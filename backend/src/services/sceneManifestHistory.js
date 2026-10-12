const crypto = require('crypto');
const SceneManifestVersion = require('../models/SceneManifestVersion');
const { validateSceneManifest } = require('./sceneManifest');

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function manifestChecksum(manifest) {
  return crypto.createHash('sha256').update(canonicalize(manifest)).digest('hex');
}

function publicManifestVersion(snapshot) {
  const value = typeof snapshot?.toObject === 'function' ? snapshot.toObject() : snapshot;
  if (!value) return null;
  return {
    version: value.version,
    schemaVersion: value.schemaVersion,
    assetBundleVersion: value.assetBundleVersion,
    checksum: value.checksum,
    reason: value.reason,
    sourceVersion: value.sourceVersion || null,
    createdAt: value.createdAt || null
  };
}

async function createSnapshot({ roomId, version, manifest, actorUserId, reason, sourceVersion = null }) {
  return SceneManifestVersion.create({
    roomId: String(roomId),
    version,
    schemaVersion: manifest.schemaVersion,
    assetBundleVersion: manifest.assetBundleVersion,
    checksum: manifestChecksum(manifest),
    manifest,
    createdBy: String(actorUserId),
    reason,
    sourceVersion
  });
}

async function persistSceneManifestVersion({
  room,
  manifest,
  previousManifest = null,
  actorUserId,
  reason = 'update',
  sourceVersion = null
}) {
  const validation = validateSceneManifest(manifest);
  if (!validation.valid) {
    return { valid: false, status: 400, error: 'Invalid scene manifest', details: validation.errors };
  }

  let latest = await SceneManifestVersion.findOne({ roomId: room.roomId }).sort({ version: -1 });
  const requestedChecksum = manifestChecksum(validation.manifest);
  const currentVersion = Math.max(1, Number.parseInt(room.sceneManifestVersion, 10) || 1);

  if (!latest && previousManifest) {
    const previousValidation = validateSceneManifest(previousManifest);
    if (previousValidation.valid) {
      const previousChecksum = manifestChecksum(previousValidation.manifest);
      if (previousChecksum !== requestedChecksum) {
        latest = await createSnapshot({
          roomId: room.roomId,
          version: currentVersion,
          manifest: previousValidation.manifest,
          actorUserId,
          reason: 'baseline'
        });
      }
    }
  }

  if (latest?.checksum === requestedChecksum) {
    room.sceneManifest = validation.manifest;
    room.sceneManifestVersion = String(latest.version);
    await room.save();
    return { valid: true, status: 200, created: false, snapshot: publicManifestVersion(latest) };
  }

  const nextVersion = latest ? latest.version + 1 : currentVersion;
  const snapshot = await createSnapshot({
    roomId: room.roomId,
    version: nextVersion,
    manifest: validation.manifest,
    actorUserId,
    reason,
    sourceVersion
  });

  room.sceneManifest = validation.manifest;
  room.sceneManifestVersion = String(nextVersion);
  await room.save();

  return { valid: true, status: 201, created: true, snapshot: publicManifestVersion(snapshot) };
}

async function listSceneManifestVersions(roomId, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const snapshots = await SceneManifestVersion.find({ roomId: String(roomId) })
    .sort({ version: -1 })
    .limit(safeLimit)
    .lean();
  return snapshots.map(publicManifestVersion);
}

async function rollbackSceneManifestVersion({ room, targetVersion, actorUserId }) {
  const numericVersion = Number(targetVersion);
  if (!Number.isInteger(numericVersion) || numericVersion < 1) {
    return { valid: false, status: 400, error: 'Invalid manifest version' };
  }

  const target = await SceneManifestVersion.findOne({
    roomId: room.roomId,
    version: numericVersion
  }).lean();

  if (!target) return { valid: false, status: 404, error: 'Manifest version not found' };

  return persistSceneManifestVersion({
    room,
    manifest: target.manifest,
    previousManifest: room.sceneManifest,
    actorUserId,
    reason: 'rollback',
    sourceVersion: numericVersion
  });
}

module.exports = {
  canonicalize,
  manifestChecksum,
  publicManifestVersion,
  persistSceneManifestVersion,
  listSceneManifestVersions,
  rollbackSceneManifestVersion
};
