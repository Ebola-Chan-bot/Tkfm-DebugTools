<#
.SYNOPSIS
  从天下布魔 APK 中提取完整战斗引擎汇编代码（NP AppGuard 加壳游戏专用）。
.DESCRIPTION
  基于已验证的提取管线：
  1. 从 APK 解压 libil2cpp.so、global-metadata.dat、native libs
  2. AES-ECB + LZ4 解密元数据，解析方法表
  3. 从内存快照/离线 dump 恢复 IL2CPP 解密后代码
  4. 按方法 token 反查地址，反汇编战斗引擎方法

  依赖：Python 3.x + pycryptodome + lz4
.PARAMETER ApkPath
  原始 APK 路径
.PARAMETER OutDir
  输出目录（默认在 APK 同级 <APK名>_提取/）
.PARAMETER SnapshotDir
  内存快照目录（post_fastpath_6_mem.pkl 等），用于恢复 IL2CPP 解密代码
.EXAMPLE
  .\提取战斗引擎.ps1 -ApkPath "D:\天下布魔\天下布魔-2.3.0-erolabs-com.pinkcore.tkfm.erolabs.apk"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ApkPath,
    [string]$OutDir,
    [string]$Snapshot
)

$ErrorActionPreference = 'Stop'

# 定位 Python
$pyCmd = Get-Command python3 -ErrorAction SilentlyContinue
if ($pyCmd) { $pyExe = $pyCmd.Source } else { $pyExe = $null }
if (-not $pyExe) {
    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pyCmd) { $pyExe = $pyCmd.Source }
}
if (-not $pyExe) {
    Write-Host "[X] 未找到 Python" -ForegroundColor Red; exit 1
}

# 验证/安装依赖
& $pyExe -c "import Crypto.Cipher.AES, lz4.block" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] 安装 Python 依赖..." -ForegroundColor Yellow
    & $pyExe -m pip install --user pycryptodome lz4 2>$null
}

# 执行主脚本
$mainPy = Join-Path $PSScriptRoot "提取战斗引擎.py"
$pyArgs = @($mainPy, $ApkPath)
if ($OutDir) { $pyArgs += @("-o", $OutDir) }
if ($Snapshot) { $pyArgs += @("--snapshot", $Snapshot) }
& $pyExe @pyArgs
exit $LASTEXITCODE
