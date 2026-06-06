require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const coursesRouter     = require('./routes/courses');
const aiRouter          = require('./routes/ai');
const pdfRouter         = require('./routes/pdf');
const pptTranslateRouter = require('./routes/pptTranslate');

const app = express();
const PORT = process.env.PORT || 3001;
const COURSES_DIR = path.join(__dirname, '..', 'courses');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/courses', coursesRouter(COURSES_DIR));
app.use('/api/ai', aiRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/ppt', pptTranslateRouter);

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  ai: !!process.env.ANTHROPIC_API_KEY
}));

// Catch-all error handler — ensures we never send an empty body
app.use((err, req, res, next) => {
  if (!res.headersSent) res.status(500).json({ error: err.message || 'Erreur serveur' });
});

app.listen(PORT, () => {
  const aiStatus = process.env.ANTHROPIC_API_KEY ? '✓ IA active' : '⚠ Clé API manquante';
  console.log(`Backend: http://localhost:${PORT}  —  ${aiStatus}`);
});
