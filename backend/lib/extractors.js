const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// ── PPTX (modern zip-based) ───────────────────────────────────────────────────
function extractPptx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const slides = zip.getEntries()
      .filter(e => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const n = e => parseInt(e.entryName.match(/\d+/)[0]);
        return n(a) - n(b);
      });

    const parts = [];
    for (const slide of slides) {
      const xml = slide.getData().toString('utf8');
      const texts = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
      const slideText = texts
        .map(t => t.replace(/<[^>]+>/g, '').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
        .join(' ').trim();
      if (slideText) parts.push(slideText);
    }
    return parts.join('\n\n') || '(Aucun texte extrait)';
  } catch (e) {
    return `(Erreur PPTX: ${e.message})`;
  }
}

// ── Binary PPT (OLE Compound File) ───────────────────────────────────────────
function extractPpt(filePath) {
  try {
    const CFB = require('cfb');
    const buf = fs.readFileSync(filePath);
    const cfb = CFB.read(buf, { type: 'buffer' });
    const entry = CFB.find(cfb, 'PowerPoint Document');
    if (!entry) return '(Stream PowerPoint Document introuvable)';

    const data = Buffer.from(entry.content);
    const results = [];

    function walk(d, offset, end) {
      let i = offset;
      while (i + 8 <= end) {
        const verInst = d.readUInt16LE(i);
        const type    = d.readUInt16LE(i + 2);
        const len     = d.readUInt32LE(i + 4);
        if (len > 5000000 || i + 8 + len > end) { i++; continue; }
        if ((verInst & 0x0F) === 0x0F) {
          walk(d, i + 8, i + 8 + len);
        } else if (type === 0x0FA0 && len > 0) { // TextCharsAtom — UTF-16LE
          const t = d.slice(i + 8, i + 8 + len).toString('utf16le').replace(/\x00/g, '').trim();
          if (t.length > 1) results.push(t);
        } else if (type === 0x0FA8 && len > 0) { // TextBytesAtom — Latin-1
          const t = d.slice(i + 8, i + 8 + len).toString('latin1').trim();
          if (t.length > 1) results.push(t);
        }
        i += 8 + len;
      }
    }

    walk(data, 0, data.length);
    return results.join('\n') || '(Aucun texte extrait)';
  } catch (e) {
    return `(Erreur PPT binaire: ${e.message})`;
  }
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
function extractDocx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entry = zip.getEntry('word/document.xml');
    if (!entry) return '(document.xml introuvable dans le DOCX)';

    const xml = entry.getData().toString('utf8');
    const paragraphs = [];
    const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
    let m;
    while ((m = paraRe.exec(xml)) !== null) {
      const pieces = [];
      const textRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let t;
      while ((t = textRe.exec(m[0])) !== null) pieces.push(t[1]);
      const line = pieces.join('').trim();
      if (line) paragraphs.push(line);
    }
    return paragraphs.join('\n') || '(Aucun texte extrait)';
  } catch (e) {
    return `(Erreur DOCX: ${e.message})`;
  }
}

// ── PDF ──────────────────────────────────────────────────────────────────────
async function extractPdf(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n').trim();
}

// ── Dispatch by extension ─────────────────────────────────────────────────────
async function extractFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pptx')             return extractPptx(filePath);
  if (ext === '.ppt')              return extractPpt(filePath);
  if (ext === '.docx' || ext === '.doc') return extractDocx(filePath);
  if (ext === '.pdf')              return await extractPdf(filePath);
  if (ext === '.txt' || ext === '.md')
    return fs.readFileSync(filePath, 'utf8');
  return null;
}

const SUPPORTED_EXTS = ['.pdf', '.pptx', '.ppt', '.docx', '.doc', '.txt', '.md'];

module.exports = { extractFile, extractPptx, extractPpt, extractDocx, extractPdf, SUPPORTED_EXTS };
