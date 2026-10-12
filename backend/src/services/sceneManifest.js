const SCENE_MANIFEST_SCHEMA_VERSION = '1';

const ASSET_TYPES = new Set(['gltf', 'glb', 'image', 'audio', 'video']);
const ZONE_TYPES = new Set(['portal', 'stage', 'link']);
const LIGHTING_PRESETS = new Set(['day', 'sunset', 'night', 'studio']);
const CAPABILITIES = new Set(['webgl2', 'webxr-immersive-vr', 'audio', 'video']);

function defaultSceneManifest() {
  return {
    schemaVersion: SCENE_MANIFEST_SCHEMA_VERSION,
    assetBundleVersion: '1',
    assets: [],
    spawnPoints: [{ id: 'default', position: [0, 0, 0] }],
    interactionZones: [],
    stage: { position: [0, 0, 0], capacity: 1 },
    lighting: { preset: 'day' },
    capabilities: []
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
}

function validVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function validHttpsUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validateSceneManifest(input) {
  const errors = [];
  if (!isRecord(input)) return { valid: false, errors: ['manifest must be an object'] };

  if (input.schemaVersion !== SCENE_MANIFEST_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCENE_MANIFEST_SCHEMA_VERSION}`);
  }
  if (typeof input.assetBundleVersion !== 'string' || !/^[1-9][0-9]{0,8}$/.test(input.assetBundleVersion)) {
    errors.push('assetBundleVersion must be a positive integer string');
  }

  if (!Array.isArray(input.assets) || input.assets.length > 100) {
    errors.push('assets must be an array with at most 100 entries');
  } else {
    const ids = new Set();
    input.assets.forEach((asset, index) => {
      if (!isRecord(asset) || !validId(asset.id)) errors.push(`assets[${index}].id is invalid`);
      else if (ids.has(asset.id)) errors.push(`assets[${index}].id must be unique`);
      else ids.add(asset.id);
      if (!isRecord(asset) || !ASSET_TYPES.has(asset.type)) errors.push(`assets[${index}].type is unsupported`);
      if (!isRecord(asset) || !validHttpsUrl(asset.url)) errors.push(`assets[${index}].url must use https`);
    });
  }

  if (!Array.isArray(input.spawnPoints) || input.spawnPoints.length < 1 || input.spawnPoints.length > 32) {
    errors.push('spawnPoints must contain between 1 and 32 entries');
  } else {
    const ids = new Set();
    input.spawnPoints.forEach((spawn, index) => {
      if (!isRecord(spawn) || !validId(spawn.id)) errors.push(`spawnPoints[${index}].id is invalid`);
      else if (ids.has(spawn.id)) errors.push(`spawnPoints[${index}].id must be unique`);
      else ids.add(spawn.id);
      if (!isRecord(spawn) || !validVector(spawn.position)) errors.push(`spawnPoints[${index}].position must be a finite xyz vector`);
    });
  }

  if (!Array.isArray(input.interactionZones) || input.interactionZones.length > 100) {
    errors.push('interactionZones must be an array with at most 100 entries');
  } else {
    input.interactionZones.forEach((zone, index) => {
      if (!isRecord(zone) || !validId(zone.id)) errors.push(`interactionZones[${index}].id is invalid`);
      if (!isRecord(zone) || !ZONE_TYPES.has(zone.type)) errors.push(`interactionZones[${index}].type is unsupported`);
      if (!isRecord(zone) || !validVector(zone.position)) errors.push(`interactionZones[${index}].position must be a finite xyz vector`);
      if (!isRecord(zone) || !Number.isFinite(zone.radius) || zone.radius <= 0 || zone.radius > 100) errors.push(`interactionZones[${index}].radius must be between 0 and 100`);
      if (zone?.type === 'portal' && !validId(zone.destination)) errors.push(`interactionZones[${index}].destination is required for portals`);
      if (zone?.type === 'link' && !validHttpsUrl(zone.destination)) errors.push(`interactionZones[${index}].destination must use https for links`);
    });
  }

  if (!isRecord(input.stage) || !validVector(input.stage.position)) {
    errors.push('stage.position must be a finite xyz vector');
  }
  if (!isRecord(input.stage) || !Number.isInteger(input.stage.capacity) || input.stage.capacity < 1 || input.stage.capacity > 500) {
    errors.push('stage.capacity must be between 1 and 500');
  }
  if (!isRecord(input.lighting) || !LIGHTING_PRESETS.has(input.lighting.preset)) {
    errors.push('lighting.preset is unsupported');
  }
  if (!Array.isArray(input.capabilities) || input.capabilities.some((capability) => !CAPABILITIES.has(capability))) {
    errors.push('capabilities contains an unsupported requirement');
  }

  return errors.length ? { valid: false, errors } : { valid: true, manifest: input, errors: [] };
}

module.exports = {
  SCENE_MANIFEST_SCHEMA_VERSION,
  defaultSceneManifest,
  validateSceneManifest
};
