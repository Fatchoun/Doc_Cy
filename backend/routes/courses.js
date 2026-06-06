const express = require('express');
const fs = require('fs');
const path = require('path');
const { extractFile } = require('../lib/extractors');
const { exportSlidesToImages, convertPptAndExport } = require('../lib/pptExporter');
const { parsePptx } = require('../lib/pptxParser');

async function readCourseFile(dirPath, filename) {
  if (!filename) return null;
  const filePath = path.join(dirPath, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return await extractFile(filePath);
  } catch (e) {
    return `(Erreur: ${e.message})`;
  }
}

function loadCourse(coursesDir, dirName) {
  const dirPath = path.join(coursesDir, dirName);
  const metaPath = path.join(dirPath, 'course.json');
  if (!fs.existsSync(metaPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  return { id: dirName, title: meta.title, description: meta.description || '', files: meta.files || {} };
}

module.exports = function(coursesDir) {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      if (!fs.existsSync(coursesDir)) return res.json([]);
      const dirs = fs.readdirSync(coursesDir).filter(d =>
        fs.statSync(path.join(coursesDir, d)).isDirectory()
      );
      const courses = dirs.map(d => loadCourse(coursesDir, d)).filter(Boolean)
        .sort((a, b) => a.title.localeCompare(b.title));
      res.json(courses);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Must be before /:id so Express doesn't treat "slides" as an id
  router.get('/:id/slides', async (req, res) => {
    try {
      const lang = req.query.lang || 'ru';
      const dirPath = path.join(coursesDir, req.params.id);
      const metaPath = path.join(dirPath, 'course.json');
      if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'Cours introuvable' });

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const f = meta.files || {};

      const filename = f[`cours_${lang}`] || (lang !== 'ru' ? f.cours_ru : f.cours_fr);
      if (!filename) return res.status(404).json({ error: 'Aucun fichier cours PPT trouvé' });

      const filePath = path.join(dirPath, filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable' });

      const ext = path.extname(filename).toLowerCase();
      let slideImages, tempPptx = null;

      if (ext === '.ppt') {
        console.log(`[courses] Converting .ppt → slides: ${filename}`);
        const result = await convertPptAndExport(filePath);
        slideImages = result.images;
        tempPptx = result.pptxPath;
      } else if (ext === '.pptx') {
        console.log(`[courses] Exporting .pptx slides: ${filename}`);
        const data = parsePptx(filePath);
        slideImages = await exportSlidesToImages(filePath, data.slides.length);
      } else {
        return res.status(400).json({ error: 'Format non supporté pour le rendu slides' });
      }

      if (tempPptx) try { fs.unlinkSync(tempPptx); } catch {}

      res.json({ slideImages, slideCount: slideImages.filter(Boolean).length });
    } catch (e) {
      console.error('[courses] /slides error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const dirPath = path.join(coursesDir, req.params.id);
      const metaPath = path.join(dirPath, 'course.json');
      if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'Cours introuvable' });

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const f = meta.files || {};

      const [coursRu, coursFr, resumeRu, resumeFr, qaRu, qaFr] = await Promise.all([
        readCourseFile(dirPath, f.cours_ru),
        readCourseFile(dirPath, f.cours_fr),
        readCourseFile(dirPath, f.resume_ru),
        readCourseFile(dirPath, f.resume_fr),
        readCourseFile(dirPath, f.qa_ru),
        readCourseFile(dirPath, f.qa_fr),
      ]);

      res.json({
        id: req.params.id,
        title: meta.title,
        description: meta.description || '',
        cours:  { ru: coursRu,  fr: coursFr  },
        resume: { ru: resumeRu, fr: resumeFr },
        qa:     { ru: qaRu,     fr: qaFr     },
        coursFiles: { ru: f.cours_ru || null, fr: f.cours_fr || null },
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
