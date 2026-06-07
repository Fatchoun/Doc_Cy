import { useState, useRef, useEffect, useCallback } from 'react';
import SlideRenderer from './SlideRenderer';

const LANGS = [
  { v: 'Français',   l: '🇫🇷 Français'   },
  { v: 'English',    l: '🇬🇧 English'    },
  { v: 'Arabe',      l: '🇸🇦 Arabe'      },
  { v: 'Allemand',   l: '🇩🇪 Allemand'   },
  { v: 'Espagnol',   l: '🇪🇸 Espagnol'   },
  { v: 'Russe',      l: '🇷🇺 Russe'      },
  { v: 'Italien',    l: '🇮🇹 Italien'    },
  { v: 'Portugais',  l: '🇵🇹 Portugais'  },
  { v: 'Turc',       l: '🇹🇷 Turc'       },
  { v: 'Chinois',    l: '🇨🇳 Chinois'    },
  { v: 'Japonais',   l: '🇯🇵 Japonais'   },
];

// ─── client-side text map helpers (mirrors pptxParser.js) ────────────────────

// Extract one entry per paragraph (join all runs) so Claude gets full sentences.
function extractTextMap(slides) {
  const map = {};
  slides.forEach((slide, si) =>
    slide.elements.forEach((el, ei) => {
      if (el.type !== 'text') return;
      el.paras.forEach((para, pi) => {
        const text = para.runs.map(r => r.text).join('');
        if (text.trim()) map[`${si}_${ei}_${pi}`] = text;
      });
    })
  );
  return map;
}

// Apply paragraph-level translations: collapse runs into one, keep first run's formatting.
function applyTranslations(slides, tMap) {
  return slides.map((slide, si) => ({
    ...slide,
    elements: slide.elements.map((el, ei) => {
      if (el.type !== 'text') return el;
      return {
        ...el,
        paras: el.paras.map((para, pi) => {
          const k = `${si}_${ei}_${pi}`;
          if (!(k in tMap)) return para;
          const base = para.runs[0] || {};
          return { ...para, runs: [{ ...base, text: tMap[k] }] };
        }),
      };
    }),
  }));
}

// ─── measure container width ──────────────────────────────────────────────────

