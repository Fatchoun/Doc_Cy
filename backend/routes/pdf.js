const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { extractFile, SUPPORTED_EXTS } = require('../lib/extractors');

const router = express.Router();

const MIME_WHITELIST = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint',                                               // .ppt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',    // .docx
  'application/msword',                                                          // .doc
  'application/octet-stream', // Some browsers send this for .ppt/.pptx
];

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (SUPPORTED_EXTS.includes(ext) || MIME_WHITELIST.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error(`Format non supporté. Formats acceptés : ${SUPPORTED_EXTS.join(', ')}`));
  }
});

// POST /api/pdf/extract  — accepts PDF, PPTX, PPT, DOCX
router.post('/extract', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

  // Rename temp file to have the correct extension (needed by extractors)
  const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
  const tmpPath = req.file.path + ext;
  try {
    fs.renameSync(req.file.path, tmpPath);
    const text = await extractFile(tmpPath);
    if (!text) return res.status(400).json({ error: 'Impossible d\'extraire le texte de ce fichier' });

    res.json({
      text,
      filename: req.file.originalname || 'document' + ext,
      pages: null,
      chars: text.length,
      format: ext.slice(1).toUpperCase()
    });
  } catch (e) {
    res.status(500).json({ error: `Extraction échouée : ${e.message}` });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
    try { fs.unlinkSync(req.file.path); } catch {}
  }
});

module.exports = router;
