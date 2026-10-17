# 发布、社区市场与自动更新

[English](PUBLISHING.en.md) · [返回使用说明](../README.md)

## 先区分两件事

- **发布安装包**：在本项目 GitHub Releases 提供 XPI，用户即可安装，也能通过 Zotero 更新机制升级。
- **市场收录**：让社区市场展示你的插件，便于发现；收录不负责替你发布安装包。

截至 2026-10-17，[Zotero 官方说明](https://www.zotero.org/support/plugins)表示尚未提供插件目录，官方目录仍在计划中。官方建议在 [Zotero Forums](https://forums.zotero.org/) 介绍和讨论插件。因此目前没有官方商店上传、审核、上架的入口，也无需 Firefox 商店签名。

## 第一次发布 v0.1.5

**当前状态：v0.1.5 已正式公开发布，安装包与更新清单已通过公开下载和 SHA-256 校验。** 下列步骤保留为发布流程参考，请勿重复创建已存在的 v0.1.5 标签；后续版本使用新的版本号。

先在 Zotero 安装本地 `dist/your-journal-list-0.1.5.xpi`，确认导入、等级列、原生下拉和筛选正常。下列操作由仓库维护者执行：

1. 在 GitHub 仓库的 **Actions** 页面确认工作流已启用。仓库需要允许 Actions 创建 Release（本项目工作流已声明 `contents: write`）。
2. 确认 `package.json` 与 `addon/manifest.json` 中的版本一致。本次为 `0.1.5`。
3. 完成验证并推送版本标签：

   ```sh
   npm run check
   npm test
   npm run build
   python scripts/verify_release.py
   git push origin master
   git tag v0.1.5
   git push origin v0.1.5
   ```

4. 打开 **Actions → Release plugin**。工作流测试、构建，然后创建 **Draft Release**；不会直接公开发布。
5. 打开仓库 **Releases**，编辑草稿。Assets 应包含以下 3 个文件：

   | 文件 | 用途 |
   | --- | --- |
   | `your-journal-list-0.1.5.xpi` | 用户安装包 |
   | `your-journal-list-0.1.5.xpi.sha256` | 安装包校验 |
   | `updates.json` | Zotero 更新清单 |

6. 可直接复制 [已准备的中英文发布说明](releases/v0.1.5.md)，也可自行写明功能、兼容范围、已知限制和测试环境。**不要勾选 pre-release**，设为最新正式版本，再点击 **Publish release**。
7. “Verify published update feed”工作流会访问公开下载地址，检查版本、插件 ID、兼容信息和实际 XPI 的 SHA-256。也可在本地运行：

   ```sh
   python scripts/verify_release.py --live --expect-version 0.1.5
   ```

若 Actions 无法创建草稿，也可在 GitHub **Releases → Draft a new release** 手动选择 `v0.1.5` 标签，把本地构建生成的上述 3 个文件一并上传，再发布正式版本。不要上传源码 ZIP 代替 XPI。

**本次代码修改和推送不等于正式发布。** 在第一个正式 Release 发布前，自动更新地址返回 404 是预期状态。

## 以后怎样发布更新

1. 修改代码，同时递增 `package.json` 与 `addon/manifest.json` 的版本，例如 `0.1.6`。同步界面资源 URL 中的版本，便于直接加载源码测试；构建时也会自动写入当前版本的缓存键。
2. 运行检查、单元测试、构建和发布资产校验，安装新 XPI 验证。
3. 提交、推送，再创建并推送新标签 `v0.1.6`。不要覆盖已有版本标签或用同一版本替换不同内容的安装包。
4. 检查自动生成的草稿，发布为最新正式版本。不要只上传 XPI 而忘记 `updates.json`。

## GitHub 自动更新如何工作

按照 [Zotero 官方更新格式](https://www.zotero.org/support/dev/zotero_7_for_developers#updaterdf_updatesjson)，安装包内已配置固定更新清单地址：

```text
https://github.com/xiangzhong26/YOUR-JOURNAL-LIST/releases/latest/download/updates.json
```

构建脚本自动生成清单：使用固定插件 ID `your-journal-list@xiangzhong26.github.io`，写入版本、版本标签下的 XPI 下载地址、Zotero 兼容范围及安装包 SHA-256。GitHub 的 latest 路径会指向最新正式 Release。

流程是：**Zotero 检查更新 → 读取 updates.json → 发现更高兼容版本 → 下载 XPI 并校验 → 安装升级**。自动安装受 Zotero 的插件更新设置控制；用户也可以在 **工具 → 插件** 的齿轮菜单手动检查更新。无需额外后台程序、服务器或 GitHub Token。

正式更新成立的条件：仓库和 Release 公开；新版本比已安装版本高；正式 Release 被设为最新版本；3 个资产完整且相互一致；用户可以访问 GitHub 及其下载域名。Draft、pre-release、只推送代码、只创建标签都不能替代正式 Release。

**验证范围：** 已在隔离 Zotero 10.0.6 中，从 v0.1.4 的测试副本通过本地 HTTP 更新清单完成发现、下载、SHA-256 校验和 v0.1.5 安装，并保留目录、刷新旧缓存。测试副本仅将旧包的更新源改为 localhost，临时配置允许 HTTP；正式安装包仍使用 HTTPS。GitHub 公开链路现已通过 `--live --expect-version 0.1.5` 校验。以后每次发布仍应重新运行线上校验。

### 更新异常排查

| 情况 | 检查 |
| --- | --- |
| 清单地址 404 | 是否已有公开正式 Release，是否上传了名为 `updates.json` 的资产，是否设为 latest。 |
| 显示没有更新 | 清单版本是否更高，Zotero 版本是否在兼容范围内，是否选了最新正式 Release。 |
| 下载或校验失败 | 重新运行 `--live`；XPI 与清单应来自同一次构建。不要混用旧清单。 |
| GitHub 无法访问 | 用户可以手动下载安装 XPI；这同样会保留本地目录。 |
| 更改仓库名或组织 | 保留旧更新地址的可用性，先通过旧通道发布迁移版本；插件 ID 不要修改。 |

## 收录到社区 Zotero Add-on Market

[syt2/zotero-addons](https://github.com/syt2/zotero-addons) 是社区插件市场，其目录来源于 [zotero-addons-scraper](https://github.com/syt2/zotero-addons-scraper)。按该项目当前 README 的贡献说明：

1. 先完成正式 GitHub Release，并让仓库公开；准备清晰的 README、许可证和截图。
2. Fork [syt2/zotero-addons-scraper](https://github.com/syt2/zotero-addons-scraper)。
3. 在它的 `addons/` 目录新增文件 **`xiangzhong26@YOUR-JOURNAL-LIST`**，没有 `.json` 扩展名。内容：

   ```json
   {"tags": ["metadata", "interface"]}
   ```

4. 向该仓库提交 Pull Request，说明插件用途、GitHub 地址、已测 Zotero 版本和正式 Release。等待维护者审核与抓取；收录时间由对方决定。
5. 合并后检查市场是否已展示正确的名称、版本、介绍和下载链接。

本仓库已准备 [可提交的目录文件](marketplace/xiangzhong26@YOUR-JOURNAL-LIST)。它应复制到**对方仓库的 addons/** 下，本项目不会自动提交收录申请，也没有声称已被收录。贡献规则以后可能变化，提交前再核对上游 README。

也可在 Zotero Forums 发布插件介绍，提供功能截图、安装包和问题反馈链接；这有助于用户发现，但不是官方审核认证。
