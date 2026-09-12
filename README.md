# Tkfm-DebugTools

TKFM-Data-Room 的本地部署调试工具（独立仓库，不含网站代码，不做任何功能修改）。

用途：把 `../TKFM-Data-Room` 构建成静态产物并在本地起服务器，浏览器实测网站可用性。

## 使用方法

1. 构建（首次需联网安装依赖，耗时数分钟）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\部署-构建.ps1
```

2. 起本地服务器（保持窗口开着）：

```powershell
node .\静态服务器.js
```

3. 浏览器打开 <http://localhost:3000> 即可实测。

## 说明

- 构建产物在 `../TKFM-Data-Room/dist`，本仓库不落任何生成物
- **中文路径陷阱**：globby 11（nuxt generate 快照缓存的依赖）的 `slash()` 遇到非 ASCII 路径时拒绝转换反斜杠，导致仓库放在含中文的路径下时构建必抛 `Path ... is not in cwd` 致命错误。脚本会自动 `subst X:` 建纯 ASCII 虚拟盘符完成构建，结束后自动解除，无需人工干预
- 依赖安装用 `npm install` 而非 `npm ci`：lock 文件含 fsevents 等 macOS 专属可选依赖，Windows 上 `npm ci` 必报 Missing 错（官方 CI 在 Linux/macOS 上跑才没事）。副作用是 `TKFM-Data-Room/package-lock.json` 可能被本地重写，实测时不要把它一起提交
- 脚本设置 `NODE_OPTIONS=--openssl-legacy-provider`，解决 Nuxt2+webpack4 在 Node17+ 的 OpenSSL3 MD4 崩溃问题
- 脚本设置 `NUXT_BUILD=1`，跳过依赖 globby gitignore 快照的增量缓存逻辑
- 静态服务器带 SPA 回退（未命中路径返回根 index.html），适配 nuxt generate 的前端路由

## 文件

- `部署-构建.ps1`：完整构建流程（subst 虚拟盘 → npm install → nuxt generate → 解除虚拟盘）
- `静态服务器.js`：零依赖 Node 静态服务器，默认端口 3000
