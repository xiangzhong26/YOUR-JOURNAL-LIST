# 测试后发布到 GitHub

仓库远端已配置为 `https://github.com/xiangzhong26/YOUR-JOURNAL-LIST`。本次开发只准备本地代码、安装包和工作流，不会自动推送或公开发布。

## 首次开源

1. 完成 [人工验收](TESTING.md)，尤其是安装、重启、原生文件选择器和导出。
2. 查看将提交的文件，不要提交真实学院内部目录、Zotero 数据库或账号凭据。
3. 在项目目录运行：

```powershell
git add .
git commit -m "Add institutional journal list plugin"
git push -u origin HEAD
```

4. 在 GitHub 仓库 Settings → General → Danger Zone → Change repository visibility 将仓库设置为 Public（如果目前是 Private）。若原本 Public 无需修改。
5. 查看 Actions 的 `Check and package` 是否通过；每次提交会检查代码、运行单元测试并上传安装包附件。

## 发布第一个版本

首版版本号为 `0.1.2`。本地确认构建与测试：

```powershell
npm run check
npm test
npm run build
git tag v0.1.2
git push origin v0.1.2
```

推送标签后，`Release plugin` 工作流会再次检查并创建 **Draft Release（发布草稿）**，自动附加 `.xpi`、`.sha256` 和 `updates.json` 文件。

进入 GitHub → Releases → 编辑草稿：

- 标题：`Your Journal List v0.1.2`。
- 说明已实现的功能、实际测试的 Zotero/系统版本、安装方法和已知限制。
- 建议首版勾选 **Set as a pre-release**，让少量同学先试用。
- 检查附件完整，然后点击 **Publish release** 正式公开。

用户应下载 `.xpi`，不用下载 Source code ZIP。若 Actions 没权限创建 Release，在仓库 Settings → Actions 检查权限；也可在 Releases 页面手动创建标签对应发布并上传本地 dist 文件。

## 之后更新

1. 同时更新 `package.json`、`addon/manifest.json` 版本，如 `0.1.3`，并填写 CHANGELOG。
2. 完成测试，提交并推送代码。
3. 创建并推送同名版本标签 `v0.1.3`。已发布标签不要覆盖；修复问题使用新版本号。
4. 检查新的发布草稿、上传产物和兼容范围后公开。

GitHub 工作流能检查纯逻辑和打包，不能替代 Zotero 真机验收。manifest 允许安装的范围不代表每个平台都实测。

本版配置了 GitHub Releases 的 `releases/latest/download/updates.json` 更新地址，构建时自动写入版本、安装包下载地址和 SHA-256。正式发布时必须保留这三个附件；后续安装包可以通过 Zotero 插件更新机制获取。尚未发布或仓库为私有时，该公开地址不可用；GitHub 的 latest 不包含预发布版本，因此预发布请手动安装。插件 ID 应保持不变，目录数据不会因重新安装而主动删除。更新机制尚需在实际发布两个正式版本后验证。
