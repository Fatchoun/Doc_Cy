export default function Sidebar({ courses, selectedId, onSelect, loading, section, setSection, apiOk }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2C11 2 7 5 7 9C7 11 7.8 12.8 9.2 14.1C9.8 14.7 11 15.4 11 15.4V2Z" fill="white" opacity="0.95"/>
            <path d="M11 2C11 2 15 5 15 9C15 11 14.2 12.8 12.8 14.1C12.2 14.7 11 15.4 11 15.4V2Z" fill="white" opacity="0.6"/>
            <rect x="10" y="14" width="2" height="5.5" rx="1" fill="white" opacity="0.85"/>
            <rect x="8.5" y="17" width="5" height="1.8" rx="0.9" fill="white" opacity="0.7"/>
            <circle cx="15" cy="7" r="1.6" fill="white" opacity="0.5"/>
            <circle cx="7" cy="7" r="1.6" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <div className="logo-text">
          <h1>MediLearn Pro</h1>
          <p>Éducation Médicale IA</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {[
          { key: 'courses', icon: '📚', label: 'Cours' },
          { key: 'pdf',     icon: '📄', label: 'PDF' },
          { key: 'translate', icon: '🌍', label: 'Traducteur' },
          { key: 'image',        icon: '🔬', label: 'Images' },
          { key: 'ppt-translate', icon: '🖼️', label: 'Slides' },
        ].map(n => (
          <button key={n.key} className={`nav-btn ${section===n.key?'active':''}`} onClick={() => setSection(n.key)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-content">
        {section === 'courses' && (
          <>
            <div className="sidebar-section-label">Mes Cours</div>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', paddingTop:30 }}><div className="spinner" /></div>
            ) : !courses.length ? (
              <div style={{ padding:'14px 10px', color:'var(--text-muted)', fontSize:'0.78rem', lineHeight:1.6 }}>
                Aucun cours trouvé.<br />
                Ajoutez un dossier dans{' '}
                <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:4, fontSize:'0.74rem' }}>courses/</code>
              </div>
            ) : (
              courses.map((c, i) => (
                <div key={c.id} className={`course-item ${selectedId===c.id?'active':''}`} onClick={() => onSelect(c.id)}>
                  <div className="course-item-tag">Cours {String(i+1).padStart(2,'0')}</div>
                  <h3>{c.title}</h3>
                  {c.description && <p>{c.description}</p>}
                </div>
              ))
            )}
          </>
        )}

        {section === 'pdf' && (
          <div style={{ padding:'14px 10px', color:'var(--text-muted)', fontSize:'0.78rem', lineHeight:1.6 }}>
            <strong style={{ color:'var(--text-secondary)' }}>Analyseur PDF</strong><br />
            Uploadez un PDF, PPTX, PPT ou DOCX pour le résumer, examiner ou traduire.
          </div>
        )}

        {section === 'translate' && (
          <div style={{ padding:'14px 10px', color:'var(--text-muted)', fontSize:'0.78rem', lineHeight:1.6 }}>
            <strong style={{ color:'var(--text-secondary)' }}>Traducteur Libre</strong><br />
            Traduisez n'importe quel texte médical vers 12 langues.
          </div>
        )}

        {section === 'image' && (
          <div style={{ padding:'14px 10px', color:'var(--text-muted)', fontSize:'0.78rem', lineHeight:1.6 }}>
            <strong style={{ color:'var(--text-secondary)' }}>Analyse d'Images</strong><br />
            Expliquez ou traduisez des images médicales avec l'IA.
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className={`api-dot ${apiOk?'':'off'}`} />
        <span className="api-status-text">{apiOk ? 'IA active' : 'Clé API requise'}</span>
      </div>
    </div>
  );
}
