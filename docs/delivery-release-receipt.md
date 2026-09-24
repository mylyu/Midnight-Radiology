# 2026-09-25 发布与导入核验回执

游戏修改提交：`66ceebb`；测试保护：`a5e7f4e`；首份完整交接：`272cc29`。已普通快进推送到 `origin/main`，无强推或历史重写。

GitHub Pages工作流[36040384613](https://github.com/mylyu/Midnight-Radiology/actions/runs/36040384613)已完成且为success，使用Node20构建。后续本回执提交只补交接记录，不再改app、图片、声音或运行逻辑。线上正常入口为 https://mylyu.github.io/Midnight-Radiology/ ，不需要固定版本参数；已打开的旧标签如仍取旧资源，可Ctrl+F5刷新，不用清空存档。

首份Kimi ZIP实际从ZIP全新解压，在没有`.git`、旧优化缓存、大PNG原稿的目录执行`npm ci --include=dev`及`npm run build`成功。所有706个ZIP条目逐项解码并校验SHA256；约29 MiB。补本回执后重新导出最终ZIP，以最终包内`REVISION.txt`和`SHA256SUMS.txt`为准。原包与最终包的app运行源码/素材保持一致。

## 本轮发现的既有依赖审计告警

2026-09-25全新安装的npm审计提示**15项：2 low、2 moderate、11 high**。排除开发依赖后，`npm audit --omit=dev --json`报告**1项high，为间接依赖lodash**，涉及template/unset/omit。该结论是依赖树审计，不代表已证实在本游戏可触发；大部分UI模板依赖未进入当前运行入口，但不能仅凭此宣称所有告警都无风险。

本轮`package.json`和`package-lock.json`与基点`c4215b0`完全一致，未引入依赖更新或擅自`npm audit fix --force`。后续AI需单独核对依赖调用链、适用安全版本并走回归；不要把“加载优化通过”写成“无安全问题”。全仓原有lint 10 errors/2 warnings也另保留。此为交接债务记录，不在本轮媒体改动中顺手修改剧情/共享引擎或批量升级。

授权/商业化限制与来源以NOTICE及`docs/ch2-ct-sequences.md`为准，尤其ImageCAS冠脉序列商用前须替换或另获授权。
