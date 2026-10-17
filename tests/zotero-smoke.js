/* Runs only as a separate test extension in a disposable profile. */
var testTask;
function install() {}
function uninstall() {}
function shutdown() {}
function startup() { testTask = runSmoke(); }
async function runSmoke() {
  const result = { ok: false, checks: [], version: "", error: "" };
  const delay = ms => new Promise(resolve => {
    const timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback(() => resolve(), ms, Ci.nsITimer.TYPE_ONE_SHOT);
  });
  const check = (value, label) => { if (!value) throw new Error(label); result.checks.push(label); };
  try {
    await Zotero.initializationPromise;
    result.version = Zotero.version;
    let app, win;
    for (let i = 0; i < 120; i++) {
      app = Zotero.YourJournalList;
      win = Zotero.getMainWindow();
      if (app?.columnKey && win?.ZoteroPane?.itemsView) break;
      await delay(500);
    }
    check(app?.columnKey, "Plugin startup and custom column registration");
    const chinesePrompt = await app.readPrompt();
    const englishPrompt = await app.readPrompt("en");
    check(typeof chinesePrompt === "string" && chinesePrompt.startsWith("请根据") && chinesePrompt.includes('"schemaVersion": 1'), "Chinese prompt loads as UTF-8 text from installed XPI");
    check(typeof englishPrompt === "string" && englishPrompt.startsWith("Using the school") && englishPrompt.includes('"schemaVersion": 1'), "English prompt loads as text from installed XPI");
    check(win?.ZoteroPane?.itemsView, "Main library window available");
    app.attachWindow(win);
    check(win.document.getElementById("your-journal-list-button"), "Toolbar entry attached");
    const { catalog, warnings } = await app.readImport(__FIXTURE_PATH__);
    check(catalog.journals.length === 4 && warnings.length > 0, "JSON import validates conflicting aliases");
    await app.importCatalog(catalog);
    check(app.activeCatalog()?.journals.length === 4, "Catalog activates after atomic local write");
    const saved = await IOUtils.readJSON(app.path);
    check(saved.catalogs.length === 1, "Catalog persisted in isolated data directory");
    const cases = [
      ["R&D Management", "", "A类"], ["RD MANAGEMENT", "", "A类"],
      ["R & D Management", "", "A类"], ["J. Example Stud.", "", "B类"],
      ["Shared Review", "", "待确认"], ["Unknown Journal", "", "目录未收录"],
      ["", "", "信息不足"], ["Different supplied title", "0033-6807", "A类"]
    ];
    const items = [];
    for (const [journal, issn, expected] of cases) {
      const item = new Zotero.Item("journalArticle");
      item.libraryID = Zotero.Libraries.userLibraryID;
      item.setField("title", "Smoke: " + (journal || "Missing journal"));
      item.setField("publicationTitle", journal);
      item.setField("ISSN", issn);
      await item.saveTx();
      items.push(item);
      check(Zotero.ItemTreeManager.getCustomCellData(item, app.columnKey) === app.t(expected), "Column result: " + (journal || "missing metadata") + " → " + expected);
    }
    await win.ZoteroPane.selectItems(items.map(i => i.id));
    await delay(800);
    const dialog = app.openManager(win);
    for (let i = 0; i < 40 && !dialog.JournalListUI?.app; i++) await delay(250);
    const ui = dialog.JournalListUI;
    result.locale = app.l10n.locale;
    check(ui?.app && dialog.document.getElementById("catalog").options.length === 1, "Manager XHTML and script loaded");
    if (app.l10n.locale === "en") {
      check(ui.$("refresh").textContent === "Refresh current list" && dialog.document.documentElement.lang.startsWith("en"), "English labels and document language follow Zotero locale: " + ui.$("refresh").textContent + " lang=" + dialog.document.documentElement.lang);
      check(ui.$("query").placeholder === "Paper title, journal or catalog alias", "English search placeholder");
      check(ui.$("status").options[2].textContent === "Needs review", "English match-status menu labels");
      check(win.document.getElementById("your-journal-list-button").getAttribute("label").startsWith("Journal grades"), "Toolbar localized in English");
    }
    check(ui.$("refresh").getBoundingClientRect().width > 40 && dialog.innerWidth >= 700, "Manager controls have a rendered layout");
    const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
    const picker = new FilePicker();
    picker.init(dialog, "Smoke file picker initialization", picker.modeOpen);
    check(picker.modeOpen === 0, "Native file picker module initializes against manager window");
    ui.captureItems();
    check(ui.rows.length === 8, "Filter captures current Zotero items");
    const gradeDropdown = ui.dropdowns.get("grade"), statusDropdown = ui.dropdowns.get("status");
    check(gradeDropdown.control.localName === "menulist" && gradeDropdown.popup.localName === "menupopup", "Uses Zotero native dropdown widgets");
    check(ui.$("grade").hidden && gradeDropdown.control.getBoundingClientRect().height >= 25, "Hidden data select replaced by a rendered native control");
    const before = ui.$("counts").getBoundingClientRect().top;
    gradeDropdown.open(); await delay(300);
    check(gradeDropdown.popup.state === "open", "Native grade popup opens outside document layout");
    check(ui.$("counts").getBoundingClientRect().top === before, "Opening popup does not push content down");
    gradeDropdown.close();
    for (let i = 0; i < 3; i++) { gradeDropdown.open(); await delay(50); gradeDropdown.close(); }
    check(gradeDropdown.popup.children.length === ui.$("grade").options.length, "Repeated opening never duplicates options");
    const gradeIndex = [...ui.$("grade").options].findIndex(o => o.value === "A类");
    gradeDropdown.popup.children[gradeIndex].doCommand();
    check(ui.$("grade").value === "A类" && ui.$("results").children.length === 4, "Native grade command applies filter");
    ui.$("grade").value = ""; gradeDropdown.sync(); ui.renderResults();
    const statusIndex = [...ui.$("status").options].findIndex(o => o.value === "ambiguous");
    statusDropdown.popup.children[statusIndex].doCommand();
    check(ui.$("status").value === "ambiguous" && ui.$("results").children.length === 1, "Native status command applies filter");
    ui.showTab("catalogs");
    check(ui.$("panel-papers").hidden && !ui.$("panel-catalogs").hidden, "Tabs separate literature and catalog tasks");
    ui.showTab("help"); check(!ui.$("panel-help").hidden, "Help tab opens"); ui.showTab("papers");
    check(dialog.document.querySelector("link").href.includes("v=" + __TARGET_VERSION__) && dialog.location.search.includes("v=" + __TARGET_VERSION__), "Dialog and stylesheet use versioned cache keys");
    check(dialog.getComputedStyle(dialog.document.querySelector("h1")).fontSize === "18px", "Current compact stylesheet loaded in Zotero");
    ui.$("status").value = ""; statusDropdown.sync(); ui.renderResults();
    ui.$("grade").value = "A类"; ui.renderResults();
    check(ui.$("results").children.length === 4, "Grade filter returns four expected matches");
    ui.$("grade").value = ""; ui.$("status").value = "ambiguous"; ui.renderResults();
    check(ui.$("results").children.length === 1, "Conflict filter returns one ambiguous article");
    ui.$("results").querySelectorAll("button")[1].click();
    check(!ui.$("detail").hidden && ui.$("detail").textContent.includes("Example Review One"), "Match explanation shows conflicting records");
    // Exercise preview and commit without automating an operating-system file dialog.
    app.chooseFile = async (_win, save) => save ? __EXPORT_PATH__ : __FIXTURE_PATH__;
    await ui.previewImport();
    if (app.l10n.locale === "en") {
      check(ui.$("warnings").textContent.includes("Conflicting identifier") && !ui.$("warnings").textContent.includes("冲突"), "Import conflict warnings translated while catalog values are retained");
      check(ui.$("import-summary").textContent.startsWith("Read "), "Import counts use English text");
    }
    check(!ui.$("preview").hidden && ui.$("preview-rows").children.length === 4, "Import preview renders records and warnings");
    ui.$("import-name").value = "Second test catalog";
    await ui.confirmImport();
    check(app.state.catalogs.length === 2 && app.activeCatalog().name === "Second test catalog", "Preview confirmation imports a second catalog");
    await app.exportCatalog(dialog);
    const exported = await app.readImport(__EXPORT_PATH__);
    check(exported.catalog.name === "Second test catalog" && exported.catalog.journals.length === 4, "Exported catalog imports again without losing records");
    const csv = await app.readImport(__CSV_PATH__);
    check(csv.catalog.journals.length === 2, "CSV file imports through Zotero file IO");
    const firstID = app.state.catalogs[0].id;
    await app.activate(firstID);
    check(app.state.activeId === firstID, "Catalog switching updates active selection");
    await app.importCatalog({ ...catalog, name: "Updated catalog" }, firstID);
    check(app.state.catalogs.length === 2 && app.activeCatalog().name === "Updated catalog", "Replacement preserves catalog identity and count");
    await app.remove(firstID);
    check(app.state.catalogs.length === 1 && app.index, "Deleting active catalog falls back to remaining catalog");
    const key = app.columnKey;
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    const addon = await AddonManager.getAddonByID(app.pluginID);
    await addon.disable();
    check(!win.document.getElementById("your-journal-list-button") && !Zotero.ItemTreeManager.isCustomColumn(key), "Disable cleanup removes toolbar, dialogs and column");
    await addon.enable();
    for (let i = 0; i < 40; i++) {
      app = Zotero.YourJournalList;
      if (app?.columnKey && app.activeCatalog()) break;
      await delay(100);
    }
    check(app?.activeCatalog()?.name === "Second test catalog" && app.columnKey, "Re-enable reloads persisted catalog and registers column");
    check(Zotero.ItemTreeManager.getCustomCellData(items[0], app.columnKey) === "A类", "Grade works after re-enable");
    // Synthetic records reproduce annotated titles and repeated subject entries without publishing user data.
    await app.importCatalog({ name: "Annotated title regression", journals: [
      { title: "Strategic Management Journal (UT-Dallas 24)", grade: "Tier 1" },
      { title: "Organization Science (UT-Dallas 24) (FT 50)", grade: "Tier 1" },
      { title: "R & D Management", grade: "Tier 3", subject: "Strategy", issn: ["0033-6807"] },
      { title: "R & D Management", grade: "Tier 3", subject: "Operations", issn: ["0033-6807"] },
      { title: "Management Science", grade: "Tier 1" },
      { title: "Quarterly Journal of Economics", grade: "Top Tier", issn: ["0033-5533"] }
    ] });
    for (const [title, grade] of [["Strategic Management Journal", "Tier 1"], ["Organization Science", "Tier 1"], ["R&D Management", "Tier 3"], ["Management Science", "Tier 1"]]) {
      const article = new Zotero.Item("journalArticle");
      article.setField("publicationTitle", title);
      check(Zotero.ItemTreeManager.getCustomCellData(article, app.columnKey) === grade, "Annotated/multi-subject column regression: " + title);
      if (title === "R&D Management") check(app.match(article).entries.length === 2, "Multi-subject matching preserves both evidence records");
    }
    const qje = new Zotero.Item("journalArticle"); qje.setField("publicationTitle", "The Quarterly Journal of Economics");
    check(Zotero.ItemTreeManager.getCustomCellData(qje, app.columnKey) === "Top Tier", "QJE with leading The matches the catalog without ISSN");
    result.persistence = "Catalog restored after actual add-on disable/enable";
    if (__OLD_PACKAGE__) {
      const oldFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile); oldFile.initWithPath(__OLD_PACKAGE__);
      const oldInstall = await AddonManager.getInstallForFile(oldFile); await oldInstall.install();
      for (let i = 0; i < 80 && !Zotero.YourJournalList?.columnKey; i++) await delay(100);
      let oldApp = Zotero.YourJournalList;
      const oldDialog = oldApp.openManager(win);
      for (let i = 0; i < 40 && !oldDialog.JournalListUI?.app; i++) await delay(100);
      check(oldDialog.JournalListUI?.app, "Old version loaded with its UI and caches before upgrade");
      const installedOld = await AddonManager.getAddonByID(oldApp.pluginID);
      check(installedOld.version === "0.1.4", "Upgrade begins from installed v0.1.4");
      const available = await new Promise((resolve, reject) => {
        let found;
        installedOld.findUpdates({ onUpdateAvailable(_addon, install) { found = install; }, onUpdateFinished(_addon, error) { if (error || !found) reject(new Error("No update discovered: " + error + " URL=" + installedOld.updateURL)); else resolve(found); } }, AddonManager.UPDATE_WHEN_USER_REQUESTED);
      });
      check(available.version === __TARGET_VERSION__, "Zotero discovers newer version through JSON update feed");
      await available.install();
      for (let i = 0; i < 80 && Zotero.YourJournalList?.version !== __TARGET_VERSION__; i++) await delay(100);
      app = Zotero.YourJournalList;
      check(app.version === __TARGET_VERSION__ && app.activeCatalog()?.name === "Annotated title regression", "Update downloads and installs XPI while preserving catalogs");
      check(oldDialog.closed, "Upgrade closes the old UI");
      const upgradedDialog = app.openManager(win);
      for (let i = 0; i < 40 && !upgradedDialog.JournalListUI?.app; i++) await delay(100);
      const upgradedUI = upgradedDialog.JournalListUI;
      check(upgradedUI?.dropdowns.get("grade").control?.localName === "menulist", "Warm upgrade replaces cached custom menu with native control");
      check(upgradedDialog.getComputedStyle(upgradedDialog.document.querySelector("h1")).fontSize === "18px", "Warm upgrade loads new stylesheet without clearing caches");
      if (app.l10n.locale === "en") check(upgradedUI.$("refresh").textContent === "Refresh current list", "Upgrade loads English interface over the Chinese-only previous version");
      result.update = "v0.1.4 to current version through local HTTP feed with SHA-256; GitHub production feed requires a published stable release";
    }
    if (__CAPTURE_PATH__) {
      for (const window of app.dialogs) if (!window.closed) window.close();
      const {catalog: display} = await app.readImport(__DISPLAY_CATALOG__);
      await app.importCatalog(display);
      const collection = new Zotero.Collection();
      collection.name = app.l10n.locale === "en" ? "Journal grade demonstration" : "期刊等级演示";
      await collection.saveTx();
      const demoCases = [
        ["The Quarterly Journal of Economics", "Economic evidence and institutions"],
        ["QUARTERLY JOURNAL OF ECONOMICS", "Economic evidence and institutions (uppercase journal)"],
        ["Management Science", "Organization and decision making"],
        ["MANAGEMENT SCIENCE", "Organization and decision making (uppercase journal)"],
        ["R&D Management", "Collaboration in research and development"],
        ["RD MANAGEMENT", "Collaboration in research and development (alias)"]
      ];
      for (const [journal,title] of demoCases) {
        const article = new Zotero.Item("journalArticle");
        article.setField("title", title); article.setField("publicationTitle",journal);
        article.setField("date", "2024");
        article.setCreators([{firstName:"Alex",lastName:"Chen",creatorType:"author"}]);
        article.setCollections([collection.id]); await article.saveTx();
      }
      win.resizeTo(1500, 850);
      await win.ZoteroPane.collectionsView.selectCollection(collection.id);
      await delay(800);
      const view = win.ZoteroPane.itemsView;
      for (const key of ["publicationTitle",app.columnKey]) {
        const columns = view._getColumns();
        const columnIndex = columns.findIndex(c=>c.dataKey===key);
        if (columnIndex >= 0 && columns[columnIndex].hidden) view.tree._columns.toggleHidden(columnIndex);
      }
      const columnPrefs = view._getColumnPrefs();
      for (const [key,width] of [["title",310],["firstCreator",75],["publicationTitle",340],[app.columnKey,140]]) columnPrefs[key] = {...columnPrefs[key],width,flex:0};
      view._storeColumnPrefs(columnPrefs);
      await view._resetColumns();
      await delay(500);
      check(view._getColumns().some(c=>c.dataKey===app.columnKey && !c.hidden), "Grade column enabled in actual Zotero library");
      const bounds = new win.DOMRect(0,0,win.innerWidth,Math.min(390,win.innerHeight));
      const bitmap = await win.browsingContext.currentWindowGlobal.drawSnapshot(bounds,1,"white");
      const canvas = win.document.createElementNS("http://www.w3.org/1999/xhtml","canvas");
      canvas.width=bitmap.width; canvas.height=bitmap.height;
      canvas.getContext("2d").drawImage(bitmap,0,0); bitmap.close();
      const blob = await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
      await IOUtils.write(__CAPTURE_PATH__,new Uint8Array(await blob.arrayBuffer()));
      check(true,"Actual Zotero library document captured with synthetic data");
    }
    result.ok = true;
  }
  catch (error) { result.error = error.message + "\n" + error.stack; }
  await IOUtils.writeJSON(__RESULT_PATH__, result);
}
