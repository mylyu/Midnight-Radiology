#Requires -Version 7.0
<#
Create a source/runtime handoff, not a repository backup.
Run only after the release commit is ready:
  pwsh -File scripts/export-kimi.ps1
Inspect the selection without writing an export:
  pwsh -File scripts/export-kimi.ps1 -PlanOnly
No source files, Git references, or existing export directories are deleted/overwritten.
#>
[CmdletBinding()]
param([switch]$PlanOnly)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$gitExecutable = (Get-Command git -ErrorAction Stop).Source
$utf8 = [Text.UTF8Encoding]::new($false)

function Invoke-RepoGit {
    param([string[]]$GitArguments)
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $gitExecutable
    $start.WorkingDirectory = $repoRoot
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.StandardOutputEncoding = $utf8
    $start.StandardErrorEncoding = $utf8
    foreach ($argument in $GitArguments) { [void]$start.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    try {
        [void]$process.Start()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw "git failed ($($process.ExitCode)): $stderr" }
        return $stdout
    } finally { $process.Dispose() }
}

function Test-WithinDirectory {
    param([string]$ParentPath, [string]$ChildPath)
    $relative = [IO.Path]::GetRelativePath($ParentPath, $ChildPath)
    return $relative -eq '.' -or ($relative -ne '..' -and -not $relative.StartsWith("..$([IO.Path]::DirectorySeparatorChar)") -and -not [IO.Path]::IsPathRooted($relative))
}

