const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {prepare} = require('../scripts/prepare_catalog.cjs');
const core = require('../addon/content/core.js');
function workspace(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'journal-prepare-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return {root, input:path.join(root,'input.json'),out:path.join(root,'delivery')};
}
test('prepared file round-trips through plugin parser, preserves grades and reports real alias probes',t=>{
  const w=workspace(t);
  fs.writeFileSync(w.input,JSON.stringify({name:'某学院',journals:[
    {title:'R & D Management',grade:'国际二类',aliases:['RD Management'],issn:['0033-6807']},
    {title:'Quarterly Journal of Economics',grade:'顶级',issn:['0033-5533']}
  ]}));
  const result=prepare({...w,expectedCount:2,probes:['RD MANAGEMENT','The Quarterly Journal of Economics','Not Listed']});
  const parsed=core.parseCatalog(fs.readFileSync(path.join(w.out,'journal-list.json'),'utf8'));
  assert.equal(parsed.catalog.journals[0].grade,'国际二类');
  assert.equal(result.report.sourceAuditVerified,false);
  assert.deepEqual(result.report.probes.map(p=>p.status),['matched','matched','unlisted']);
  assert.equal(result.report.probes[1].grade,'顶级');
  assert.equal(fs.existsSync(path.join(w.out,'source-audit.md')),false); // Never manufacture source verification.
});
test('invalid ISSN and count mismatch create no delivery directory',t=>{
  const w=workspace(t);
  fs.writeFileSync(w.input,JSON.stringify({journals:[{title:'Example',grade:'A',issn:['1234-5678']}]}));
  assert.throws(()=>prepare(w),/invalid ISSN/);
  assert.equal(fs.existsSync(w.out),false);
  fs.writeFileSync(w.input,JSON.stringify({journals:[{title:'Example',grade:'A'}]}));
  assert.throws(()=>prepare({...w,expectedCount:2}),/Expected 2/);
  assert.equal(fs.existsSync(w.out),false);
});
test('conflicts remain ambiguous and a previous delivery cannot be overwritten',t=>{
  const w=workspace(t);
  fs.writeFileSync(w.input,JSON.stringify({journals:[{title:'One',grade:'A',aliases:['Shared']},{title:'Two',grade:'B',aliases:['Shared']}]}));
  const {report}=prepare({...w,probes:['Shared']});
  assert.ok(report.warnings.length);
  assert.equal(report.probes[0].status,'ambiguous');
  const original=fs.readFileSync(path.join(w.out,'journal-list.json'),'utf8');
  assert.throws(()=>prepare(w),/EEXIST/);
  assert.equal(fs.readFileSync(path.join(w.out,'journal-list.json'),'utf8'),original);
});
test('UTF-8 CSV is supported and malformed UTF-8 is rejected',t=>{
  const w=workspace(t);
  const csv=path.join(w.root,'catalog.csv');
  fs.writeFileSync(csv,'title,grade,aliases\nExample,A,Example Journal\n');
  assert.equal(prepare({...w,input:csv,language:'zh-CN'}).report.journalCount,1);
  fs.writeFileSync(w.input,Buffer.from([0xff,0xfe]));
  assert.throws(()=>prepare({...w,out:path.join(w.root,'invalid')}),/encoded data/);
});
