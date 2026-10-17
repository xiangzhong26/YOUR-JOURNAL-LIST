# Publishing, community listing and automatic updates

[中文](PUBLISHING.md) · [User guide](../README.en.md)

## Distribution versus listing

Publishing an XPI on GitHub Releases lets people install and update the plugin. A community marketplace listing helps people discover it; it does not publish your release for you.

As checked on 2026-10-17, [Zotero's official documentation](https://www.zotero.org/support/plugins) says there is no official plugin directory yet and one is planned. Plugins are commonly announced on the [Zotero Forums](https://forums.zotero.org/). There is currently no official store submission or approval flow; Firefox store signing is not required.

## First stable release: v0.1.5

**Current status: v0.1.5 is publicly released; public asset downloads and SHA-256 validation passed.** The steps below document the release process. Do not recreate the existing v0.1.5 tag; use a new version for later releases.

Install `dist/your-journal-list-0.1.5.xpi` locally and check import, the grade column, native menus and filtering. Then, as repository maintainer:

1. Enable repository **Actions**. The release workflow declares `contents: write` and needs permission to create releases.
2. Confirm `package.json` and `addon/manifest.json` both specify `0.1.5`.
3. Validate and push the version tag:

   ```sh
   npm run check
   npm test
   npm run build
   python scripts/verify_release.py
   git push origin master
   git tag v0.1.5
   git push origin v0.1.5
   ```

4. Watch **Actions → Release plugin**. It runs tests, builds assets and creates a **Draft Release**.
5. Edit the draft under **Releases**. Confirm all three assets are present:

   | Asset | Purpose |
   | --- | --- |
   | `your-journal-list-0.1.5.xpi` | Installable plugin |
   | `your-journal-list-0.1.5.xpi.sha256` | Package checksum |
   | `updates.json` | Zotero update manifest |

6. Paste the prepared [bilingual release notes](releases/v0.1.5.md), or describe changes, compatibility, tested environment and limitations. Leave **pre-release unchecked**, set it as the latest stable release, then **Publish release**.
7. **Verify published update feed** checks the public manifest, package identity, compatibility and SHA-256. You can also run:

   ```sh
   python scripts/verify_release.py --live --expect-version 0.1.5
   ```

If Actions cannot create the draft, use **Releases → Draft a new release**, choose tag `v0.1.5`, upload all three locally generated files, and publish it as stable/latest. Source code ZIP is not a substitute for the XPI.

Pushing these source changes does not publish a release. The update URL returning 404 before the first public stable release is expected.

## Later versions

1. Increase both package and manifest versions, for example to `0.1.6`. Update UI resource query versions for source-based testing; the builder also injects the current cache version into packaged XHTML.
2. Run checks, tests, build and asset validation; install and test the XPI.
3. Commit and push, then create/push tag `v0.1.6`. Do not reuse existing tags or replace a version with different content.
4. Review the generated draft and publish as the latest stable release. Always upload the corresponding `updates.json` with the XPI.

## Automatic GitHub updates

Following [Zotero's documented update format](https://www.zotero.org/support/dev/zotero_7_for_developers#updaterdf_updatesjson), the XPI already points to:

```text
https://github.com/xiangzhong26/YOUR-JOURNAL-LIST/releases/latest/download/updates.json
```

The builder generates this manifest with the fixed ID `your-journal-list@xiangzhong26.github.io`, version, tag-specific XPI URL, compatibility range and SHA-256. GitHub's latest path resolves to the latest stable release.

Zotero checks the manifest, discovers a newer compatible version, downloads and verifies its XPI, then installs it. Automatic installation follows Zotero's plugin update settings; users can also check manually in the **Tools → Plugins** gear menu. No additional service or GitHub token is required.

Requirements: public repository and release; higher compatible version; stable release marked latest; matching assets from the same build; network access to GitHub and its download domains. Drafts, pre-releases, source pushes and tags alone do not activate this channel.

**Test scope:** isolated Zotero 10.0.6 successfully discovered, downloaded, hash-checked and installed v0.1.5 over a v0.1.4 test copy, preserving catalogs and replacing warm UI caches. Only the old test copy's update URL was redirected to localhost, with HTTP allowed in the disposable profile. Production packages use HTTPS. The public GitHub chain has now passed `--live --expect-version 0.1.5`. Repeat the public check for each later release.

| Failure | Check |
| --- | --- |
| Manifest 404 | Public stable/latest release exists and includes an asset named `updates.json`. |
| No update found | Higher manifest version, compatible Zotero version, correct latest stable release. |
| Download or checksum failure | Run `--live`; upload XPI and manifest from the same build. |
| GitHub inaccessible | Manually install the downloaded newer XPI; catalogs are preserved. |
| Renaming the repository | Keep the old channel reachable and ship a migration release through it first. Keep the plugin ID stable. |

## Community Zotero Add-on Market listing

[syt2/zotero-addons](https://github.com/syt2/zotero-addons) is a community marketplace whose catalog comes from [zotero-addons-scraper](https://github.com/syt2/zotero-addons-scraper). Its current contribution instructions are:

1. Publish a stable GitHub release first; provide a public repository, clear README, license and screenshots.
2. Fork `syt2/zotero-addons-scraper`.
3. Add **`xiangzhong26@YOUR-JOURNAL-LIST`** inside its `addons/` directory, without a `.json` extension:

   ```json
   {"tags": ["metadata", "interface"]}
   ```

4. Submit a pull request describing the purpose, repository, tested Zotero version and stable release. Listing depends on upstream review and scraping.
5. After merge, check the market displays the expected name, version, description and download.

A ready-to-copy [entry file](marketplace/xiangzhong26@YOUR-JOURNAL-LIST) is included here. Copy it into the **upstream addons/** directory. No application has been submitted automatically and no listing is claimed. Check the upstream contribution instructions again before submitting.

You may also announce the plugin on Zotero Forums with screenshots, download and issue links; this is not official certification.
