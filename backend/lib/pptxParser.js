const AdmZip = require('adm-zip');

// ─── color helpers ────────────────────────────────────────────────────────────

function hexClr(xml) {
  if (!xml) return null;
  const s = xml.match(/<a:srgbClr[^>]*val="([0-9A-Fa-f]{6})"/);
  if (s) return '#' + s[1].toLowerCase();
  const sy = xml.match(/<a:sysClr[^>]*lastClr="([0-9A-Fa-f]{6})"/);
  if (sy) return '#' + sy[1].toLowerCase();
  return null;
}

function solidClr(xml) {
  const m = xml && xml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
  return m ? hexClr(m[1]) : null;
}

function gradientClr(xml) {
  // Return first stop color of a gradient as approximation
  if (!xml) return null;
  const gM = xml.match(/<a:gradFill>([\s\S]*?)<\/a:gradFill>/);
  if (!gM) return null;
  const gsM = gM[1].match(/<a:gs[^>]*>([\s\S]*?)<\/a:gs>/);
  return gsM ? hexClr(gsM[1]) : null;
}

function anyFillClr(xml) {
  return solidClr(xml) || gradientClr(xml);
}

// ─── text helpers ─────────────────────────────────────────────────────────────

function decodeTxt(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
}

function parseRPr(rpr) {
  const p = {};
  if (!rpr) return p;
  const b  = rpr.match(/\bb="([01])"/);  if (b)  p.bold      = b[1] !== '0';
  const i  = rpr.match(/\bi="([01])"/);  if (i)  p.italic    = i[1] !== '0';
  const u  = rpr.match(/\bu="([^"]+)"/); if (u && u[1] === 'sng') p.underline = true;
  const sz = rpr.match(/\bsz="(\d+)"/);  if (sz) p.sz        = +sz[1]; // hundredths of pt
  const c  = solidClr(rpr);              if (c)  p.color     = c;
  return p;
}

function parsePara(pXml) {
  let align = 'left';
  const ppM = pXml.match(/<a:pPr([^>]*)(?:\/>|>[\s\S]*?<\/a:pPr>)/);
  if (ppM) {
    const algn = ppM[1].match(/algn="([^"]+)"/);
    if (algn) align = { ctr: 'center', r: 'right', just: 'justify' }[algn[1]] || 'left';
  }

  const defM = pXml.match(/<a:defRPr([^>]*)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
  const def  = defM ? parseRPr(defM[0]) : {};

  const runs = [];
  const rRe  = /<a:r\b[^>]*>([\s\S]*?)<\/a:r>/g;
  let rm;
  while ((rm = rRe.exec(pXml)) !== null) {
    const tM = rm[1].match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/);
    if (!tM) continue;
    const text = decodeTxt(tM[1]);
    if (!text) continue;
    const rpM = rm[1].match(/<a:rPr([^>]*)(?:\/>|>([\s\S]*?)<\/a:rPr>)/);
    const rp  = rpM ? parseRPr(rpM[0]) : {};
    runs.push({ text, ...def, ...rp });
  }
  return { runs, align };
}

// ─── shape transform helper ───────────────────────────────────────────────────

