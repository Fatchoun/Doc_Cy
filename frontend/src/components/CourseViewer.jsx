import { useState, useEffect } from 'react';
import SideBySide from './SideBySide';
import QASection from './QASection';
import SmartSummary from './SmartSummary';
import ExamSimulator from './ExamSimulator';

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
        {tab === 'cours' && (
          <SideBySide contentRu={data.cours?.ru} contentFr={data.cours?.fr} />
        )}
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
