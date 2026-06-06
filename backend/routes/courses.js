const express = require('express');
const fs = require('fs');
const path = require('path');
const { extractFile } = require('../lib/extractors');

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
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
