import { useState, useEffect } from 'react';
import SideBySide from './SideBySide';
import CourseSlideViewer from './CourseSlideViewer';
import QASection from './QASection';
import SmartSummary from './SmartSummary';
import ExamSimulator from './ExamSimulator';

const PPT_EXTS = ['.ppt', '.pptx'];

const TABS = [
  { id: 'cours', label: 'Cours', icon: '📖' },
  { id: 'resume', label: 'Résumé IA', icon: '🧠' },
  { id: 'exam', label: 'Examen', icon: '🎯' },
  { id: 'qa', label: 'Q & R', icon: '❓' },
];

export default function CourseViewer({ courseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('cours');

  useEffect(() => {
    if (!courseId) return;
    setLoading(true); setError(null); setData(null);
    fetch(`/api/courses/${courseId}`)
      .then(r => { if (!r.ok) throw new Error('Cours introuvable'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [courseId]);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span className="loading-text">Chargement du cours…</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 24 }}>
      <div className="error-box">Erreur : {error}</div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="course-viewer">
      <div className="viewer-header">
        <div className="viewer-header-top">
          <h2 className="viewer-title">{data.title}</h2>
          <span className="viewer-badge">Médecine</span>
        </div>
        <div className="viewer-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="viewer-content">
        {tab === 'cours' && (() => {
          const pptRu = data.coursFiles?.ru && PPT_EXTS.includes(data.coursFiles.ru.slice(data.coursFiles.ru.lastIndexOf('.')).toLowerCase());
          const pptFr = data.coursFiles?.fr && PPT_EXTS.includes(data.coursFiles.fr.slice(data.coursFiles.fr.lastIndexOf('.')).toLowerCase());
          if (pptRu || pptFr) {
            const langs = [pptRu && 'ru', pptFr && 'fr'].filter(Boolean);
            return <CourseSlideViewer courseId={data.id} langs={langs} />;
          }
          return <SideBySide contentRu={data.cours?.ru} contentFr={data.cours?.fr} />;
        })()}
        {tab === 'resume' && (
          <SmartSummary courseData={data} />
        )}
        {tab === 'exam' && (
          <ExamSimulator courseData={data} />
        )}
        {tab === 'qa' && (
          <QASection contentRu={data.qa?.ru} contentFr={data.qa?.fr} />
        )}
      </div>
    </div>
  );
}
