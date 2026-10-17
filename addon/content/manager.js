/* global window, document */
"use strict";
var JournalListUI = {
  rows: [], page: 0, pageSize: 60, pending: null, busy: false,
  $(id) { return document.getElementById(id); },
  async init() {
    [this.app, this.mainWindow] = window.arguments;
    window.resizeTo(1060, 760);
    for (const button of document.querySelectorAll("[data-tab]")) button.addEventListener("click", () => this.showTab(button.dataset.tab));
    this.dropdowns = new Map([...document.querySelectorAll("select")].map(select => [select.id, new JournalListDropdown(select)]));
    const actions = {
      import: () => this.previewImport(), "confirm-import": () => this.confirmImport(),
      "cancel-import": () => { this.pending = null; this.$("preview").hidden = true; this.$("catalog-browser").hidden = false; },
      export: async () => { if (await this.app.exportCatalog(window)) this.message("目录已导出，可分享给同学院的人。"); },
      delete: async () => {
        const cat = this.app.activeCatalog();
        if (cat && window.confirm(`删除本地目录「${cat.name}」？文献不会被修改。`)) await this.app.remove(cat.id);
      },
      refresh: () => this.captureItems(),
      previous: () => { this.page--; this.renderResults(); },
      next: () => { this.page++; this.renderResults(); },
      "copy-prompt": async () => {
        await this.app.copyPrompt();
        this.message("AI 整理提示词已复制。请同时向 AI 提供学院官方目录。");
      },
      "copy-prompt-en": async () => {
        await this.app.copyPrompt("en");
        this.message("English prompt copied. Provide your department's official journal list with it.");
      }
    };
    for (const [id, action] of Object.entries(actions)) this.$(id).addEventListener("click", () => this.run(action));
    this.$("catalog").addEventListener("change", () => this.run(() => this.app.activate(this.$("catalog").value)));
    for (const id of ["query", "grade", "status"]) this.$(id).addEventListener(id === "query" ? "input" : "change", () => {
      this.page = 0; this.renderResults();
    });
    this.$("journal-query").addEventListener("input", () => this.renderJournals());
    window.addEventListener("unload", () => {
      this.app.dialogs.delete(window);
      for (const dropdown of this.dropdowns.values()) dropdown.destroy();
    }, { once: true });
    this.renderCatalogs();
    this.showTab(this.app.activeCatalog() ? "papers" : "catalogs");
    this.captureItems();
    if (this.app.loadError) this.message(this.app.loadError, true);
  },
  showTab(name) {
    for (const tab of ["papers", "catalogs", "help"]) this.$("panel-" + tab).hidden = tab !== name;
    for (const button of document.querySelectorAll("[data-tab]")) button.setAttribute("aria-selected", String(button.dataset.tab === name));
  },
  async run(action) {
    if (this.busy) return;
    this.busy = true;
    for (const id of ["import", "confirm-import", "export", "delete", "catalog"]) this.$(id).disabled = true;
    this.message("");
    try { await action(); }
    catch (error) { this.message(error.message || String(error), true); }
    finally { this.busy = false; this.renderButtons(); }
  },
  message(text, error = false) { this.$("message").textContent = text; this.$("message").className = error ? "error" : ""; },
  renderButtons() {
    const noCatalog = !this.app.activeCatalog();
    for (const id of ["export", "delete"]) this.$(id).disabled = this.busy || noCatalog;
    this.$("import").disabled = this.busy || !!this.app.loadError;
    this.$("confirm-import").disabled = this.busy || !this.pending;
    this.$("catalog").disabled = this.busy || noCatalog;
    this.syncDropdowns();
  },
  syncDropdowns() { for (const dropdown of this.dropdowns?.values() || []) dropdown.sync(); },
  option(select, value, label) {
    const option = document.createElement("option"); option.value = value; option.textContent = label; select.appendChild(option);
  },
  renderCatalogs() {
    const select = this.$("catalog"); select.replaceChildren();
    for (const cat of this.app.state.catalogs) this.option(select, cat.id, [cat.name, cat.department, cat.version].filter(Boolean).join(" · "));
    if (!this.app.state.catalogs.length) this.option(select, "", "尚未导入目录");
    select.value = this.app.state.activeId;
    const cat = this.app.activeCatalog();
    this.$("metadata").textContent = cat ? [cat.institution, cat.department, cat.version, `${cat.journals.length} 本期刊`, cat.source && `来源：${cat.source}`].filter(Boolean).join(" · ") : "导入学院目录后即可显示等级。支持纯 JSON 和 CSV UTF-8 文件。";
    const grade = this.$("grade"), previousGrade = grade.value;
    grade.replaceChildren(); this.option(grade, "", "全部等级");
    for (const value of [...new Set(cat?.journals.map(j => j.grade) || [])].sort()) this.option(grade, value, value);
    grade.value = [...grade.options].some(o => o.value === previousGrade) ? previousGrade : "";
    this.renderButtons(); this.renderJournals();
  },
  async previewImport() {
    const path = await this.app.chooseFile(window);
    if (!path) return;
    this.pending = await this.app.readImport(path);
    const { catalog, warnings, originalCount } = this.pending;
    for (const key of ["name", "institution", "department", "version"]) this.$("import-" + key).value = catalog[key];
    this.$("import-summary").textContent = `读取 ${originalCount} 条记录，整理后 ${catalog.journals.length} 本期刊。下方预览前 20 本；共 ${warnings.length} 条检查提示。`;
    this.$("warning-details").hidden = !warnings.length;
    this.$("warning-title").textContent = `${warnings.length} 条检查提示（名称冲突会显示待确认）`;
    const list = this.$("warnings"); list.replaceChildren();
    for (const warning of warnings) { const li = document.createElement("li"); li.textContent = warning; list.appendChild(li); }
    this.drawJournalRows(this.$("preview-rows"), catalog.journals.slice(0, 20));
    const mode = this.$("import-mode"); mode.replaceChildren();
    this.option(mode, "", "新增一份目录（保留现有目录）");
    for (const cat of this.app.state.catalogs) this.option(mode, cat.id, `替换：${cat.name} · ${cat.department} · ${cat.version}`);
    this.syncDropdowns();
    this.showTab("catalogs");
    this.$("catalog-browser").hidden = true;
    this.$("preview").hidden = false;
    this.$("preview").scrollIntoView({ behavior: "smooth", block: "start" });
  },
  async confirmImport() {
    if (!this.pending) return;
    const cat = { ...this.pending.catalog };
    for (const key of ["name", "institution", "department", "version"]) cat[key] = this.$("import-" + key).value.trim();
    if (!cat.name) throw new Error("请填写目录名称。");
    const replaceId = this.$("import-mode").value;
    if (replaceId && !window.confirm("确定替换所选目录？建议先取消并导出旧目录留存。")) return;
    await this.app.importCatalog(cat, replaceId);
    this.pending = null; this.$("preview").hidden = true; this.$("catalog-browser").hidden = false;
    this.message(`已启用「${cat.name}」。在 Zotero 主列表表头右键勾选“学院等级”即可显示。`);
  },
  captureItems() {
    this.snapshot = this.app.getViewItems(this.mainWindow);
    this.page = 0; this.recompute();
  },
  recompute() {
    this.rows = (this.snapshot || []).filter(i => this.app.itemEligible(i)).map(item => ({
      item, result: this.app.match(item), title: item.getField("title"), journal: item.getField("publicationTitle")
    }));
    this.renderResults();
  },
  onChange(kind) {
    if (kind === "catalogs") this.renderCatalogs();
    this.recompute();
    if (kind === "items") this.$("counts").textContent += " · 文献有变动，可刷新当前列表。";
  },
  resultLabel(result) { return result.status === "matched" ? result.grade : ({ ambiguous: "待确认", missing: "信息不足", unlisted: "目录未收录", "no-catalog": "未选择目录" }[result.status] || ""); },
  cells(body, values) {
    const tr = document.createElement("tr");
    for (const value of values) { const td = document.createElement("td"); td.textContent = value; tr.appendChild(td); }
    body.appendChild(tr); return tr;
  },
  renderResults() {
    const query = this.$("query").value.trim().toLocaleLowerCase(), grade = this.$("grade").value, status = this.$("status").value;
    const filtered = this.rows.filter(row => {
      const names = row.result.entries.flatMap(e => [e.title, ...e.aliases]).join(" ");
      return (!grade || (row.result.status === "matched" && row.result.grade === grade))
        && (!status || row.result.status === status)
        && (!query || `${row.title} ${row.journal} ${names}`.toLocaleLowerCase().includes(query));
    });
    const pages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    const body = this.$("results"); body.replaceChildren(); this.$("detail").hidden = true;
    for (const row of filtered.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize)) {
      const tr = this.cells(body, [row.title || "（无标题）", row.journal || "（缺少刊名）", this.resultLabel(row.result), row.result.method || "—", ""]);
      const cell = tr.lastChild;
      const locate = document.createElement("button"); locate.textContent = "定位";
      locate.addEventListener("click", () => this.run(async () => {
        await this.mainWindow.ZoteroPane.selectItem(row.item.id);
        this.mainWindow.focus();
      })); cell.appendChild(locate);
      const explain = document.createElement("button"); explain.textContent = "依据";
      explain.addEventListener("click", () => {
        this.$("detail").hidden = false;
        this.$("detail").textContent = `${row.journal || "缺少刊名"} → ${this.resultLabel(row.result)}\n`
          + (row.result.entries.map(e => `${e.title} · ${e.grade}${e.subject ? " · " + e.subject : ""}\n别名：${e.aliases.join("；") || "无"}\nISSN：${e.issn.join("；") || "无"}\n备注：${e.notes || "无"}`).join("\n\n") || "请检查文献的期刊名称、期刊简称和 ISSN，或补充目录中的已确认别名。")
          + `\n目录：${this.app.activeCatalog()?.name || "未选择"} · ${this.app.activeCatalog()?.version || "未标注版本"}`;
      }); cell.appendChild(explain);
    }
    if (!filtered.length) this.cells(body, [this.rows.length ? "没有符合条件的文献" : "当前列表没有期刊论文。请在主窗口选中文献库或集合，再点击刷新。", "", "", "", ""]);
    const matched = this.rows.filter(r => r.result.status === "matched").length;
    this.$("counts").textContent = `当前列表 ${this.rows.length} 篇期刊论文 · 已匹配 ${matched} 篇 · 筛选结果 ${filtered.length} 篇`;
    this.$("page").textContent = `${this.page + 1} / ${pages}`;
    this.$("previous").disabled = this.page === 0; this.$("next").disabled = this.page >= pages - 1;
  },
  drawJournalRows(body, journals) {
    body.replaceChildren();
    for (const j of journals) this.cells(body, [j.title, j.aliases.join("；"), [j.grade, j.subject].filter(Boolean).join(" / "), j.issn.join("；")]);
  },
  renderJournals() {
    const cat = this.app.activeCatalog(), query = this.$("journal-query").value.trim().toLocaleLowerCase();
    const journals = (cat?.journals || []).filter(j => `${j.title} ${j.aliases.join(" ")} ${j.grade} ${j.subject} ${j.issn.join(" ")}`.toLocaleLowerCase().includes(query));
    this.drawJournalRows(this.$("journals"), journals.slice(0, 100));
    this.$("journal-count").textContent = `共 ${journals.length} 本${journals.length > 100 ? "，显示前 100 本；请输入关键词缩小范围" : ""}。`;
  }
};
window.addEventListener("DOMContentLoaded", () => JournalListUI.init().catch(error => JournalListUI.message(error.message, true)), { once: true });
