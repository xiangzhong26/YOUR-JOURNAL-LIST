/* Prepare private import artifacts with the exact parser used by the plugin. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const core = require("../addon/content/core.js");
const l10n = require("../addon/content/i18n.js");
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function prepare({input, out, language = "en", expectedCount, probes = []}) {
  if (!input || !out) throw new Error("Input and a new output directory are required.");
  l10n.use(language);
  const inputPath = path.resolve(input), outputPath = path.resolve(out);
  const stat = fs.statSync(inputPath);
  if (!stat.isFile() || stat.size > core.MAX_BYTES) throw new Error("Input must be a file no larger than 10 MB.");
  const bytes = fs.readFileSync(inputPath);
  const text = new TextDecoder("utf-8", {fatal:true}).decode(bytes);
  let parsed;
  try { parsed = core.parseCatalog(text, path.basename(inputPath)); }
  catch (error) { throw new Error(l10n.diagnostic(error.message)); }
  if (expectedCount !== undefined && (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || parsed.originalCount !== expectedCount)) {
    throw new Error(`Expected ${expectedCount} extracted records, received ${parsed.originalCount}. No output written.`);
  }
  const content = JSON.stringify(parsed.catalog, null, 2) + "\n";
  if (Buffer.byteLength(content) > core.MAX_BYTES) throw new Error("Normalized JSON exceeds the plugin's 10 MB limit. Split the catalog.");
  const index = core.buildIndex(parsed.catalog);
  const report = {
    formatValid: true,
    sourceAuditVerified: false,
    scope: "Plugin format, ISSN checks, identifier conflicts and optional name probes only. Original documents were not audited by this tool.",
    inputSHA256: digest(bytes), catalogSHA256: digest(content),
    originalCount: parsed.originalCount, journalCount: parsed.catalog.journals.length,
    mergedCount: parsed.originalCount - parsed.catalog.journals.length,
    grades: Object.fromEntries([...new Set(parsed.catalog.journals.map(j=>j.grade))].map(grade=>[grade,parsed.catalog.journals.filter(j=>j.grade===grade).length])),
    warnings: parsed.warnings.map(w=>l10n.diagnostic(w)),
    probes: probes.map(title=> {
      const result = core.matchJournal(index, {title});
      return {title, status:result.status, grade:result.grade || "", matches:result.entries.map(e=>({title:e.title,grade:e.grade,subject:e.subject}))};
    })
  };
  // Fail rather than overwrite an earlier delivery or the source directory.
  fs.mkdirSync(path.dirname(outputPath), {recursive:true});
  fs.mkdirSync(outputPath);
  const write = (name, value) => fs.writeFileSync(path.join(outputPath,name), value, {encoding:"utf8",flag:"wx"});
  write("journal-list.json",content);
  write("validation-report.json",JSON.stringify(report,null,2)+"\n");
  write("NEXT-STEPS.md", language.startsWith("zh") ?
    "# 下一步\n\n已生成并通过格式校验；本工具未安装或配置 Zotero，也没有核对原始学校材料。请查看 validation-report.json 和 AI 单独提供的 source-audit.md。\n\n1. 如未安装插件，在 Zotero 的“工具 → 插件”中安装本仓库的 XPI。\n2. 打开“学院期刊目录 → 目录管理 → 导入目录…”，选择本文件夹的 journal-list.json，核对后点击“确认并启用”。默认新增目录，不替换旧目录。\n3. 文献列表表头上右键勾选“学院等级”，核对目录名称、数量、代表期刊与别名。\n\n存在未识别页面、未核对记录或冲突时，请先检查 source-audit.md；格式通过不代表提取完整或等级正确。\n" :
    "# Next steps\n\nThe catalog passed format validation. This tool did not install/configure Zotero or audit the original policy materials. Review validation-report.json and the separately prepared source-audit.md.\n\n1. If needed, install this repository's XPI through Zotero Tools → Plugins.\n2. Open Your Journal List → Catalogs → Import catalog, choose journal-list.json from this folder, review it and click Import and activate. Add a new catalog by default; do not replace existing ones.\n3. Enable Institutional grade in the item-list header menu. Verify the active catalog, count and representative journals/aliases.\n\nReview source-audit.md for unreadable pages, unverified entries or conflicts. Format validation does not establish extraction completeness or correct policy interpretation.\n");
  return {outputPath,report};
}
function main(args) {
  if (args.includes("--help")) {
    console.log('Usage: node scripts/prepare_catalog.cjs INPUT --out NEW_FOLDER [--lang en|zh-CN] [--expected-count N] [--probe "Journal title"]');
    return;
  }
  const options = {input:args.shift(), probes:[]};
  while (args.length) {
    const flag=args.shift(), value=args.shift();
    if (!value) throw new Error(`Missing value for ${flag}`);
    if (flag==="--out") options.out=value;
    else if (flag==="--lang" && ["en","zh-CN"].includes(value)) options.language=value;
    else if (flag==="--expected-count") options.expectedCount=Number(value);
    else if (flag==="--probe") options.probes.push(value);
    else throw new Error(`Unknown option or invalid value: ${flag}`);
  }
  const {outputPath,report} = prepare(options);
  console.log(JSON.stringify({outputPath,formatValid:true,journalCount:report.journalCount,warnings:report.warnings.length,sourceAuditVerified:false},null,2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode=1; }
}
module.exports = {prepare};
