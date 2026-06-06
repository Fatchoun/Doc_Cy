import { useState } from 'react';

const LANGS = [
  { v: 'auto', l: '🔍 Détection auto' },
  { v: 'Français', l: '🇫🇷 Français' },
  { v: 'English', l: '🇬🇧 Anglais' },
  { v: 'Russe', l: '🇷🇺 Russe' },
  { v: 'Arabe', l: '🇸🇦 Arabe' },
  { v: 'Allemand', l: '🇩🇪 Allemand' },
  { v: 'Espagnol', l: '🇪🇸 Espagnol' },
  { v: 'Italien', l: '🇮🇹 Italien' },
  { v: 'Portugais', l: '🇵🇹 Portugais' },
  { v: 'Turc', l: '🇹🇷 Turc' },
  { v: 'Chinois', l: '🇨🇳 Chinois' },
  { v: 'Japonais', l: '🇯🇵 Japonais' },
];
const TARGET = LANGS.filter(l => l.v !== 'auto');

export default function TranslatePanel() {
  const [srcLang, setSrcLang] = useState('auto');
  const [tgtLang, setTgtLang] = useState('Français');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function translate() {
    if (!input.trim()) return;
    setLoading(true); setError(null); setOutput('');
    try {
      const r = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, targetLang: tgtLang, sourceLang: srcLang === 'auto' ? undefined : srcLang })
      });
      let d;
      try { d = await r.json(); } catch { throw new Error(`Réponse invalide du serveur (${r.status})`); }
      if (!r.ok || d.error) throw new Error(d.error || `Erreur ${r.status}`);
      setOutput(d.translation);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function swap() {
    if (srcLang === 'auto' || !output) return;
    const prevIn = input, prevOut = output, prevSrc = srcLang;
    setInput(prevOut); setOutput(prevIn);
    setSrcLang(tgtLang); setTgtLang(prevSrc);
  }

  return (
    <div className="translate-full">
      <div className="panel-header">
        <h2>🌍 Traducteur Médical</h2>
        <p>Traduction instantanée de textes médicaux vers 12 langues</p>
      </div>

      <div className="translate-controls">
        <select className="select-styled" value={srcLang} onChange={e => setSrcLang(e.target.value)}>
          {LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={swap} disabled={srcLang === 'auto' || !output} title="Inverser"
          style={{ fontSize:'1rem', padding:'6px 10px' }}>⇄</button>
        <select className="select-styled" value={tgtLang} onChange={e => setTgtLang(e.target.value)}>
          {TARGET.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
        </select>
        <button className="btn btn-primary" onClick={translate} disabled={loading || !input.trim()}>
          {loading ? <><div className="spinner spinner-sm" /> Traduction…</> : '⟶ Traduire'}
        </button>
        <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginLeft:'auto' }}>{input.length} caractères</span>
      </div>

      {error && <div className="error-box">⚠ {error}</div>}

      <div className="translate-body">
        <div className="textarea-wrap">
          <span className="textarea-label">Texte source</span>
          <textarea className="translate-input" placeholder="Collez votre texte médical ici…"
            value={input} onChange={e => { setInput(e.target.value); setOutput(''); }} />
        </div>
        <div className="textarea-wrap">
          <span className="textarea-label">Traduction — {TARGET.find(l=>l.v===tgtLang)?.l}</span>
          <div className="translate-output">
            {loading
              ? <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text-muted)' }}><div className="spinner spinner-sm" /> Traduction…</div>
              : output
              ? output
              : <span className="translate-placeholder">La traduction apparaîtra ici…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
