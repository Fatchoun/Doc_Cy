function parseQA(text) {
  if (!text) return [];
  const blocks = text.split(/\n{2,}/);
  const items = []; let cur = null;
  for (const block of blocks) {
    const t = block.trim();
    if (!t) continue;
    if (/^(Q\s*:|В\s*:|Question\s*:|Вопрос\s*:|\d+[\.\)]\s*)/i.test(t)) {
      if (cur) items.push(cur);
      cur = { q: t.replace(/^(Q\s*:|В\s*:|Question\s*:|Вопрос\s*:|\d+[\.\)]\s*)/i, '').trim(), a: '' };
    } else if (/^(A\s*:|Р\s*:|Answer\s*:|Ответ\s*:|R\s*:)/i.test(t)) {
      if (cur) cur.a = t.replace(/^(A\s*:|Р\s*:|Answer\s*:|Ответ\s*:|R\s*:)/i, '').trim();
    } else {
      if (cur && !cur.a) cur.a = t;
      else if (!cur) cur = { q: t, a: '' };
    }
  }
  if (cur) items.push(cur);
  return items;
}

function QACol({ items, headerClass, flag, label }) {
  return (
    <div className="qa-col">
      <div className={`qa-col-header ${headerClass}`}>
        <span>{flag}</span> {label}
      </div>
      <div className="qa-list">
        {!items.length ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: 8 }}>
            Fichier non disponible
          </div>
        ) : items.map((item, i) => (
          <div key={i} className="qa-item">
            <div className="qa-question">
              <span className="q-badge">Q{i + 1}</span>
              {item.q}
            </div>
            {item.a && (
              <div className="qa-answer">
                <span className="a-badge">R</span>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QASection({ contentRu, contentFr }) {
  const qaRu = parseQA(contentRu);
  const qaFr = parseQA(contentFr);

  return (
    <div className="qa-panel">
      <div className="qa-columns">
        <QACol items={qaRu} headerClass="ru" flag="🇷🇺" label="Russe" />
        <QACol items={qaFr} headerClass="fr" flag="🇫🇷" label="Français" />
      </div>
    </div>
  );
}
