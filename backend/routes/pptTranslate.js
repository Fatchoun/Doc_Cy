require('dotenv').config();
const express    = require('express');
const multer     = require('multer');
const os         = require('os');
const fs         = require('fs');
const path       = require('path');
const AdmZip     = require('adm-zip');
const { parsePptx } = require('../lib/pptxParser');
const { exportSlidesToImages, convertPptAndExport } = require('../lib/pptExporter');

const AnthropicPkg = require('@anthropic-ai/sdk');
const Anthropic    = AnthropicPkg.default || AnthropicPkg;
let client = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const router = express.Router();

// ─── Session store: keeps the PPTX on disk so we can re-export after translation ─

const sessions = new Map(); // id → { pptxPath, slideCount, expiry }

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.expiry < now) {
      try { fs.unlinkSync(s.pptxPath); } catch {}
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

function createSession(pptxPath, slideCount) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const stored = path.join(os.tmpdir(), `ppt_sess_${id}.pptx`);
  fs.copyFileSync(pptxPath, stored);
  sessions.set(id, { pptxPath: stored, slideCount, expiry: Date.now() + 30 * 60 * 1000 });
  return id;
}

// ─── Multer ────────────────────────────────────────────────────────────────────

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pptx' || ext === '.ppt') return cb(null, true);
    cb(new Error('Seul les formats PPT et PPTX sont supportés'));
  },
});

// ─── PPTX XML text replacement ────────────────────────────────────────────────

function xmlDecode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
}

