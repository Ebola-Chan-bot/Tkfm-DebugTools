<#
.SYNOPSIS
  从天下布魔 APK 中提取完整战斗引擎汇编代码（NP AppGuard 加壳游戏专用）。
.DESCRIPTION
  基于已验证的提取管线：
  1. 从 APK 解压 libil2cpp.so、global-metadata.dat、native libs
  2. AES-ECB + LZ4 解密元数据，解析方法表
  3. 从内存快照/离线 dump 恢复 IL2CPP 解密后代码
  4. 按方法 token 反查地址，反汇编战斗引擎方法
  全部输出（APK解压/元数据明文/解密快照/战斗汇编/摘要.txt 等）集中在输出目录，自产文件一律中文命名

  依赖：Python 3.x + pycryptodome + lz4
.PARAMETER ApkPath
  原始 APK 路径
.PARAMETER OutDir
  输出目录（默认在 APK 同级 <APK名>_提取/）
.PARAMETER SnapshotDir
  内存快照（解密快照.pkl 或归档 post_fastpath_6_mem.pkl 等），用于恢复 IL2CPP 解密代码
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

# 执行主脚本：放入关闭即终止的作业对象（Job Object），本 PowerShell 无论正常退出还是被强杀，内核都会自动终止 Python 及其全部后代模拟进程，杜绝孤儿进程
Add-Type -Namespace Win32 -Name JobGuard -MemberDefinition @'
[StructLayout(LayoutKind.Sequential)] public struct BASIC_LIMIT {
    public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass;
}
[StructLayout(LayoutKind.Sequential)] public struct IO_COUNTERS {
    public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount;
}
[StructLayout(LayoutKind.Sequential)] public struct EXTENDED_LIMIT {
    public BASIC_LIMIT Basic; public IO_COUNTERS Io;
    public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
}
[DllImport("kernel32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr CreateJobObjectW(IntPtr sa, string name);
[DllImport("kernel32.dll")] public static extern bool SetInformationJobObject(IntPtr job, int cls, ref EXTENDED_LIMIT info, uint len);
[DllImport("kernel32.dll")] public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr proc);
'@
$守护作业 = [Win32.JobGuard]::CreateJobObjectW([IntPtr]::Zero, $null)
if ($守护作业 -ne [IntPtr]::Zero) {
    $限制 = New-Object Win32.JobGuard+EXTENDED_LIMIT
    $限制.Basic.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    [Win32.JobGuard]::SetInformationJobObject($守护作业, 9, [ref]$限制, [Runtime.InteropServices.Marshal]::SizeOf($限制)) | Out-Null
}

$mainPy = Join-Path $PSScriptRoot "提取战斗引擎.py"
$pyArgs = @($mainPy, $ApkPath)
if ($OutDir) { $pyArgs += @("-o", $OutDir) }
if ($Snapshot) { $pyArgs += @("--snapshot", $Snapshot) }
$引号参数 = $pyArgs | ForEach-Object { '"{0}"' -f $_ }
$主进程 = Start-Process -FilePath $pyExe -ArgumentList $引号参数 -NoNewWindow -PassThru
if ($守护作业 -ne [IntPtr]::Zero) {
    [Win32.JobGuard]::AssignProcessToJobObject($守护作业, $主进程.Handle) | Out-Null
}
$主进程.WaitForExit()
exit $主进程.ExitCode
