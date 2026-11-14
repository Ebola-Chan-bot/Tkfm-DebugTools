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
    if (-not (Test-Path -LiteralPath (Join-Path $发布目录 'index.html') -PathType Leaf)) {
        throw '缺少 dist 构建产物。请先在战斗模拟器目录执行 npm ci 和 npm run build。'
    }
    $启动锁 = [Threading.Mutex]::new($false, "Local\TKFM-战斗模拟器-$端口")
    try { $已持锁 = $启动锁.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $已持锁 = $true }
    if (-not $已持锁) {
        Write-Host '另一个启动器正在处理此端口，请勿重复启动。'
        exit 0
    }
    $进程 = @(获取监听进程)
    if ($进程.Count) {
        $参数模式 = '(?:"{0}"|{0})\s+(?:"{1}"|{1})\s+{2}(?:\s|$)' -f [regex]::Escape($服务器脚本), [regex]::Escape($发布目录), $端口
        if ($进程.Count -ne 1 -or $进程[0].Name -ine 'node.exe' -or $进程[0].CommandLine -notmatch $参数模式) {
            throw "端口 $端口 已被其他进程占用，未停止或替换该进程。可使用 -端口 指定其他端口。"
        }
        $进程编号 = [uint32]$进程[0].ProcessId
        Write-Host "服务器已在运行，PID：$进程编号。"
    }
    else {
        $节点程序 = 获取节点程序
        $启动属性 = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
        $启动命令 = '"{0}" "{1}" "{2}" {3} --no-spa' -f $节点程序, $服务器脚本, $发布目录, $端口
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