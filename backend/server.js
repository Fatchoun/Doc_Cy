require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Keep the process alive — log crashes instead of exiting
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err.message);
});

const coursesRouter      = require('./routes/courses');
const aiRouter           = require('./routes/ai');
const pdfRouter          = require('./routes/pdf');
const pptTranslateRouter = require('./routes/pptTranslate');

const app = express();
const PORT = process.env.PORT || 3001;
const COURSES_DIR  = path.join(__dirname, '..', 'courses');
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the built React app (static assets: JS, CSS, images)
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

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

// SPA fallback: serve index.html for any non-API GET (handles hard refresh)
app.get('*', (req, res) => {
  const index = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(503).send('Frontend not built. Run: cd frontend && npm run build');
  }
});

app.listen(PORT, () => {
  const aiStatus   = process.env.ANTHROPIC_API_KEY ? '✓ IA active' : '⚠ Clé API manquante';
  const frontStatus = fs.existsSync(FRONTEND_DIST)  ? '✓ Frontend servi' : '⚠ Frontend non construit (npm run build)';
  console.log(`App: http://localhost:${PORT}  —  ${aiStatus}  —  ${frontStatus}`);
});
