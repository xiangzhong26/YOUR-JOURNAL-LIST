# 把材料与仓库交给 AI，协助配置 Zotero

[English](AI_SETUP.en.md) · [返回 README](../README.md)

可以把学校材料与本仓库一起交给 Codex、Claude Code 或其他具备文件处理能力的 AI。仓库已经提供代理入口和操作流程，不需要用户自己编写 JSON 或运行校验命令。

这不是让 Zotero 直接读取所有文件。AI 先提取材料，生成经过校验的目录，再通过插件导入。具体能读取哪些格式、能否操作本机 Zotero，取决于你使用的 AI 工具和授权能力。

## 推荐：附上材料，复制完整请求

1. 在 Codex / Claude 中附上学校材料，也可给本地工具提供材料路径。
2. 复制下面的请求；仓库地址已写入，AI 自行读取或下载项目，用户无需先下载。
3. 如不能联网、读取附件或执行命令，AI 应说明具体限制并交付可完成的文件和剩余步骤。

```text
请使用这个开源项目帮我配置 Zotero 的学院期刊目录：
https://github.com/xiangzhong26/YOUR-JOURNAL-LIST

我的学校或学院期刊目录材料已附在这条消息中；如附件不可访问，请告诉我需要提供哪些材料。
请自行访问仓库；有本地命令能力时，将仓库克隆或下载到新的工作目录，不覆盖已有项目，
不要求我预先下载仓库。先阅读 AGENTS.md、CLAUDE.md 和
skills/configure-journal-list/SKILL.md，再按其中指引处理材料。
仓库主页不可访问时，可尝试直接读取：
https://raw.githubusercontent.com/xiangzhong26/YOUR-JOURNAL-LIST/master/skills/configure-journal-list/SKILL.md

识别材料中的学校、学院、政策版本和等级，逐页核对期刊、跨页续行、ISSN、别名与数量。
不同学院或版本分别生成目录；不猜测等级或标识，未确认记录列入来源核对报告。
插件自动忽略刊名大小写，无需机械枚举大小写；缺少符号、缩写及不同名称须核实后作为别名。
生成可导入 JSON 和来源核对报告；有执行能力时运行仓库的共享校验工具。
能操作我本机 Zotero 时，请保留现有目录，完成安装（如需要）、导入、启用和验证。
不能操作时请交付文件及剩余点击步骤，不要声称已经安装或导入。
私有材料和结果放在 .local/ 或私有目录，不要提交或发布到 GitHub。
如无法联网读取指引或读取某种材料，请说明具体限制，再让我补充相应文件。
```

4. AI 应交付一个新的私有文件夹，至少包含：

   | 文件 | 用途 |
   | --- | --- |
   | `journal-list.json` | 导入插件 |
   | `validation-report.json` | 格式、ISSN、冲突、数量及可选别名匹配测试 |
   | `source-audit.md` | AI 对原始材料的逐页/逐组核对、合并和未解决项 |
   | `NEXT-STEPS.md` | 具体安装、导入和验证步骤 |

5. 查看来源报告中的未解决项。AI 如已能操作 Zotero，应报告实际完成了哪些步骤；如果没有本机操作能力，你只需在插件“目录管理 → 导入目录…”中选中生成的 JSON 并确认。插件未安装时，先在“工具 → 插件”中安装 XPI。

**格式通过不等于原始材料提取正确。** 校验工具不会读取原始 PDF，也无法证明 AI 没有漏页、漏刊或误判等级。来源报告是另一项独立交付，缺失时应让 AI 补齐；有影响等级判断的未解决项时，不应宣称目录已完全配置好。

## 只提供 GitHub 链接和附件也可以吗？

这就是默认使用方式：附上学校材料，发送上面带仓库地址的请求。但 AI 必须能访问仓库内容和附件；仅粘贴链接不会保证所有指引自动加载。可以明确要求它先读取 `AGENTS.md`、`CLAUDE.md` 和配置 skill。如果 AI 无法浏览仓库，请同时提供仓库 ZIP；若环境不允许解压或执行，则让它阅读相应指引与中英文目录整理提示词。

网页聊天通常只能生成文件，不能直接安装你电脑里的 Zotero。此时交付 JSON 后手动导入即可，不需要向 AI 提供 Zotero 账号、密码或 GitHub Token。材料上传会经过你所选 AI 服务，请按学校要求选择适合处理这些材料的环境。

## 给开发者：校验工具

Node.js 20+，无额外依赖。从仓库根目录运行：

```sh
node scripts/prepare_catalog.cjs ".local/input/extracted.json" --out ".local/setup/my-catalog" --lang zh-CN
```

输入是 **AI 已整理的 JSON / CSV UTF-8**，不是原始 PDF。`--out` 必须是尚不存在的新文件夹，避免覆盖上次交付。数据先经过插件同一套解析、ISSN 校验、合并与冲突检测，再输出标准 JSON 和报告。

可增加 `--expected-count 100` 检查提取文件的原始记录数；重复 `--probe "期刊或别名"` 检查匹配。期刊是否应该出现必须依据原始材料，不能因名气大就自动补入。`sourceAuditVerified` 固定为 `false`，表示工具没有核对学校原件；这不否定 AI 单独提供的来源报告。遇到格式或数量错误会返回非零退出码，警告保留在报告中，不会被悄悄删除。

`.local/` 已加入 Git 忽略。用户材料如放在其他目录，不会自动受到该忽略规则保护。此流程不修改 Zotero 数据库、不直接改写插件存储文件，也不把个人目录嵌入公开安装包。

## 仓库内的入口

- [AGENTS.md](../AGENTS.md)：Codex 等代理入口。
- [CLAUDE.md](../CLAUDE.md)：Claude Code 入口。
- [配置 skill](../skills/configure-journal-list/SKILL.md)：供代理读取的完整工作流，无需全局安装。
- [中文提示词](../addon/content/ai-prompt.txt) / [English prompt](../addon/content/ai-prompt-en.txt)：材料提取与核对规则。

入口文件的识别方式参考 [Codex AGENTS.md 文档](https://developers.openai.com/codex/guides/agents-md/) 和 [Claude Code CLAUDE.md 文档](https://code.claude.com/docs/en/memory)。其他工具可以显式读取同样的文件，但不保证自动发现。
