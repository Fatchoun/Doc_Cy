import { useState } from 'react';

const LANGUAGES = [
  { value: 'Français',   label: '🇫🇷 Français'   },
  { value: 'English',    label: '🇬🇧 English'    },
  { value: 'Arabe',      label: '🇸🇦 Arabe'      },
  { value: 'Allemand',   label: '🇩🇪 Allemand'   },
  { value: 'Espagnol',   label: '🇪🇸 Espagnol'   },
  { value: 'Russe',      label: '🇷🇺 Russe'      },
  { value: 'Italien',    label: '🇮🇹 Italien'    },
  { value: 'Portugais',  label: '🇵🇹 Portugais'  },
  { value: 'Turc',       label: '🇹🇷 Turc'       },
  { value: 'Chinois',    label: '🇨🇳 Chinois'    },
];

// ─── markdown renderer ────────────────────────────────────────────────────────

export function Md({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = []; let listItems = []; let key = 0;
  const flush = () => {
    if (listItems.length) { out.push(<ul key={key++}>{listItems}</ul>); listItems = []; }
  };
  const inline = (s) => {
    const parts = []; let last = 0;
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g; let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
      else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
      else if (m[4]) parts.push(<code key={m.index}>{m[4]}</code>);
      last = re.lastIndex;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts.length > 1 ? parts : s;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('# '))   { flush(); out.push(<h1 key={key++}>{inline(line.slice(2))}</h1>); }
    else if (line.startsWith('## '))  { flush(); out.push(<h2 key={key++}>{inline(line.slice(3))}</h2>); }
    else if (line.startsWith('### ')) { flush(); out.push(<h3 key={key++}>{inline(line.slice(4))}</h3>); }
    else if (line === '---') { flush(); out.push(<hr key={key++} />); }
    else if (line.startsWith('- ') || line.startsWith('* '))
      { listItems.push(<li key={key++}>{inline(line.slice(2))}</li>); }
    else { flush(); out.push(<p key={key++}>{inline(line)}</p>); }
  }
  flush();
  return <div className="md">{out}</div>;
}

// ─── api helper ───────────────────────────────────────────────────────────────

