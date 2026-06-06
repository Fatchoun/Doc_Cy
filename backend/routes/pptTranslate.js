require('dotenv').config();
const express    = require('express');
const multer     = require('multer');
const os         = require('os');
const fs         = require('fs');
const path       = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { parsePptx, extractTextMap, applyTranslations } = require('../lib/pptxParser');

const AnthropicPkg = require('@anthropic-ai/sdk');
const Anthropic    = AnthropicPkg.default || AnthropicPkg;
const client       = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const execFileAsync = promisify(execFile);
const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pptx') return cb(null, true);
    cb(new Error('Seul le format PPTX (.pptx) est supporté pour la prévisualisation'));
  },
});

// ─── PowerPoint → PNG export via COM automation ───────────────────────────────

async function exportSlidesToImages(pptxPath, slideCount) {
  const uid      = Date.now();
  const outDir   = path.join(os.tmpdir(), `ppt_imgs_${uid}`);
  const psFile   = path.join(os.tmpdir(), `ppt_exp_${uid}.ps1`);

  fs.mkdirSync(outDir, { recursive: true });

  // Single-quote-safe paths for PowerShell literal strings
  const pptxPs  = pptxPath.replace(/'/g, "''");
  const outDirPs = outDir.replace(/'/g, "''");

  const ps1 = `$ErrorActionPreference = 'Stop'
$pptApp = $null
try {
  # Kill any non-responsive PowerPoint instances left from prior runs
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
  // Keep a debug copy so it can be inspected if the script fails
  fs.writeFileSync(path.join(os.tmpdir(), 'ppt_last_export.ps1'), ps1, 'utf8');

  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', psFile,
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

// POST /api/ppt/parse — upload PPTX, return full slide data + high-quality images
router.post('/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
  const tmpPath = req.file.path + '.pptx';
  try {
    fs.renameSync(req.file.path, tmpPath);
    const data = parsePptx(tmpPath);

    // Export each slide to PNG via PowerPoint COM for pixel-perfect preview
    let slideImages = null;
    try {
      slideImages = await exportSlidesToImages(tmpPath, data.slides.length);
      console.log(`[ppt] Exported ${data.slides.length} slides to PNG`);
    } catch (imgErr) {
      console.warn('[ppt] PowerPoint image export failed (HTML fallback):', imgErr.message, '\nstderr:', imgErr.stderr, '\nstdout:', imgErr.stdout);
    }

    res.json({
      ...data,
      filename:    req.file.originalname,
      slideCount:  data.slides.length,
      slideImages,                       // null → frontend uses HTML rendering
    });
  } catch (e) {
    res.status(500).json({ error: `Parsing échoué : ${e.message}` });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
    try { fs.unlinkSync(req.file.path); } catch {}
  }
});

// POST /api/ppt/translate-text — translate a text map (JSON), return translated map
router.post('/translate-text', async (req, res) => {
  const { textMap, targetLang, sourceLang } = req.body || {};
  if (!textMap || !targetLang) return res.status(400).json({ error: 'textMap et targetLang requis' });

  const keys = Object.keys(textMap);
  if (!keys.length) return res.json({ translatedMap: {} });

  const CHUNK         = 80;
  const translatedMap = {};

  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    const batch = {};
    chunk.forEach(k => { batch[k] = textMap[k]; });

    const prompt =
      `Translate the following JSON object from ${sourceLang || 'auto-detect'} to ${targetLang}.\n` +
      `RULES:\n` +
      `- Keep every key exactly as-is (they are position identifiers)\n` +
      `- Only translate the string values\n` +
      `- Preserve spacing and punctuation structure within each value\n` +
      `- Output ONLY valid JSON — no markdown, no explanation\n\n` +
      JSON.stringify(batch);

    try {
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      let raw = resp.content[0].text.trim();
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const start  = raw.indexOf('{');
      const end    = raw.lastIndexOf('}');
      const parsed = JSON.parse(raw.slice(start, end + 1));
      Object.assign(translatedMap, parsed);
    } catch {
      chunk.forEach(k => { translatedMap[k] = textMap[k]; });
    }
  }

  res.json({ translatedMap });
});

module.exports = router;
