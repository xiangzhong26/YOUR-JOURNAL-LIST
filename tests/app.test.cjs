const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../addon/content/core.js');
const source = fs.readFileSync(path.join(__dirname, '../addon/content/app.js'), 'utf8');

function setup(saved, writeError = false) {
  let serial = 0, writes = 0, disk = saved;
  const context = vm.createContext({
    JournalListCore: core,
    Services: { uuid: { generateUUID: () => `{id-${++serial}}` } },
    PathUtils: { join: (...args) => args.join('/'), parent: value => value.slice(0, value.lastIndexOf('/')) },
    IOUtils: {
      exists: async () => saved !== undefined,
      readJSON: async () => saved,
      makeDirectory: async () => {},
      writeJSON: async (_path, value) => {
        if (writeError) throw new Error('Disk full');
        writes++; disk = JSON.parse(JSON.stringify(value));
      }
    },
    Zotero: {
      DataDirectory: { dir: '/isolated-data' }, logError: () => {},
      ItemTreeManager: { registerColumn: () => 'test-column', refreshColumns: () => {}, unregisterColumn: () => {} },
      Notifier: { registerObserver: () => 1, unregisterObserver: () => {} }
    }
  });
  vm.runInContext(source, context);
  return { app: context.JournalListApp, writes: () => writes, disk: () => disk };
}
const catalog = name => ({ name, journals: [{ title: 'Example', grade: 'A' }] });

test('failed local writes preserve active catalog and in-memory state', async () => {
  const { app, writes } = setup(undefined, true);
  await app.start('test');
  await assert.rejects(app.importCatalog(catalog('Failed')), /Disk full/);
  assert.equal(app.state.catalogs.length, 0);
  assert.equal(app.index, null);
  assert.equal(writes(), 0);
});
test('serialized concurrent imports do not overwrite one another', async () => {
  const { app, disk } = setup();
  await app.start('test');
  await Promise.all([app.importCatalog(catalog('First')), app.importCatalog(catalog('Second'))]);
  assert.equal(app.state.catalogs.length, 2);
  assert.equal(app.activeCatalog().name, 'Second');
  assert.equal(disk().catalogs.length, 2);
});
test('corrupt persisted directories block writes and preserve the original data', async () => {
  const saved = { schemaVersion: 1, catalogs: [{ id: 'broken', journals: [] }] };
  const { app, writes, disk } = setup(saved);
  await app.start('test');
  assert.ok(app.loadError);
  await assert.rejects(app.importCatalog(catalog('New')), /无法读取/);
  assert.equal(writes(), 0);
  assert.equal(disk(), saved);
});
test('invalid replacement cannot remove or alter an existing catalog', async () => {
  const { app, writes } = setup();
  await app.start('test');
  await app.importCatalog(catalog('Original'));
  await assert.rejects(app.importCatalog(catalog('Replacement'), 'missing-id'), /不存在/);
  assert.equal(app.activeCatalog().name, 'Original');
  assert.equal(writes(), 1);
});
