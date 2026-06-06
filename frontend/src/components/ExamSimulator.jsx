import { useState } from 'react';

const LANGS = [
  { v: 'Français', l: '🇫🇷 Français' }, { v: 'English', l: '🇬🇧 English' },
  { v: 'Arabe', l: '🇸🇦 Arabe' }, { v: 'Espagnol', l: '🇪🇸 Espagnol' },
  { v: 'Allemand', l: '🇩🇪 Allemand' }, { v: 'Russe', l: '🇷🇺 Russe' },
];

async function apiFetch(url, options) {
  const r = await fetch(url, options);
  let data;
  try { data = await r.json(); } catch { throw new Error(`Réponse invalide du serveur (${r.status})`); }
  if (!r.ok || data.error) throw new Error(data.error || `Erreur ${r.status}`);
  return data;
}

export default function ExamSimulator({ courseData, externalText }) {
  const [type, setType] = useState('qcm');
  const [count, setCount] = useState(5);
  const [lang, setLang] = useState('Français');
  const [questions, setQuestions] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [userAnswer, setUserAnswer] = useState(null);
  const [shortText, setShortText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('config');

  function getContent() {
    if (externalText) return externalText;
    const parts = [];
    if (courseData?.cours?.fr) parts.push(courseData.cours.fr);
    if (courseData?.resume?.fr) parts.push(courseData.resume.fr);
    if (courseData?.qa?.fr) parts.push(courseData.qa.fr);
    if (!parts.length && courseData?.cours?.ru) parts.push(courseData.cours.ru);
    return parts.join('\n\n');
  }

  async function generate() {
    const text = getContent();
    if (!text.trim()) return;
    setLoading(true); setError(null);
    try {
      const d = await apiFetch('/api/ai/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type, count, lang })
      });
      setQuestions(d.questions);
      setAnswers([]); setCurrent(0); setAnswered(false);
      setUserAnswer(null); setShortText(''); setRevealed(false);
      setPhase('exam');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleAnswer(val) {
    if (answered) return;
    setUserAnswer(val); setAnswered(true);
    const q = questions[current];
    const isCorrect = type === 'qcm' ? val === q.correct : type === 'tf' ? val === q.correct : true;
    setAnswers(prev => [...prev, { q: q.question, correct: isCorrect, expl: q.explanation || q.answer }]);
  }

  function next() {
    if (current + 1 >= questions.length) { setPhase('score'); return; }
    setCurrent(c => c + 1);
    setAnswered(false); setUserAnswer(null); setShortText(''); setRevealed(false);
  }

  function reset() {
    setPhase('config'); setQuestions(null); setAnswers([]);
    setCurrent(0); setAnswered(false); setUserAnswer(null);
    setShortText(''); setRevealed(false);
  }

  const hasContent = !!getContent().trim();
  const score = answers.filter(a => a.correct).length;

  if (phase === 'config') return (
    <div className="exam-wrapper">
      <div className="ai-toolbar">
        <span className="ai-toolbar-title">🎯 Simulateur d'Examen Médical</span>
      </div>
      <div className="exam-config">
        <div className="exam-config-title">⚙ Configuration de l'examen</div>
        <div className="config-group">
          <div className="config-label">Type de questions</div>
          <div className="config-chips">
            {[{ v:'qcm', l:'📋 QCM' }, { v:'tf', l:'⚖ Vrai / Faux' }, { v:'short', l:'✏ Réponse courte' }].map(t => (
              <button key={t.v} className={`chip ${type===t.v?'selected':''}`} onClick={() => setType(t.v)}>{t.l}</button>
            ))}
          </div>
        </div>
        <div className="config-group">
          <div className="config-label">Nombre de questions</div>
          <div className="config-chips">
            {[5,10,15,20].map(n => (
              <button key={n} className={`chip ${count===n?'selected':''}`} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
        </div>
        <div className="config-group">
          <div className="config-label">Langue</div>
          <select className="select-styled" value={lang} onChange={e => setLang(e.target.value)}>
            {LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
          </select>
        </div>
        {error && <div className="error-box">⚠ {error}</div>}
        {!hasContent && <div className="warn-box">Aucun contenu texte disponible pour générer des questions.</div>}
        <button className="btn btn-primary" style={{ alignSelf:'flex-start', padding:'10px 24px', fontSize:'0.88rem' }}
          onClick={generate} disabled={loading || !hasContent}>
          {loading ? <><div className="spinner spinner-sm" /> Génération…</> : '▶ Lancer l\'examen'}
        </button>
      </div>
    </div>
  );

  if (phase === 'score') {
    const pct = Math.round((score / questions.length) * 100);
    const msg = pct >= 80 ? '🏆 Excellent !' : pct >= 60 ? '👍 Bien !' : pct >= 40 ? '📚 À revoir' : '🔄 Continuez à pratiquer';
    return (
      <div className="score-screen">
        <div className="score-ring" style={{ '--pct': `${pct}%` }}>
          <div className="score-ring-bg" />
          <div className="score-ring-inner">
            <span className="score-pct">{pct}%</span>
            <span className="score-sub">Score</span>
          </div>
        </div>
        <div className="score-title">{msg}</div>
        <div className="score-detail">{score} / {questions.length} réponses correctes</div>
        <div className="score-actions">
          <button className="btn btn-primary" onClick={generate}>↺ Nouvel examen</button>
          <button className="btn btn-ghost" onClick={reset}>⚙ Reconfigurer</button>
        </div>
        <div className="review-list" style={{ marginTop:8 }}>
          <div className="review-list-title">Révision</div>
          {answers.map((a, i) => (
            <div key={i} className={`review-item ${a.correct?'correct':'wrong'}`}>
              <span className="review-icon">{a.correct ? '✓' : '✗'}</span>
              <div>
                <div className="review-q">{a.q}</div>
                {!a.correct && a.expl && <div className="review-a">{a.expl}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const q = questions[current];
  const pctBar = Math.round(((current + (answered ? 1 : 0)) / questions.length) * 100);

  return (
    <div className="exam-wrapper">
      <div className="ai-toolbar">
        <span className="ai-toolbar-title">🎯 Examen en cours</span>
        <button className="btn btn-ghost" style={{ marginLeft:'auto', fontSize:'0.72rem' }} onClick={reset}>✕ Quitter</button>
      </div>
      <div className="exam-runner">
        <div className="exam-runner-inner">
          <div className="exam-progress-bar">
            <div className="prog-bar"><div className="prog-fill" style={{ width:`${pctBar}%` }} /></div>
            <span className="prog-text">{current + 1} / {questions.length}</span>
          </div>

          <div className="question-card">
            <div className="question-type-tag">
              {type === 'qcm' ? '📋 QCM' : type === 'tf' ? '⚖ Vrai / Faux' : '✏ Réponse courte'}
            </div>
            <div className="question-text">{q.question}</div>
          </div>

          {type === 'qcm' && (
            <div className="options-list">
              {q.options.map((opt, i) => {
                let cls = '';
                if (answered) cls = i === q.correct ? 'correct' : i === userAnswer ? 'wrong' : '';
                return (
                  <button key={i} className={`option-btn ${cls}`} disabled={answered} onClick={() => handleAnswer(i)}>
                    <span className="opt-letter">{String.fromCharCode(65+i)}</span>
                    {opt.replace(/^[A-D]\)\s*/,'')}
                  </button>
                );
              })}
            </div>
          )}

          {type === 'tf' && (
            <div className="tf-btns">
              {[true,false].map(val => {
                let cls = '';
                if (answered) cls = val === q.correct ? 'correct' : val === userAnswer ? 'wrong' : '';
                return (
                  <button key={String(val)} className={`tf-btn ${cls}`} disabled={answered} onClick={() => handleAnswer(val)}>
                    {val ? '✓ Vrai' : '✗ Faux'}
                  </button>
                );
              })}
            </div>
          )}

          {type === 'short' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <textarea className="short-input" placeholder="Rédigez votre réponse…"
                value={shortText} onChange={e => setShortText(e.target.value)} disabled={revealed} />
              {!revealed ? (
                <button className="btn btn-ghost" style={{ alignSelf:'flex-start' }}
                  onClick={() => { setRevealed(true); setAnswered(true); setAnswers(p => [...p, { q:q.question, correct:true, expl:q.answer }]); }}>
                  Voir la réponse
                </button>
              ) : (
                <div className="revealed-answer">
                  <strong>Réponse : </strong>{q.answer}
                  {q.hints?.length > 0 && <div style={{ marginTop:6, color:'var(--accent-text)', fontSize:'0.8rem' }}>💡 {q.hints.join(' · ')}</div>}
                </div>
              )}
            </div>
          )}

          {answered && q.explanation && type !== 'short' && (
            <div className="explanation-box"><strong>Explication : </strong>{q.explanation}</div>
          )}

          <div className="exam-nav">
            {answered && (
              <button className="btn btn-primary" onClick={next}>
                {current + 1 >= questions.length ? '📊 Voir les résultats' : 'Question suivante →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
