/* global Zotero, Services, ChromeUtils, Cc, Ci, APP_SHUTDOWN */
var chromeHandle, journalScope;

async function startup({ id, rootURI }) {
  await Zotero.initializationPromise;
  if (typeof IOUtils === "undefined") Cu.importGlobalProperties(["IOUtils"]);
  if (typeof PathUtils === "undefined") Cu.importGlobalProperties(["PathUtils"]);
  const aom = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
  chromeHandle = aom.registerChrome(Services.io.newURI(rootURI + "manifest.json"), [
    ["content", "yourjournallist", "content/"]
  ]);
  journalScope = { Zotero, Services, ChromeUtils, IOUtils, PathUtils, Cc, Ci };
  Services.scriptloader.loadSubScript(rootURI + "content/core.js", journalScope, "UTF-8");
  Services.scriptloader.loadSubScript(rootURI + "content/app.js", journalScope, "UTF-8");
  Zotero.YourJournalList = journalScope.JournalListApp;
  await Zotero.YourJournalList.start(id);
  for (const win of Zotero.getMainWindows()) Zotero.YourJournalList.attachWindow(win);
}

function onMainWindowLoad({ window }) { journalScope?.JournalListApp?.attachWindow(window); }
function onMainWindowUnload({ window }) { journalScope?.JournalListApp?.detachWindow(window); }
async function shutdown(_data, reason) {
  if (reason === APP_SHUTDOWN) return;
  await journalScope?.JournalListApp?.stop();
  delete Zotero.YourJournalList;
  chromeHandle?.destruct();
  chromeHandle = null;
  journalScope = null;
}
function install() {}
function uninstall() {}
