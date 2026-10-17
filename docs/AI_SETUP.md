# 把材料与仓库交给 AI，协助配置 Zotero

[English](AI_SETUP.en.md) · [返回 README](../README.md)

可以把学校材料与本仓库一起交给 Codex、Claude Code 或其他具备文件处理能力的 AI。仓库已经提供代理入口和操作流程，不需要用户自己编写 JSON 或运行校验命令。

这不是让 Zotero 直接读取所有文件。AI 先提取材料，生成经过校验的目录，再通过插件导入。具体能读取哪些格式、能否操作本机 Zotero，取决于你使用的 AI 工具和授权能力。

## 推荐：本地 Codex / Claude Code

1. 下载或克隆 [本仓库](https://github.com/xiangzhong26/YOUR-JOURNAL-LIST)，在 AI 工具中打开解压后的项目文件夹。
2. 将学校材料放在项目的 `.local/input/`，或告诉 AI 材料在本机的准确路径。PDF、Word、Excel、图片、CSV、文本均可作为候选输入；扫描件需要 AI 环境具备图片识别/OCR能力。不要把学校材料提交到公开仓库。
3. 把下面这段话发送给 AI（将材料路径和学院改成自己的；未确定的信息可让 AI 从材料中识别）：

   ```text
   请根据本仓库的 AGENTS.md（Claude 也请阅读 CLAUDE.md）和
   skills/configure-journal-list/SKILL.md，帮我配置 Your Journal List。
   我的学校期刊目录材料在：<文件或文件夹路径>。
   请识别材料中的学校、学院、政策版本和等级，逐页核对期刊、续行、ISSN、别名与数量，
   生成可导入目录和来源核对报告，并运行仓库提供的校验工具。
   多个学院或版本请分别处理。不能辨认或无法确认的内容请列入报告，不要猜测。
   如果你能操作本机 Zotero，请在保留现有目录的前提下完成安装（如需要）、导入、启用和验证。
   如果不能操作 Zotero，请把生成文件交付给我，并明确告诉我剩余点击步骤。
   请将私有材料和生成结果放在 .local/ 下，不要提交或发布到 GitHub。
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

可以尝试：提供仓库链接、上传学校材料，再发送上面的请求。但 AI 必须能访问仓库内容和附件；仅粘贴链接不会保证所有指引自动加载。可以明确要求它先读取 `AGENTS.md`、`CLAUDE.md` 和配置 skill。如果 AI 无法浏览仓库，请同时提供仓库 ZIP；若环境不允许解压或执行，则让它阅读相应指引与中英文目录整理提示词。

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
