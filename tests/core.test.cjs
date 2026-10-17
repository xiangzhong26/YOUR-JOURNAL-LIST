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

test('ranking membership suffixes do not hide journals with ordinary titles or missing ISSNs', () => {
  const { catalog } = core.validateCatalog({ journals: [
    { title: 'Strategic Management Journal (UT-Dallas 24)', aliases: ['Strategic Management Journal (UT-Dallas 24) (FT 50)'], grade: 'Tier 1' },
    { title: 'Organization Science (UT-Dallas 24)', grade: 'Tier 1' },
    { title: 'Information Systems Research(UT-Dallas 24)(FT 50)', grade: 'Tier 1' }
  ] });
  const index = core.buildIndex(catalog);
  for (const title of ['Strategic Management Journal', 'Organization Science', 'Information Systems Research', 'Strategic Management Journal（UT-Dallas 24）（FT50）']) {
    assert.equal(core.matchJournal(index, { title }).grade, 'Tier 1', title);
  }
  assert.notEqual(core.normalizeName('Journal (English Edition)'), core.normalizeName('Journal'));
  assert.notEqual(core.normalizeName('Journal (1997)'), core.normalizeName('Journal'));
  assert.notEqual(core.normalizeName('Journal (FT 500)'), core.normalizeName('Journal'));
});

test('one journal with the same grade in multiple subjects is matched with all evidence preserved', () => {
  const { catalog, warnings } = core.validateCatalog({ journals: [
    { title: 'R & D Management', issn: ['0033-6807'], grade: 'Tier 3', subject: 'Strategy' },
    { title: 'R&D MANAGEMENT', issn: ['0033-6807'], grade: 'Tier 3', subject: 'Operations' }
  ] });
  const index = core.buildIndex(catalog);
  for (const item of [{ title: 'R&D Management' }, { issn: '0033-6807' }, { title: 'R & D Management', issn: '0033-6807' }]) {
    const result = core.matchJournal(index, item);
    assert.equal(result.status, 'matched'); assert.equal(result.grade, 'Tier 3');
    assert.equal(result.entries.length, 2);
  }
  assert.equal(warnings.length, 0);
  catalog.journals[1].grade = 'Tier 2';
  assert.equal(core.matchJournal(core.buildIndex(catalog), { title: 'R&D Management' }).status, 'ambiguous');
});

test('multi-subject ISSN evidence does not override a contradictory explicit journal name', () => {
  const { catalog } = core.validateCatalog({ journals: [
    { title: 'R&D Management', issn: ['0033-6807'], grade: 'Tier 3', subject: 'Strategy' },
    { title: 'R&D Management', issn: ['0033-6807'], grade: 'Tier 3', subject: 'Operations' },
    { title: 'Another Journal', grade: 'Tier 3' }
  ] });
  assert.equal(core.matchJournal(core.buildIndex(catalog), { title: 'Another Journal', issn: '0033-6807' }).status, 'ambiguous');
});

test('leading The variations match QJE in either direction without losing exact-title priority', () => {
  const { catalog } = core.validateCatalog({ journals: [
    { title: 'Quarterly Journal of Economics', grade: 'Top Tier' },
    { title: 'The Review of Example Studies', grade: 'A' }
  ] });
  const index = core.buildIndex(catalog);
  assert.equal(core.matchJournal(index, { title: 'The Quarterly Journal of Economics' }).grade, 'Top Tier');
  assert.equal(core.matchJournal(index, { title: 'Review of Example Studies' }).grade, 'A');
  assert.equal(core.matchJournal(index, { title: 'The Quarterly Journal of Something Else' }).status, 'unlisted');
  const exact = core.validateCatalog({ journals: [
    { title: 'Journal X', grade: 'A' }, { title: 'The Journal X', grade: 'B' }
  ] }).catalog;
  assert.equal(core.matchJournal(core.buildIndex(exact), { title: 'The Journal X' }).grade, 'B');
  const conflict = core.validateCatalog({ journals: [
    { title: 'The Journal X', grade: 'A', aliases: ['The Shared Name'] },
    { title: 'Distinct Journal', grade: 'A', aliases: ['The Shared Name'] }
  ] }).catalog;
  assert.equal(core.matchJournal(core.buildIndex(conflict), { title: 'Shared Name' }).status, 'ambiguous');
});

test('explicit journal names disambiguate a shared ISSN without assigning the highest grade', () => {
  const { catalog } = core.validateCatalog({ journals: [
    { title: 'American Economic Review (FT 50)', grade: 'Top Tier', issn: ['0002-8282'] },
    { title: 'AER Papers and Proceedings', grade: 'Tier 2', issn: ['0002-8282'] }
  ] });
  const index = core.buildIndex(catalog);
  assert.equal(core.matchJournal(index, { title: 'American Economic Review', issn: '0002-8282' }).grade, 'Top Tier');
  assert.equal(core.matchJournal(index, { title: 'AER Papers and Proceedings', issn: '0002-8282' }).grade, 'Tier 2');
  assert.equal(core.matchJournal(index, { issn: '0002-8282' }).status, 'ambiguous');
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
test('identical canonical title/grade/subject rows merge; differing grades stay ambiguous', () => {
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
