# 构建 TKFM-Data-Room 静态站点：安装依赖后执行 Nuxt 静态生成，产物输出到仓库的 dist 目录
# 关键背景：globby 11（nuxt generate 的依赖）遇到含非 ASCII 字符的工作目录时，其 slash() 拒绝把反斜杠转正斜杠，导致路径前缀比对必然失败并抛出 "Path ... is not in cwd" 致命错误；仓库若放在含中文的路径下必中招，解法是用 subst 建一个纯 ASCII 的虚拟盘符，在其中完成构建，结束后解除
$ErrorActionPreference = 'Stop'
$仓库目录 = (Resolve-Path (Join-Path $PSScriptRoot '..\TKFM-Data-Room')).Path

# 选一个未被占用的盘符作为构建工作盘
$虚拟盘符 = $null
foreach ($候选 in 'X','W','V','U') {
    if (-not (Test-Path "${候选}:\")) { $虚拟盘符 = $候选; break }
}
if (-not $虚拟盘符) { throw "找不到可用盘符建立 subst 虚拟盘，请手动释放 X:/W:/V:/U: 之一" }

try {
    Write-Host "=== 建立虚拟盘 ${虚拟盘符}: => $仓库目录（规避 globby 中文路径缺陷）==="
    subst "${虚拟盘符}:" $仓库目录

    Set-Location "${虚拟盘符}:\"
    Write-Host "=== 当前 Node 版本 ==="
    node --version

    # Nuxt 2 + webpack 4 在 Node17+ 会因 OpenSSL3 移除 MD4 报错，配合 legacy-provider 环境变量即可正常运行
    $env:NODE_OPTIONS = '--openssl-legacy-provider'
    # cli-generate.js 检测到 NUXT_BUILD 时直接走完整构建，跳过依赖 globby gitignore 快照的增量缓存逻辑（该逻辑在中文路径下必崩）
    $env:NUXT_BUILD = '1'

    # 不能用 npm ci：lock 文件里有 fsevents 等 macOS 专属可选依赖，Windows 上必报 Missing 错；npm install 会跳过不适用平台的可选依赖
    Write-Host "=== 安装依赖（npm install，首次耗时较长）==="
    npm install --no-audit --no-fund

    Write-Host "=== 静态生成（npm run generate，耗时较长）==="
    npm run generate

    $产物 = Join-Path $仓库目录 'dist\index.html'
    if (Test-Path $产物) {
        Write-Host "构建成功：dist\index.html 已生成"
    } else {
        throw "构建失败：未找到 dist\index.html"
    }
} finally {
    Set-Location $PSScriptRoot
    Write-Host "=== 解除虚拟盘 ${虚拟盘符}: ==="
    subst "${虚拟盘符}:" /d
}
