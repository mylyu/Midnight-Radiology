# 新章节剧情代码与原内容体积保护

作者允许新增章节增量，原内容保护仍严格小于17,000,000字节。本次没有调高限额、按gzip/ZIP计算或整体排除新章节UI/实验代码。

Vite配置增加一个仅构建时运行的Rollup generateBundle钩子。它读取每个实际输出chunk的全部 modules，包括渲染长度为零的模块，不按文件名猜来源，也不丢掉query或虚拟模块；记录是否入口/动态入口、实际UTF-8字节及SHA-256，输出 dist/chunk-sources.generated.json。非绝对模块ID标为unresolved，不能冒充真实源码路径。清单自身仍计入原内容保护。

postbuild检查器独立读取产物字节并计算JS哈希。只有同时符合以下条件的剧情chunk才单列为新增章节代码：

- 是已登记的Rollup JS chunk、非入口且是动态入口。
- 模块清单非空，全部精确来自 src/game/ch3.ts、ch4.ts、ch5.ts、trilogy-registry.ts，没有其他模块。
- 产物实际存在，字节数和独立计算的SHA-256与构建记录一致。
- 不是App、index或shared命名的产物；这项仅作额外拒绝条件，文件名永远不能授予豁免。

App、共用运行时、数值实验、组件、虚拟helper、混合来源chunk和未登记文件仍计入原17MB项。清单缺失、格式无效、模块不符或哈希/字节不符，都不能获得代码扣除。新三章媒体集合同时限定为现行 assets/media 下WebP/PNG与audio下MP3/OGG/WAV，JS不能借“媒体登记”绕过来源校验。既有LDCT媒体政策不扩大。

deliverySizeReport(files, manifest)原接口保留，缺少代码证据时全部代码照旧计入原内容。新可选第三参数为 { metadata, sha256ByFile }，供CLI和synthetic测试传入实际来源记录与独立产物哈希。报告保留总字节、各媒体类和原chapterBytes；新增 trilogyExclusiveMediaBytes、trilogyExclusiveCodeBytes、trilogyExclusiveCodeFiles与代码来源清单状态。trilogyExclusiveBytes为新章媒体与符合来源规则的剧情代码之和，总体积始终包含全部文件。

本次没有修改chunk切分方式。本子任务未运行生产构建；主任务的最终生产构建及postbuild现已通过，dist包含chunk-sources.generated.json，独立动态剧情chunk经来源、字节与哈希核验后计入新章增量，未按文件名猜测豁免。

最终部署产物总计24,588,506字节，符合四个指定剧情源码规则的独占动态chunk为213,890字节；原内容保护部分16,869,806字节，严格小于原17,000,000字节上限。此处是主任务最终构建的真实统计，不是下方synthetic测试数值，也不代表已推送或部署。

窄测试：[trilogy-delivery-code.mjs](../app/tests/trilogy-delivery-code.mjs)。它只加载Vite配置并直接调用真实元数据钩子处理synthetic bundle，不调用游戏构建、不写dist。检查纯剧情来源和UTF-8字节，并用App/共用模块/虚拟模块/query/空来源/非动态/入口/类型/字节/哈希/未登记及假媒体登记等负例拒绝不当扣除。不扩展历史全仓冻结或游戏回归。

从app目录运行：node --import tsx tests/trilogy-delivery-code.mjs。已执行一次，约2.08秒通过；synthetic剧情代码25,033字节被单列，1,029字节来源清单仍受保护，来源/哈希/入口/命名等负例拒绝。没有用这些模拟数值冒充真实构建统计；主任务最终构建统计见上段，手机和章节试玩仍以主任务记录为准。本次仅更新文档状态，没有重跑测试或修改代码。
