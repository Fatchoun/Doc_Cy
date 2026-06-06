import { useState } from 'react';

const LANGUAGES = [
  { value: 'Anglais', label: '🇬🇧 Anglais' },
  { value: 'Français', label: '🇫🇷 Français' },
  { value: 'Russe', label: '🇷🇺 Russe' },
  { value: 'Arabe', label: '🇸🇦 Arabe' },
  { value: 'Allemand', label: '🇩🇪 Allemand' },
  { value: 'Espagnol', label: '🇪🇸 Espagnol' },
  { value: 'Italien', label: '🇮🇹 Italien' },
  { value: 'Portugais', label: '🇵🇹 Portugais' },
  { value: 'Turc', label: '🇹🇷 Turc' },
  { value: 'Chinois', label: '🇨🇳 Chinois' },
];

export default function SideBySide({ contentRu, contentFr }) {
  const [targetLang, setTargetLang] = useState('Anglais');
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [transError, setTransError] = useState(null);

  async function translate() {
    const src = contentFr || contentRu || '';
    if (!src.trim()) return;
    setTranslating(true); setTransError(null); setTranslation(null);
    try {
      const r = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: src, targetLang, sourceLang: contentFr ? 'Français' : 'Russe' })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setTranslation(d.translation);
    } catch (e) {
      setTransError(e.message);
    } finally {
      setTranslating(false);
    }
  }

  const cols = translation ? 'cols-3' : 'cols-2';

  return (
    <div className="sbs-wrapper">
      <div className="sbs-toolbar">
        <span className="sbs-toolbar-label">Traduire vers :</span>
        <select
          className="select-styled"
          value={targetLang}
          onChange={e => { setTargetLang(e.target.value); setTranslation(null); }}
        >
          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <button className="btn btn-primary" onClick={translate} disabled={translating || (!contentRu && !contentFr)}>
          {translating ? <><div className="spinner spinner-sm" /> Traduction…</> : '⟶ Traduire'}
        </button>
        {translation && (
          <button className="btn btn-ghost" onClick={() => setTranslation(null)}>✕ Fermer</button>
        )}
        {transError && <span style={{ fontSize: '0.75rem', color: 'var(--red-light)' }}>⚠ {transError}</span>}
      </div>

      <div className={`sbs-grid ${cols}`}>
        <div className="lang-panel">
          <div className="lang-header ru">
            <div className="lang-header-left">
              <span className="flag">🇷🇺</span>
              <span className="lang-label">RU</span>
            </div>
          </div>
          <div className={`lang-content ${!contentRu ? 'empty' : ''}`}>
            {contentRu ? <pre>{contentRu}</pre> : <span>Fichier non disponible</span>}
          </div>
        </div>

        <div className="lang-panel">
          <div className="lang-header fr">
            <div className="lang-header-left">
              <span className="flag">🇫🇷</span>
              <span className="lang-label">FR</span>
            </div>
          </div>
          <div className={`lang-content ${!contentFr ? 'empty' : ''}`}>
            {contentFr ? <pre>{contentFr}</pre> : <span>Fichier non disponible</span>}
          </div>
        </div>

        {translation && (
          <div className="lang-panel">
            <div className="lang-header translated">
              <div className="lang-header-left">
                <span className="flag">🌍</span>
                <span className="lang-label">{targetLang.toUpperCase()}</span>
              </div>
            </div>
            <div className="lang-content">
              <pre>{translation}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