async function apiFetch(url, options) {
  const r = await fetch(url, options);
  let data;
  try { data = await r.json(); } catch { throw new Error(`Réponse invalide du serveur (${r.status})`); }
  if (!r.ok || data.error) throw new Error(data.error || `Erreur ${r.status}`);
  return data;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function SmartSummary({ courseData, externalText }) {
  const [summary,       setSummary]       = useState(null);   // original-language summary
  const [translation,   setTranslation]   = useState(null);   // translated summary
  const [tgtLang,       setTgtLang]       = useState('Français');
  const [loadingSum,    setLoadingSum]    = useState(false);
  const [loadingTrans,  setLoadingTrans]  = useState(false);
  const [error,         setError]         = useState(null);

  function getContent() {
    if (externalText) return externalText;
    const parts = [];
    if (courseData?.cours?.fr)   parts.push(courseData.cours.fr);
    if (courseData?.resume?.fr)  parts.push(courseData.resume.fr);
    if (courseData?.qa?.fr)      parts.push(courseData.qa.fr);
    if (!parts.length) {
      if (courseData?.cours?.ru)  parts.push(courseData.cours.ru);
      if (courseData?.resume?.ru) parts.push(courseData.resume.ru);
    }
    return parts.join('\n\n');
  }

  async function generate() {
    const text = getContent();
    if (!text.trim()) return;
    setLoadingSum(true); setError(null); setSummary(null); setTranslation(null);
    try {
      // lang: 'source' → backend generates in the same language as the source text
      const d = await apiFetch('/api/ai/summarize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, lang: 'source' }),
      });
      setSummary(d.summary);
    } catch (e) { setError(e.message); }
    finally { setLoadingSum(false); }
  }

  async function translate() {
    if (!summary) return;
    setLoadingTrans(true); setError(null); setTranslation(null);
    try {
      const d = await apiFetch('/api/ai/translate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: summary, targetLang: tgtLang }),
      });
      setTranslation(d.translation);
    } catch (e) { setError(e.message); }
    finally { setLoadingTrans(false); }
  }

  function reset() { setSummary(null); setTranslation(null); setError(null); }

  const hasContent  = !!getContent().trim();
  const splitView   = !!summary && (!!translation || loadingTrans);

  // ── toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="ai-toolbar">
      <span className="ai-toolbar-title">🧠 Résumé Médical IA</span>

      <button className="btn btn-primary" onClick={generate} disabled={loadingSum || loadingTrans || !hasContent}>
        {loadingSum
          ? <><div className="spinner spinner-sm" /> Génération…</>
          : summary ? '↺ Régénérer' : '✦ Générer le résumé'}
      </button>

      {/* translate controls — only visible once summary exists */}
      {summary && !loadingSum && (
        <>
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
          <span className="ai-toolbar-title">🌍 Traduire vers</span>
          <select
            className="select-styled"
            value={tgtLang}
            onChange={e => { setTgtLang(e.target.value); setTranslation(null); }}
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <button
            className="btn btn-ghost"
            onClick={translate}
            disabled={loadingTrans}
          >
            {loadingTrans
              ? <><div className="spinner spinner-sm" /> Traduction…</>
              : translation ? '↺ Retraduire' : '⟶ Traduire'}
          </button>
          {translation && (
            <button className="btn btn-ghost" onClick={() => setTranslation(null)}
              title="Fermer la traduction" style={{ padding: '7px 10px' }}>
              ✕
            </button>
          )}
        </>
      )}

      {summary && !loadingSum && (
        <button className="btn btn-ghost" onClick={reset} style={{ marginLeft: 'auto' }}>
          🗑 Effacer
        </button>
      )}
    </div>
  );

  // ── empty state ──────────────────────────────────────────────────────────
  if (!loadingSum && !summary && !error) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {toolbar}
        <div className="ai-empty">
          <div className="ai-empty-icon">🧠</div>
          <h3>Résumé Médical Intelligent</h3>
          <p>L'IA génère un résumé structuré dans la langue originale du cours — concepts clés, mécanismes, clinique et mnémotechniques.</p>
          {!hasContent && (
            <div className="warn-box" style={{ marginTop: 10, maxWidth: 340 }}>
              Ce cours n'a pas encore de contenu texte.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── loading summary ───────────────────────────────────────────────────────
  if (loadingSum) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {toolbar}
        <div className="loading-screen">
          <div className="spinner" />
          <span className="loading-text">L'IA analyse le contenu médical…</span>
        </div>
      </div>
    );
  }

  // ── error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {toolbar}
        <div style={{ padding: 20 }}><div className="error-box">⚠ {error}</div></div>
      </div>
    );
  }

  // ── single-panel view (summary only) ─────────────────────────────────────
  if (!splitView) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {toolbar}
        <div className="ai-result" style={{ flex: 1, overflowY: 'auto' }}>
          <Md text={summary} />
        </div>
      </div>
    );
  }

  // ── split view (original | translated) ───────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {toolbar}
      <div className="sbs-grid cols-2" style={{ flex: 1, overflow: 'hidden' }}>

        {/* left: original */}
        <div className="lang-panel">
          <div className="lang-header fr">
            <div className="lang-header-left">
              <span className="flag">📄</span>
              <span className="lang-label">Langue originale</span>
            </div>
          </div>
          <div className="lang-content" style={{ overflowY: 'auto' }}>
            <Md text={summary} />
          </div>
        </div>

        {/* right: translation */}
        <div className="lang-panel">
          <div className="lang-header translated">
            <div className="lang-header-left">
              <span className="flag">🌍</span>
              <span className="lang-label">{tgtLang}</span>
            </div>
          </div>
          {loadingTrans ? (
            <div className="loading-screen">
              <div className="spinner" />
              <span className="loading-text">Traduction en cours…</span>
            </div>
          ) : (
            <div className="lang-content" style={{ overflowY: 'auto' }}>
              <Md text={translation} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
