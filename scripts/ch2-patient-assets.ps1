$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.Drawing
$manifestPath = Join-Path $repoPath 'docs/ch2-patient-images.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$report = foreach ($entry in $manifest.images) {
    $assetPath = Join-Path $repoPath $entry.output
    $bitmap = [System.Drawing.Bitmap]::FromFile($assetPath)
    try {
        $transparent = 0
        $samples = 0
        for ($y = 0; $y -lt $bitmap.Height; $y += 16) {
            for ($x = 0; $x -lt $bitmap.Width; $x += 16) {
                if ($bitmap.GetPixel($x, $y).A -eq 0) { $transparent++ }
                $samples++
            }
        }
        $corners = @($bitmap.GetPixel(0, 0).A, $bitmap.GetPixel(($bitmap.Width-1), 0).A, $bitmap.GetPixel(0, ($bitmap.Height-1)).A, $bitmap.GetPixel(($bitmap.Width-1), ($bitmap.Height-1)).A)
        # Alpha 0–2/255 is visually transparent; preserve original pixels and
        # record the exact value (one chest-image corner is alpha 1).
        if (($corners | Where-Object { $_ -gt 2 }).Count -ne 0) { throw "Opaque corner: $assetPath" }
        if ($transparent / $samples -lt .25) { throw "Too little transparency: $assetPath" }
        [ordered]@{ id=$entry.id; file=$entry.output; width=$bitmap.Width; height=$bitmap.Height; corner_alpha=$corners; transparent_sample_fraction=[Math]::Round($transparent/$samples,4); sha256=(Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLower() }
    } finally { $bitmap.Dispose() }
}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $repoPath 'docs/ch2-patient-image-qa.json') -Encoding UTF8
Write-Output "PASS: $($report.Count) decoded PNGs; transparent corners, dimensions and SHA-256 recorded."
