const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  dark:    '0D1B2A',
  navy:    '1B3A6B',
  blue:    '2563EB',
  cyan:    '06B6D4',
  green:   '10B981',
  orange:  'F59E0B',
  red:     'EF4444',
  purple:  '8B5CF6',
  white:   'FFFFFF',
  offwhite:'E8EDF5',
  gray:    '94A3B8',
  lightbg: '1E2E42',
};

const PHASE_COLORS = [
  C.cyan, C.green, C.blue, C.orange, C.purple, C.red, '#EC4899', C.gray
];

// ─── Helper: slide with dark background + top accent bar ─────────────────────
function makeSlide(accentColor) {
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.dark } });
  s.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: accentColor || C.cyan } });
  return s;
}

// ─── Helper: section title + left color bar ───────────────────────────────────
function addSectionHeader(s, title, subtitle, color) {
  s.addShape('rect', { x: 0, y: 0.06, w: 0.07, h: 7.44, fill: { color: color } });
  s.addText(title, {
    x: 0.3, y: 0.3, w: 12.7, h: 0.9,
    fontSize: 32, bold: true, color: C.white, fontFace: 'Calibri'
  });
  if (subtitle) {
    s.addText(subtitle, {
      x: 0.3, y: 1.1, w: 12.7, h: 0.45,
      fontSize: 16, color: color, fontFace: 'Calibri', italic: true
    });
  }
}

