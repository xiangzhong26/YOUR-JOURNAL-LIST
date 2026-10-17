"""Generate original bilingual SVG operation illustrations, not application screenshots."""
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'docs/images'
OUT.mkdir(parents=True, exist_ok=True)


def rect(x, y, width, height, fill='#ffffff', stroke='#d9e3dc', radius=14):
    return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>'


def text(x, y, label, size=19, fill='#213b35', weight=400):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}">{escape(label)}</text>'


def button(x, y, width, label):
    return rect(x, y, width, 44, '#226b54', '#226b54', 7) + text(x + 14, y + 29, label, 17, '#ffffff', 600)


def badge(x, y, number):
    return f'<circle cx="{x}" cy="{y}" r="17" fill="#dbeee1"/>' + text(x - 5, y + 6, str(number), 17, '#226b54', 700)


def save(name, title, subtitle, body):
    content = ('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640" viewBox="0 0 1200 640">'
               '<g font-family="Microsoft YaHei, Noto Sans CJK SC, Arial, sans-serif">'
               + rect(0, 0, 1200, 640, '#f3f6f2', '#f3f6f2', 0)
               + text(38, 39, 'YOUR JOURNAL LIST  /  操作示意 · ILLUSTRATED GUIDE', 15, '#226b54', 700)
               + text(38, 87, title, 30, weight=700) + text(38, 119, subtitle, 18, '#63736c')
               + body + text(38, 608, '示意图，非软件截图 / Illustration, not a screenshot. UI positions may vary by Zotero version.', 14, '#63736c')
               + '</g></svg>')
    (OUT / name).write_text(content + '\n', encoding='utf-8')


