import { useState, useRef } from 'react';
import { Md } from './SmartSummary';
import SmartSummary from './SmartSummary';
import ExamSimulator from './ExamSimulator';

const LANGS = [
  { v: 'Français', l: '🇫🇷 Français' }, { v: 'English', l: '🇬🇧 English' },
  { v: 'Arabe', l: '🇸🇦 Arabe' }, { v: 'Allemand', l: '🇩🇪 Allemand' },
  { v: 'Espagnol', l: '🇪🇸 Espagnol' }, { v: 'Russe', l: '🇷🇺 Russe' },
  { v: 'Italien', l: '🇮🇹 Italien' }, { v: 'Portugais', l: '🇵🇹 Portugais' },
  { v: 'Turc', l: '🇹🇷 Turc' }, { v: 'Chinois', l: '🇨🇳 Chinois' },
];

const TABS = [
  { id: 'text', label: 'Contenu', icon: '📄' },
  { id: 'resume', label: 'Résumé IA', icon: '🧠' },
  { id: 'exam', label: 'Examen', icon: '🎯' },
  { id: 'translate', label: 'Traduction', icon: '🌍' },
];

function UploadZone({ onExtracted }) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  async function handleFile(f) {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    const ok = ['pdf','pptx','ppt','docx','doc'].includes(ext);
    if (!ok) { setError('Format non supporté. Acceptés : PDF, PPTX, PPT, DOCX, DOC'); return; }
    if (f.size > 50 * 1024 * 1024) { setError('Fichier trop volumineux (max 50 Mo)'); return; }
    setLoading(true); setError(null);
    try {
      const form = new FormData();
      form.append('pdf', f);
      const r = await fetch('/api/pdf/extract', { method: 'POST', body: form });
      let d;
      try { d = await r.json(); } catch { throw new Error(`Réponse invalide (${r.status})`); }
      if (!r.ok || d.error) throw new Error(d.error || `Erreur ${r.status}`);
      onExtracted({ text: d.text, filename: d.filename, pages: d.pages, chars: d.chars });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:24, gap:16 }}>
      <div className="panel-header">
        <h2>📄 Analyseur de PDF Médical</h2>
        <p>Uploadez un PDF pour l'analyser, le résumer, générer un examen ou le traduire</p>
      </div>

      <div className={`drop-zone ${drag ? 'active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !loading && inputRef.current.click()}
        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
        <input ref={inputRef} type="file" accept=".pdf,.pptx,.ppt,.docx,.doc" style={{ display:'none' }}
          onChange={e => handleFile(e.target.files[0])} disabled={loading} />
        {loading ? (
          <>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <h3>Extraction du texte…</h3>
            <p>Analyse du PDF en cours, cela peut prendre quelques secondes</p>
          </>
        ) : (
          <>
            <span className="drop-icon">📄</span>
            <h3>Glissez votre document ici</h3>
            <p>PDF · PPTX · PPT · DOCX · DOC — max 50 Mo</p>
          </>
        )}
      </div>

      {error && <div className="error-box">⚠ {error}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, maxWidth:480 }}>
        {[
          { icon:'🧠', t:'Résumé IA', d:'Synthèse structurée avec mnémotechniques' },
          { icon:'🎯', t:'Examen Simulé', d:'QCM, Vrai/Faux, réponses courtes' },
          { icon:'🌍', t:'Traduction', d:'Vers 10+ langues instantanément' },
          { icon:'📋', t:'Texte Extrait', d:'Lecture du contenu brut du PDF' },
        ].map(f => (
          <div key={f.t} className="feature-card" style={{ padding:14 }}>
            <span className="feature-icon" style={{ fontSize:'1.2rem', marginBottom:6 }}>{f.icon}</span>
            <h3 style={{ fontSize:'0.78rem' }}>{f.t}</h3>
            <p style={{ fontSize:'0.7rem' }}>{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextTab({ text }) {
  return (
    <div className="lang-content" style={{ flex:1, padding:'20px 24px' }}>
      <pre style={{ whiteSpace:'pre-wrap', wordBreak:'break-word', fontFamily:'Inter,sans-serif', fontSize:'0.86rem', lineHeight:1.75, color:'var(--text)' }}>
        {text}
      </pre>
    </div>
  );
}

function TranslateTab({ text }) {
  const [tgtLang, setTgtLang] = useState('Français');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function translate() {
    setLoading(true); setError(null); setOutput('');
    try {
      const r = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: tgtLang })
      });
      let d;
      try { d = await r.json(); } catch { throw new Error(`Réponse invalide (${r.status})`); }
      if (!r.ok || d.error) throw new Error(d.error || `Erreur ${r.status}`);
      setOutput(d.translation);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div className="ai-toolbar">
        <span className="ai-toolbar-title">🌍 Traduire le PDF vers</span>
        <select className="select-styled" value={tgtLang} onChange={e => { setTgtLang(e.target.value); setOutput(''); }}>
          {LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
        </select>
        <button className="btn btn-primary" onClick={translate} disabled={loading}>
          {loading ? <><div className="spinner spinner-sm" /> Traduction…</> : '⟶ Traduire'}
        </button>
        {output && <button className="btn btn-ghost" onClick={() => setOutput('')}>✕</button>}
      </div>
      {loading && <div className="loading-screen"><div className="spinner" /><span className="loading-text">Traduction en cours…</span></div>}
      {error && <div style={{ padding:16 }}><div className="error-box">⚠ {error}</div></div>}
      {!loading && !error && !output && (
        <div className="ai-empty">
          <div className="ai-empty-icon">🌍</div>
          <h3>Traduire le document</h3>
          <p>Sélectionnez la langue cible et cliquez sur Traduire.</p>
        </div>
      )}
      {output && !loading && (
        <div className="lang-content" style={{ flex:1, padding:'20px 24px' }}>
          <pre style={{ whiteSpace:'pre-wrap', wordBreak:'break-word', fontFamily:'Inter,sans-serif', fontSize:'0.86rem', lineHeight:1.75, color:'var(--text)' }}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function PDFViewer() {
  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState('text');

  if (!doc) return <UploadZone onExtracted={d => { setDoc(d); setTab('text'); }} />;

  return (
    <div className="course-viewer">
      <div className="viewer-header">
        <div className="viewer-header-top">
          <h2 className="viewer-title" style={{ fontSize:'0.95rem' }}>📄 {doc.filename}</h2>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span className="viewer-badge">{doc.pages} pages</span>
            <button className="btn btn-ghost" style={{ fontSize:'0.72rem' }} onClick={() => setDoc(null)}>
              ✕ Fermer
            </button>
          </div>
        </div>
        <div className="viewer-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="viewer-content">
        {tab === 'text' && <TextTab text={doc.text} />}
        {tab === 'resume' && <SmartSummary externalText={doc.text} />}
        {tab === 'exam' && <ExamSimulator externalText={doc.text} />}
        {tab === 'translate' && <TranslateTab text={doc.text} />}
      </div>
    </div>
  );
}
