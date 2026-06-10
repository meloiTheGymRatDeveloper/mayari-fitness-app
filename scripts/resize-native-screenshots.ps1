Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\tablet-screenshots"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$targetW = 1080
$targetH = 1920

$nativeScreens = @(
  @{ src = "Search.png";               dst = "7-Barcode-Scanner.png" },
  @{ src = "Analyze_Photo_Result.png"; dst = "8-Photo-Result.png" },
  @{ src = "Logging Options.png";      dst = "3b-Logging-Options-alt.png" },
  @{ src = "Suggested Plan.png";       dst = "5b-Workout-Suggestion.png" }
)

$rootDir = Join-Path $PSScriptRoot ".."

foreach ($item in $nativeScreens) {
  $srcPath = Join-Path $rootDir $item.src
  if (-not (Test-Path $srcPath)) {
    Write-Host "Skipping (not found): $($item.src)"
    continue
  }

  $srcImg = [System.Drawing.Image]::FromFile($srcPath)
  $srcW   = $srcImg.Width
  $srcH   = $srcImg.Height

  # Scale to fill width, then crop height from center
  $scale  = $targetW / $srcW
  $newW   = $targetW
  $newH   = [int]($srcH * $scale)

  $scaled = New-Object System.Drawing.Bitmap($newW, $newH)
  $g = [System.Drawing.Graphics]::FromImage($scaled)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($srcImg, 0, 0, $newW, $newH)
  $g.Dispose()
  $srcImg.Dispose()

  # Crop to target height from top
  $cropH  = [Math]::Min($newH, $targetH)
  $cropY  = 0
  $result = New-Object System.Drawing.Bitmap($targetW, $targetH)
  $gd     = [System.Drawing.Graphics]::FromImage($result)
  $gd.Clear([System.Drawing.Color]::FromArgb(10, 10, 30))
  $gd.DrawImage($scaled, 0, $cropY, [System.Drawing.Rectangle]::new(0, 0, $targetW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)
  $gd.Dispose()
  $scaled.Dispose()

  $dstPath = Join-Path $outDir $item.dst
  $result.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $result.Dispose()

  Write-Host "Saved: $($item.dst)"
}

Write-Host "`nNative screenshots resized to ${targetW}x${targetH}."
