param([string]$OutputPath = (Join-Path $PSScriptRoot '../../../ch2-portraits-contact.png'))
Add-Type -AssemblyName System.Drawing
$assetDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/assets'))
$files = Get-ChildItem -LiteralPath $assetDir -Filter 'ch2_pixel_*.png' | Sort-Object Name
$cellW = 224
$cellH = 330
$canvas = [System.Drawing.Bitmap]::new(5 * $cellW, [int][Math]::Ceiling($files.Count / 5.0) * $cellH)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::FromArgb(33, 44, 60))
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$font = [System.Drawing.Font]::new('Consolas', 9)
$audit = @()
try {
  for ($i = 0; $i -lt $files.Count; $i++) {
    $img = [System.Drawing.Bitmap]::new($files[$i].FullName)
    try {
      $x = ($i % 5) * $cellW
      $y = [Math]::Floor($i / 5) * $cellH
      $scale = [Math]::Min(210.0 / $img.Width, 292.0 / $img.Height)
      $w = [int]($img.Width * $scale)
      $h = [int]($img.Height * $scale)
      $graphics.DrawImage($img, [int]($x + ($cellW - $w) / 2), [int]$y, $w, $h)
      $graphics.DrawString($files[$i].BaseName.Replace('ch2_pixel_', ''), $font, [System.Drawing.Brushes]::White, [single]($x + 5), [single]($y + 299))
      $transparent = 0
      $total = 0
      for ($py = 0; $py -lt $img.Height; $py += 20) {
        for ($px = 0; $px -lt $img.Width; $px += 20) {
          $total++
          if ($img.GetPixel($px, $py).A -eq 0) { $transparent++ }
        }
      }
      $audit += [pscustomobject]@{ File=$files[$i].Name; Width=$img.Width; Height=$img.Height; TransparentSamplePercent=[Math]::Round(100.0*$transparent/$total,1); SHA256=(Get-FileHash -LiteralPath $files[$i].FullName -Algorithm SHA256).Hash }
    } finally { $img.Dispose() }
  }
  $canvas.Save([System.IO.Path]::GetFullPath($OutputPath), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $font.Dispose(); $graphics.Dispose(); $canvas.Dispose() }
$audit | ConvertTo-Json
