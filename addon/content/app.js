/* global Zotero, Services, ChromeUtils, IOUtils, PathUtils, JournalListCore */
var JournalListApp = {
  state: { schemaVersion: 1, activeId: "", catalogs: [] },
  index: null,
  windows: new Map(),
  dialogs: new Set(),
  writeQueue: Promise.resolve(),
  loadError: "",

  async start(pluginID) {
    this.pluginID = pluginID;
    this.path = PathUtils.join(Zotero.DataDirectory.dir, "your-journal-list", "catalogs.json");
    if (await IOUtils.exists(this.path)) {
      try {
        const saved = await IOUtils.readJSON(this.path);
        if (saved.schemaVersion !== 1 || !Array.isArray(saved.catalogs)) throw new Error("目录存储格式无效");
        const ids = new Set();
        for (const cat of saved.catalogs) {
          if (typeof cat.id !== "string" || !cat.id || ids.has(cat.id)) throw new Error("目录 ID 无效或重复");
          ids.add(cat.id);
          JournalListCore.validateCatalog(cat);
        }
        this.state = saved;
        if (!ids.has(saved.activeId)) this.state.activeId = saved.catalogs[0]?.id || "";
      }
      catch (error) {
        this.loadError = `无法读取本地目录：${error.message}。原文件已保留，请先备份 ${this.path} 后修复。`;
        Zotero.logError(error);
      }
    }
    this.reindex();
    this.columnKey = await Zotero.ItemTreeManager.registerColumn({
      dataKey: "institutionGrade", label: "学院等级", pluginID,
      enabledTreeIDs: ["*"], width: "125", flex: 0,
      dataProvider: item => this.itemEligible(item) ? JournalListCore.displayMatch(this.match(item)) : ""
    });
    if (!this.columnKey) throw new Error("无法注册学院等级列");
    this.notifier = Zotero.Notifier.registerObserver({
      notify: () => this.broadcast("items")
    }, ["item"], "your-journal-list");
  },

  activeCatalog() { return this.state.catalogs.find(c => c.id === this.state.activeId); },
  reindex() { this.index = this.activeCatalog() ? JournalListCore.buildIndex(this.activeCatalog()) : null; },
  itemEligible(item) { return item?.isRegularItem?.() && item.itemType === "journalArticle" && !item.deleted; },
  match(item) {
    return JournalListCore.matchJournal(this.index, {
      title: item.getField("publicationTitle"), abbreviation: item.getField("journalAbbreviation"), issn: item.getField("ISSN")
    });
  },
  async mutate(change) {
    // Serialize copy-on-write updates; failed writes leave both memory and the original file intact.
    const task = this.writeQueue.catch(() => {}).then(async () => {
      if (this.loadError) throw new Error(this.loadError);
      const next = JSON.parse(JSON.stringify(this.state));
      change(next);
      await IOUtils.makeDirectory(PathUtils.parent(this.path), { ignoreExisting: true });
      await IOUtils.writeJSON(this.path, next, { tmpPath: this.path + ".tmp" });
      this.state = next;
      this.reindex();
      Zotero.ItemTreeManager.refreshColumns();
      this.broadcast("catalogs");
    });
    this.writeQueue = task;
    return task;
  },
  async importCatalog(catalog, replaceId = "") {
    return this.mutate(next => {
      const validated = JournalListCore.validateCatalog(catalog).catalog;
      const id = replaceId || Services.uuid.generateUUID().toString().slice(1, -1);
      const record = { ...validated, id, importedAt: new Date().toISOString() };
      if (replaceId) {
        const pos = next.catalogs.findIndex(c => c.id === replaceId);
        if (pos < 0) throw new Error("要替换的目录不存在，请重新选择。");
        next.catalogs[pos] = record;
      }
      else next.catalogs.push(record);
      next.activeId = id;
    });
  },
  async activate(id) {
    return this.mutate(next => {
      if (!next.catalogs.some(c => c.id === id)) throw new Error("目录不存在。");
      next.activeId = id;
    });
  },
  async remove(id) {
    return this.mutate(next => {
      next.catalogs = next.catalogs.filter(c => c.id !== id);
      if (next.activeId === id) next.activeId = next.catalogs[0]?.id || "";
    });
  },
  broadcast(kind) {
    for (const dialog of [...this.dialogs]) {
      if (dialog.closed) this.dialogs.delete(dialog);
      else dialog.JournalListUI?.onChange(kind);
    }
    for (const [win, nodes] of this.windows) {
      const cat = this.activeCatalog();
      nodes.button?.setAttribute("label", cat ? `学院等级 · ${cat.name}` : "学院等级 · 导入目录");
      nodes.button?.setAttribute("tooltiptext", cat ? `${cat.institution} ${cat.department} ${cat.version}` : "导入自己的学院期刊目录");
    }
  },
  attachWindow(win) {
    if (this.windows.has(win)) return;
    const doc = win.document;
    const nodes = {};
    // Zotero 8+ uses its official menu API; Zotero 7 keeps an explicitly cleaned-up menu element.
    if (!this.menuID && Zotero.MenuManager) {
      this.menuID = Zotero.MenuManager.registerMenu({
        menuID: "your-journal-list-manager", pluginID: this.pluginID, target: "main/menubar/tools",
        menus: [{ menuType: "menuitem", onShowing: (_event, context) => {
          // setAttribute is needed for the XUL menu label on Zotero 7/8/10.
          context.menuElem?.setAttribute("label", "学院期刊目录 / Your Journal List");
        }, onCommand: () => this.openManager(Zotero.getMainWindow()) }]
      });
    }
    // A toolbar button is also available regardless of menu API differences.
    const toolbar = doc.getElementById("zotero-items-toolbar");
    if (toolbar) {
      const button = doc.createXULElement("toolbarbutton");
      button.id = "your-journal-list-button";
      button.setAttribute("label", "学院等级 · 导入目录");
      button.setAttribute("style", "padding: 3px 8px; margin-inline: 4px;");
      button.addEventListener("command", () => this.openManager(win));
      toolbar.appendChild(button);
      nodes.button = button;
    }
    if (!Zotero.MenuManager) {
      const menu = doc.getElementById("menu_ToolsPopup");
      if (menu) {
        const entry = doc.createXULElement("menuitem");
        entry.id = "your-journal-list-menu";
        entry.setAttribute("label", "学院期刊目录 / Your Journal List");
        entry.addEventListener("command", () => this.openManager(win));
        menu.appendChild(entry);
        nodes.menu = entry;
      }
    }
    this.windows.set(win, nodes);
    this.broadcast("catalogs");
  },
  detachWindow(win) {
    const nodes = this.windows.get(win);
    if (nodes) for (const node of Object.values(nodes)) node?.remove();
    for (const dialog of [...this.dialogs]) {
      if (dialog.closed || dialog.opener === win) { if (!dialog.closed) dialog.close(); this.dialogs.delete(dialog); }
    }
    this.windows.delete(win);
  },
  openManager(win) {
    const existing = [...this.dialogs].find(d => !d.closed && d.opener === win);
    if (existing) { existing.focus(); return existing; }
    const dialog = win.openDialog("chrome://yourjournallist/content/manager.xhtml", "", "chrome,centerscreen,resizable,dialog=no", this, win);
    this.dialogs.add(dialog);
    return dialog;
  },
  getViewItems(win) {
    return (win.ZoteroPane?.getSortedItems() || []).filter(item => this.itemEligible(item));
  },
  async chooseFile(win, save = false) {
    const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
    const picker = new FilePicker();
    picker.init(win, save ? "导出期刊目录" : "选择期刊目录（JSON / CSV）", save ? picker.modeSave : picker.modeOpen);
    picker.appendFilter(save ? "JSON" : "JSON / CSV", save ? "*.json" : "*.json; *.csv");
    if (save) { picker.defaultString = "journal-list.json"; picker.defaultExtension = "json"; }
    const result = await picker.show();
    return [picker.returnOK, picker.returnReplace].includes(result) ? picker.file : null;
  },
  async readImport(path) {
    const info = await IOUtils.stat(path);
    if (info.size > JournalListCore.MAX_BYTES) throw new Error("文件超过 10 MB，请拆分后导入。");
    return JournalListCore.parseCatalog(await IOUtils.readUTF8(path), PathUtils.filename(path));
  },
  async exportCatalog(win) {
    const catalog = this.activeCatalog();
    if (!catalog) throw new Error("请先选择目录。");
    const path = await this.chooseFile(win, true);
    if (!path) return false;
    const { id, importedAt, ...exported } = catalog;
    await IOUtils.writeJSON(path, exported, { tmpPath: path + ".tmp" });
    return true;
  },
  async readPrompt(language = "zh-CN") {
    const filename = language === "en" ? "ai-prompt-en.txt" : "ai-prompt.txt";
    const response = await Zotero.HTTP.request("GET", `chrome://yourjournallist/content/${filename}`, { responseType: "text" });
    const prompt = response.responseText;
    if (typeof prompt !== "string" || !prompt.trim()) throw new Error("提示词文件未返回有效文本，请重新安装插件后再试。");
    return prompt;
  },
  async copyPrompt(language = "zh-CN") {
    const prompt = await this.readPrompt(language);
    Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper).copyString(prompt);
  },
  async stop() {
    await this.writeQueue.catch(() => {});
    if (this.notifier) Zotero.Notifier.unregisterObserver(this.notifier);
    for (const dialog of this.dialogs) if (!dialog.closed) dialog.close();
    this.dialogs.clear();
    for (const win of [...this.windows.keys()]) this.detachWindow(win);
    if (this.menuID) Zotero.MenuManager.unregisterMenu(this.menuID);
    if (this.columnKey) await Zotero.ItemTreeManager.unregisterColumn(this.columnKey);
  }
};
