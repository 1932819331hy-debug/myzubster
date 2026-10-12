const {
  canonicalize,
  manifestChecksum,
  publicManifestVersion
} = require('./sceneManifestHistory');

describe('scene manifest history', () => {
  test('canonicalizes object keys recursively for stable checksums', () => {
    const first = { b: 2, a: { y: [3, 2, 1], x: true } };
    const second = { a: { x: true, y: [3, 2, 1] }, b: 2 };
    expect(canonicalize(first)).toBe(canonicalize(second));
    expect(manifestChecksum(first)).toBe(manifestChecksum(second));
  });

  test('changes the checksum when scene content changes', () => {
    const first = { schemaVersion: '1', assetBundleVersion: '1', assets: [] };
    const second = { ...first, assetBundleVersion: '2' };
    expect(manifestChecksum(first)).not.toBe(manifestChecksum(second));
  });

  test('returns public metadata without the manifest or actor identifier', () => {
    const view = publicManifestVersion({
      version: 4,
      schemaVersion: '1',
      assetBundleVersion: '7',
      checksum: 'abc',
      manifest: { private: 'large payload' },
      createdBy: 'account-secret',
      reason: 'rollback',
      sourceVersion: 2,
      createdAt: '2026-10-12T00:00:00.000Z'
    });

    expect(view).toEqual({
      version: 4,
      schemaVersion: '1',
      assetBundleVersion: '7',
      checksum: 'abc',
      reason: 'rollback',
      sourceVersion: 2,
      createdAt: '2026-10-12T00:00:00.000Z'
    });
    expect(view).not.toHaveProperty('manifest');
    expect(view).not.toHaveProperty('createdBy');
  });
});
