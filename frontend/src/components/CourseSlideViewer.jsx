import { useState, useEffect } from 'react';

export default function CourseSlideViewer({ courseId, langs = ['ru'] }) {
  const [lang, setLang]           = useState(langs[0] || 'ru');
  const [slideImages, setImages]  = useState(null);
  const [slideCount, setCount]    = useState(0);
  const [slideIdx, setIdx]        = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    setImages(null);
    setIdx(0);

    fetch(`/api/courses/${courseId}/slides?lang=${lang}`)
      .then(r => { if (!r.ok) throw new Error('Export slides échoué'); return r.json(); })
      .then(d => { setImages(d.slideImages); setCount(d.slideCount); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, lang]);

  useEffect(() => {
    if (!slideImages?.length) return;
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setIdx(i => Math.min(slideCount - 1, i + 1));
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  setIdx(i => Math.max(0, i - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slideImages, slideCount]);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: 260 }}>
      <div className="spinner" />
      <span className="loading-text">Export des diapositives via PowerPoint…</span>
      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Peut prendre 20-40 secondes</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 24 }}>
      <div className="error-box">⚠ {error}</div>
    </div>
  );

  if (!slideImages?.length) return null;

  const currentImg = slideImages[slideIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 20px 28px' }}>

      {/* top bar: lang toggle + navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {langs.length > 1 && (
          <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
            {langs.map(l => (
              <button
                key={l}
                className={`tab-btn ${lang === l ? 'active' : ''}`}
                onClick={() => setLang(l)}
                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
              >
                {l === 'ru' ? '🇷🇺 RU' : '🇫🇷 FR'}
              </button>
            ))}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost"
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={slideIdx === 0}
        >◀</button>
        <span style={{
          fontSize: '0.84rem', color: 'var(--text-secondary)',
          fontWeight: 600, minWidth: 120, textAlign: 'center',
        }}>
          Diapo {slideIdx + 1} / {slideCount}
        </span>
        <button
          className="btn btn-ghost"
          onClick={() => setIdx(i => Math.min(slideCount - 1, i + 1))}
          disabled={slideIdx === slideCount - 1}
        >▶</button>
      </div>

      {/* thumbnail filmstrip */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, flexShrink: 0 }}>
        {slideImages.map((src, i) => src && (
          <button
            key={i}
            onClick={() => setIdx(i)}
            title={`Diapo ${i + 1}`}
            style={{
              flexShrink: 0, padding: 0, background: 'none', cursor: 'pointer',
              border: i === slideIdx ? '2px solid var(--accent)' : '2px solid var(--border)',
              borderRadius: 4, overflow: 'hidden',
              boxShadow: i === slideIdx ? '0 0 0 1px var(--accent)' : 'none',
              transition: 'border-color 0.15s',
            }}
          >
            <img src={src} alt={`${i + 1}`} style={{ width: 96, height: 54, display: 'block', objectFit: 'fill' }} />
            <div style={{
              fontSize: '0.52rem', fontWeight: 700, textAlign: 'center',
              padding: '1px 0', background: 'var(--surface-2)', color: 'var(--text-muted)',
            }}>{i + 1}</div>
          </button>
        ))}
      </div>

      {/* main slide image */}
      {currentImg && (
        <div style={{
          maxWidth: 960, margin: '0 auto', width: '100%',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
          borderRadius: 6, overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>
          <img
            src={currentImg}
            alt={`Diapo ${slideIdx + 1}`}
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
}
