const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function exportSlidesToImages(pptxPath, slideCount) {
  const uid      = Date.now();
  const outDir   = path.join(os.tmpdir(), `ppt_imgs_${uid}`);
  const psFile   = path.join(os.tmpdir(), `ppt_exp_${uid}.ps1`);

  fs.mkdirSync(outDir, { recursive: true });

  const pptxPs   = pptxPath.replace(/'/g, "''");
  const outDirPs = outDir.replace(/'/g, "''");

  const ps1 = `$ErrorActionPreference = 'Stop'
$pptApp = $null
try {
  Get-Process 'POWERPNT' -ErrorAction SilentlyContinue |
    Where-Object { -not $_.Responding } |
    Stop-Process -Force -ErrorAction SilentlyContinue
  $pptApp = New-Object -ComObject PowerPoint.Application
  $pptApp.Visible = -1
  $pptApp.WindowState = 2
  $prs = $pptApp.Presentations.Open('${pptxPs}', 0, 0, 0)
  if ($prs -eq $null) { throw 'Presentations.Open returned null' }
  $n = $prs.Slides.Count
  for ($i = 1; $i -le $n; $i++) {
    $sl = $prs.Slides.Item($i)
    $sl.Export((Join-Path '${outDirPs}' "slide_$i.png"), 'PNG', 960, 540)
  }
  $prs.Close()
  Write-Output "done:$n"
} catch {
  Write-Error "$_"
  exit 1
} finally {
  if ($pptApp -ne $null) { try { $pptApp.Quit() } catch {} }
}`;

  fs.writeFileSync(psFile, ps1, 'utf8');

  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', psFile,
    ], { timeout: 120000 });

    const images = [];
    for (let i = 1; i <= slideCount; i++) {
      const imgPath = path.join(outDir, `slide_${i}.png`);
      if (fs.existsSync(imgPath)) {
        const buf = fs.readFileSync(imgPath);
        images.push(`data:image/png;base64,${buf.toString('base64')}`);
        fs.unlinkSync(imgPath);
      } else {
        images.push(null);
      }
    }
    return images;
  } finally {
    try { fs.unlinkSync(psFile); } catch {}
    try { fs.rmdirSync(outDir); } catch {}
  }
}

// Converts a legacy .ppt to .pptx, exports slide PNGs, and returns { pptxPath, images }.
// Caller is responsible for cleaning up pptxPath when done.
async function convertPptAndExport(pptPath) {
  const uid      = Date.now();
  const pptxPath = path.join(os.tmpdir(), `ppt_conv_${uid}.pptx`);
  const outDir   = path.join(os.tmpdir(), `ppt_imgs_${uid}`);
  const psFile   = path.join(os.tmpdir(), `ppt_comb_${uid}.ps1`);

  fs.mkdirSync(outDir, { recursive: true });

  const pptPs    = pptPath.replace(/'/g, "''");
  const pptxPs   = pptxPath.replace(/'/g, "''");
  const outDirPs = outDir.replace(/'/g, "''");

  const ps1 = `$ErrorActionPreference = 'Stop'
$pptApp = $null
try {
  Get-Process 'POWERPNT' -ErrorAction SilentlyContinue |
    Where-Object { -not $_.Responding } |
    Stop-Process -Force -ErrorAction SilentlyContinue
  $pptApp = New-Object -ComObject PowerPoint.Application
  $pptApp.Visible = -1
  $pptApp.WindowState = 2
  $prs = $pptApp.Presentations.Open('${pptPs}', 0, 0, 0)
  if ($prs -eq $null) { throw 'Presentations.Open returned null' }
  $prs.SaveAs('${pptxPs}', 24)
  $n = $prs.Slides.Count
  for ($i = 1; $i -le $n; $i++) {
    $sl = $prs.Slides.Item($i)
    $sl.Export((Join-Path '${outDirPs}' "slide_$i.png"), 'PNG', 960, 540)
  }
  $prs.Close()
  Write-Output "done:$n"
} catch {
  Write-Error "$_"
  exit 1
} finally {
  if ($pptApp -ne $null) { try { $pptApp.Quit() } catch {} }
}`;

  fs.writeFileSync(psFile, ps1, 'utf8');

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', psFile,
    ], { timeout: 180000 });

    const m = (stdout || '').match(/done:(\d+)/);
    const n = m ? parseInt(m[1], 10) : 0;

    const images = [];
    for (let i = 1; i <= n; i++) {
      const imgPath = path.join(outDir, `slide_${i}.png`);
      if (fs.existsSync(imgPath)) {
        const buf = fs.readFileSync(imgPath);
        images.push(`data:image/png;base64,${buf.toString('base64')}`);
        fs.unlinkSync(imgPath);
      } else {
        images.push(null);
      }
    }
    return { pptxPath, images };
  } finally {
    try { fs.unlinkSync(psFile); } catch {}
    try { fs.rmdirSync(outDir); } catch {}
  }
}

module.exports = { exportSlidesToImages, convertPptAndExport };