function parseXfrm(spXml) {
  const xfM = spXml.match(/<a:xfrm([^>]*)?>([\s\S]*?)<\/a:xfrm>/);
  if (!xfM) return null;
  const rot  = (() => { const r = xfM[1] && xfM[1].match(/rot="(-?\d+)"/); return r ? +r[1] / 60000 : 0; })();
  const flipH = !!(xfM[1] && /flipH="1"/.test(xfM[1]));
  const offM = xfM[2].match(/<a:off[^>]*x="(-?\d+)"[^>]*y="(-?\d+)"/);
  const extM = xfM[2].match(/<a:ext[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  if (!offM || !extM) return null;
  return { x: +offM[1], y: +offM[2], cx: +extM[1], cy: +extM[2], rot, flipH };
}

// ─── shape parsers ────────────────────────────────────────────────────────────

function parseSpEl(spXml) {
  const xfrm = parseXfrm(spXml);
  if (!xfrm) return null;
  const { x, y, cx, cy, rot, flipH } = xfrm;
  if (!cx || !cy) return null;

  const spPrM = spXml.match(/<p:spPr>([\s\S]*?)<\/p:spPr>/);
  const fill   = spPrM ? anyFillClr(spPrM[1]) : null;
  const noFill = spPrM ? /<a:noFill/.test(spPrM[1]) : false;

  // Border/stroke
  let strokeColor = null, strokeW = 0;
  if (spPrM) {
    const lnM = spPrM[1].match(/<a:ln\b([^>]*)>([\s\S]*?)<\/a:ln>/);
    if (lnM) {
      const wM = lnM[1].match(/\bw="(\d+)"/);
      if (wM) strokeW = +wM[1]; // EMU
      strokeColor = solidClr(lnM[2]);
    }
  }

  const txM = spXml.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);

  if (!txM) {
    // Decorative shape (no text): include if visible
    if (!noFill && fill) return { type: 'shape', x, y, cx, cy, rot, fill, strokeColor, strokeW };
    if (strokeColor && strokeW > 0) return { type: 'shape', x, y, cx, cy, rot, fill: null, strokeColor, strokeW };
    return null;
  }

  // Text shape
  let va = 'top';
  const bpM = txM[1].match(/<a:bodyPr([^>]*)(?:\/>|>)/);
  if (bpM) {
    const a = bpM[1].match(/anchor="([^"]+)"/);
    if (a) va = { ctr: 'middle', b: 'bottom' }[a[1]] || 'top';
  }

  const paras = [];
  const pRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let pm;
  while ((pm = pRe.exec(txM[1])) !== null) {
    const p = parsePara(pm[1]);
    if (p.runs.length) paras.push(p);
  }

  // Even if no text runs, keep shape if it has a visible background
  if (!paras.length) {
    if (!noFill && fill) return { type: 'shape', x, y, cx, cy, rot, fill, strokeColor, strokeW };
    return null;
  }

  return { type: 'text', x, y, cx, cy, rot, fill, noFill, va, paras, strokeColor, strokeW };
}

function parsePicEl(picXml, rMap, zip) {
  const blipM = picXml.match(/<a:blip[^>]*r:embed="([^"]+)"/);
  if (!blipM) return null;
  const tgt = rMap[blipM[1]];
  if (!tgt) return null;

  const xfrm = parseXfrm(picXml);
  if (!xfrm) return null;
  const { x, y, cx, cy, rot } = xfrm;

  try {
    const imgPath = 'ppt/' + tgt.replace(/^\.\.\//, '');
    const entry   = zip.getEntry(imgPath);
    if (!entry) return null;
    const buf  = entry.getData();
    const ext  = tgt.split('.').pop().toLowerCase();
    const mime = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', bmp: 'bmp', svg: 'svg+xml' }[ext] || 'png';
    return { type: 'image', x, y, cx, cy, rot, src: `data:image/${mime};base64,${buf.toString('base64')}` };
  } catch { return null; }
}

function parseCxnSp(cxnXml) {
  const xfrm = parseXfrm(cxnXml);
  if (!xfrm) return null;
  const { x, y, cx, cy, rot } = xfrm;
  if (!cx && !cy) return null;

  const spPrM = cxnXml.match(/<p:spPr>([\s\S]*?)<\/p:spPr>/);
  let strokeColor = null, strokeW = 12700; // default 1pt
  if (spPrM) {
    const lnM = spPrM[1].match(/<a:ln\b([^>]*)>([\s\S]*?)<\/a:ln>/);
    if (lnM) {
      const wM = lnM[1].match(/\bw="(\d+)"/);
      if (wM) strokeW = +wM[1];
      strokeColor = solidClr(lnM[2]);
    }
  }
  if (!strokeColor) return null;
  return { type: 'shape', x, y, cx, cy, rot, fill: null, strokeColor, strokeW };
}

