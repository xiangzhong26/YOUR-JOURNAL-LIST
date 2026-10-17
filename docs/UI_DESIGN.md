# Desktop design plan
Applied [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design).

Palette: paper #FFFFFF, toolbar #F3F4F6, text #202124, secondary #62666D, divider #D6D9DE, selection #235EA7.
Type: system UI / Microsoft YaHei; 13px body and 18px title to fit adjacent Zotero controls.
Layout: left-aligned desktop utility with a single work table and separate catalog management.

```
学院期刊目录                 当前目录 [          v]
文献筛选 | 目录管理 | 使用帮助
等级 [    v] 状态 [    v] 搜索 [        ] [刷新]
标题                    期刊          等级   操作
...
结果数量                           上一页 下一页
```

Review before implementation: dashboard cards and promotional headings distract from comparing papers. Remove both. Native Zotero menus supply familiar interaction; journal titles and grades carry the hierarchy. No gradients, badges, shadows or animations. Controls wrap at narrow widths; tables scroll. Dark mode follows system colors; keyboard focus remains visible.
