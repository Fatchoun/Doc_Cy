export default function CourseList({ courses, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <div className="sidebar-list">
        <div className="loading" style={{ flexDirection: 'column', gap: 8, paddingTop: 40 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
          <span>Chargement…</span>
        </div>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="sidebar-list" style={{ padding: '20px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Aucun cours trouvé.<br />Ajoutez un dossier dans <code>courses/</code>.
      </div>
    );
  }

  return (
    <div className="sidebar-list">
      {courses.map(course => (
        <div
          key={course.id}
          className={`course-item ${selectedId === course.id ? 'active' : ''}`}
          onClick={() => onSelect(course.id)}
        >
          <h3>{course.title}</h3>
          {course.description && <p>{course.description}</p>}
        </div>
      ))}
    </div>
  );
}
