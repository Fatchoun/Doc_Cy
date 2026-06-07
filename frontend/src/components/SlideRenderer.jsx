// Renders one parsed PPTX slide.
// textOnly=false (original view)  → pixel-perfect PNG when bgImage is available
// textOnly=true  (translated view) → full HTML rendering (no PNG, avoids text doubling)
// no bgImage                       → full HTML rendering always

const EPX = 9525; // EMU → px at 96 DPI

function emuPx(emu) { return emu / EPX; }

function ShapeEl({ el }) {
  const bw = el.strokeW ? Math.max(emuPx(el.strokeW), 0.5) : 0;
  return (
    <div style={{
      position:        'absolute',
      left:            emuPx(el.x),
      top:             emuPx(el.y),
      width:           emuPx(el.cx),
      height:          emuPx(el.cy),
      backgroundColor: el.fill || 'transparent',
      border:          el.strokeColor ? `${bw}px solid ${el.strokeColor}` : 'none',
      boxSizing:       'border-box',
      transform:       el.rot ? `rotate(${el.rot}deg)` : undefined,
      transformOrigin: 'center center',
    }} />
  );
}

function TextEl({ el }) {
  const bgColor = (el.noFill || !el.fill) ? 'transparent' : el.fill;
  return (
    <div style={{
      position:        'absolute',
      left:            emuPx(el.x),
      top:             emuPx(el.y),
      width:           emuPx(el.cx),
      height:          emuPx(el.cy),
      overflow:        'hidden',
      display:         'flex',
      flexDirection:   'column',
      justifyContent:  el.va === 'middle' ? 'center' : el.va === 'bottom' ? 'flex-end' : 'flex-start',
      boxSizing:       'border-box',
      backgroundColor: bgColor,
      border:          (el.strokeColor && el.strokeW) ? `${Math.max(emuPx(el.strokeW), 0.5)}px solid ${el.strokeColor}` : 'none',
      transform:       el.rot ? `rotate(${el.rot}deg)` : undefined,
      transformOrigin: 'center center',
    }}>
      {el.paras.map((para, pi) => (
        <p key={pi} style={{ textAlign: para.align, margin: 0, padding: 0, lineHeight: 1.2 }}>
          {para.runs.map((run, ri) => (
            <span key={ri} style={{
              fontFamily:     'Calibri, "Segoe UI", Arial, sans-serif',
              fontWeight:     run.bold      ? 'bold'      : 'normal',
              fontStyle:      run.italic    ? 'italic'    : 'normal',
              textDecoration: run.underline ? 'underline' : 'none',
              fontSize:       run.sz ? `${run.sz / 100 * 4 / 3}px` : '13px',
              color:          run.color || '#111111',
              whiteSpace:     'pre-wrap',
            }}>
              {run.text}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function ImageEl({ el }) {
  return (
    <img
      src={el.src}
      alt=""
      draggable={false}
      style={{
        position:   'absolute',
        left:       emuPx(el.x),
        top:        emuPx(el.y),
        width:      emuPx(el.cx),
        height:     emuPx(el.cy),
        objectFit:  'fill',
        display:    'block',
        userSelect: 'none',
        transform:  el.rot ? `rotate(${el.rot}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    />
  );
}

export default function SlideRenderer({ slide, slideW, slideH, containerWidth, bgImage, textOnly = false }) {
  if (!slide || containerWidth <= 0) return null;

  const refW  = emuPx(slideW);
  const refH  = emuPx(slideH);
  const scale = containerWidth / refW;
  const h     = Math.round(refH * scale);

  // Original view: pixel-perfect PNG (text is baked in, no HTML overlay needed)
  if (bgImage && !textOnly) {
    return (
      <div style={{ width: containerWidth, height: h, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <img
          src={bgImage}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill', userSelect: 'none' }}
        />
      </div>
    );
  }

  // Translated view OR no bgImage: full HTML rendering.
  // PNG is intentionally omitted here — showing it alongside HTML text would double the text.
  return (
    <div style={{ width: containerWidth, height: h, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{
        position:        'absolute',
        top:             0, left: 0,
        width:           refW,
        height:          refH,
        transformOrigin: 'top left',
        transform:       `scale(${scale})`,
        backgroundColor: slide.bgColor || '#FFFFFF',
      }}>
        {slide.elements.map((el, i) => {
          if (el.type === 'image') return <ImageEl key={i} el={el} />;
          if (el.type === 'text')  return <TextEl  key={i} el={el} />;
          return <ShapeEl key={i} el={el} />;
        })}
      </div>
    </div>
  );
}
