import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CourseViewer from './components/CourseViewer';
import TranslatePanel from './components/TranslatePanel';
import ImageAnalyzer from './components/ImageAnalyzer';
import PDFViewer from './components/PDFViewer';
import PPTTranslator from './components/PPTTranslator';

export default function App() {
  const [courses, setCourses] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [section, setSection] = useState('courses');
  const [apiOk, setApiOk] = useState(false);

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => { setCourses(data); setLoadingList(false); })
      .catch(() => setLoadingList(false));

    fetch('/api/health')
      .then(r => r.json())
      .then(d => setApiOk(!!d.ai))
      .catch(() => {});
  }, []);

  function selectCourse(id) {
    setSelectedId(id);
    setSection('courses');
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar
        courses={courses}
        selectedId={selectedId}
        onSelect={selectCourse}
        loading={loadingList}
        section={section}
        setSection={setSection}
        apiOk={apiOk}
      />
      <div className="main-area">
        {section === 'pdf'          ? <PDFViewer /> :
         section === 'translate'    ? <TranslatePanel /> :
         section === 'image'        ? <ImageAnalyzer /> :
         section === 'ppt-translate' ? <PPTTranslator /> :
         selectedId                 ? <CourseViewer courseId={selectedId} /> :
                                      <Welcome />}
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <div className="welcome-screen">
      <div className="welcome-logo-wrap">
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <path d="M19 4C19 4 13 8 13 15C13 18.31 14.34 21.31 16.5 23.5C17.56 24.55 19 25.5 19 25.5V4Z" fill="white" opacity="0.9"/>
          <path d="M19 4C19 4 25 8 25 15C25 18.31 23.66 21.31 21.5 23.5C20.44 24.55 19 25.5 19 25.5V4Z" fill="white" opacity="0.6"/>
          <rect x="17" y="23" width="4" height="10" rx="2" fill="white" opacity="0.85"/>
          <rect x="14" y="28" width="10" height="3" rx="1.5" fill="white" opacity="0.7"/>
          <circle cx="26" cy="12" r="3" fill="white" opacity="0.55"/>
          <circle cx="12" cy="12" r="3" fill="white" opacity="0.55"/>
        </svg>
      </div>
      <h1 className="welcome-title">MediLearn Pro</h1>
      <p className="welcome-subtitle">Plateforme d'apprentissage médical avancée</p>
      <div className="welcome-features">
        {[
          { icon:'📖', title:'Cours Bilingues',       desc:'Contenu médical côte à côte, Russe / Français' },
          { icon:'🧠', title:'Résumés IA',             desc:'Synthèse structurée avec mnémotechniques' },
          { icon:'🎯', title:'Examens Simulés',        desc:'QCM, Vrai/Faux et questions ouvertes' },
          { icon:'📄', title:'Analyse PDF',            desc:'Uploadez un PDF — résumé, examen, traduction' },
          { icon:'🌍', title:'Traduction Multi-langue', desc:'Traduisez vers 12 langues instantanément' },
          { icon:'🔬', title:'Analyse d\'Images',      desc:'Explication et traduction d\'images médicales' },
          { icon:'🖼️', title:'Slides Traduits',       desc:'Prévisualisez et traduisez vos PPTX en gardant la mise en page' },
        ].map(f => (
          <div className="feature-card" key={f.title}>
            <span className="feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
