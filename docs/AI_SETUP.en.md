# Give your materials and this repository to an AI

[中文](AI_SETUP.md) · [README](../README.en.md)

Codex, Claude Code and other file-capable agents can follow this repository's setup instructions to prepare your institutional journal catalog. Users do not need to write JSON or run validation commands themselves.

The AI extracts the source material, validates an import file, then helps configure the plugin. Supported source formats and access to your desktop Zotero depend on the agent's tools and permissions; this is not a universal document importer built into Zotero.

## Recommended: attach materials and copy the request

1. Attach official materials in Codex / Claude, or give a local agent their paths.
2. Copy the request below. The repository URL is included; the agent fetches the project itself.
3. If network, attachment or execution access is unavailable, the agent should explain the limitation and deliver the available files and remaining steps.

```text
Use this open-source project to configure institutional journal grades in my Zotero:
https://github.com/xiangzhong26/YOUR-JOURNAL-LIST

My official school/department materials are attached. If inaccessible, tell me what sources you need.
Access the repository yourself. With local command tools, clone/download it into a new working
folder without overwriting existing projects; do not require me to download it first.
Read AGENTS.md, CLAUDE.md and skills/configure-journal-list/SKILL.md, then follow the workflow.
If the repository page is inaccessible, try the direct instruction file:
https://raw.githubusercontent.com/xiangzhong26/YOUR-JOURNAL-LIST/master/skills/configure-journal-list/SKILL.md

Identify the institution, department, policy version and grades from the sources.
Reconcile every page/group, continued titles, ISSNs, aliases and counts. Keep departments and
versions separate. Do not guess grades or identifiers; report unresolved entries in the source audit.
The plugin ignores case; do not enumerate every capitalization variant. Missing symbols,
abbreviations and alternative names require verified explicit aliases.
Deliver importable JSON and a source-audit report; run the shared validator when execution is available.
If you can interact with my local Zotero, install if needed, import and activate a new catalog
without replacing existing catalogs, and verify it. Otherwise deliver files and remaining clicks;
do not claim installation/import you did not perform.
Keep private materials/results under .local/ or a private folder. Do not commit or publish them.
If repository access or a source format is unsupported, explain the specific limitation and ask
only for the files needed to proceed.
```

4. Expect a new private delivery folder containing:

   | File | Purpose |
   | --- | --- |
   | `journal-list.json` | Plugin import file |
   | `validation-report.json` | Format, ISSNs, conflicts, counts and optional matching probes |
   | `source-audit.md` | AI's page/group reconciliation, merges and unresolved records |
   | `NEXT-STEPS.md` | Installation, import and verification instructions |

5. Review unresolved issues. An agent with desktop tools should report what it actually completed. Otherwise import the JSON under **Catalogs → Import catalog** and confirm. If the plugin is not installed, install its XPI in **Tools → Plugins** first.

**Passing format validation does not prove correct extraction.** The validator does not read the original PDF or establish that the AI interpreted every grade correctly. The source audit is a separate required delivery. Resolve policy context affecting grades before calling the setup complete.

## Repository link plus attachments

This is the default workflow: attach your documents and send the request above containing the repository URL. It must be able to access both. A pasted URL does not guarantee automatic loading of all instructions: explicitly ask it to read AGENTS.md, CLAUDE.md and the setup skill. If it cannot browse, supply a repository ZIP. In restricted environments, provide the relevant instructions and preparation prompt directly.

Web-only chat usually cannot install software in your desktop Zotero. It can deliver JSON for manual import instead. No Zotero credentials or GitHub token are needed. Uploaded materials are handled by your chosen AI provider; choose an environment appropriate for the materials.

## Shared validator for agents and developers

Requires Node.js 20+, no dependencies. From the repository root:

```sh
node scripts/prepare_catalog.cjs ".local/input/extracted.json" --out ".local/setup/my-catalog" --lang en
```

Input is **already extracted JSON / CSV UTF-8**, not the original PDF. The output folder must not exist, protecting previous deliveries. The tool uses the same parsing, ISSN checks, normalization, merging and conflict detection as the plugin.

Use `--expected-count 100` to check the extracted file's raw record count; repeat `--probe "Journal or alias"` to inspect matching. Source membership must come from the institution's material, not reputation. `sourceAuditVerified` is always `false`: the tool itself did not audit original documents; the AI's separate source audit remains necessary. Format/count failures exit nonzero. Warnings remain visible in the report.

`.local/` is Git-ignored. Materials placed elsewhere are not covered by that rule. This workflow does not edit the Zotero library database or plugin storage behind Zotero, and does not embed institutional data into public XPI files.

## Agent entry points

- [AGENTS.md](../AGENTS.md): Codex and other repository-aware agents.
- [CLAUDE.md](../CLAUDE.md): Claude Code.
- [Setup skill](../skills/configure-journal-list/SKILL.md): shared workflow, read directly without global installation.
- [English prompt](../addon/content/ai-prompt-en.txt) / [中文提示词](../addon/content/ai-prompt.txt): extraction and source-audit rules.

See the primary documentation for [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md/) and [Claude Code CLAUDE.md](https://code.claude.com/docs/en/memory). Other agents can read the same files explicitly; automatic discovery varies.
