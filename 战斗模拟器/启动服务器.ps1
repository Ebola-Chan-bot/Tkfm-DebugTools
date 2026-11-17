[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$端口 = 5511,
    [switch]$不打开浏览器
)

$ErrorActionPreference = 'Stop'
$服务根 = Split-Path -Parent $PSScriptRoot
$服务器脚本 = Join-Path $服务根 '静态服务器.js'
$发布目录 = Join-Path $PSScriptRoot 'dist'
$地址 = "http://127.0.0.1:$端口/"

function 获取监听进程 {
    $连接 = @(Get-NetTCPConnection -State Listen -LocalPort $端口 -ErrorAction SilentlyContinue)
    foreach ($编号 in @($连接 | Select-Object -ExpandProperty OwningProcess -Unique)) {
        Get-CimInstance Win32_Process -Filter "ProcessId=$编号"
    }
}

function 获取节点程序 {
    $命令 = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($命令) { return $命令.Source }
    $安装目录 = [Environment]::GetFolderPath('ProgramFilesX86')
    $查找器 = Join-Path $安装目录 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (Test-Path -LiteralPath $查找器 -PathType Leaf) {
        $候选 = @(& $查找器 -latest -prerelease -products '*' -find 'MSBuild\Microsoft\VisualStudio\NodeJs\node.exe')
        foreach ($文件 in $候选) {
            if (Test-Path -LiteralPath $文件 -PathType Leaf) { return $文件 }
        }
    }
    throw '未找到 Node.js。请安装 Node.js 并加入 PATH 后重新启动。'
}

function 运行节点命令([string]$节点程序, [string[]]$参数) {
    # 显式传全路径时仍确保子进程能找到同目录 npm 与 node；不改变调用者的全局环境
    $原路径 = $env:PATH
    try {
        $env:PATH = (Split-Path -Parent $节点程序) + ';' + $原路径
        & $节点程序 @参数
        if ($LASTEXITCODE -ne 0) { throw "命令执行失败，退出码：$LASTEXITCODE" }
    }
    finally { $env:PATH = $原路径 }
}

function 获取源码指纹 {
    # 聚合全部构建输入的 SHA-256：构建.mjs 的文件列表 + 构建脚本自身 + 离线工作器 + package.json/依赖锁
    # （锁定 lucide 等构建期取用的 node_modules 产物版本）+ 真实角色目录引用的每张头像源图。
    # 文件列表直接从 构建.mjs 解析，构建清单增删文件时此处自动跟随；解析失败或任一输入缺失返回 $null，
    # 调用方按"必须重建"兜底，绝不把无法确认的状态当成"没改"。
    $构建脚本 = Join-Path $PSScriptRoot '构建.mjs'
    if (-not (Test-Path -LiteralPath $构建脚本 -PathType Leaf)) { return $null }
    $清单匹配 = [regex]::Match((Get-Content -LiteralPath $构建脚本 -Raw), "const 文件列表 = \[([^\]]*)\]")
    if (-not $清单匹配.Success) { return $null }
    $输入表 = @('package.json', 'package-lock.json', '构建.mjs', '离线.js')
    $输入表 += @([regex]::Matches($清单匹配.Groups[1].Value, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value })
    $目录文件 = Join-Path $PSScriptRoot '真实角色目录.json'
    if (-not (Test-Path -LiteralPath $目录文件 -PathType Leaf)) { return $null }
    $角色目录 = Get-Content -LiteralPath $目录文件 -Raw | ConvertFrom-Json
    foreach ($单位 in $角色目录) { $输入表 += ('..\..\tenkaassist\images\characters\cs{0}_0_0.webp' -f $单位.编号) }
    $行表 = foreach ($文件 in $输入表) {
        $完整 = Join-Path $PSScriptRoot $文件
        if (-not (Test-Path -LiteralPath $完整 -PathType Leaf)) { return $null }
        '{0}|{1}' -f $文件, (Get-FileHash -LiteralPath $完整 -Algorithm SHA256).Hash
    }
    $散列器 = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($散列器.ComputeHash([Text.Encoding]::UTF8.GetBytes($行表 -join "`n"))) -replace '-', '' }
    finally { $散列器.Dispose() }
}

