// Optional documentation previews: npm install --no-save playwright
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  const page = await browser.newPage({viewport: {width: 1060, height: 720}, deviceScaleFactor: 1});
  const root = path.resolve(__dirname, "..");
  let html = fs.readFileSync(path.join(root,"addon/content/manager.xhtml"),"utf8").replace(/<\?xml[^>]*>/," ").replace(/<script[^>]*><\/script>/g,"").replace(/<link[^>]*>/g,"");
  await page.setContent(html);
  await page.addStyleTag({path:path.join(root,"addon/content/manager.css")});
  await page.addScriptTag({path:path.join(root,"addon/content/i18n.js")});
  const language = process.env.UI_LOCALE || "zh-CN";
  const suffix = language.startsWith("zh") ? "" : "-en";
  await page.evaluate(language => {
    JournalListI18n.use(language);
    const journals = [
      { title:"Quarterly Journal of Economics", aliases:["The Quarterly Journal of Economics", "QJE"], grade:"Top Tier（国际顶级）", subject:"经济学", issn:["0033-5533"] },
      { title:"Management Science", aliases:[], grade:"First Tier（国际一类）", subject:"管理学", issn:[] },
      { title:"R & D Management", aliases:["R&D Management", "RD MANAGEMENT"], grade:"Second Tier II（国际二类Ⅱ）", subject:"管理学", issn:["0033-6807"] }
    ];
    const cat = {id:"demo", name:"示例学院期刊目录", institution:"示例大学", department:"商学院", version:"2024", journals};
    const titles = ["Innovation and firm productivity", "Evidence on organization and incentives", "Research collaboration across industries"];
    const items = journals.map((j,i)=>({ id:i+1, getField:key=>key==="title" ? titles[i] : key==="publicationTitle" ? j.aliases[0]||j.title : "", journal:j }));
    const app = {l10n:JournalListI18n,state:{catalogs:[cat],activeId:"demo"},dialogs:new Set(),activeCatalog:()=>cat,getViewItems:()=>items,itemEligible:()=>true,match:item=>({status:"matched",grade:item.journal.grade,method:"刊名 / 已确认别名",entries:[item.journal]}),activate:async()=>{},readImport:async()=>({catalog:cat,warnings:[],originalCount:3}), chooseFile:async()=>"demo"};
    window.arguments=[app, {ZoteroPane:{selectItem:async()=>{}},focus(){}}];
    if (!language.startsWith("zh")) {
      Object.assign(cat,{name:"Department journal catalog",institution:"Example university",department:"Business school"});
      journals.forEach(j=>{ j.grade=j.grade.split("（")[0]; j.subject=""; });
    }
  }, language);
  await page.addScriptTag({path:path.join(root,"addon/content/dropdown.js")});
  await page.addScriptTag({path:path.join(root,"addon/content/manager.js")});
  await page.evaluate(()=>JournalListUI.init());
  fs.mkdirSync(path.join(root,"docs/images"),{recursive:true});
  await page.screenshot({path:path.join(root,`docs/images/ui-papers${suffix}.png`)});
  await page.emulateMedia({colorScheme:"dark"});
  await page.screenshot({path:path.join(root,`docs/images/ui-papers-dark${suffix}.png`)});
  await page.emulateMedia({colorScheme:"light"});
  await page.evaluate(()=>JournalListUI.showTab("catalogs"));
  await page.screenshot({path:path.join(root,`docs/images/ui-catalogs${suffix}.png`)});
  await page.evaluate(async ()=>{await JournalListUI.previewImport(); JournalListUI.renderButtons();});
  await page.screenshot({path:path.join(root,`docs/images/ui-import${suffix}.png`)});
  await page.setViewportSize({width:680,height:720});
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error("Narrow layout overflows window");
  await browser.close();
})();
