# Doc_Cy — Application de Cours de Russe

Application full-stack pour apprendre le russe : liste des cours, résumés et Q&R côte à côte (Russe | Français).

## Prérequis

Installer **Node.js** (v18 ou supérieur) : https://nodejs.org

## Démarrage rapide

Double-cliquer sur `start.bat` — il installe les dépendances et lance l'app automatiquement.

Ou manuellement dans deux terminaux :

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm install && node server.js

# Terminal 2 — Frontend (port 3000)
cd frontend && npm install && npm run dev
```

Ouvrir : **http://localhost:3000**

---

## Ajouter un cours

1. Créer un dossier dans `courses/`, ex: `courses/cours-3/`
2. Y placer un `course.json` :

```json
{
  "title": "Leçon 3 — Les couleurs",
  "description": "Rouge, bleu, vert...",
  "files": {
    "cours_ru": "cours_ru.txt",
    "cours_fr": "cours_fr.txt",
    "resume_ru": "resume_ru.txt",
    "resume_fr": "resume_fr.txt",
    "qa_ru": "qa_ru.txt",
    "qa_fr": "qa_fr.txt"
  }
}
```

3. Créer les fichiers `.txt` (ou `.pptx`) dans le même dossier.

### Format Q&R

```
Q: Question ici ?
A: Réponse ici.
```

---

## Structure

```
Doc_Cy/
├── backend/           # API Express (port 3001)
├── frontend/          # React + Vite (port 3000)
└── courses/           # Dossiers des cours
    ├── cours-1/       # Leçon 1 — Se présenter
    └── cours-2/       # Leçon 2 — Les chiffres
```
