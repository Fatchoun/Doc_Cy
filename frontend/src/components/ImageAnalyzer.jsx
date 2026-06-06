import { useState, useRef } from 'react';
import { Md } from './SmartSummary';

const LANGS = [
  { v: 'Français', l: '🇫🇷 Français' }, { v: 'English', l: '🇬🇧 English' },
  { v: 'Arabe', l: '🇸🇦 Arabe' }, { v: 'Allemand', l: '🇩🇪 Allemand' },
  { v: 'Espagnol', l: '🇪🇸 Espagnol' }, { v: 'Russe', l: '🇷🇺 Russe' },
];

export default function ImageAnalyzer() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [action, setAction] = useState('explain');
  const [lang, setLang] = useState('Français');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  function handleFile(f) {
    if (!f || !f.type.startsWith('image/')) { setError('Veuillez sélectionner une image (JPG, PNG, WEBP…)'); return; }
    setFile(f); setResult(null); setError(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('action', action);
      form.append('lang', lang);
      const r = await fetch('/api/ai/image', { method: 'POST', body: form });
      let d;
      try { d = await r.json(); } catch { throw new Error(`Réponse invalide (${r.status})`); }
      if (!r.ok || d.error) throw new Error(d.error || `Erreur ${r.status}`);
      setResult(d.result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="image-full">
      <div className="panel-header">
        <h2>🔬 Analyseur d'Images Médicales</h2>
        <p>Expliquez des schémas anatomiques, radiographies, histologies — ou extrayez et traduisez le texte</p>
      </div>

      {!preview ? (
        <div className={`drop-zone ${drag ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current.click()}>
          <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <span className="drop-icon">🖼</span>
          <h3>Glissez une image ici</h3>
          <p>ou cliquez pour sélectionner — JPG, PNG, WEBP (max 20 Mo)</p>
          {error && <div className="error-box" style={{ marginTop:8 }}>⚠ {error}</div>}
        </div>
      ) : (
        <div className="image-row">
          <div className="image-card">
            <img src={preview} alt="Aperçu" />
            <div className="image-card-info">{file?.name} — {file ? (file.size/1024).toFixed(0) : 0} Ko</div>
          </div>

          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
            <div className="image-actions">
              {[{ v:'explain', l:'🔬 Expliquer' }, { v:'translate', l:'🌍 Traduire le texte' }].map(a => (
                <button key={a.v} className={`chip ${action===a.v?'selected':''}`} onClick={() => setAction(a.v)}>{a.l}</button>
              ))}
              <select className="select-styled" value={lang} onChange={e => setLang(e.target.value)}>
                {LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
              </select>
              <button className="btn btn-primary" onClick={analyze} disabled={loading}>
                {loading ? <><div className="spinner spinner-sm" /> Analyse…</> : '✦ Analyser'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setFile(null); setPreview(null); setResult(null); setError(null); }}>
                ✕ Changer
              </button>
            </div>

            {error && <div className="error-box">⚠ {error}</div>}

            {loading && (
              <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text-muted)', fontSize:'0.84rem' }}>
                <div className="spinner spinner-sm" /> L'IA analyse l'image…
              </div>
            )}

            {result && !loading && (
              <div className="image-result-box">
                <div className="result-box-header">
                  {action === 'explain' ? '🔬 Analyse médicale' : '🌍 Extraction & Traduction'}
                </div>
                <Md text={result} />
              </div>
            )}

            {!result && !loading && !error && (
              <div style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>
                Sélectionnez une action et cliquez sur <strong style={{ color:'var(--accent)' }}>Analyser</strong>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
