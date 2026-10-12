const {
  SCENE_MANIFEST_SCHEMA_VERSION,
  defaultSceneManifest,
  validateSceneManifest
} = require('./sceneManifest');

describe('scene manifest v1 contract', () => {
  test('accepts the safe default browser-first manifest', () => {
    const manifest = defaultSceneManifest();
    expect(manifest.schemaVersion).toBe(SCENE_MANIFEST_SCHEMA_VERSION);
    expect(validateSceneManifest(manifest)).toEqual({ valid: true, manifest, errors: [] });
  });

  test('accepts versioned assets, spawn points, zones and capability requirements', () => {
    const manifest = {
      ...defaultSceneManifest(),
      assetBundleVersion: '42',
      assets: [{ id: 'plaza', type: 'glb', url: 'https://cdn.myzubster.com/scenes/plaza.42.glb' }],
      spawnPoints: [{ id: 'entrance', position: [0, 1.6, 2] }],
      interactionZones: [
        { id: 'life-portal', type: 'portal', position: [2, 0, 3], radius: 1.5, destination: 'life-hub' },
        { id: 'help', type: 'link', position: [4, 0, 1], radius: 1, destination: 'https://www.myzubster.com/life' }
      ],
      stage: { position: [0, 0, -4], capacity: 30 },
      lighting: { preset: 'sunset' },
      capabilities: ['webgl2', 'audio']
    };
    expect(validateSceneManifest(manifest).valid).toBe(true);
  });

  test('rejects unsupported schema versions and insecure asset urls', () => {
    const manifest = {
      ...defaultSceneManifest(),
      schemaVersion: '2',
      assets: [{ id: 'plaza', type: 'glb', url: 'http://cdn.example.com/plaza.glb' }]
    };
    const result = validateSceneManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'schemaVersion must be 1',
      'assets[0].url must use https'
    ]));
  });

  test('rejects malformed vectors, duplicate ids and unsupported capabilities', () => {
    const manifest = {
      ...defaultSceneManifest(),
      spawnPoints: [
        { id: 'same', position: [0, 0] },
        { id: 'same', position: [0, 0, Number.NaN] }
      ],
      capabilities: ['telepathy']
    };
    const result = validateSceneManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'spawnPoints[0].position must be a finite xyz vector',
      'spawnPoints[1].id must be unique',
      'capabilities contains an unsupported requirement'
    ]));
  });

  test('requires safe destinations for portal and link zones', () => {
    const manifest = {
      ...defaultSceneManifest(),
      interactionZones: [
        { id: 'portal', type: 'portal', position: [0, 0, 0], radius: 2 },
        { id: 'link', type: 'link', position: [1, 0, 0], radius: 2, destination: 'javascript:alert(1)' }
      ]
    };
    const result = validateSceneManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'interactionZones[0].destination is required for portals',
      'interactionZones[1].destination must use https for links'
    ]));
  });
});
