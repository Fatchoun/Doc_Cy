const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');

const router = express.Router();
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Images et PDF uniquement'));
  }
});

const AnthropicPkg = require('@anthropic-ai/sdk');
const Anthropic = AnthropicPkg.default || AnthropicPkg;

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY non configurée — créez backend/.env avec ANTHROPIC_API_KEY=sk-ant-...');
  return new Anthropic({ apiKey: key });
}

function extractJSON(raw) {
  try { return JSON.parse(raw); } catch {}
  const cb = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (cb) try { return JSON.parse(cb[1]); } catch {}
  const arr = raw.match(/\[[\s\S]*\]/);
  if (arr) try { return JSON.parse(arr[0]); } catch {}
  throw new Error('Réponse JSON invalide du modèle. Réessayez.');
}

function send500(res, e) {
  const msg = e?.message || String(e);
  if (!res.headersSent) res.status(500).json({ error: msg });
}

// POST /api/ai/translate
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;
    if (!text?.trim() || !targetLang) return res.status(400).json({ error: 'Paramètres requis : text, targetLang' });
    const from = sourceLang ? `depuis ${sourceLang} ` : '';
    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `Traduis le texte suivant ${from}vers ${targetLang}. Retourne UNIQUEMENT la traduction, sans explication.\n\n${text}` }]
    });
    res.json({ translation: msg.content[0].text });
  } catch (e) { send500(res, e); }
});

// POST /api/ai/summarize
router.post('/summarize', async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Paramètre requis : text' });
    // 'source' means: respond in the same language as the source text
    const langInstr = (!lang || lang === 'source')
      ? 'dans la même langue que le texte source'
      : `en ${lang}`;
    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Tu es un expert en pédagogie médicale. Crée un résumé d'étude complet et structuré du contenu médical suivant. Réponds ${langInstr}. Structure avec ces sections en markdown :

# Concepts Clés
- Liste des termes et définitions essentiels

## Points Essentiels
- Les points principaux sous forme claire et mémorisable

## Mécanismes / Physiopathologie
- Mécanismes d'action, physiopathologie (si applicable)

## Présentation Clinique
- Signes, symptômes, tableaux cliniques (si applicable)

## Diagnostic & Traitement
- Critères diagnostiques, options thérapeutiques (si applicable)

## Aide-mémoire
- Mnémotechniques, acronymes et astuces de mémorisation

---
Contenu :
${text}`
      }]
    });
    res.json({ summary: msg.content[0].text });
  } catch (e) { send500(res, e); }
});

// POST /api/ai/exam
router.post('/exam', async (req, res) => {
  try {
    const { text, type, count, lang } = req.body;
    if (!text?.trim() || !type) return res.status(400).json({ error: 'Paramètres requis : text, type' });
    const numQ = Math.min(parseInt(count) || 5, 20);
    const outputLang = lang || 'Français';

    const prompts = {
      qcm: `Tu es un examinateur médical expert. À partir du contenu ci-dessous, génère exactement ${numQ} QCM en ${outputLang}. Retourne UNIQUEMENT un tableau JSON valide, aucun autre texte :
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]
"correct" est l'index 0-based.
Contenu :\n${text}`,
      tf: `Tu es un examinateur médical expert. Génère exactement ${numQ} questions Vrai/Faux en ${outputLang}. Retourne UNIQUEMENT un tableau JSON :
[{"question":"...","correct":true,"explanation":"..."}]
Contenu :\n${text}`,
      short: `Tu es un examinateur médical expert. Génère exactement ${numQ} questions à réponse courte en ${outputLang}. Retourne UNIQUEMENT un tableau JSON :
[{"question":"...","answer":"...","hints":["...","..."]}]
Contenu :\n${text}`
    };
    if (!prompts[type]) return res.status(400).json({ error: 'Type invalide : qcm | tf | short' });

    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompts[type] }]
    });
    const questions = extractJSON(msg.content[0].text);
    res.json({ questions, type });
  } catch (e) { send500(res, e); }
});

// POST /api/ai/image  (image or PDF page images)
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    const { action, lang } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const imageData = fs.readFileSync(req.file.path);
    const base64 = imageData.toString('base64');
    const mediaType = req.file.mimetype.startsWith('image/') ? req.file.mimetype : 'image/jpeg';
    const outputLang = lang || 'Français';

    const prompt = action === 'translate'
      ? `Cette image contient du texte. Extrais tout le texte visible et traduis-le en ${outputLang}.\n\n**Texte original extrait :**\n[texte]\n\n**Traduction en ${outputLang} :**\n[traduction]`
      : `Tu es un expert en éducation médicale. Analyse cette image médicale en détail en ${outputLang} :\n\n## Description\n## Structures / Éléments Clés\n## Signification Médicale\n## Points Pédagogiques\n## Corrélation Clinique`;

    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: prompt }
      ]}]
    });
    res.json({ result: msg.content[0].text });
  } catch (e) { send500(res, e); } finally {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
  }
});

module.exports = router;
