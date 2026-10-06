# vulgur 独立开发周记数据集

抓取 V2EX 用户 **vulgur** 的「独立开发周记」系列全部帖子和回复，本地存档。

## 数据范围

| 项目 | 数量 |
|---|---|
| 周记系列（#1 ~ #190，含合并期） | 184 篇 |
| 年终总结 / 相关主题 | 2 篇 |
| 回复总数 | 763 条 |
| 数据时间跨度 | 2023-03-07 ~ 2026-10-05 |
| 抓取完成时间 | 2026-10-06 |

> 注：#15、#18、#75、#183 等缺失期号在 V2EX 上不存在（作者未发或已删，sov2ex 索引中也无）。
> 周记系列已通过 sov2ex 全量索引交叉验证，确认无遗漏。

## 目录结构

```
v2ex-funny/
├── site/                    # ★ HTML 阅读器（双击 index.html 直接阅读）
│   ├── index.html           # 单页应用：侧栏目录 + 搜索 + 总览统计 + 灯箱
│   └── data.js              # 内嵌全部数据（1.2MB，无需服务器）
├── data/                    # 原始数据（JSON）
│   ├── topics_list.json     # 用户全部 203 个主题的清单（从用户主页抓取）
│   ├── topics/              # 每个“周记”主题一个 JSON 文件（186 个）
│   │   └── <topic_id>.json  #   含：标题、正文、附言、全部回复、收藏/感谢数等
│   ├── index.json           # 186 个主题的元数据索引
│   ├── summary.json         # 汇总统计（TOP 回复/收藏、高频回复者等）
│   ├── crawl_summary.json   # 抓取过程记录
│   └── crawl_progress.log   # 抓取日志
├── docs/                    # 人类可读的 Markdown（保留）
│   ├── 目录.md              # 全部周记的索引表（期号/日期/标题/回复数/链接）
│   ├── 周记全集.md          # 全部 184 篇周记正文+附言+回复（约 1MB）
│   ├── 导读.md              # ★ 190 期精读综合导读（商业结果+网友观点+时间线）
│   └── 数据视角分析.md      # 商业数据时间线 + 网友观点分析
├── analysis/
│   └── batch_reports/       # 9 个批次精读的原始报告（导读的综合底稿）
├── data/ep_texts/           # 每期周记的纯文本版（128 份，按 topic id 命名）
└── scripts/                 # 可复用脚本
    ├── api_probe.js         # API 连通性测试
    ├── crawl_member_topics.js # 用户主题列表爬取（浏览器内执行）
    ├── fetch_weekly.mjs     # 通过 API 2.0 抓取详情+回复（支持断点续跑）
    ├── build_docs.mjs       # 生成 Markdown 数据集
    ├── build_analysis.mjs   # 生成分析文档
    └── build_site.mjs       # 生成 site/ HTML 阅读器
```

## 技术说明

- **认证**：V2EX API 2.0，`Authorization: Bearer <token>`（token 请求头）
- **用户主题列表**：API 2.0 无“按用户名查主题”接口，改从 `member/vulgur/topics?p=N` 页面抓取（11 页 × ~20 条 = 203 个主题），再按标题正则筛选周记系列
- **主题详情与回复**：`GET /api/v2/topics/:id` + `GET /api/v2/topics/:id/replies?p=N`（每页 20 条，p=1 起，<20 条即止）
- **代理**：本地代理（`NODE_USE_ENV_PROXY=1` + `HTTPS_PROXY` 环境变量），代理地址请按自己环境填写
- **限流**：600 次/小时，脚本内置 X-Rate-Limit 监控与自动等待
- **完整性**：每帖回复数与 `topic.replies` 字段一致性 100%（186/186 校验通过）

## 如何阅读

1. **首选**：双击 `site/index.html` 在浏览器阅读 —— 侧栏按年分组目录、全文搜索（标题/正文/回复）、总览统计页（发布节奏热力图、讨论热帖、高频网友）、**导读页**（190 期精读综合导读，含目录导航）、←/→ 键盘翻期、图片点击放大。无需服务器，单文件数据（图片为外链，需代理环境）。
2. **快速了解全系列** → `docs/导读.md`（或站内「导读」标签）：四幕编年史、商业结果全景、产品矩阵兴衰、AI 使用演进、网友观点、十大转折点、方法论金句、现状快照——约 30 分钟读完 190 期的精华。
3. 速览期号 → `docs/目录.md`
4. 商业结果 → `docs/数据视角分析.md` 第一章“商业结果时间线”
5. 网友观点 → `docs/数据视角分析.md` 第二章
6. 精读纯文本 → `docs/周记全集.md`
7. 批次精读底稿 → `analysis/batch_reports/`（9 份报告，导读的原始素材）

## 复跑 / 增量更新

```powershell
$env:NODE_USE_ENV_PROXY='1'; $env:HTTPS_PROXY='http://127.0.0.1:7890'; $env:V2EX_TOKEN='<你的V2EX token>'
node scripts/fetch_weekly.mjs     # 新主题会自动追加（已有文件跳过）
node scripts/build_docs.mjs       # 重新生成 docs/周记全集.md + 目录.md
node scripts/build_analysis.mjs   # 重新生成 docs/数据视角分析.md
node scripts/build_site.mjs       # 重新生成 site/ HTML 阅读器
```
