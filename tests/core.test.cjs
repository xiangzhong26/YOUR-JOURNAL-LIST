const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../addon/content/core.js');
const example = fs.readFileSync(new URL('../examples/demo-journals.json', `file://${__filename.replaceAll('\\', '/')}`), 'utf8');
const fixture = () => core.parseCatalog(example).catalog;
const match = item => core.matchJournal(core.buildIndex(fixture()), item);

test('user examples: capitalization, ampersand spacing and explicit aliases share one grade', () => {
  for (const title of ['R & D Management', 'RD MANAGEMENT', 'RD Management', 'R&D Management', 'R&D MANAGEMENT', ' Ｒ＆Ｄ Management ']) {
    assert.equal(match({ title }).grade, 'A类', title);
  }
});
test('format normalization does not erase meaningful punctuation or invent aliases', () => {
  assert.notEqual(core.normalizeName('A-B'), core.normalizeName('AB'));
  assert.equal(match({ title: 'Journal Example Studies' }).status, 'unlisted');
});
test('abbreviations and valid ISSNs identify journals', () => {
  assert.equal(match({ abbreviation: 'J. Example Stud.' }).grade, 'B类');
  assert.equal(match({ issn: '14679310' }).grade, 'A类');
  assert.equal(core.normalizeISSN('0033-6807'), '0033-6807');
  assert.equal(core.normalizeISSN('0033-6808'), '');
});
test('ambiguous aliases fail closed even across identical grades', () => {
  assert.equal(match({ title: 'Shared Review' }).status, 'ambiguous');
  const c = fixture(); c.journals[3].grade = 'A类';
  assert.equal(core.matchJournal(core.buildIndex(c), { title: 'Shared Review' }).status, 'ambiguous');
});
test('ISSN/name disagreements require confirmation; a shared alias can be disambiguated by ISSN', () => {
  assert.equal(match({ title: 'Journal of Example Studies', issn: '0033-6807' }).status, 'ambiguous');
  const c = fixture(); c.journals[2].issn = ['0033-6807'];
  assert.equal(core.matchJournal(core.buildIndex(c), { issn: '0033-6807' }).status, 'ambiguous');
  c.journals[0].issn = [];
  assert.equal(core.matchJournal(core.buildIndex(c), { title: 'Shared Review', issn: '0033-6807' }).entries[0].title, 'Example Review One');
});
test('missing metadata and unlisted journals are distinct', () => {
  assert.equal(match({}).status, 'missing');
  assert.equal(match({ title: 'Unknown Journal' }).status, 'unlisted');
  assert.equal(core.matchJournal(null, {}).status, 'no-catalog');
});
test('CSV BOM, quoted commas, escaped quotes and newlines round-trip', () => {
  const csv = '\uFEFFtitle,grade,aliases\r\n"Journal, Example",A,"Alias ""A"";Other\nThird"\r\n';
  const { catalog } = core.parseCatalog(csv, 'test.csv');
  assert.equal(catalog.journals[0].title, 'Journal, Example');
  assert.deepEqual(catalog.journals[0].aliases, ['Alias "A"', 'Other', 'Third']);
});
test('CSV rejects broken quoting, duplicate headers, unequal columns and mixed institutions', () => {
  for (const csv of ['title,grade\n"A,B', 'title,grade,等级\nA,B,C', 'title,grade\nA,B,C', 'title,grade,institution\nA,A,X\nB,B,Y']) {
    assert.throws(() => core.parseCatalog(csv, 'bad.csv'));
  }
});
test('identical canonical title/grade/subject rows merge; differing grades or subjects stay ambiguous', () => {
  const { catalog, warnings } = core.validateCatalog({ journals: [
    { title: 'Example', grade: 'A', aliases: ['First'] },
    { title: 'EXAMPLE', grade: 'A', aliases: ['Second'] },
    { title: 'Example', grade: 'B' }
  ] });
  assert.equal(catalog.journals.length, 2);
  assert.ok(catalog.journals[0].aliases.includes('Second'));
  assert.ok(warnings.length >= 2);
  assert.equal(core.matchJournal(core.buildIndex(catalog), { title: 'Example' }).status, 'ambiguous');
});
test('strict validation blocks malformed data before import', () => {
  for (const raw of [null, [], {}, { schemaVersion: 2, journals: [{}] }, { journals: [{ title: 'X' }] },
    { journals: [{ title: 'X', grade: 1 }] }, { journals: [{ title: 'X', grade: 'A', aliases: {} }] },
    { journals: [{ title: 'X', grade: 'A', issn: ['1234-5678'] }] }]) {
    assert.throws(() => core.validateCatalog(raw));
  }
  assert.throws(() => core.parseCatalog('```json\n{}\n```'));
});
test('example CSV is importable and Chinese headers are accepted', () => {
  const path = require('node:path');
  const csv = fs.readFileSync(path.join(__dirname, '../examples/demo-journals.csv'), 'utf8');
  assert.equal(core.parseCatalog(csv, 'demo.csv').catalog.journals.length, 2);
  assert.equal(core.parseCatalog('期刊名称,学院等级,名称别名\nExample,A,Alias', 'cn.csv').catalog.journals[0].aliases[0], 'Alias');
});
test('large catalogs use indexed lookups', () => {
  const raw = { journals: Array.from({ length: 10000 }, (_, i) => ({ title: `Journal ${i}`, aliases: [`Alias ${i}`], grade: 'A' })) };
  const { catalog } = core.validateCatalog(raw);
  const index = core.buildIndex(catalog);
  assert.equal(core.matchJournal(index, { title: 'Alias 9999' }).grade, 'A');
  assert.throws(() => core.validateCatalog({ journals: Array(50001).fill(raw.journals[0]) }));
});