// ─── Helper: bullet card ─────────────────────────────────────────────────────
function addCard(s, x, y, w, h, title, bullets, color) {
  s.addShape('rect', { x, y, w, h, fill: { color: C.lightbg }, line: { color: color, width: 1.5 } });
  s.addShape('rect', { x, y, w, h: 0.04, fill: { color: color } });
  s.addText(title, {
    x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.4,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  const bulletText = bullets.map(b => ({ text: '•  ' + b, options: { breakLine: true } }));
  s.addText(bulletText, {
    x: x + 0.15, y: y + 0.55, w: w - 0.3, h: h - 0.65,
    fontSize: 11, color: C.offwhite, fontFace: 'Calibri', valign: 'top'
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ═══════════════════════════════════════════════════════════════════════════════
(function slide1() {
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.dark } });
  s.addShape('rect', { x: 0, y: 6.5, w: '100%', h: 0.06, fill: { color: C.cyan } });
  s.addShape('rect', { x: 0, y: 6.62, w: '100%', h: 0.02, fill: { color: C.blue } });
  s.addShape('ellipse', { x: 10.5, y: -1, w: 4, h: 4, fill: { color: C.navy }, line: { color: C.cyan, width: 1 } });
  s.addShape('ellipse', { x: -1, y: 4.5, w: 3, h: 3, fill: { color: C.navy }, line: { color: C.blue, width: 0.5 } });

  s.addText('PLAN DE FORMATION INTENSIF', {
    x: 0.6, y: 1.2, w: 10, h: 0.4,
    fontSize: 13, color: C.cyan, bold: true, fontFace: 'Calibri', charSpacing: 4
  });
  s.addText('DevOps Mastery\nLearning Path', {
    x: 0.6, y: 1.7, w: 10, h: 2.4,
    fontSize: 56, bold: true, color: C.white, fontFace: 'Calibri', lineSpacingMultiple: 1.1
  });
  s.addText('From Absolute Zero → Professional DevOps Engineer', {
    x: 0.6, y: 4.15, w: 11, h: 0.55,
    fontSize: 20, color: C.offwhite, fontFace: 'Calibri'
  });
  s.addText('Ahmed  |  4-Month Intensive Roadmap  |  8 Phases', {
    x: 0.6, y: 6.75, w: 10, h: 0.4,
    fontSize: 13, color: C.gray, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — What is DevOps?
// ═══════════════════════════════════════════════════════════════════════════════
(function slide2() {
  const s = makeSlide(C.cyan);
  addSectionHeader(s, 'What is DevOps?', 'Understanding the big picture before diving in', C.cyan);

  const boxes = [
    { title: '🏗️  Development',        text: 'Writing the code that makes software work.\nDevelopers build features and fix bugs.',                                                     color: C.blue  },
    { title: '⚙️  Operations',          text: 'Running the software on servers so users can access it.\nOps teams manage infrastructure and deployments.',                                color: C.green },
    { title: '🔄  DevOps = Both Together', text: 'DevOps combines both worlds. One team builds AND deploys — faster, safer, and automatically.', color: C.cyan  },
  ];
  boxes.forEach((b, i) => {
    addCard(s, 0.3 + i * 4.3, 1.7, 4.05, 2.3, b.title, [b.text], b.color);
  });

  s.addText('"DevOps is not a tool or a role — it is a culture of collaboration and automation."', {
    x: 0.5, y: 4.3, w: 12.33, h: 0.7,
    fontSize: 14, color: C.gray, italic: true, align: 'center', fontFace: 'Calibri'
  });
  s.addText('Why learn DevOps?', {
    x: 0.5, y: 5.1, w: 5, h: 0.4,
    fontSize: 15, bold: true, color: C.cyan, fontFace: 'Calibri'
  });
  const reasons = [
    '💰  Among the highest-paid tech roles worldwide',
    '📈  Demand is growing 25% per year',
    '🌍  100% remote-friendly career',
    '🛠️  Every company in the world needs it',
  ];
  s.addText(reasons.map(r => ({ text: r, options: { breakLine: true } })), {
    x: 0.5, y: 5.55, w: 12.33, h: 1.6,
    fontSize: 13, color: C.offwhite, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Roadmap Overview
// ═══════════════════════════════════════════════════════════════════════════════
(function slide3() {
  const s = makeSlide(C.orange);
  addSectionHeader(s, 'Your 8-Phase Roadmap', 'Intensive 4-month plan — one phase at a time, never skip ahead', C.orange);

  const phases = [
    { num: '01', name: 'Linux & Terminal',   time: 'Month 1, Wk 1-2',  color: PHASE_COLORS[0] },
    { num: '02', name: 'Bash & Python',      time: 'Month 1, Wk 3-4',  color: PHASE_COLORS[1] },
    { num: '03', name: 'Git & GitHub',       time: 'Month 2, Wk 1',    color: PHASE_COLORS[2] },
    { num: '04', name: 'Docker',             time: 'Month 2, Wk 2-4',  color: PHASE_COLORS[3] },
    { num: '05', name: 'CI/CD Pipelines',    time: 'Month 3, Wk 1-2',  color: PHASE_COLORS[4] },
    { num: '06', name: 'Cloud (AWS)',        time: 'Month 3, Wk 3-4',  color: PHASE_COLORS[5] },
    { num: '07', name: 'Kubernetes',         time: 'Month 4, Wk 1-2',  color: PHASE_COLORS[6] },
    { num: '08', name: 'IaC & Monitoring',   time: 'Month 4, Wk 3-4',  color: PHASE_COLORS[7] },
  ];

  const cols = 4, boxW = 2.9, boxH = 1.1, gapX = 0.35, gapY = 0.25;
  const startX = 0.5, startY = 1.75;

  phases.forEach((p, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);

    s.addShape('rect', { x, y, w: boxW, h: boxH, fill: { color: C.lightbg }, line: { color: p.color, width: 1.5 } });
    s.addShape('rect', { x, y, w: 0.5,   h: boxH, fill: { color: p.color } });
    s.addText(p.num, {
      x: x + 0.05, y: y + 0.28, w: 0.4, h: 0.5,
      fontSize: 14, bold: true, color: C.dark, align: 'center', fontFace: 'Calibri'
    });
    s.addText(p.name, {
      x: x + 0.6, y: y + 0.1, w: boxW - 0.7, h: 0.45,
      fontSize: 13, bold: true, color: C.white, fontFace: 'Calibri'
    });
    s.addText(p.time, {
      x: x + 0.6, y: y + 0.58, w: boxW - 0.7, h: 0.35,
      fontSize: 11, color: p.color, fontFace: 'Calibri'
    });
  });

  s.addText('Each phase builds on the previous one. Complete them in order. Aim for 6+ hours of study per day.', {
    x: 0.5, y: 6.9, w: 12.33, h: 0.4,
    fontSize: 13, color: C.gray, align: 'center', italic: true, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Phase 1: Linux & Command Line
// ═══════════════════════════════════════════════════════════════════════════════
(function slide4() {
  const color = PHASE_COLORS[0];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 1 — Linux & Command Line', 'Month 1, Week 1-2  |  The foundation of everything in DevOps', color);

  addCard(s, 0.3, 1.7, 3.8, 2.5, '📖  What You Will Learn', [
    'What is Linux and why DevOps uses it',
    'Navigating folders: ls, cd, pwd',
    'Managing files: cp, mv, rm, mkdir',
    'Viewing files: cat, less, head, tail',
    'User permissions: chmod, chown',
    'Process management: ps, kill, top',
    'Package manager: apt install',
  ], color);

  addCard(s, 4.3, 1.7, 3.8, 2.5, '🛠️  Practice Exercises', [
    'Install Ubuntu on VirtualBox (free)',
    'Navigate to /var/log and read logs',
    'Create a folder structure for a project',
    'Change file permissions to 755',
    'Install nginx web server',
    'Run your first shell script',
  ], color);

  addCard(s, 8.4, 1.7, 4.6, 2.5, '🆓  Free Resources', [
    'Linux Journey → linuxjourney.com',
    'OverTheWire Bandit (fun hacking game)',
    'YouTube: "Linux for Beginners"',
    'Ubuntu official tutorial',
    'Ryan\'s Linux Tutorial (ryanstutorials.net)',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.4, w: 12.7, h: 1.1, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 1 MILESTONE', {
    x: 0.5, y: 4.5, w: 4, h: 0.4,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You can open a terminal, navigate the file system, run commands, and write a basic shell script without looking anything up.', {
    x: 0.5, y: 4.92, w: 12.5, h: 0.45,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
  s.addText('⚠️  Do NOT skip this phase. Every DevOps tool runs on Linux.', {
    x: 0.3, y: 5.65, w: 12.7, h: 0.4,
    fontSize: 13, color: C.orange, bold: true, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Phase 2: Scripting
// ═══════════════════════════════════════════════════════════════════════════════
(function slide5() {
  const color = PHASE_COLORS[1];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 2 — Bash & Python Scripting', 'Month 1, Week 3-4  |  Automate repetitive tasks so you never do them manually', color);

  addCard(s, 0.3, 1.7, 4.0, 2.6, '🐚  Bash Scripting', [
    'Variables and user input',
    'if/else conditions',
    'for and while loops',
    'Functions in shell scripts',
    'Read/write files from script',
    'Cron jobs (schedule automation)',
    'Exit codes and error handling',
  ], color);

  addCard(s, 4.5, 1.7, 4.0, 2.6, '🐍  Python Basics for DevOps', [
    'Variables, strings, lists, dicts',
    'if/else, for loops, functions',
    'Read files, write files',
    'Run shell commands from Python',
    'Work with JSON and APIs',
    'os and subprocess modules',
    'Write automation scripts',
  ], color);

  addCard(s, 8.7, 1.7, 4.3, 2.6, '🎯  Real Projects to Build', [
    'Script that backs up a folder daily',
    'Disk usage monitor with alerts',
    'Log file analyser (count errors)',
    'Script that installs a full server',
    'CSV file reader and reporter',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.5, w: 12.7, h: 1.05, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 2 MILESTONE', {
    x: 0.5, y: 4.58, w: 4, h: 0.38,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You can write a Bash script that automates a multi-step task, AND a Python script that reads a file and sends an alert.', {
    x: 0.5, y: 4.98, w: 12.5, h: 0.45,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
  s.addText('Tip: Bash first (1 week), then Python (1 week). Practice every day — even 30 minutes counts.', {
    x: 0.3, y: 5.7, w: 12.7, h: 0.4,
    fontSize: 12, color: C.gray, italic: true, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Phase 3: Git & GitHub
// ═══════════════════════════════════════════════════════════════════════════════
(function slide6() {
  const color = PHASE_COLORS[2];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 3 — Git & GitHub', 'Month 2, Week 1  |  Track your code and collaborate with any team on Earth', color);

  addCard(s, 0.3, 1.7, 4.0, 2.7, '🗂️  Git Essentials', [
    'git init — start a project',
    'git add — stage your changes',
    'git commit — save a snapshot',
    'git status — see what changed',
    'git log — history of all commits',
    'git diff — see exact changes',
    'git reset — undo mistakes',
    'git stash — save work temporarily',
  ], color);

  addCard(s, 4.5, 1.7, 4.0, 2.7, '🌿  Branching & Merging', [
    'git branch — list / create branches',
    'git checkout — switch branches',
    'git merge — combine branches',
    'git rebase — clean history',
    'Resolve merge conflicts',
    'Feature branch workflow',
    'Main branch protection rules',
  ], color);

  addCard(s, 8.7, 1.7, 4.3, 2.7, '☁️  GitHub', [
    'Push code to GitHub',
    'Pull Requests (PR) — code review',
    'Fork → contribute to any project',
    'Issues — track bugs and tasks',
    'GitHub Actions preview (Phase 5)',
    'README.md files',
    'Protect your main branch',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.6, w: 12.7, h: 1.0, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 3 MILESTONE', {
    x: 0.5, y: 4.67, w: 4, h: 0.38,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You can manage a full project using Git, open a Pull Request on GitHub, and recover from any common Git mistake.', {
    x: 0.5, y: 5.05, w: 12.5, h: 0.42,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
  s.addText('Free: github.com/learn  |  Git Immersion: gitimmersion.com  |  "Learn Git Branching" interactive game', {
    x: 0.3, y: 5.75, w: 12.7, h: 0.38,
    fontSize: 12, color: C.gray, italic: true, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Phase 4: Docker
// ═══════════════════════════════════════════════════════════════════════════════
(function slide7() {
  const color = PHASE_COLORS[3];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 4 — Docker & Containers', 'Month 2, Week 2-4  |  "It works on my machine" — never again', color);

  addCard(s, 0.3, 1.7, 3.8, 2.6, '📦  Core Concepts', [
    'What is a container vs a VM?',
    'Images vs running containers',
    'Docker Hub (public image registry)',
    'Layers and caching',
    'Volumes: persistent storage',
    'Networks: container communication',
    'Environment variables',
  ], color);

  addCard(s, 4.3, 1.7, 3.8, 2.6, '⌨️  Key Commands', [
    'docker pull nginx',
    'docker run -p 80:80 nginx',
    'docker ps / docker images',
    'docker build -t myapp .',
    'docker stop / docker rm',
    'docker exec -it container bash',
    'docker logs container',
  ], color);

  addCard(s, 8.3, 1.7, 4.7, 2.6, '📝  Dockerfile & Compose', [
    'Write a Dockerfile from scratch',
    'FROM, RUN, COPY, EXPOSE, CMD',
    'Build custom images for any app',
    'docker-compose.yml syntax',
    'Run multi-container apps',
    'Link database + backend + frontend',
    'Scale services with compose',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.5, w: 12.7, h: 1.05, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 4 MILESTONE', {
    x: 0.5, y: 4.58, w: 4, h: 0.38,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You can containerise your own Node.js or Python app, write a Dockerfile, and run it with docker-compose alongside a database.', {
    x: 0.5, y: 4.98, w: 12.5, h: 0.44,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
  s.addText('Free: Play with Docker (labs.play-with-docker.com)  |  Docker official docs  |  TechWorld with Nana (YouTube)', {
    x: 0.3, y: 5.68, w: 12.7, h: 0.38,
    fontSize: 12, color: C.gray, italic: true, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Phase 5: CI/CD
// ═══════════════════════════════════════════════════════════════════════════════
(function slide8() {
  const color = PHASE_COLORS[4];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 5 — CI/CD Pipelines', 'Month 3, Week 1-2  |  Automate the path from code to production', color);

  addCard(s, 0.3, 1.7, 4.0, 2.65, '🔄  What is CI/CD?', [
    'CI = Continuous Integration',
    '  → Automatically test every commit',
    'CD = Continuous Delivery/Deployment',
    '  → Automatically deploy after tests pass',
    'Pipeline = a series of automated steps',
    'Benefits: faster releases, fewer bugs',
    'No more manual deployments!',
  ], color);

  addCard(s, 4.5, 1.7, 4.0, 2.65, '⚡  GitHub Actions', [
    'YAML workflow files in .github/',
    'Triggers: push, PR, schedule, manual',
    'Jobs and steps',
    'Run tests automatically',
    'Build Docker images on every push',
    'Deploy to server on merge to main',
    'Secrets management (API keys)',
  ], color);

  addCard(s, 8.7, 1.7, 4.3, 2.65, '🏗️  Pipeline to Build', [
    '1.  Push code to GitHub',
    '2.  GitHub Actions triggers',
    '3.  Run automated tests',
    '4.  Build Docker image',
    '5.  Push image to Docker Hub',
    '6.  SSH into server + deploy',
    '7.  Health check passes ✅',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.55, w: 12.7, h: 1.05, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 5 MILESTONE', {
    x: 0.5, y: 4.62, w: 4, h: 0.38,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You have a working GitHub Actions pipeline that tests your code, builds a Docker image, and deploys it automatically on every push to main.', {
    x: 0.5, y: 5.02, w: 12.5, h: 0.44,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Phase 6: Cloud
// ═══════════════════════════════════════════════════════════════════════════════
(function slide9() {
  const color = PHASE_COLORS[5];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 6 — Cloud Computing (AWS)', 'Month 3, Week 3-4  |  Run your applications anywhere in the world', color);

  addCard(s, 0.3, 1.7, 4.0, 2.7, '☁️  Cloud Basics', [
    'What is the cloud? (servers you rent)',
    'IaaS / PaaS / SaaS explained',
    'Regions and Availability Zones',
    'Pay-as-you-go pricing model',
    'AWS Free Tier (use it!)',
    'AWS Console navigation',
    'IAM: users, roles, permissions',
  ], color);

  addCard(s, 4.5, 1.7, 4.0, 2.7, '🛠️  Key AWS Services', [
    'EC2 — virtual server (Linux VM)',
    'S3 — file/object storage',
    'RDS — managed database',
    'VPC — private network',
    'Route 53 — DNS / domain names',
    'ELB — load balancer',
    'CloudWatch — monitoring & logs',
  ], color);

  addCard(s, 8.7, 1.7, 4.3, 2.7, '🎯  Hands-on Projects', [
    'Launch an EC2 and SSH into it',
    'Host a static website on S3',
    'Set up a RDS PostgreSQL database',
    'Create a VPC with public/private subnets',
    'Add CloudWatch alarms',
    'Deploy your Docker app to EC2',
    'Get your AWS Cloud Practitioner cert',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.6, w: 12.7, h: 1.0, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 6 MILESTONE', {
    x: 0.5, y: 4.67, w: 4, h: 0.38,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You can deploy a full application (with database) on AWS, secured behind a VPC, accessible via a domain name.', {
    x: 0.5, y: 5.05, w: 12.5, h: 0.42,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
  s.addText('Certification target: AWS Cloud Practitioner (CLF-C02) — sit the exam at the end of Month 4', {
    x: 0.3, y: 5.72, w: 12.7, h: 0.38,
    fontSize: 12, color: color, bold: true, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Phase 7: Kubernetes
// ═══════════════════════════════════════════════════════════════════════════════
(function slide10() {
  const color = PHASE_COLORS[6];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 7 — Kubernetes (K8s)', 'Month 4, Week 1-2  |  Orchestrate hundreds of containers automatically', color);

  addCard(s, 0.3, 1.7, 4.0, 2.7, '🚢  Core Concepts', [
    'Why Kubernetes? (Docker at scale)',
    'Cluster: master + worker nodes',
    'Pod: smallest deployable unit',
    'Deployment: manage replicas',
    'Service: expose pods to network',
    'Ingress: external HTTP traffic',
    'ConfigMap & Secret: configuration',
  ], color);

  addCard(s, 4.5, 1.7, 4.0, 2.7, '⌨️  kubectl Commands', [
    'kubectl get pods / nodes',
    'kubectl apply -f file.yaml',
    'kubectl describe pod <name>',
    'kubectl logs <pod>',
    'kubectl exec -it <pod> -- bash',
    'kubectl scale deployment --replicas=3',
    'kubectl rollout restart deployment',
  ], color);

  addCard(s, 8.7, 1.7, 4.3, 2.7, '🏗️  Projects', [
    'Install minikube (local K8s)',
    'Deploy your Docker app on K8s',
    'Scale to 3 replicas',
    'Set up rolling updates (zero downtime)',
    'Add health checks (liveness probes)',
    'Create Ingress with TLS certificate',
    'Deploy on AWS EKS',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.6, w: 12.7, h: 1.0, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 7 MILESTONE', {
    x: 0.5, y: 4.67, w: 4, h: 0.38,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You can deploy, scale, and update a production-ready application on a real Kubernetes cluster with zero downtime.', {
    x: 0.5, y: 5.05, w: 12.5, h: 0.42,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
  s.addText('Certification target: CKAD (Certified Kubernetes Application Developer) — study during Month 4, sit after completion', {
    x: 0.3, y: 5.72, w: 12.7, h: 0.38,
    fontSize: 12, color: color, bold: true, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Phase 8: IaC & Monitoring
// ═══════════════════════════════════════════════════════════════════════════════
(function slide11() {
  const color = PHASE_COLORS[7];
  const s = makeSlide(color);
  addSectionHeader(s, 'Phase 8 — Infrastructure as Code & Monitoring', 'Month 4, Week 3-4  |  Build entire environments with code. Know before users do.', color);

  addCard(s, 0.3, 1.7, 3.9, 2.6, '🏗️  Terraform (IaC)', [
    'Define infrastructure in .tf files',
    'terraform init / plan / apply',
    'Resources: EC2, VPC, RDS…',
    'Variables and outputs',
    'Modules: reusable infrastructure',
    'Remote state (S3 backend)',
    'Destroy with terraform destroy',
  ], color);

  addCard(s, 4.4, 1.7, 3.9, 2.6, '⚙️  Ansible (Config Mgmt)', [
    'Agentless — uses SSH only',
    'Playbooks: YAML automation scripts',
    'Roles: reusable task bundles',
    'Inventory: list of servers',
    'Configure 100 servers at once',
    'Idempotent (safe to re-run)',
    'Vault: encrypt secrets',
  ], color);

  addCard(s, 8.5, 1.7, 4.5, 2.6, '📊  Monitoring Stack', [
    'Prometheus: collect metrics',
    'Grafana: visualize dashboards',
    'AlertManager: send alerts',
    'ELK Stack: centralized logs',
    'Uptime monitors (Uptime Kuma)',
    'Distributed tracing (Jaeger)',
    'On-call rotation basics',
  ], color);

  s.addShape('rect', { x: 0.3, y: 4.5, w: 12.7, h: 1.05, fill: { color: C.lightbg }, line: { color: color, width: 1 } });
  s.addText('✅  PHASE 8 MILESTONE  →  You are a DevOps Engineer 🎉', {
    x: 0.5, y: 4.57, w: 10, h: 0.38,
    fontSize: 13, bold: true, color: color, fontFace: 'Calibri'
  });
  s.addText('You can provision cloud infrastructure with Terraform, configure servers with Ansible, and monitor everything through Grafana dashboards.', {
    x: 0.5, y: 4.97, w: 12.5, h: 0.44,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri'
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — 4-Month Timeline
// ═══════════════════════════════════════════════════════════════════════════════
(function slide12() {
  const s = makeSlide(C.green);
  addSectionHeader(s, '4-Month Timeline', 'Full-time intensive study — ~6 hours/day minimum', C.green);

  // Month blocks across the top
  const months = [
    { label: 'MONTH 1', phases: 'Linux + Scripting',    color: C.cyan,   x: 0.3  },
    { label: 'MONTH 2', phases: 'Git + Docker',          color: C.orange, x: 3.55 },
    { label: 'MONTH 3', phases: 'CI/CD + Cloud',         color: C.purple, x: 6.8  },
    { label: 'MONTH 4', phases: 'K8s + IaC + Monitor',  color: C.green,  x: 10.05 },
  ];

  months.forEach(m => {
    s.addShape('rect', { x: m.x, y: 1.7, w: 3.0, h: 0.85, fill: { color: m.color } });
    s.addText(m.label, {
      x: m.x, y: 1.72, w: 3.0, h: 0.38,
      fontSize: 13, bold: true, color: C.dark, align: 'center', fontFace: 'Calibri'
    });
    s.addText(m.phases, {
      x: m.x, y: 2.12, w: 3.0, h: 0.38,
      fontSize: 10, color: C.dark, align: 'center', fontFace: 'Calibri'
    });
  });

  // Weekly breakdown
  const weeks = [
    { wk: 'Wk 1-2', phase: 'Phase 1 — Linux & Terminal',       hours: '~6h/day', color: PHASE_COLORS[0], row: 0, col: 0 },
    { wk: 'Wk 3-4', phase: 'Phase 2 — Bash & Python',          hours: '~6h/day', color: PHASE_COLORS[1], row: 1, col: 0 },
    { wk: 'Wk 1',   phase: 'Phase 3 — Git & GitHub',           hours: '~5h/day', color: PHASE_COLORS[2], row: 0, col: 1 },
    { wk: 'Wk 2-4', phase: 'Phase 4 — Docker',                 hours: '~6h/day', color: PHASE_COLORS[3], row: 1, col: 1 },
    { wk: 'Wk 1-2', phase: 'Phase 5 — CI/CD Pipelines',        hours: '~6h/day', color: PHASE_COLORS[4], row: 0, col: 2 },
    { wk: 'Wk 3-4', phase: 'Phase 6 — Cloud AWS',              hours: '~7h/day', color: PHASE_COLORS[5], row: 1, col: 2 },
    { wk: 'Wk 1-2', phase: 'Phase 7 — Kubernetes',             hours: '~7h/day', color: PHASE_COLORS[6], row: 0, col: 3 },
    { wk: 'Wk 3-4', phase: 'Phase 8 — IaC & Monitoring',       hours: '~6h/day', color: PHASE_COLORS[7], row: 1, col: 3 },
  ];

  const colX = [0.3, 3.55, 6.8, 10.05];
  const rowY = [2.72, 3.78];
  const wW = 3.0, wH = 0.9;

  weeks.forEach(w => {
    const x = colX[w.col], y = rowY[w.row];
    s.addShape('rect', { x, y, w: wW, h: wH, fill: { color: C.lightbg }, line: { color: w.color, width: 1.2 } });
    s.addShape('rect', { x, y, w: wW, h: 0.04, fill: { color: w.color } });
    s.addText(w.wk, {
      x: x + 0.1, y: y + 0.1, w: 0.8, h: 0.3,
      fontSize: 10, color: w.color, bold: true, fontFace: 'Calibri'
    });
    s.addText(w.hours, {
      x: x + 2.1, y: y + 0.1, w: 0.85, h: 0.3,
      fontSize: 9, color: C.gray, fontFace: 'Calibri', align: 'right'
    });
    s.addText(w.phase, {
      x: x + 0.1, y: y + 0.42, w: wW - 0.2, h: 0.4,
      fontSize: 11, color: C.offwhite, fontFace: 'Calibri'
    });
  });

  // Bottom note
  s.addShape('rect', { x: 0.3, y: 4.85, w: 12.7, h: 1.4, fill: { color: C.lightbg }, line: { color: C.green, width: 1 } });
  s.addText('⚡  How to succeed in 4 months', {
    x: 0.5, y: 4.93, w: 6, h: 0.38,
    fontSize: 14, bold: true, color: C.green, fontFace: 'Calibri'
  });
  const tips = [
    '•  Study 6-8 hours every day — treat it like a full-time job',
    '•  Build 1 project per phase and push it to GitHub — doing beats watching',
    '•  When you get stuck, spend 30 min figuring it out yourself first, then ask',
    '•  Review the previous phase briefly every morning before starting new material',
  ];
  s.addText(tips.map(t => ({ text: t, options: { breakLine: true } })), {
    x: 0.5, y: 5.35, w: 12.5, h: 0.82,
    fontSize: 11, color: C.offwhite, fontFace: 'Calibri', lineSpacingMultiple: 1.35
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Free Resources & Next Steps
// ═══════════════════════════════════════════════════════════════════════════════
(function slide13() {
  const s = makeSlide(C.cyan);
  addSectionHeader(s, 'Free Resources & Next Steps', 'Everything you need — without spending money', C.cyan);

  addCard(s, 0.3, 1.7, 3.8, 2.5, '📺  YouTube Channels', [
    'TechWorld with Nana (best for Docker/K8s)',
    'NetworkChuck (fun & beginner-friendly)',
    'freeCodeCamp.org (full courses)',
    'Fireship (quick 100-second concepts)',
    'Bret Fisher (Docker + DevOps)',
  ], C.cyan);

  addCard(s, 4.3, 1.7, 3.8, 2.5, '🌐  Free Platforms', [
    'KodeKloud (interactive labs)',
    'Katacoda (browser-based labs)',
    'Linux Journey → linuxjourney.com',
    'Play with Docker / Play with K8s',
    'AWS Free Tier (12 months free)',
    'GitHub Student Pack (free tools)',
  ], C.green);

  addCard(s, 8.3, 1.7, 4.7, 2.5, '🏅  Certifications After Month 4', [
    '① AWS Cloud Practitioner (Month 4)',
    '② CKAD — Kubernetes Dev (Month 4)',
    '③ AWS Solutions Architect (Month 5-6)',
    '④ HashiCorp Terraform Associate (Month 6)',
    '⑤ AWS DevOps Engineer Pro (Month 8-9)',
  ], C.orange);

  s.addShape('rect', { x: 0.3, y: 4.4, w: 12.7, h: 2.35, fill: { color: C.lightbg }, line: { color: C.cyan, width: 1 } });
  s.addText('🚀  The 5 Rules That Will Make You Succeed', {
    x: 0.5, y: 4.47, w: 9, h: 0.42,
    fontSize: 15, bold: true, color: C.cyan, fontFace: 'Calibri'
  });
  const rules = [
    '1.  Build something real every week — tutorials alone are not enough.',
    '2.  Push every project to GitHub — your portfolio is your resume.',
    '3.  Never memorize commands — understand WHY they work.',
    '4.  Join communities: DevOps subreddit, Discord servers, local meetups.',
    '5.  Be consistent: 6 hours every day beats nothing for 3 days then 12 hours.',
  ];
  s.addText(rules.map(r => ({ text: r, options: { breakLine: true } })), {
    x: 0.5, y: 4.93, w: 12.5, h: 1.7,
    fontSize: 12, color: C.offwhite, fontFace: 'Calibri', lineSpacingMultiple: 1.4
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// Save
// ═══════════════════════════════════════════════════════════════════════════════
const outPath = 'C:\\Users\\admin\\Downloads\\DevOps_Learning_Path_4months.pptx';

pptx.writeFile({ fileName: outPath })
  .then(() => console.log('✅  Saved:', outPath))
  .catch(err => { console.error('❌  Error:', err.message); process.exit(1); });