function useWidth(ref) {
  // seed with a reasonable estimate so the first render isn't tiny
  const [w, setW] = useState(() => Math.max((typeof window !== 'undefined' ? window.innerWidth : 1200) - 340, 400));
  useEffect(() => {
    if (!ref.current) return;
    setW(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver(es => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return w;
}

// ─── thumbnail ────────────────────────────────────────────────────────────────

const THUMB_W = 96;

function Thumb({ slide, slideW, slideH, index, active, onClick, bgImage }) {
  const thumbH = Math.round(THUMB_W / (slideW / slideH));
  return (
    <button
      onClick={onClick}
      title={`Slide ${index + 1}`}
      style={{
        flexShrink:      0,
        width:           THUMB_W,
        height:          thumbH,
        padding:         0,
        border:          active ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius:    4,
        overflow:        'hidden',
        cursor:          'pointer',
        background:      'none',
        position:        'relative',
        boxShadow:       active ? '0 0 0 1px var(--accent)' : 'none',
        transition:      'border-color 0.15s',
      }}
    >
      <SlideRenderer
        slide={slide}
        slideW={slideW}
        slideH={slideH}
        containerWidth={THUMB_W}
        bgImage={bgImage}
      />
      <div style={{
        position:   'absolute',
        bottom:     2,
        right:      3,
        fontSize:   '0.52rem',
        fontWeight: 700,
        color:      '#fff',
        textShadow: '0 0 4px #000, 0 0 4px #000',
        lineHeight: 1,
        pointerEvents: 'none',
      }}>
        {index + 1}
      </div>
    </button>
  );
}

// ─── upload zone ──────────────────────────────────────────────────────────────

function UploadZone({ onParsed }) {
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const inputRef = useRef();

  async function handleFile(f) {
    if (!f) return;
    const lname = f.name.toLowerCase();
    if (!lname.endsWith('.pptx') && !lname.endsWith('.ppt')) {
      setError('Seul les formats PPT et PPTX sont supportés.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) { setError('Fichier trop volumineux (max 50 Mo)'); return; }
    setLoading(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', f);
      const r = await fetch('/api/ppt/parse', { method: 'POST', body: form });
      let d;
      try { d = await r.json(); } catch { throw new Error(`Réponse invalide (${r.status})`); }
      if (!r.ok || d.error) throw new Error(d.error || `Erreur ${r.status}`);
      onParsed(d);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 16, overflowY: 'auto' }}>
      <div className="panel-header">
        <h2>🖼️ Traducteur de Présentations</h2>
        <p>Uploadez un fichier PPT ou PPTX — prévisualisez chaque slide avec son design original et traduisez le texte</p>
      </div>

      <div
        className={`drop-zone ${drag ? 'active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !loading && inputRef.current.click()}
        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        <input
          ref={inputRef} type="file" accept=".pptx,.ppt" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} disabled={loading}
        />
        {loading ? (
          <>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <h3>Analyse de la présentation…</h3>
            <p>Extraction des diapositives, formes, couleurs et images</p>
          </>
        ) : (
          <>
            <span className="drop-icon">🖼️</span>
            <h3>Glissez votre présentation ici</h3>
            <p>Formats .ppt et .pptx — max 50 Mo</p>
          </>
        )}
      </div>
      {loading && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8 }}>
          Génération des aperçus haute qualité via PowerPoint… (peut prendre 10-20 s)
        </p>
      )}

      {error && <div className="error-box">⚠ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, maxWidth: 480 }}>
        {[
          { icon: '🎨', t: 'Design Préservé',       d: 'Couleurs, formes, images et mise en page identiques' },
          { icon: '🌍', t: 'Traduction IA',          d: 'Texte traduit par Claude, slide par slide' },
          { icon: '📐', t: 'Positions Exactes',      d: 'Chaque élément reste à sa position d\'origine' },
          { icon: '🔄', t: 'Comparaison',            d: 'Bascule entre version originale et traduite' },
        ].map(f => (
          <div key={f.t} className="feature-card" style={{ padding: 14 }}>
            <span className="feature-icon" style={{ fontSize: '1.2rem', marginBottom: 6 }}>{f.icon}</span>
            <h3 style={{ fontSize: '0.78rem' }}>{f.t}</h3>
            <p style={{ fontSize: '0.7rem' }}>{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main viewer ──────────────────────────────────────────────────────────────

export default function PPTTranslator() {
  const [pptData,               setPptData]               = useState(null);
  const [slideImages,           setSlideImages]           = useState(null);  // original PNGs
  const [translatedSlideImages, setTranslatedSlideImages] = useState(null);  // re-exported PNGs after translation
  const [sessionId,             setSessionId]             = useState(null);
  const [slideIdx,              setSlideIdx]              = useState(0);
  const [tgtLang,               setTgtLang]               = useState('Français');
  const [view,                  setView]                  = useState('original');
  const [translating,           setTranslating]           = useState(false);
  const [translatedSlides,      setTranslatedSlides]      = useState(null);
  const [error,                 setError]                 = useState(null);

  // Measure the slide content area width
  const contentRef   = useRef();
  const contentWidth = useWidth(contentRef);
  // Leave some breathing room on both sides
  const slideWidth   = Math.max(contentWidth - 40, 200);

  // Keyboard navigation
  useEffect(() => {
    if (!pptData) return;
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setSlideIdx(i => Math.min(pptData.slides.length - 1, i + 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setSlideIdx(i => Math.max(0, i - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pptData]);

  const translate = useCallback(async () => {
    if (!pptData) return;
    setTranslating(true); setError(null);
    try {
      const textMap = extractTextMap(pptData.slides);
      const r = await fetch('/api/ppt/translate-text', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ textMap, targetLang: tgtLang, sessionId }),
      });
      let d;
      try { d = await r.json(); } catch { throw new Error(`Réponse invalide (${r.status})`); }
      if (!r.ok || d.error) throw new Error(d.error || `Erreur ${r.status}`);
      setTranslatedSlides(applyTranslations(pptData.slides, d.translatedMap));
      // If backend re-exported slides with translated text, use those PNGs (pixel-perfect design)
      if (d.slideImages && d.slideImages.some(Boolean)) {
        setTranslatedSlideImages(d.slideImages);
      }
      setView('translated');
    } catch (e) { setError(e.message); }
    finally { setTranslating(false); }
  }, [pptData, tgtLang, sessionId]);

  if (!pptData) {
    return <UploadZone onParsed={d => {
      setPptData(d);
      setSlideImages(d.slideImages || null);
      setSessionId(d.sessionId || null);
      setSlideIdx(0);
      setTranslatedSlides(null);
      setTranslatedSlideImages(null);
      setView('original');
    }} />;
  }

  const slides = view === 'translated' && translatedSlides ? translatedSlides : pptData.slides;
  const total  = slides.length;
  const slide  = slides[Math.min(slideIdx, total - 1)];

  // In translated view, use re-exported PNGs if available (preserves original design + translated text)
  const activeBgImages = view === 'translated' && translatedSlideImages ? translatedSlideImages : slideImages;
  // textOnly only when translated but no re-exported PNGs (HTML fallback)
  const isTextOnly = view === 'translated' && !!translatedSlides && !translatedSlideImages;

  return (
    <div className="course-viewer">

      {/* ── sticky header ── */}
      <div className="viewer-header">
        <div className="viewer-header-top">
          <h2 className="viewer-title" style={{ fontSize: '0.9rem' }}>
            🖼️ {pptData.filename}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span className="viewer-badge">{total} diapo{total > 1 ? 's' : ''}</span>
            <button className="btn btn-ghost" style={{ fontSize: '0.72rem' }}
              onClick={() => { setPptData(null); setTranslatedSlides(null); }}>
              ✕ Fermer
            </button>
          </div>
        </div>

        {/* translate toolbar */}
        <div className="ai-toolbar" style={{ borderBottom: 'none', paddingBottom: 6 }}>
          <span className="ai-toolbar-title">🌍 Traduire vers</span>
          <select className="select-styled" value={tgtLang}
            onChange={e => { setTgtLang(e.target.value); setTranslatedSlides(null); setTranslatedSlideImages(null); setView('original'); }}>
            {LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
          </select>
          <button className="btn btn-primary" onClick={translate} disabled={translating}>
            {translating
              ? <><div className="spinner spinner-sm" /> Traduction…</>
              : `⟶ Traduire les ${total} slides`}
          </button>
          {translatedSlides && !translating && (
            <span style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700 }}>✓ {tgtLang}</span>
          )}
        </div>

        {/* original / translated tabs */}
        <div className="viewer-tabs">
          <button className={`tab-btn ${view === 'original' ? 'active' : ''}`} onClick={() => setView('original')}>
            <span>📄</span> Original
          </button>
          <button
            className={`tab-btn ${view === 'translated' ? 'active' : ''}`}
            onClick={() => translatedSlides && setView('translated')}
            style={{ opacity: translatedSlides ? 1 : 0.4, cursor: translatedSlides ? 'pointer' : 'default' }}
          >
            <span>🌍</span> Traduit {translatedSlides ? `— ${tgtLang}` : ''}
          </button>
        </div>
      </div>

      {/* ── scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {error && (
          <div style={{ padding: '12px 20px 0' }}>
            <div className="error-box" style={{ margin: 0 }}>⚠ {error}</div>
          </div>
        )}

        {/* navigation bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '12px 20px 6px', flexShrink: 0 }}>
          <button className="btn btn-ghost"
            onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
            disabled={slideIdx === 0}>
            ◀
          </button>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: 110, textAlign: 'center' }}>
            Slide {slideIdx + 1} / {total}
          </span>
          <button className="btn btn-ghost"
            onClick={() => setSlideIdx(i => Math.min(total - 1, i + 1))}
            disabled={slideIdx === total - 1}>
            ▶
          </button>
        </div>

        {/* thumbnail filmstrip */}
        <div style={{ display: 'flex', gap: 6, padding: '0 20px 10px', overflowX: 'auto', flexShrink: 0 }}>
          {slides.map((s, i) => (
            <Thumb
              key={i}
              slide={s}
              slideW={pptData.slideW}
              slideH={pptData.slideH}
              index={i}
              active={i === slideIdx}
              onClick={() => setSlideIdx(i)}
              bgImage={activeBgImages?.[i]}
            />
          ))}
        </div>

        {/* ── main slide preview ── */}
        <div ref={contentRef} style={{ padding: '0 20px 28px', flexShrink: 0 }}>
          {translating ? (
            <div className="loading-screen" style={{ minHeight: 200 }}>
              <div className="spinner" />
              <span className="loading-text">Traduction des {total} diapositives…</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>IA + re-rendu via PowerPoint — peut prendre 20-40 s</span>
            </div>
          ) : (
            <div style={{
              width:        slideWidth,
              margin:       '0 auto',
              boxShadow:    '0 12px 48px rgba(0,0,0,0.6)',
              borderRadius: 6,
              overflow:     'hidden',
              border:       '1px solid var(--border)',
            }}>
              <SlideRenderer
                slide={slide}
                slideW={pptData.slideW}
                slideH={pptData.slideH}
                containerWidth={slideWidth}
                bgImage={activeBgImages?.[slideIdx]}
                textOnly={isTextOnly}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
