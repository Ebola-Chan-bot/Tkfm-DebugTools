# Tkfm-DebugTools

TKFM-Data-Room 的本地部署调试工具（独立仓库，不含网站代码，不做任何功能修改）。

用途：把 `../TKFM-Data-Room` 构建成静态产物并在本地起服务器，浏览器实测网站可用性；也附带 tenkaassist 的本地实测启动脚本。

## 使用方法

### TKFM-Data-Room（需构建）

1. 构建（首次需联网安装依赖，耗时数分钟）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\部署-构建.ps1
```

2. 起本地服务器（保持窗口开着）：

```powershell
node .\静态服务器.js
```

3. 浏览器打开 <http://localhost:3000> 即可实测。

### tenkaassist（纯静态，无需构建）

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\运行-tenkaassist本地.ps1
```

浏览器打开 <http://localhost:5500/comp/add/index.html>（或其他页面路径）即可实测。页面的 js/css 均为仓库内相对路径，本地改动即时生效；角色图片由 `common.js` 的 `address` 变量指向线上 GitHub Pages，无需本地资源。后端 API 仍指向线上（控制台会报 `/users/me` 的 CORS 失败，属预期，不影响页面与本地校验逻辑的实测）；注意登记校验通过的队伍会真实 POST 到线上服务器，实测拒绝消息时用非法队伍即可。

## 说明

- 构建产物在 `../TKFM-Data-Room/dist`，本仓库不落任何生成物
- **中文路径陷阱**：globby 11（nuxt generate 快照缓存的依赖）的 `slash()` 遇到非 ASCII 路径时拒绝转换反斜杠，导致仓库放在含中文的路径下时构建必抛 `Path ... is not in cwd` 致命错误。脚本会自动 `subst X:` 建纯 ASCII 虚拟盘符完成构建，结束后自动解除，无需人工干预
- 依赖安装用 `npm install` 而非 `npm ci`：lock 文件含 fsevents 等 macOS 专属可选依赖，Windows 上 `npm ci` 必报 Missing 错（官方 CI 在 Linux/macOS 上跑才没事）。副作用是 `TKFM-Data-Room/package-lock.json` 可能被本地重写，实测时不要把它一起提交
- 脚本设置 `NODE_OPTIONS=--openssl-legacy-provider`，解决 Nuxt2+webpack4 在 Node17+ 的 OpenSSL3 MD4 崩溃问题
- 脚本设置 `NUXT_BUILD=1`，跳过依赖 globby gitignore 快照的增量缓存逻辑
- 静态服务器带 SPA 回退（未命中路径返回根 index.html），适配 nuxt generate 的前端路由；`--no-spa` 参数关闭回退如实返回 404，适用于 tenkaassist 这类多页面站点（回退会把缺失资源掩盖成首页）

## 文件

- `部署-构建.ps1`：TKFM 完整构建流程（subst 虚拟盘 → npm install → nuxt generate → 解除虚拟盘）
- `静态服务器.js`：零依赖 Node 静态服务器，用法 `node 静态服务器.js [目标目录] [端口] [--no-spa]`，默认伺服 TKFM dist、3000 端口、带 SPA 回退；目标目录传相对路径时相对本脚本解析，传绝对路径直接使用
- `运行-tenkaassist本地.ps1`：以 5500 端口 + `--no-spa` 伺服 `../tenkaassist`（端口与作者在 common.js 注释里留的本地调试端口一致）

## Slurm 集群长跑作业（搜索最优队伍）

`搜索最优队伍.js`（团队码 → 最优 5 人队全链路搜索）是典型长跑作业（大池粗筛可达
数十小时），不适合在登录节点跑。`slurm/` 收编了集群提交的适应性改造：

```bash
# 一次性环境验证（node / 解码 / 机制表 bin），计算节点上跑
CODE='xxxx:yyyy' srun -p bme_gpupub -A v-jiamh -c 2 --time=00:20:00 bash slurm/预检.sh

# 提交正式搜索（4 天时限、8 核；被杀后重提同一命令即续跑）
CODE='xxxx:yyyy' sbatch slurm/搜索.sbatch

# 监控
squeue -u $USER                # 作业状态
cat <OUT>/进度.json            # 实时进度快照（阶段/明细/更新时间）
tail -f slurm-<jobid>.out      # 完整日志
```

**断点续跑**：`搜索最优队伍.js` 把每块/每项/每队结果原子写进出目录的 `检查点/`
（meta.json 指纹 + A全扫/A粗筛逐块、A精扫、B精排、C深搜、D深评逐块、终搜逐队），
`进度.json` 每 2s 刷新、输出镜像每 30s 落盘。作业被杀（超时/scancel/节点故障）后，
**同一 CODE、同一 OUT 重新提交即自动跳过已完成部分**；换码/换参数会被 meta 指纹
拒绝续跑（防串数据），确要重算加 `--从头`（`EXTRA_ARGS='--从头'`）。

**超时自动续跑**：`搜索.sbatch` 带 `--signal=B:USR1@300`——超时前 5 分钟收到 USR1
就通知 node 落检查点提前收尾，随后自动 `sbatch` 重提自己接着跑（`MAXRESUB` 默认 3
次封顶；用户主动 scancel 只发 SIGTERM，不会误触发重提）。`--requeue` 让节点故障时
调度器自动换节点重排。

**本集群已验证的适配点**（换集群时留意）：

- node 用共享存储上的 glibc2.17 兼容构建（`NODE_DIR` 可覆盖）：系统 glibc 太旧，
官方 node 22 二进制起不来
- 机制表 bin 构建工具链仓库自带的是 `tools/flatc.exe`（Windows），Linux 端用官方
同版本 25.12.19 `flatc`（`FLATC` 环境变量指定），构建后还原 names.txt 不留产物
- 账号 QOS `user_v-jiamh`：单用户最多 1 作业、8 核（QOSMaxCpuPerUserLimit），超了
直接 PENDING；`CPUS` 默认 8 就是这么来的
- 可用分区实测 `bme_gpupub`（bme_cpu 等报 Invalid account/partition 组合）

## 模拟器逆向研究目录

- `逆向-模拟器/`：tenkaassist 模拟器 `calculator.v3.js`（javascript-obfuscator 混淆）的 webcrack 反混淆产物 `deobfuscated.js` 与《逆向分析文档.md》（伤害管线、乘区公式、buff 体系、237 角色技能定义、黑名单技术根源），仅供本地研究
- `明文考古-模拟器/`：从 tenkaassist git 历史提取的 2024-07 明文版计算器源码（`calculator copy.js`@3983492、`calculator_test.js`@59a302b、`damageCalc.js`@957c128），作为反混淆对照材料
- 版权边界：tenkaassist 仓库无 LICENSE，代码版权归 inittt；本仓库已设为 private，以上产物仅限个人研究学习，不得公开传播或用于任何发布