function Get-SafeSourcePath {
    param([string]$RelativePath)
    if ($RelativePath -match '[\r\n\x00]' -or [IO.Path]::IsPathRooted($RelativePath) -or @($RelativePath.Split('/') | Where-Object { $_ -eq '..' -or $_ -eq '.' -or $_ -eq '' }).Count) {
        throw "Unsafe relative source path: $RelativePath"
    }
    $absolute = [IO.Path]::GetFullPath((Join-Path $repoRoot $RelativePath))
    if (-not (Test-WithinDirectory $repoRoot $absolute)) { throw "Source escapes repository: $RelativePath" }
    if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) { return $null }
    # Reject links/junctions at every level; lexical containment alone is insufficient.
    $cursor = $absolute
    while ($cursor -and $cursor -ne $repoRoot) {
        if (([IO.File]::GetAttributes($cursor) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Linked source is not exportable: $RelativePath" }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
    return $absolute
}

$actualGitRoot = [IO.Path]::GetFullPath((Invoke-RepoGit @('rev-parse', '--show-toplevel')).Trim())
if (-not [StringComparer]::OrdinalIgnoreCase.Equals($actualGitRoot, $repoRoot)) { throw 'Run this script from the intended repository, not a nested/exported copy.' }
$revision = (Invoke-RepoGit @('rev-parse', 'HEAD')).Trim()
$shortRevision = $revision.Substring(0, 7)
$branch = (Invoke-RepoGit @('rev-parse', '--abbrev-ref', 'HEAD')).Trim()
$statusBefore = Invoke-RepoGit @('status', '--porcelain=v1', '-z')
$workingTreeDirty = $statusBefore.Length -gt 0
$tracked = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($file in (Invoke-RepoGit @('ls-files', '--cached', '-z')).Split([char]0, [StringSplitOptions]::RemoveEmptyEntries)) { [void]$tracked.Add($file) }
$candidates = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($file in (Invoke-RepoGit @('ls-files', '--cached', '--others', '--exclude-standard', '-z')).Split([char]0, [StringSplitOptions]::RemoveEmptyEntries)) { [void]$candidates.Add($file) }

$rootFiles = @('.gitignore', 'AGENTS.md', 'README.md', 'HANDOFF.md', 'LICENSE', 'NOTICE')
$voiceManuscripts = @('docs/voices/配音台词底稿.md', 'docs/voices/配音台词底稿.csv')
$storyFiles = @('深夜影像科/全书剧情总线.md', '深夜影像科/第二章「快与狠」完整剧本.md', '深夜影像科/游戏设计文档.md')
$appRootFiles = @('.gitignore', 'index.html', 'README.md', 'package.json', 'package-lock.json', 'components.json',
    'vite.config.ts', 'eslint.config.js', 'postcss.config.js', 'tailwind.config.js', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'validate.mjs')
$catalogPath = Join-Path $repoRoot 'app/src/lib/image-assets.catalog.json'
$catalog = [IO.File]::ReadAllText($catalogPath, $utf8) | ConvertFrom-Json -AsHashtable
if (-not ($catalog -is [Collections.IDictionary]) -or $catalog.Count -lt 3) { throw 'Missing canonical image catalog.' }
$canonicalImages = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($entry in $catalog.GetEnumerator()) {
    $relative = [string]$entry.Value
    if ($relative -notmatch '^(media/[a-z0-9_.-]+\.webp|[a-z0-9_]+\.png)$') { throw "Unexpected canonical image path: $relative" }
    [void]$canonicalImages.Add("app/public/assets/$relative")
}
$rawIds = @('ct_head_hema', 'ct_lung', 'ct_wrist_simulated')
foreach ($rawId in $rawIds) {
    if (-not $catalog.Contains($rawId) -or $catalog[$rawId] -ne "$rawId.png") { throw "Numerical image must remain original PNG: $rawId" }
}

function Test-IncludedPath {
    param([string]$File)
    # No credentials, local runtime output, dependency trees, or development pages.
    if ($File -match '(^|/)(\.git|node_modules|dist|dist-ssr|optimized|auditions|\.codex|\.ssh|\.aws)(/|$)' -or
        $File -match '(^|/)(\.env([^/]*$)|credentials\.json$|secrets\.json$)' -or
        $File -match '\.(log|pid|tmp|bak|local|pem|key|pfx|p12|sqlite|db)$' -or
        ($File.EndsWith('.html') -and $File -ne 'app/index.html') -or
        $File -in @('app/src/lib/image-assets.generated.json', 'app/image-delivery-report.json')) { return $false }
    if ($File -in $rootFiles -or $File -in $storyFiles) { return $true }
    if ($File -match '^\.github/workflows/[^/]+\.ya?ml$') { return $true }
    # Legacy one-off pw_ scripts and auditions live in archive/ and are not part
    # of the current source handoff. Active regression tests stay in app/tests/.
    if ($File -match '^app/([^/]+)$' -and $Matches[1] -in $appRootFiles) { return $true }
    if ($File -match '^app/[^/]+\.(py|mjs|cjs|js|ps1)$') { return $true }
    if ($File -match '^app/src/.+\.(ts|tsx|js|jsx|css|json|svg)$') { return $true }
    if ($File -match '^app/(tests|scripts)/.+\.(mjs|cjs|js|ts|tsx|py|ps1|json|md)$') { return $true }
    if ($canonicalImages.Contains($File)) { return $true }
    if ($File -match '^app/public/assets/ct-sequences/[a-z0-9_.-]+\.webp$') { return $true }
    if ($File -match '^app/public/audio/[^/]+\.(mp3|ogg|wav)$') { return $true }
    if ($File -eq 'app/public/ct-sequences-sources.txt') { return $true }
    if ($File -match '^docs/.+\.(md|json|txt|csv|png|webp)$') { return $true }
    if ($File -match '^scripts/.+\.(ps1|py|mjs|cjs|js|ts|md|json)$') { return $true }
    return $false
}

[string[]]$selected = @($candidates | Where-Object { (Test-IncludedPath $_) -and (Get-SafeSourcePath $_) })
[Array]::Sort($selected, [StringComparer]::Ordinal)
$selectedSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($file in $selected) { [void]$selectedSet.Add($file) }
$required = @('AGENTS.md', 'README.md', 'HANDOFF.md', 'LICENSE', 'NOTICE',
    'app/index.html', 'app/package.json', 'app/package-lock.json', 'app/src/lib/image-assets.catalog.json',
    'app/src/lib/image-previews.catalog.json', 'app/scripts/import-image.mjs', 'docs/media-import.md', 'app/public/ct-sequences-sources.txt') + $voiceManuscripts + $storyFiles + @($canonicalImages)
foreach ($file in $required) { if (-not $selectedSet.Contains($file)) { throw "Required tracked/nonignored file missing from export: $file" } }
if (-not @($selected | Where-Object { $_ -match '^\.github/workflows/[^/]+\.ya?ml$' }).Count) { throw 'GitHub Pages workflow missing from export.' }
$untrackedIncluded = @($selected | Where-Object { -not $tracked.Contains($_) })
$sourceBytes = [long]0
foreach ($file in $selected) { $sourceBytes += ([IO.FileInfo](Get-SafeSourcePath $file)).Length }
if ($PlanOnly) {
    [pscustomobject]@{ revision = $revision; branch = $branch; workingTreeDirty = $workingTreeDirty; files = $selected.Count;
        sourceBytes = $sourceBytes; untrackedIncluded = $untrackedIncluded; selected = $selected } | ConvertTo-Json -Depth 5
    return
}
if ($workingTreeDirty) { Write-Warning 'Working tree is not clean. This package will be explicitly marked as a working-tree snapshot, not an exact copy of HEAD.' }

$downloadsRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads'
$downloadsRoot = [IO.Path]::GetFullPath($downloadsRoot)
if (Test-WithinDirectory $repoRoot $downloadsRoot) { throw 'Downloads must be outside the repository.' }
if (-not (Test-Path -LiteralPath $downloadsRoot -PathType Container)) { throw "Downloads directory not found: $downloadsRoot" }
if (([IO.File]::GetAttributes($downloadsRoot) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Downloads is a link/junction; resolve and review its real location before configuring an export target.' }
$exportName = "Midnight-Radiology-Kimi-$(Get-Date -Format 'yyyyMMdd-HHmmss')-$shortRevision-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
$exportRoot = [IO.Path]::GetFullPath((Join-Path $downloadsRoot $exportName))
if (-not (Test-WithinDirectory $downloadsRoot $exportRoot) -or (Test-Path -LiteralPath $exportRoot)) { throw 'Export directory must be new and inside Downloads.' }
[void](New-Item -ItemType Directory -Path $exportRoot -ErrorAction Stop)
$payloadRoot = Join-Path $exportRoot 'source'
[void](New-Item -ItemType Directory -Path $payloadRoot -ErrorAction Stop)
$hashes = [Collections.Generic.Dictionary[string,string]]::new([StringComparer]::Ordinal)
try {
    foreach ($file in $selected) {
        $sourceFile = Get-SafeSourcePath $file
        $targetFile = [IO.Path]::GetFullPath((Join-Path $payloadRoot $file))
        if (-not (Test-WithinDirectory $payloadRoot $targetFile)) { throw "Export target escaped: $file" }
        [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($targetFile))
        [IO.File]::Copy($sourceFile, $targetFile, $false)
        $sourceHash = (Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash.ToLowerInvariant()
        $targetHash = (Get-FileHash -LiteralPath $targetFile -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($sourceHash -ne $targetHash) { throw "File changed while copying: $file" }
        $hashes.Add($file, $targetHash)
    }
    $utc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    $revisionText = "Repository: https://github.com/mylyu/Midnight-Radiology`nCommit: $revision`nBranch: $branch`nExportedUTC: $utc`nWorkingTreeDirty: $workingTreeDirty`nIncludedUntracked: $($untrackedIncluded.Count)`n"
    if ($untrackedIncluded.Count) { $revisionText += "UntrackedPaths:`n" + ($untrackedIncluded -join "`n") + "`n" }
    $intro = @'
# 给 Kimi 的项目导入与交接说明

请以本包 `app/` 为唯一可运行源码，先读根目录 `AGENTS.md`、`HANDOFF.md` 顶部最新记录和 `REVISION.txt`，再按任务查 `README.md`、`深夜影像科/全书剧情总线.md` 及 `docs/validation-guide.md`。局部修改不默认反复完整通关或重跑全部历史冻结；按风险选择验证，未跑的范围如实注明。不要从旧压缩包、根目录旧稿或历史PNG恢复游戏。该包是源码交接，不是包含Git历史的仓库备份。

配音底稿位于 `docs/voices/`。仓库的旧试听、图像备份和早期临时脚本已归入 `archive/`，不放入本包；当前回归测试在 `app/tests/`，归档脚本不是当前验证入口。

## 本地启动与构建

使用 Node.js 20（20.19或以上），进入 `app/`：

```sh
cd app
npm ci
npm run dev
# 完成修改后
npm run build
```

请保留已有剧情、章节进度、存档键、奖励、调窗和已确认声音；按用户新要求最小修改，并更新交接文档。当前配音没有在加载优化中重制，`app/public/audio/` 是原样保留的运行音频。

## 图片已经迁移，不要回填大PNG

- 游戏仍使用原来的逻辑图片ID；`app/src/lib/image-assets.catalog.json` 将ID映射到 `app/public/assets/media/` 的内容哈希文件。`image-previews.catalog.json` 是背景先显示的小预览。
- 不要根据过去的 `public/assets/<ID>.png` 路径，把已删除的大PNG批量补回来，也不要恢复 `optimized/` 缓存或旧生成清单。图片缺失时先核对catalog、相对部署路径及当前文件。
- 新增/替换图片请读 `docs/media-import.md`，在 `app/` 使用 `node scripts/import-image.mjs <仓库外原图绝对路径> <逻辑ID>`；已有ID须 `--replace`，小字证物可用 `--lossless`。原始素材单独保存在仓库外。
- `--replace` 不自动删除旧交付图。构建前审核输出的 `stalePathCandidates`，确认旧文件没有catalog及其他引用、并有Git提交或外部备份可恢复后，再将确认过期的文件移出 `public/assets/media/`、归档到仓库外；不要自动批量删除。否则prebuild会拒绝无引用旧版本（orphan），不能靠放宽检查绕过。
- `ct_head_hema.png`、`ct_lung.png`、`ct_wrist_simulated.png` 是调窗数值灰度源，严禁有损压缩、重绘替换或改变像素。CT运动床图还需保持透明通道及机架坐标尺寸。

## 验证、版本与许可

- `SHA256SUMS.txt` 覆盖包内每个文件（清单自身除外），路径采用相对路径和UTF-8。`REVISION.txt` 记录来源提交；若 WorkingTreeDirty 为 True，本包包含未提交修改，不能称为该提交的原样副本。
- `app/tests/` 中的LIVE冻结/历史投影审计需要完整Git历史。源码ZIP不含 `.git`，缺历史导致的测试失败不能用删测试、改宽断言或批量更新哈希解决；应在原仓库或完整克隆中验证。独立运行测试也要先查看各脚本的环境要求。
- `.github/workflows/` 保留现有GitHub Pages部署配置，完整测试pipeline脚本也保留。旧测试输出JSON和进程日志不是测试源码，不放入本包。仅安装Node依赖并运行正常构建不需要Git历史。
- 新素材须另记来源、作者/许可、生成参数、哈希和人工验收。不要篡改已经批准的历史认证manifest来自动接纳变化。
- 冠脉连续切片使用 ImageCAS 的非商业许可素材；**未来商业化前必须替换或另获商业授权**。详见 `NOTICE`、`docs/ch2-ct-sequences.md` 及 `app/public/ct-sequences-sources.txt`。本包不包含原始医学体数据。
- 项目许可见 `LICENSE` / `NOTICE`（CC BY-NC-SA 4.0，版权人 Mengye Lyu）；第三方权利仍分别适用。

本包刻意不含依赖目录、构建目录、Git历史、内部试听/开发HTML、原始大图与历史配音备份、个人环境文件或进程日志。它们没有因为打包而从原仓库删除。更详细的逐轮修改、已知问题与回退说明以 `HANDOFF.md` 为准。
'@
    [IO.File]::WriteAllText((Join-Path $payloadRoot 'KIMI_IMPORT.md'), $intro.Replace("`r`n", "`n") + "`n", $utf8)
    [IO.File]::WriteAllText((Join-Path $payloadRoot 'REVISION.txt'), $revisionText, $utf8)
    foreach ($extra in @('KIMI_IMPORT.md', 'REVISION.txt')) {
        $hashes.Add($extra, (Get-FileHash -LiteralPath (Join-Path $payloadRoot $extra) -Algorithm SHA256).Hash.ToLowerInvariant())
    }
    # Refuse a mixed export if another task edits/commits while the copy is running.
    foreach ($file in $selected) {
        if ((Get-FileHash -LiteralPath (Get-SafeSourcePath $file) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hashes[$file]) { throw "Source changed during export: $file" }
    }
    if ((Invoke-RepoGit @('rev-parse', 'HEAD')).Trim() -ne $revision -or (Invoke-RepoGit @('status', '--porcelain=v1', '-z')) -ne $statusBefore) { throw 'Repository changed during export; inspect the unfinished output and run again after development stops.' }
    [string[]]$hashedNames = @($hashes.Keys)
    [Array]::Sort($hashedNames, [StringComparer]::Ordinal)
    $checksumText = (@($hashedNames | ForEach-Object { "$($hashes[$_])  $_" }) -join "`n") + "`n"
    [IO.File]::WriteAllText((Join-Path $payloadRoot 'SHA256SUMS.txt'), $checksumText, $utf8)
    $zipPath = Join-Path $exportRoot "$exportName.zip"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($payloadRoot, $zipPath, [IO.Compression.CompressionLevel]::Optimal, $false, $utf8)
    $archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach ($entry in $archive.Entries) {
            $entryName = $entry.FullName.Replace('\', '/')
            if (-not $seen.Add($entryName)) { throw "Duplicate ZIP entry: $entryName" }
            $stream = $entry.Open()
            $digest = [Security.Cryptography.SHA256]::Create()
            try { $actualHash = [BitConverter]::ToString($digest.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
            finally { $digest.Dispose(); $stream.Dispose() }
            $expectedHash = if ($entryName -eq 'SHA256SUMS.txt') { (Get-FileHash -LiteralPath (Join-Path $payloadRoot $entryName) -Algorithm SHA256).Hash.ToLowerInvariant() } else { $hashes[$entryName] }
            if ($actualHash -ne $expectedHash) { throw "ZIP hash verification failed: $entryName" }
        }
        if ($seen.Count -ne $hashes.Count + 1) { throw 'ZIP entry count differs from export manifest.' }
    } finally { $archive.Dispose() }
    $zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText("$zipPath.sha256", "$zipHash  $([IO.Path]::GetFileName($zipPath))`n", $utf8)
    [pscustomobject]@{ zip = $zipPath; sourceDirectory = $payloadRoot; revision = $revision; workingTreeDirty = $workingTreeDirty;
        sourceFiles = $selected.Count; zipFiles = $hashes.Count + 1; zipBytes = ([IO.FileInfo]$zipPath).Length; zipSha256 = $zipHash;
        verification = 'Every ZIP entry decoded and SHA256 verified; source unchanged during export' } | ConvertTo-Json -Depth 4
} catch {
    Write-Warning "Export not completed. Original repository is untouched; unfinished files were retained for inspection at: $exportRoot"
    throw
}
