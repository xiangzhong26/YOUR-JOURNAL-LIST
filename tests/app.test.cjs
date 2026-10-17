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
  return { app: context.JournalListApp, context, writes: () => writes, disk: () => disk };
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

test('Chinese and English copy buttons copy response text rather than an XMLHttpRequest object', async () => {
  const { app, context } = setup();
  const copied = [], requested = [];
  const prompts = {
    'ai-prompt.txt': fs.readFileSync(path.join(__dirname, '../addon/content/ai-prompt.txt'), 'utf8'),
    'ai-prompt-en.txt': fs.readFileSync(path.join(__dirname, '../addon/content/ai-prompt-en.txt'), 'utf8')
  };
  const request = async (method, uri, options) => {
    assert.equal(method, 'GET');
    assert.equal(options.responseType, 'text');
    const filename = uri.split('/').at(-1);
    requested.push(filename);
    return { responseText: prompts[filename], toString: () => '[object XMLHttpRequest]' };
  };
  context.Zotero.HTTP = { request };
  // Reproduce the old API behavior so the original implementation cannot pass this test.
  context.Zotero.File = { getContentsAsync: async () => ({ toString: () => '[object XMLHttpRequest]' }) };
  context.Ci = { nsIClipboardHelper: 'clipboard' };
  context.Cc = { '@mozilla.org/widget/clipboardhelper;1': { getService: () => ({ copyString: value => {
    assert.equal(typeof value, 'string'); copied.push(value);
  } }) } };
  await app.copyPrompt();
  await app.copyPrompt('en');
  assert.deepEqual(requested, ['ai-prompt.txt', 'ai-prompt-en.txt']);
  assert.deepEqual(copied, [prompts['ai-prompt.txt'], prompts['ai-prompt-en.txt']]);
});

test('failed or non-text prompt reads do not overwrite the clipboard', async () => {
  const { app, context } = setup();
  let clipboardWrites = 0;
  context.Ci = { nsIClipboardHelper: 'clipboard' };
  context.Cc = { '@mozilla.org/widget/clipboardhelper;1': { getService: () => ({ copyString: () => clipboardWrites++ }) } };
  for (const responseText of [undefined, {}, '', '   ']) {
    context.Zotero.HTTP = { request: async () => ({ responseText }) };
    await assert.rejects(app.copyPrompt(), /有效文本/);
  }
  context.Zotero.HTTP.request = async () => { throw new Error('Resource unavailable'); };
  await assert.rejects(app.copyPrompt('en'), /Resource unavailable/);
  assert.equal(clipboardWrites, 0);
});
