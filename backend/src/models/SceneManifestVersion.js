const mongoose = require('mongoose');

const sceneManifestVersionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  schemaVersion: { type: String, required: true },
  assetBundleVersion: { type: String, required: true },
  checksum: { type: String, required: true },
  manifest: { type: mongoose.Schema.Types.Mixed, required: true },
  createdBy: { type: String, required: true },
  reason: {
    type: String,
    enum: ['baseline', 'update', 'publish', 'rollback'],
    required: true
  },
  sourceVersion: { type: Number, default: null }
}, { timestamps: true, versionKey: false });

sceneManifestVersionSchema.index({ roomId: 1, version: 1 }, { unique: true });
sceneManifestVersionSchema.index({ roomId: 1, checksum: 1 });

module.exports = mongoose.models.SceneManifestVersion
  || mongoose.model('SceneManifestVersion', sceneManifestVersionSchema);