// ─── recursive group shape walker ─────────────────────────────────────────────

function parseGroupContents(grpXml, rMap, zip, offsetX = 0, offsetY = 0, scaleX = 1, scaleY = 1) {
  const elements = [];

  // Group transform for coordinate mapping
  const xfM = grpXml.match(/<p:grpSpPr>([\s\S]*?)<\/p:grpSpPr>/);
  let gOX = 0, gOY = 0, gCX = 1, gCY = 1, gChOX = 0, gChOY = 0, gChCX = 1, gChCY = 1;
  if (xfM) {
    const txfM = xfM[1].match(/<a:xfrm>([\s\S]*?)<\/a:xfrm>/);
    if (txfM) {
      const om  = txfM[1].match(/<a:off[^>]*x="(-?\d+)"[^>]*y="(-?\d+)"/);
      const em  = txfM[1].match(/<a:ext[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
      const com = txfM[1].match(/<a:chOff[^>]*x="(-?\d+)"[^>]*y="(-?\d+)"/);
      const cem = txfM[1].match(/<a:chExt[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
      if (om)  { gOX = +om[1];  gOY = +om[2]; }
      if (em)  { gCX = +em[1];  gCY = +em[2]; }
      if (com) { gChOX = +com[1]; gChOY = +com[2]; }
      if (cem) { gChCX = +cem[1]; gChCY = +cem[2]; }
    }
  }
  const lScaleX = gChCX ? gCX / gChCX : 1;
  const lScaleY = gChCY ? gCY / gChCY : 1;
  const applySX = scaleX * lScaleX;
  const applySY = scaleY * lScaleY;
  const applyOX = offsetX + gOX - gChOX * lScaleX;
  const applyOY = offsetY + gOY - gChOY * lScaleY;

  function applyGroupTransform(el) {
    return {
      ...el,
      x:  Math.round(el.x  * applySX + applyOX),
      y:  Math.round(el.y  * applySY + applyOY),
      cx: Math.round(el.cx * applySX),
      cy: Math.round(el.cy * applySY),
    };
  }

  const spRe  = /<p:sp\b[^>]*>([\s\S]*?)<\/p:sp>/g;
  const picRe = /<p:pic\b[^>]*>([\s\S]*?)<\/p:pic>/g;
  const cxRe  = /<p:cxnSp\b[^>]*>([\s\S]*?)<\/p:cxnSp>/g;
  const grpRe = /<p:grpSp\b[^>]*>([\s\S]*?)<\/p:grpSp>/g;

  let m;
  while ((m = spRe.exec(grpXml))  !== null) { const el = parseSpEl(m[1]);               if (el) elements.push(applyGroupTransform(el)); }
  while ((m = picRe.exec(grpXml)) !== null) { const el = parsePicEl(m[1], rMap, zip);   if (el) elements.push(applyGroupTransform(el)); }
  while ((m = cxRe.exec(grpXml))  !== null) { const el = parseCxnSp(m[1]);              if (el) elements.push(applyGroupTransform(el)); }
  while ((m = grpRe.exec(grpXml)) !== null) {
    const nested = parseGroupContents(m[1], rMap, zip, applyOX, applyOY, applySX, applySY);
    elements.push(...nested);
  }

  return elements;
}

// ─── relationship loader ──────────────────────────────────────────────────────

function loadRels(zip, relPath) {
  const map = {};
  try {
    const xml = zip.readAsText(relPath);
    const re  = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let m;
    while ((m = re.exec(xml)) !== null) map[m[1]] = m[2];
  } catch {}
  return map;
}

// ─── slide parser ─────────────────────────────────────────────────────────────

function parseSlide(zip, slidePath) {
  const xml      = zip.readAsText(slidePath);
  const file     = slidePath.split('/').pop();
  const rMap     = loadRels(zip, `ppt/slides/_rels/${file}.rels`);
  const elements = [];

  // Background
  let bgColor = null;
  const bgM = xml.match(/<p:bg\b[^>]*>([\s\S]*?)<\/p:bg>/);
  if (bgM) bgColor = anyFillClr(bgM[1]);

  const treeM = xml.match(/<p:spTree\b[^>]*>([\s\S]*?)<\/p:spTree>/);
  if (!treeM) return { elements, bgColor };

  const tree = treeM[1];

  // Parse top-level elements
  const spRe  = /<p:sp\b[^>]*>([\s\S]*?)<\/p:sp>/g;
  const picRe = /<p:pic\b[^>]*>([\s\S]*?)<\/p:pic>/g;
  const cxRe  = /<p:cxnSp\b[^>]*>([\s\S]*?)<\/p:cxnSp>/g;
  const grpRe = /<p:grpSp\b[^>]*>([\s\S]*?)<\/p:grpSp>/g;

  let m;
  while ((m = spRe.exec(tree))  !== null) { const el = parseSpEl(m[1]);               if (el) elements.push(el); }
  while ((m = picRe.exec(tree)) !== null) { const el = parsePicEl(m[1], rMap, zip);   if (el) elements.push(el); }
  while ((m = cxRe.exec(tree))  !== null) { const el = parseCxnSp(m[1]);              if (el) elements.push(el); }
  while ((m = grpRe.exec(tree)) !== null) {
    const nested = parseGroupContents(m[1], rMap, zip, 0, 0, 1, 1);
    elements.push(...nested);
  }

  return { elements, bgColor };
}

// ─── public API ───────────────────────────────────────────────────────────────

function parsePptx(filePath) {
  const zip     = new AdmZip(filePath);
  const presXml = zip.readAsText('ppt/presentation.xml');

  const szM    = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  const slideW = szM ? +szM[1] : 9144000;
  const slideH = szM ? +szM[2] : 6858000;

  const presRels = loadRels(zip, 'ppt/_rels/presentation.xml.rels');
  const rIds     = [];
  const idRe     = /<p:sldId[^>]*r:id="([^"]+)"/g;
  let m;
  while ((m = idRe.exec(presXml)) !== null) rIds.push(m[1]);

  const slides = [];
  for (const rId of rIds) {
    const tgt = presRels[rId];
    if (!tgt || !tgt.includes('slide')) continue;
    const path = 'ppt/' + tgt.replace(/^\.\.\//, '');
    try { slides.push(parseSlide(zip, path)); }
    catch { slides.push({ elements: [], bgColor: null }); }
  }

  return { slides, slideW, slideH, aspectRatio: slideW / slideH };
}

// Build flat text map for AI translation: { "si_ei_pi_ri": "text" }
function extractTextMap(slides) {
  const map = {};
  slides.forEach((slide, si) =>
    slide.elements.forEach((el, ei) => {
      if (el.type !== 'text') return;
      el.paras.forEach((para, pi) =>
        para.runs.forEach((run, ri) => {
          if (run.text.trim()) map[`${si}_${ei}_${pi}_${ri}`] = run.text;
        })
      );
    })
  );
  return map;
}

// Merge translated map back into slide data (shapes/images untouched)
function applyTranslations(slides, tMap) {
  return slides.map((slide, si) => ({
    ...slide,
    elements: slide.elements.map((el, ei) => {
      if (el.type !== 'text') return el;
      return {
        ...el,
        paras: el.paras.map((para, pi) => ({
          ...para,
          runs: para.runs.map((run, ri) => {
            const k = `${si}_${ei}_${pi}_${ri}`;
            return k in tMap ? { ...run, text: tMap[k] } : run;
          }),
        })),
      };
    }),
  }));
}

module.exports = { parsePptx, extractTextMap, applyTranslations };