function 保障构建产物 {
    # 静态服务器每次请求都从磁盘读文件（HTML no-store、js/css 引用打修改时间版本号、离线工作器网络优先
    # 且 updateViaCache:none），重建 dist 后刷新浏览器即生效，无需重启后台进程。因此本校验对
    # "已在运行的服务器"同样执行；指纹一致且关键产物齐全时跳过重建，代码没改就不付构建成本。
    $script:本次已重建 = $false
    $指纹文件 = Join-Path $发布目录 '构建指纹.txt'
    $关键产物 = @('index.html', '应用.mjs', '战斗引擎.mjs', '图标.js', '离线.js')
    $产物齐全 = -not @($关键产物 | Where-Object { -not (Test-Path -LiteralPath (Join-Path $发布目录 $_) -PathType Leaf) }).Count
    $当前指纹 = 获取源码指纹
    if ($产物齐全 -and $当前指纹 -and (Test-Path -LiteralPath $指纹文件 -PathType Leaf) -and
        ((Get-Content -LiteralPath $指纹文件 -Raw).Trim() -eq $当前指纹)) {
        Write-Host '源码与构建输入未变化，跳过重建。'
        return
    }
    $script:节点程序 = 获取节点程序
    $清单 = Join-Path $PSScriptRoot 'package.json'
    $锁文件 = Join-Path $PSScriptRoot 'package-lock.json'
    $npm入口 = Join-Path (Split-Path -Parent $script:节点程序) 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path -LiteralPath $npm入口 -PathType Leaf)) { throw "未找到配套 npm：$npm入口" }
    if (-not (Test-Path -LiteralPath $清单 -PathType Leaf) -or -not (Test-Path -LiteralPath $锁文件 -PathType Leaf)) { throw '缺少 package.json 或 package-lock.json，无法自动安装构建依赖。' }
    if ($产物齐全) { Write-Host '检测到源码或构建输入变化，正在自动安装依赖并重建…' }
    else { Write-Host '缺少 dist 构建产物，正在自动安装依赖并构建…' }
    运行节点命令 $script:节点程序 @($npm入口, 'ci', '--no-audit', '--no-fund', '--prefix', $PSScriptRoot)
    运行节点命令 $script:节点程序 @($npm入口, 'run', 'build', '--prefix', $PSScriptRoot)
    if (-not (Test-Path -LiteralPath (Join-Path $发布目录 'index.html') -PathType Leaf)) { throw '构建已完成但 dist/index.html 仍不存在。' }
    # 落盘的是构建开始前的指纹：若构建期间源码恰好又被改动，下次启动指纹不一致会再次重建，宁可多建不误判为新。
    if ($当前指纹) { Set-Content -LiteralPath $指纹文件 -Value $当前指纹 -NoNewline -Encoding Ascii }
    $script:本次已重建 = $true
    Write-Host '自动构建完成。'
}

function 确认服务就绪([uint32]$进程编号) {
    $截止 = [DateTime]::UtcNow.AddSeconds(15)
    $最后错误 = ''
    do {
        if (-not (Get-CimInstance Win32_Process -Filter "ProcessId=$进程编号")) {
            throw "服务器进程已退出，PID：$进程编号。请检查发布目录和端口。"
        }
        try {
            $响应 = Invoke-WebRequest -Uri $地址 -UseBasicParsing -TimeoutSec 3 -MaximumRedirection 0
            if ($响应.StatusCode -eq 200 -and $响应.Content.Contains('id="编队表"')) { return }
            $最后错误 = '端口响应不是本战斗模拟器。'
        }
        catch { $最后错误 = $_.Exception.Message }
    } while ([DateTime]::UtcNow -lt $截止)
    throw "服务器未在15秒内就绪，PID：$进程编号。$最后错误"
}

$启动锁 = $null
$已持锁 = $false
try {
    if (-not (Test-Path -LiteralPath $服务器脚本 -PathType Leaf)) { throw "缺少静态服务器：$服务器脚本" }
    $启动锁 = [Threading.Mutex]::new($false, "Local\TKFM-战斗模拟器-$端口")
    try { $已持锁 = $启动锁.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $已持锁 = $true }
    if (-not $已持锁) {
        Write-Host '另一个启动器正在处理此端口，请勿重复启动。'
        exit 0
    }
    $进程 = @(获取监听进程)
    $需新启动 = -not $进程.Count
    if ($进程.Count) {
        $参数模式 = '(?:"{0}"|{0})\s+(?:"{1}"|{1})\s+{2}(?:\s|$)' -f [regex]::Escape($服务器脚本), [regex]::Escape($发布目录), $端口
        if ($进程.Count -ne 1 -or $进程[0].Name -ine 'node.exe' -or $进程[0].CommandLine -notmatch $参数模式) {
            throw "端口 $端口 已被其他进程占用，未停止或替换该进程。可使用 -端口 指定其他端口。"
        }
        $进程编号 = [uint32]$进程[0].ProcessId
        Write-Host "服务器已在运行，PID：$进程编号。"
    }
    # 构建校验与"是否新启动"解耦：服务器已在运行时也检查源码指纹，代码变了就重建 dist；
    # 静态服务器按请求读盘，重建后无需重启进程，刷新浏览器即生效
    保障构建产物
    if ($需新启动) {
        if (-not $script:节点程序) { $script:节点程序 = 获取节点程序 }
        $启动属性 = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
        $启动命令 = '"{0}" "{1}" "{2}" {3} --no-spa' -f $script:节点程序, $服务器脚本, $发布目录, $端口
        $结果 = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
            CommandLine = $启动命令
            CurrentDirectory = $服务根
            ProcessStartupInformation = $启动属性
        }
        if ($结果.ReturnValue -ne 0) { throw "Windows创建后台进程失败，返回码：$($结果.ReturnValue)。未尝试提权。" }
        $进程编号 = [uint32]$结果.ProcessId
        Write-Host "已启动独立后台进程，PID：$进程编号。"
    }
    确认服务就绪 $进程编号
    if ($script:本次已重建 -and -not $需新启动) { Write-Host '检测到代码变化，发布目录已重建；刷新浏览器页面即可加载新版本。' }
    Write-Host "访问地址：$地址"
    Write-Host '可以关闭此窗口和VS Code，后台服务仍会运行；本脚本不设置开机自启。'
    if (-not $不打开浏览器) {
        try { Start-Process $地址 }
        catch { Write-Warning "服务已正常运行，但浏览器未能自动打开，请手动访问：$地址" }
    }
}
catch {
    Write-Host "启动失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if ($启动锁) {
        if ($已持锁) { $启动锁.ReleaseMutex() }
        $启动锁.Dispose()
    }
}