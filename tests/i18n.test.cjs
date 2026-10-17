const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const l10n = require('../addon/content/i18n.js');

test('Chinese locales use Chinese; other locales fall back to English', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'zh-Hant', 'zh']) assert.equal(l10n.use(locale).t('等级'), '等级');
  for (const locale of ['en-US', 'en-GB', 'de-DE', 'ja-JP', undefined]) assert.equal(l10n.use(locale).t('等级'), 'Grade');
});
test('Interpolation preserves institutional grades and source content verbatim', () => {
  l10n.use('en');
  assert.equal(l10n.t('学院等级 · {name}', {name:'学校 A类 {test}'}), 'Journal grades · 学校 A类 {test}');
  assert.equal(l10n.t('国际顶级'), '国际顶级');
});
test('Validation diagnostics translate dynamic row numbers, fields and identifiers', () => {
  l10n.use('en');
  assert.equal(l10n.diagnostic('第 12 条的 aliases 必须是文本或文本数组。'), 'Record 12: aliases must be text or an array of text.');
  assert.equal(l10n.diagnostic('第 2 条 ISSN 无效（含校验位）：1234-5678'), 'Record 2 has an invalid ISSN (including check digit): 1234-5678');
  assert.equal(l10n.diagnostic('CSV 第 5 行列数与表头不一致。'), 'CSV row 5 has a different number of columns than the header.');
  assert.equal(l10n.diagnostic('Disk full'), 'Disk full');
});
test('Every static Chinese UI text and placeholder has an English translation', () => {
  l10n.use('en');
  const html = fs.readFileSync(path.join(__dirname, '../addon/content/manager.xhtml'), 'utf8');
  const text = [...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim());
  const attrs = [...html.matchAll(/(?:placeholder|aria-label)="([^"]+)"/g)].map(m=>m[1]);
  for (const source of [...text,...attrs].filter(s=>/[\p{Script=Han}]/u.test(s))) {
    assert.ok(l10n.messages[source], 'Untranslated UI: ' + source);
    assert.ok(!/[\p{Script=Han}]/u.test(l10n.t(source)), source);
  }
});
