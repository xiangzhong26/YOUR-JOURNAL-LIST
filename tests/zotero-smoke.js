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
      check(Zotero.ItemTreeManager.getCustomCellData(item, app.columnKey) === expected, "Column result: " + (journal || "missing metadata") + " → " + expected);
    }
    await win.ZoteroPane.selectItems(items.map(i => i.id));
    await delay(800);
    const dialog = app.openManager(win);
    for (let i = 0; i < 40 && !dialog.JournalListUI?.app; i++) await delay(250);
    const ui = dialog.JournalListUI;
    check(ui?.app && dialog.document.getElementById("catalog").options.length === 1, "Manager XHTML and script loaded");
    check(ui.$("import").getBoundingClientRect().width > 40 && dialog.innerWidth >= 700, "Manager controls have a rendered layout");
    const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
    const picker = new FilePicker();
    picker.init(dialog, "Smoke file picker initialization", picker.modeOpen);
    check(picker.modeOpen === 0, "Native file picker module initializes against manager window");
    ui.captureItems();
    check(ui.rows.length === 8, "Filter captures current Zotero items");
    ui.$("grade").value = "A类"; ui.renderResults();
    check(ui.$("results").children.length === 4, "Grade filter returns four expected matches");
    ui.$("grade").value = ""; ui.$("status").value = "ambiguous"; ui.renderResults();
    check(ui.$("results").children.length === 1, "Conflict filter returns one ambiguous article");
    ui.$("results").querySelectorAll("button")[1].click();
    check(!ui.$("detail").hidden && ui.$("detail").textContent.includes("Example Review One"), "Match explanation shows conflicting records");
    // Exercise preview and commit without automating an operating-system file dialog.
    app.chooseFile = async (_win, save) => save ? __EXPORT_PATH__ : __FIXTURE_PATH__;
    await ui.previewImport();
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
    result.persistence = "Catalog restored after actual add-on disable/enable";
    result.ok = true;
  }
  catch (error) { result.error = error.message + "\n" + error.stack; }
  await IOUtils.writeJSON(__RESULT_PATH__, result);
}
