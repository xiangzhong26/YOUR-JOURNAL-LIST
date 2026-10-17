/* Pure matching/import logic. Shared by Zotero and Node's test runner. */
(function (root) {
  "use strict";
  const MAX_ROWS = 50000;
  const MAX_BYTES = 10 * 1024 * 1024;
  const text = value => String(value ?? "").trim();
  const split = value => Array.isArray(value)
    ? value.map(text).filter(Boolean)
    : text(value).split(/[;；|\r\n]+/u).map(text).filter(Boolean);
  const unique = values => [...new Set(values)];

  function normalizeName(value) {
    return text(value).normalize("NFKC").toLowerCase()
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u2010-\u2015]/g, "-")
      .replace(/\s*&\s*/g, "&").replace(/\s+/gu, " ");
  }

  function normalizeISSN(value) {
    const compact = text(value).replace(/[-\s]/g, "").toUpperCase();
    if (!/^\d{7}[\dX]$/.test(compact)) return "";
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += (compact[i] === "X" ? 10 : Number(compact[i])) * (8 - i);
    return sum % 11 === 0 ? compact.slice(0, 4) + "-" + compact.slice(4) : "";
  }

  // Quoted RFC 4180 fields, BOM and CRLF are supported. Fail closed on broken quotes.
  function parseCSV(input) {
    input = input.replace(/^\uFEFF/, "");
    const rows = [];
    let row = [], field = "", quoted = false, closed = false;
    const pushField = () => { row.push(field); field = ""; closed = false; };
    const pushRow = () => {
      pushField();
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      if (rows.length > MAX_ROWS + 1) throw new Error("目录超过 50,000 行，请拆分后导入。");
    };
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (quoted) {
        if (ch === '"') {
          if (input[i + 1] === '"') { field += '"'; i++; }
          else { quoted = false; closed = true; }
        }
        else field += ch;
      }
      else if (ch === ',') pushField();
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && input[i + 1] === '\n') i++;
        pushRow();
      }
      else if (ch === '"') {
        if (field || closed) throw new Error("CSV 引号格式错误；含逗号的单元格须用双引号包围。");
        quoted = true;
      }
      else if (closed) {
        if (!/\s/.test(ch)) throw new Error("CSV 结束引号后出现了多余字符。");
      }
      else field += ch;
    }
    if (quoted) throw new Error("CSV 中有未闭合的双引号。");
    if (field || row.length || closed) pushRow();
    return rows;
  }

  const HEADERS = {
    title: ["title", "journal", "期刊名称", "标准期刊名", "标准期刊名称"],
    aliases: ["aliases", "别名", "名称别名"],
    issn: ["issn"], eissn: ["eissn", "e-issn"],
    grade: ["grade", "等级", "学院等级", "本校等级"],
    subject: ["subject", "学科"], notes: ["notes", "备注"],
    institution: ["institution", "学校", "学校名称"],
    department: ["department", "学院", "学院名称"],
    version: ["version", "版本", "目录版本"],
    source: ["source", "来源", "官方来源"]
  };

  function fromCSV(input) {
    const table = parseCSV(input);
    if (table.length < 2) throw new Error("CSV 至少需要表头和一条期刊记录。");
    const headers = table.shift().map(h => text(h).toLowerCase());
    const positions = {};
    for (const [key, names] of Object.entries(HEADERS)) {
      const hits = headers.flatMap((h, i) => names.includes(h) ? [i] : []);
      if (hits.length > 1) throw new Error(`CSV 有重复列：${key}`);
      positions[key] = hits[0] ?? -1;
    }
    if (positions.title < 0 || positions.grade < 0) throw new Error("CSV 必须包含 title（期刊名称）和 grade（等级）列。");
    const rows = table.map((cells, index) => {
      if (cells.length !== headers.length) throw new Error(`CSV 第 ${index + 2} 行列数与表头不一致。`);
      return Object.fromEntries(Object.entries(positions).map(([k, p]) => [k, p < 0 ? "" : cells[p]]));
    });
    const meta = {};
    for (const key of ["institution", "department", "version", "source"]) {
      const values = unique(rows.map(r => text(r[key])).filter(Boolean));
      if (values.length > 1) throw new Error(`同一文件包含多个 ${key}，请将不同学院或版本拆成独立文件。`);
      meta[key] = values[0] || "";
    }
    return { ...meta, schemaVersion: 1, journals: rows };
  }

  function validateCatalog(raw, fallbackName = "未命名目录") {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("目录必须是 JSON 对象。");
    for (const key of ["name", "institution", "department", "version", "source"]) {
      if (raw[key] != null && typeof raw[key] !== "string") throw new Error(`${key} 必须是文本。`);
    }
    if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1) throw new Error("不支持的 schemaVersion，应为 1。");
    if (!Array.isArray(raw.journals) || !raw.journals.length) throw new Error("journals 必须包含至少一条期刊记录。");
    if (raw.journals.length > MAX_ROWS) throw new Error("目录超过 50,000 条记录。");
    const warnings = [];
    const journals = [], merged = new Map();
    raw.journals.forEach((r, i) => {
      if (!r || typeof r !== "object") throw new Error(`第 ${i + 1} 条记录格式错误。`);
      for (const key of ["title", "grade", "subject", "notes"]) {
        if (r[key] != null && typeof r[key] !== "string") throw new Error(`第 ${i + 1} 条的 ${key} 必须是文本。`);
      }
      for (const key of ["aliases", "issn", "eissn"]) {
        if (r[key] != null && typeof r[key] !== "string"
          && !(Array.isArray(r[key]) && r[key].every(v => typeof v === "string"))) {
          throw new Error(`第 ${i + 1} 条的 ${key} 必须是文本或文本数组。`);
        }
      }
      const title = text(r.title), grade = text(r.grade);
      if (!title || !grade) throw new Error(`第 ${i + 1} 条缺少期刊名称或等级；待核实记录请先移出导入文件。`);
      const identifiers = unique([...split(r.issn), ...split(r.eissn)]);
      const issn = identifiers.map(v => {
        const normalized = normalizeISSN(v);
        if (!normalized) throw new Error(`第 ${i + 1} 条 ISSN 无效（含校验位）：${v}`);
        return normalized;
      });
      const entry = {
        title, grade, aliases: unique(split(r.aliases)), issn: unique(issn),
        subject: text(r.subject), notes: text(r.notes)
      };
      // Only combine identical canonical titles, grades and subjects. Cross-title merging needs human review.
      const mergeKey = JSON.stringify([normalizeName(title), grade, entry.subject]);
      const existing = merged.get(mergeKey);
      if (existing) {
        existing.aliases = unique([...existing.aliases, title, ...entry.aliases]);
        existing.issn = unique([...existing.issn, ...entry.issn]);
        existing.notes = unique([existing.notes, entry.notes].filter(Boolean)).join("；");
        warnings.push(`第 ${i + 1} 条与同名同等级记录合并：${title}`);
      }
      else { merged.set(mergeKey, entry); journals.push(entry); }
    });
    const catalog = {
      schemaVersion: 1,
      name: text(raw.name) || text(fallbackName), institution: text(raw.institution),
      department: text(raw.department), version: text(raw.version),
      source: text(raw.source), journals
    };
    const index = buildIndex(catalog);
    for (const [kind, map] of [["刊名/别名", index.names], ["ISSN", index.issns]]) {
      for (const [key, entries] of map) {
        if (entries.size > 1) warnings.push(`${kind} 冲突：${key} → ${[...entries].map(e => `${e.title} (${e.grade}${e.subject ? " / " + e.subject : ""})`).join("；")}。匹配时将显示待确认。`);
      }
    }
    return { catalog, warnings, originalCount: raw.journals.length };
  }

  function parseCatalog(input, filename = "目录.json") {
    if (typeof input !== "string" || input.length > MAX_BYTES) throw new Error("文件过大（最多 10 MB）。");
    const clean = input.replace(/^\uFEFF/, "").trim();
    let raw;
    if (/\.csv$/i.test(filename)) raw = fromCSV(clean);
    else {
      try { raw = JSON.parse(clean); }
      catch { throw new Error("JSON 格式错误。请导入纯 JSON 文件，去掉 AI 回答中的说明文字和代码围栏。"); }
    }
    return validateCatalog(raw, filename.replace(/\.(json|csv)$/i, ""));
  }

  function buildIndex(catalog) {
    const names = new Map(), issns = new Map();
    const add = (map, key, entry) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(entry);
    };
    for (const entry of catalog?.journals || []) {
      for (const name of [entry.title, ...entry.aliases]) add(names, normalizeName(name), entry);
      for (const id of entry.issn) add(issns, normalizeISSN(id), entry);
    }
    return { names, issns };
  }

  function matchJournal(index, item) {
    if (!index) return { status: "no-catalog", grade: "", entries: [] };
    const idCandidates = new Set(), nameCandidates = new Set();
    const ids = split(item.issn).map(normalizeISSN).filter(Boolean);
    for (const id of ids) for (const e of index.issns.get(id) || []) idCandidates.add(e);
    for (const name of [item.title, item.abbreviation]) {
      for (const e of index.names.get(normalizeName(name)) || []) nameCandidates.add(e);
    }
    let candidates, method;
    if (idCandidates.size) {
      // A unique ISSN may disambiguate a shared alias, but conflicting explicit names fail closed.
      if (idCandidates.size === 1 && nameCandidates.size && !nameCandidates.has([...idCandidates][0])) {
        return { status: "ambiguous", grade: "", method: "ISSN 与刊名冲突", entries: unique([...idCandidates, ...nameCandidates]) };
      }
      candidates = idCandidates; method = "ISSN";
    }
    else { candidates = nameCandidates; method = "刊名 / 已确认别名"; }
    if (candidates.size > 1) return { status: "ambiguous", grade: "", method, entries: [...candidates] };
    if (candidates.size === 1) return { status: "matched", grade: [...candidates][0].grade, method, entries: [...candidates] };
    const hasMetadata = ids.length || text(item.title) || text(item.abbreviation);
    return { status: hasMetadata ? "unlisted" : "missing", grade: "", entries: [] };
  }

  const STATUS_LABELS = { "no-catalog": "未选择目录", ambiguous: "待确认", unlisted: "目录未收录", missing: "信息不足" };
  function displayMatch(result) { return result.status === "matched" ? result.grade : STATUS_LABELS[result.status] || ""; }

  const api = { normalizeName, normalizeISSN, parseCSV, parseCatalog, validateCatalog, buildIndex, matchJournal, displayMatch, MAX_BYTES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JournalListCore = api;
})(this);