function xmlEncode(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractParaText(paraContent) {
  const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let text = '', m;
  while ((m = re.exec(paraContent)) !== null) text += xmlDecode(m[1]);
  return text;
}

function replaceParaText(paraContent, translated) {
  // Extract first run's formatting properties
  const firstRunM = paraContent.match(/<a:r\b[^>]*>([\s\S]*?)<\/a:r>/);
  let rPr = '';
  if (firstRunM) {
    const prM = firstRunM[1].match(/<a:rPr(?:\s[^>]*)?>[\s\S]*?<\/a:rPr>|<a:rPr(?:\s[^>]*)?\/>/);
    if (prM) rPr = prM[0];
  }
  // Remove all existing runs; append single run with translated text
  const withoutRuns = paraContent.replace(/<a:r\b[^>]*>[\s\S]*?<\/a:r>/g, '');
  return withoutRuns + `<a:r>${rPr}<a:t>${xmlEncode(translated)}</a:t></a:r>`;
}

function applyTranslationsToSlideXml(xml, origToTrans) {
  return xml.replace(/<a:p\b([^>]*)>([\s\S]*?)<\/a:p>/g, (_, attrs, content) => {
    const orig = extractParaText(content).trim();
    if (!orig || !Object.prototype.hasOwnProperty.call(origToTrans, orig)) {
      return `<a:p${attrs}>${content}</a:p>`;
    }
    return `<a:p${attrs}>${replaceParaText(content, origToTrans[orig])}</a:p>`;
  });
}

async function buildTranslatedPngs(sessionId, textMap, translatedMap) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session expirée');

  // Build original-text → translated-text lookup
  const origToTrans = {};
  for (const [k, orig] of Object.entries(textMap)) {
    const trans = translatedMap[k];
    if (trans && trans !== orig) origToTrans[orig.trim()] = trans;
  }
  if (!Object.keys(origToTrans).length) return null;

  // Modify the PPTX XML in-memory
  const zip = new AdmZip(session.pptxPath);
  for (const entry of zip.getEntries()) {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName)) {
      const xml      = entry.getData().toString('utf8');
      const modified = applyTranslationsToSlideXml(xml, origToTrans);
      zip.updateFile(entry.entryName, Buffer.from(modified, 'utf8'));
    }
  }

  // Write modified PPTX to temp file
  const translatedPptxPath = path.join(os.tmpdir(), `ppt_trans_${Date.now()}.pptx`);
  zip.writeZip(translatedPptxPath);

  try {
    // Re-export translated slides through PowerPoint COM
    const images = await exportSlidesToImages(translatedPptxPath, session.slideCount);
    console.log(`[ppt] Re-exported ${session.slideCount} translated slides`);
    return images;
  } finally {
    try { fs.unlinkSync(translatedPptxPath); } catch {}
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// POST /api/ppt/parse
router.post('/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

  const origExt    = path.extname(req.file.originalname).toLowerCase();
  const isLegacy   = origExt === '.ppt';
  const uploadPath = req.file.path + origExt;
  let convertedPath = null;

  try {
    fs.renameSync(req.file.path, uploadPath);

    let data, slideImages, pptxPathForSession;

    if (isLegacy) {
      console.log('[ppt] .ppt — converting + exporting via PowerPoint COM…');
      let result;
      try {
        result = await convertPptAndExport(uploadPath);
      } catch (convErr) {
        console.error('[ppt] PPT conversion failed:', convErr.message);
        return res.status(500).json({ error: `Conversion PPT échouée : ${convErr.message}` });
      }
      convertedPath      = result.pptxPath;
      pptxPathForSession = result.pptxPath;
      data               = parsePptx(result.pptxPath);
      slideImages        = result.images;
      console.log(`[ppt] Converted + exported ${data.slides.length} slides`);
    } else {
      data               = parsePptx(uploadPath);
      pptxPathForSession = uploadPath;
      slideImages        = null;
      try {
        slideImages = await exportSlidesToImages(uploadPath, data.slides.length);
        console.log(`[ppt] Exported ${data.slides.length} slides`);
      } catch (imgErr) {
        console.warn('[ppt] Image export failed (HTML fallback):', imgErr.message);
      }
    }

    // Store PPTX for translation re-export
    let sessionId = null;
    try {
      sessionId = createSession(pptxPathForSession, data.slides.length);
    } catch (sessErr) {
      console.warn('[ppt] Could not create session:', sessErr.message);
    }

    return res.json({
      ...data,
      sessionId,
      filename:   req.file.originalname,
      slideCount: data.slides.length,
      slideImages,
    });
  } catch (e) {
    console.error('[ppt] /parse error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: `Parsing échoué : ${e.message}` });
  } finally {
    try { fs.unlinkSync(uploadPath); } catch {}
    if (convertedPath) try { fs.unlinkSync(convertedPath); } catch {}
    try { fs.unlinkSync(req.file.path); } catch {}
  }
});

// POST /api/ppt/translate-text
router.post('/translate-text', async (req, res) => {
  const { textMap, targetLang, sourceLang, sessionId } = req.body || {};
  if (!textMap || !targetLang) return res.status(400).json({ error: 'textMap et targetLang requis' });

  const keys = Object.keys(textMap);
  if (!keys.length) return res.json({ translatedMap: {}, slideImages: null });

  const CHUNK         = 40;
  const translatedMap = {};
  const from          = sourceLang || 'auto-detect';

  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    const batch = {};
    chunk.forEach(k => { batch[k] = textMap[k]; });

    const prompt =
      `You are a professional presentation translator.\n` +
      `Translate every text value in the JSON below from ${from} into ${targetLang}.\n\n` +
      `STRICT RULES:\n` +
      `- Output ONLY a valid JSON object. No markdown, no explanation, no extra text.\n` +
      `- Copy every key exactly as-is (they are internal position identifiers).\n` +
      `- Each value is one paragraph from a slide — translate it fully and naturally.\n` +
      `- Produce fluent, idiomatic ${targetLang}. Never translate word-for-word.\n` +
      `- Preserve numbers, proper nouns, brand names, and technical terms unchanged.\n` +
      `- If a value is already in ${targetLang}, copy it unchanged.\n\n` +
      JSON.stringify(batch, null, 2);

    try {
      const resp = await getClient().messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 8192,
        messages:   [{ role: 'user', content: prompt }],
      });
      let raw = resp.content[0].text.trim();
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const start  = raw.indexOf('{');
      const end    = raw.lastIndexOf('}');
      const parsed = JSON.parse(raw.slice(start, end + 1));
      Object.assign(translatedMap, parsed);
    } catch (err) {
      console.error('[ppt] translation chunk failed:', err.message);
      chunk.forEach(k => { translatedMap[k] = textMap[k]; });
    }
  }

  // Re-export slides with translated text via PowerPoint COM
  let slideImages = null;
  if (sessionId) {
    try {
      slideImages = await buildTranslatedPngs(sessionId, textMap, translatedMap);
    } catch (reErr) {
      console.warn('[ppt] Re-export failed (text-only fallback):', reErr.message);
    }
  }

  res.json({ translatedMap, slideImages });
});

// Catch multer/fileFilter errors — always return JSON
router.use((err, req, res, next) => {
  console.error('[ppt] router error:', err.message);
  if (!res.headersSent) res.status(400).json({ error: err.message || 'Erreur fichier' });
});

module.exports = router;