def generate():
    b = ''
    for x, number, title, en in [(38, 1, '下载插件', 'Download the XPI'), (432, 2, '从文件安装', 'Install from a file'), (826, 3, '打开插件', 'Open the manager')]:
        b += rect(x, 162, 338, 370) + badge(x+29, 192, number) + text(x+56, 199, title, 22, weight=700) + text(x+22, 231, en, 17, '#63736c')
    b += text(60, 282, 'GitHub → Releases', 20) + rect(60, 305, 294, 102, '#eaf3ed')
    b += text(76, 340, 'your-journal-list-', 20, weight=600) + text(76, 371, '0.1.0.xpi', 22, '#226b54', 700)
    b += text(60, 449, '选择 .xpi 附件', 19) + text(60, 481, 'Choose the .xpi asset', 17, '#63736c')
    b += text(454, 282, '工具 / Tools → 插件 / Plugins', 17)
    b += rect(454, 305, 294, 102, '#eaf3ed') + text(470, 341, '齿轮 / Gear →', 20) + text(470, 375, 'Install Plugin From File…', 18)
    b += text(454, 449, '选择下载好的 .xpi', 19) + text(454, 481, 'Select your downloaded XPI', 17, '#63736c')
    b += text(848, 282, '文献列表工具栏 / Item toolbar', 17) + button(848, 320, 292, '学院等级 · 导入目录')
    b += text(848, 409, '也可从“工具”菜单打开', 18) + text(848, 441, 'Or use the Tools menu:', 17, '#63736c') + text(848, 475, '学院期刊目录 / Your Journal List', 16)
    save('01-install.svg', '安装并找到入口 / Install & open', '从 Releases 下载 .xpi，安装后打开“学院等级”。 / Download, install, then open the plugin.', b)

    b = ''
    for x, num, title, en in [(38, 1, '提供官方目录', 'Supply the official list'), (432, 2, '复制整理提示词', 'Use a preparation prompt'), (826, 3, '核对后保存', 'Review and save')]:
        b += rect(x, 162, 338, 370) + badge(x+29, 192, num) + text(x+56, 199, title, 21, weight=700) + text(x+22, 231, en, 17, '#63736c')
    b += rect(64, 273, 286, 121, '#eaf3ed') + text(82, 309, '学院官方 PDF / Word / Excel', 17) + text(82, 343, '或图片、目录文本', 19) + text(82, 376, 'Official source documents', 16, '#63736c')
    b += text(60, 441, '上传给你使用的 AI', 19) + text(60, 476, 'Attach to your AI conversation', 16, '#63736c')
    b += button(454, 278, 294, '复制 AI 整理提示词') + button(454, 339, 294, 'Copy English prompt')
    b += text(454, 441, '发送提示词与目录材料', 19) + text(454, 476, 'Send the prompt with your files', 16, '#63736c')
    b += rect(848, 273, 294, 121, '#eaf3ed') + text(866, 309, 'journal-list.json', 23, '#226b54', 700) + text(866, 343, 'UTF-8 · 纯 JSON / Raw JSON', 17) + text(866, 376, '无说明文字 / No commentary', 16, '#63736c')
    b += text(848, 441, '核对等级、别名与总数', 19) + text(848, 476, 'Check grades, aliases & counts', 16, '#63736c')
    save('02-prepare.svg', '把学院目录变成导入文件 / Prepare your catalog', 'AI 负责整理；期刊等级以官方材料为准。 / AI organizes the data; grades come from the official list.', b)

    b = rect(38, 155, 720, 406) + text(62, 191, '学院目录 / Catalog manager', 23, weight=700) + button(505, 166, 230, '导入 JSON / CSV')
    b += text(62, 235, '确认导入 / Import preview', 21, weight=600) + rect(62, 252, 672, 60, '#eaf3ed') + text(78, 289, '演示管理学院 · 2026-demo · 4 records', 19)
    b += text(78, 342, '标准刊名 / Journal', 17, '#63736c') + text(553, 342, '等级 / Grade', 17, '#63736c')
    b += text(78, 380, 'R&D Management', 21) + text(553, 380, 'A类', 21, '#226b54', 700)
    b += text(78, 414, '别名 / Alias: RD Management', 18, '#63736c')
    b += rect(62, 435, 672, 40, '#fff3dc', '#ead8aa', 6) + text(76, 462, 'Shared Review → 名称冲突 / Conflicting alias', 18, '#805c1a')
    b += button(62, 494, 220, '确认并启用 / Enable')
    b += rect(786, 155, 376, 406) + badge(817, 191, 1) + text(844, 198, '选择 JSON 或 CSV', 20, weight=600) + text(808, 232, 'Choose your catalog file', 18, '#63736c')
    b += badge(817, 280, 2) + text(844, 287, '检查元数据与冲突', 20, weight=600) + text(808, 321, 'Review metadata and warnings', 17, '#63736c')
    b += badge(817, 369, 3) + text(844, 376, '新增或替换后启用', 20, weight=600) + text(808, 410, 'Add or replace, then enable', 17, '#63736c')
    b += text(808, 464, '示例等级为虚构。', 17) + text(808, 493, 'Demo grades are fictional.', 17, '#63736c')
    save('03-import.svg', '预览、检查、启用 / Preview, review & enable', '未确认的多义名称显示“待确认”。 / Ambiguous names are flagged for review.', b)

    b = rect(38, 156, 544, 398) + text(60, 190, 'Zotero 文献列表 / Item list', 22, weight=700)
    b += text(60, 228, '表头右键 → 勾选“学院等级”', 19) + text(60, 258, 'Right-click header → enable 学院等级', 16, '#63736c')
    b += rect(60, 279, 500, 42, '#eaf3ed', radius=4) + text(75, 307, '期刊 / Journal', 18) + text(438, 307, '学院等级', 18, '#226b54', 700)
    for y, title, grade in [(359, 'R&D Management', 'A类'), (403, 'RD MANAGEMENT', 'A类'), (447, 'R & D Management', 'A类'), (491, 'Shared Review', '待确认')]:
        b += text(75, y, title, 20) + text(438, y, grade, 19, '#226b54')
    b += rect(610, 156, 552, 398) + text(632, 190, '插件筛选窗口 / Plugin filter', 22, weight=700)
    b += button(632, 211, 268, '刷新当前列表 / Refresh') + text(632, 293, '等级 / Grade: A类', 20, weight=600)
    b += rect(632, 314, 507, 92, '#eaf3ed') + text(650, 351, 'DEMO 1, 2, 3, 8 → 4 篇 / 4 articles', 19) + text(650, 384, '筛选主窗口当前列表 / Current view only', 17, '#63736c')
    b += button(632, 430, 160, '依据 / Details') + button(810, 430, 160, '定位 / Locate')
    b += text(632, 508, '切换集合或搜索后重新刷新。', 19) + text(632, 535, 'Refresh after switching collections or searches.', 16, '#63736c')
    save('04-filter.svg', '显示等级并筛选 / Display grades & filter', '左侧为主列表列；右侧为插件独立筛选窗口。 / Main-list column + separate plugin filter.', b)

    b = ''
    for x, num, title, en in [(38, 1, '切换学院或版本', 'Switch catalogs'), (432, 2, '导出并分享', 'Export and share'), (826, 3, '更新目录', 'Update a catalog')]:
        b += rect(x, 162, 338, 370) + badge(x+29, 192, num) + text(x+56, 199, title, 21, weight=700) + text(x+22, 231, en, 17, '#63736c')
    b += rect(60, 278, 294, 103, '#eaf3ed') + text(76, 314, '管理学院 · 2026版', 20, '#226b54', 600) + text(76, 350, '经济学院 · 2025版', 20)
    b += text(60, 430, '从“当前使用的目录”选择', 17) + text(60, 464, 'Choose the active catalog', 17, '#63736c')
    b += button(454, 278, 294, '导出 / Export') + text(454, 365, 'journal-list.json', 23, '#226b54', 700)
    b += text(454, 430, '另一台电脑或同学手动导入', 17) + text(454, 464, 'Import on another computer', 17, '#63736c')
    b += text(848, 291, '新增 / Add', 22, weight=600) + text(848, 328, '保留旧版本 / Keep old edition', 16, '#63736c') + text(848, 389, '替换 / Replace', 22, weight=600) + text(848, 426, '先导出备份 / Export a backup first', 16, '#63736c')
    b += text(848, 482, '目录不随 Zotero 自动同步', 17)
    save('05-share.svg', '多目录管理 / Manage, share & update', '学院目录版本与插件版本相互独立。 / Catalog editions and plugin versions are separate.', b)
    print(f'Generated 5 SVG illustrations in {OUT}')


if __name__ == '__main__':
    generate()
