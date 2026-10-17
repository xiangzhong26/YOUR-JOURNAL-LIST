/* Shared UI localization. Catalog content is always preserved as supplied. */
var JournalListI18n = {
  locale: "zh-CN",
  messages: {
  "英文提示词已复制。请同时向 AI 提供学院官方目录。": "English prompt copied. Also provide your official institutional journal list.",
  "学院期刊目录 · Your Journal List": "Your Journal List",
  "学院期刊目录": "Institutional journal catalogs",
  "当前目录": "Active catalog",
  "功能": "Sections",
  "文献筛选": "Paper filter",
  "目录管理": "Catalogs",
  "使用帮助": "Help",
  "导入目录…": "Import catalog…",
  "导出…": "Export…",
  "删除": "Delete",
  "确认导入": "Review import",
  "目录名称": "Catalog name",
  "学校": "Institution",
  "学院": "Department",
  "目录版本": "Policy version",
  "检查提示": "Validation warnings",
  "标准刊名": "Canonical title",
  "别名": "Aliases",
  "等级": "Grade",
  "导入方式": "Import mode",
  "确认并启用": "Import and activate",
  "取消": "Cancel",
  "查看目录与别名": "Browse journals and aliases",
  "搜索目录": "Search catalog",
  "期刊名称、别名、ISSN 或等级": "Journal, alias, ISSN or grade",
  "等级 / 学科": "Grade / Subject",
  "筛选 Zotero 主窗口当前列表中的期刊论文。切换集合后请刷新。": "Filter journal articles in the current Zotero list. Refresh after changing collections.",
  "刷新当前列表": "Refresh current list",
  "全部等级": "All grades",
  "匹配状态": "Match status",
  "全部状态": "All statuses",
  "已匹配": "Matched",
  "待确认": "Needs review",
  "目录未收录": "Not listed",
  "信息不足": "Missing metadata",
  "未选择目录": "No catalog selected",
  "检索标题或期刊": "Search papers or journals",
  "输入标题、刊名或目录别名": "Paper title, journal or catalog alias",
  "文献标题": "Paper title",
  "期刊": "Journal",
  "匹配依据": "Match evidence",
  "操作": "Actions",
  "上一页": "Previous",
  "下一页": "Next",
  "开始使用": "Getting started",
  "把学校或学院的官方目录和整理提示词一起交给 AI。": "Give your AI the official institutional journal list together with the preparation prompt.",
  "检查生成文件中的期刊数量、等级、别名与 ISSN，保存为 .json。": "Check the generated journal counts, grades, aliases and ISSNs, then save as .json.",
  "在“目录管理”中导入文件，核对预览后点击“确认并启用”。": "Under Catalogs, import the file, review the preview and click Import and activate.",
  "在 Zotero 文献列表的表头上右键，勾选“学院等级”。": "Right-click the Zotero item-list header and enable Institutional grade.",
  "复制中文提示词": "Copy Chinese prompt",
  "筛选与匹配": "Filtering and matching",
  "选择集合后打开“文献筛选”，选择等级或匹配状态。点击“定位”返回原文献，“依据”查看目录记录。": "Select a collection, open Paper filter and choose a grade or match status. Locate selects the original paper; Evidence shows the catalog records.",
  "“目录未收录”表示没有找到对应记录；“待确认”表示存在等级冲突。请检查期刊名称、ISSN 和目录别名。": "Not listed means no corresponding record was found. Needs review indicates conflicting evidence. Check journal names, ISSNs and catalog aliases.",
  "数据与版本": "Data and versions",
  "支持 JSON 和 CSV UTF-8。目录保存在本机，可导出分享；不会随 Zotero 同步。等级按当前目录判定，不按论文发表年份自动切换政策。": "Supports JSON and CSV UTF-8. Catalogs are stored locally and can be exported, but do not sync through Zotero. The active catalog applies to all papers; publication year does not select a policy automatically.",
  "本插件不调用 AI，也不自动联网抓取学校目录或新论文。升级插件会保留已导入目录。": "This plugin does not call AI or fetch school policy changes or new papers. Plugin upgrades preserve imported catalogs.",
  "学院等级": "Institutional grade",
  "学院期刊目录 / Your Journal List": "Your Journal List",
  "学院等级 · 导入目录": "Journal grades · Import catalog",
  "导入自己的学院期刊目录": "Import your institutional journal catalog",
  "导出期刊目录": "Export journal catalog",
  "选择期刊目录（JSON / CSV）": "Choose journal catalog (JSON / CSV)",
  "目录存储格式无效": "Invalid catalog storage format",
  "目录 ID 无效或重复": "Invalid or duplicate catalog ID",
  "无法注册学院等级列": "Could not register the Institutional grade column",
  "要替换的目录不存在，请重新选择。": "The catalog to replace no longer exists. Select it again.",
  "目录不存在。": "Catalog not found.",
  "文件超过 10 MB，请拆分后导入。": "The file exceeds 10 MB. Split it before importing.",
  "请先选择目录。": "Select a catalog first.",
  "提示词文件未返回有效文本，请重新安装插件后再试。": "The prompt file did not return valid text. Reinstall the plugin and try again.",
  "目录已导出，可分享给同学院的人。": "Catalog exported. You can share it with colleagues.",
  "AI 整理提示词已复制。请同时向 AI 提供学院官方目录。": "Chinese preparation prompt copied. Also provide your official institutional journal list.",
  "尚未导入目录": "No catalog imported",
  "导入学院目录后即可显示等级。支持纯 JSON 和 CSV UTF-8 文件。": "Import a catalog to display grades. Supports plain JSON and CSV UTF-8.",
  "新增一份目录（保留现有目录）": "Add a catalog (keep existing catalogs)",
  "请填写目录名称。": "Enter a catalog name.",
  "确定替换所选目录？建议先取消并导出旧目录留存。": "Replace the selected catalog? Cancel and export a backup first if needed.",
  " · 文献有变动，可刷新当前列表。": " · Items have changed. Refresh the current list.",
  "（无标题）": "(Untitled)",
  "（缺少刊名）": "(Missing journal)",
  "缺少刊名": "Missing journal",
  "定位": "Locate",
  "依据": "Evidence",
  "无": "None",
  "未选择": "Not selected",
  "未标注版本": "Version not specified",
  "请检查文献的期刊名称、期刊简称和 ISSN，或补充目录中的已确认别名。": "Check the item’s journal title, abbreviation and ISSN, or add confirmed aliases to the catalog.",
  "没有符合条件的文献": "No papers match these filters.",
  "当前列表没有期刊论文。请在主窗口选中文献库或集合，再点击刷新。": "No journal articles in the current list. Select a library or collection in Zotero, then refresh.",
  "刊名 / 已确认别名": "Journal title / confirmed alias",
  "ISSN + 刊名 / 已确认别名": "ISSN + journal title / confirmed alias",
  "ISSN 与刊名冲突": "ISSN and journal title conflict",
  "未命名目录": "Untitled catalog",
  "无法读取本地目录：{error}。原文件已保留，请先备份 {path} 后修复。": "Could not read local catalogs: {error}. The original file was preserved. Back up {path} before repairing it.",
  "学院等级 · {name}": "Journal grades · {name}",
  "删除本地目录「{name}」？文献不会被修改。": "Delete the local catalog “{name}”? Papers will remain unchanged.",
  "{count} 本期刊": "{count} journals",
  "来源：{source}": "Source: {source}",
  "读取 {original} 条记录，整理后 {count} 本期刊。下方预览前 20 本；共 {warnings} 条检查提示。": "Read {original} records; {count} journals after normalization. Previewing the first 20; {warnings} validation warnings.",
  "{count} 条检查提示（名称冲突会显示待确认）": "{count} validation warnings (conflicting matches require review)",
  "替换：{name} · {department} · {version}": "Replace: {name} · {department} · {version}",
  "已启用「{name}」。在 Zotero 主列表表头右键勾选“学院等级”即可显示。": "Activated “{name}”. Right-click the Zotero item-list header and enable Institutional grade.",
  "别名：{value}": "Aliases: {value}",
  "备注：{value}": "Notes: {value}",
  "目录：{name} · {version}": "Catalog: {name} · {version}",
  "当前列表 {total} 篇期刊论文 · 已匹配 {matched} 篇 · 筛选结果 {filtered} 篇": "Current list: {total} articles · Matched: {matched} · Filtered: {filtered}",
  "共 {count} 本{more}。": "{count} journals{more}.",
  "，显示前 100 本；请输入关键词缩小范围": "; showing the first 100. Search to narrow the results",
  "目录超过 50,000 行，请拆分后导入。": "The catalog exceeds 50,000 rows. Split it before importing.",
  "CSV 引号格式错误；含逗号的单元格须用双引号包围。": "Invalid CSV quoting. Enclose cells containing commas in double quotes.",
  "CSV 结束引号后出现了多余字符。": "Unexpected characters after a closing CSV quote.",
  "CSV 中有未闭合的双引号。": "Unclosed double quote in CSV.",
  "CSV 至少需要表头和一条期刊记录。": "CSV requires a header and at least one journal record.",
  "CSV 必须包含 title（期刊名称）和 grade（等级）列。": "CSV must contain title and grade columns.",
  "目录必须是 JSON 对象。": "The catalog must be a JSON object.",
  "不支持的 schemaVersion，应为 1。": "Unsupported schemaVersion. Expected 1.",
  "journals 必须包含至少一条期刊记录。": "journals must contain at least one journal record.",
  "目录超过 50,000 条记录。": "The catalog exceeds 50,000 records.",
  "文件过大（最多 10 MB）。": "File too large (10 MB maximum).",
  "JSON 格式错误。请导入纯 JSON 文件，去掉 AI 回答中的说明文字和代码围栏。": "Invalid JSON. Import a plain JSON file without explanatory text or Markdown code fences."
},
  diagnostics: [
  [
    "^CSV 有重复列：(.+)$",
    "Duplicate CSV column: $1"
  ],
  [
    "^CSV 第 (\\d+) 行列数与表头不一致。$",
    "CSV row $1 has a different number of columns than the header."
  ],
  [
    "^同一文件包含多个 (.+)，请将不同学院或版本拆成独立文件。$",
    "Multiple values for $1 in one file. Split departments or versions into separate files."
  ],
  [
    "^第 (\\d+) 条记录格式错误。$",
    "Invalid record $1."
  ],
  [
    "^第 (\\d+) 条的 (.+) 必须是文本或文本数组。$",
    "Record $1: $2 must be text or an array of text."
  ],
  [
    "^第 (\\d+) 条的 (.+) 必须是文本。$",
    "Record $1: $2 must be text."
  ],
  [
    "^第 (\\d+) 条缺少期刊名称或等级；待核实记录请先移出导入文件。$",
    "Record $1 is missing a journal title or grade. Remove unverified records before importing."
  ],
  [
    "^第 (\\d+) 条 ISSN 无效（含校验位）：(.+)$",
    "Record $1 has an invalid ISSN (including check digit): $2"
  ],
  [
    "^第 (\\d+) 条与同名同等级记录合并：(.+)$",
    "Record $1 merged with an entry with the same title and grade: $2"
  ],
  [
    "^(刊名/别名|ISSN) 冲突：(.+)。匹配时将显示待确认。$",
    "Conflicting identifier ($1): $2. Matches will require review."
  ],
  [
    "^(.+) 必须是文本。$",
    "$1 must be text."
  ]
],
  use(locale) { this.locale = /^zh(?:-|$)/i.test(locale || "en") ? "zh-CN" : "en"; return this; },
  t(source, values = {}) {
    const template = this.locale === "en" ? (this.messages[source] || source) : source;
    return template.replace(/\{(\w+)\}/g, (token, key) => Object.hasOwn(values, key) ? String(values[key]) : token);
  },
  diagnostic(text) {
    if (this.locale !== "en") return text;
    if (this.messages[text]) return this.messages[text];
    for (const [pattern, replacement] of this.diagnostics) {
      const regex = new RegExp(pattern);
      if (regex.test(text)) return text.replace(regex, replacement).replace("(刊名/别名)", "(journal title/alias)");
    }
    return text;
  },
  document(doc) {
    doc.documentElement.lang = this.locale;
    const walker = doc.createTreeWalker(doc.documentElement, 4);
    for (let node; (node = walker.nextNode());) {
      if (["script", "style"].includes(node.parentElement?.localName)) continue;
      const source = node.textContent.trim();
      if (this.messages[source]) node.textContent = node.textContent.replace(source, this.t(source));
    }
    for (const element of doc.querySelectorAll("[placeholder], [aria-label]")) {
      for (const attr of ["placeholder", "aria-label"]) if (element.hasAttribute(attr)) element.setAttribute(attr, this.t(element.getAttribute(attr)));
    }
    doc.title = this.t("学院期刊目录 · Your Journal List");
  }
};
if (typeof module !== "undefined") module.exports = JournalListI18n;
