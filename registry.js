// ══════════════════════════════════════════════════════════════════════
//  POCCHIACICLOPEDIA — SISTEMA DI REGISTRO CENTRALE
//  Inserire questo file PRIMA di app.js nell'HTML.
//
//  Come aggiungere una nuova pagina:
//  1. Scrivi la funzione build...() in app.js come al solito
//  2. Aggiungi UNA riga in PAGE_REGISTRY qui sotto
//  3. Fatto — sidebar, ricerca e DEFAULT_PAGES si aggiornano da soli
//
//  Per le pagine PERSONAGGIO puoi anche aggiungere:
//    - bio: stringa breve (usata nel tooltip del grafico)
//    - tipo: 'main' | 'ally' | 'enemy' | 'neut' (colore nodo)
//    - relazioni: [ { con: 'NomePagina', tipo: 'nemico'|'alleato'|'amico'|'neutro', label: '...' } ]
//    - eventi: [ { con: 'NomePagina', label: '...' } ]
//  Il grafico relazioni verrà generato automaticamente.
// ══════════════════════════════════════════════════════════════════════

// ── 1. HELPERS ──────────────────────────────────────────────────────

/** Banner colorato in cima alla pagina */
function wikiNotice(icon, html) {
  return `<div class="wiki-notice"><span class="ni">${icon}</span><span>${html}</span></div>`;
}

/** Intestazione standard H1 + sottotitolo */
function wikiHeader(title) {
  return `<h1 class="page-title">${title}</h1>
<div class="page-subtitle">Da Pocchiaciclopedia, l'enciclopedia (quasi) libera.</div>
<div class="wiki-article-body clearfix">`;
}

/** Chiusura del wiki-article-body */
function wikiClose() {
  return `</div>`;
}

/** Riga di categorie in fondo */
function wikiCats(...cats) {
  return `<div class="wiki-cats"><strong>Categorie:</strong> ${cats.map(c => `<a>${c}</a>`).join(' ')}</div>`;
}

/** Infobox laterale */
function wikiInfobox(title, rows, imgSrc) {
  const img = imgSrc
    ? `<div style="text-align:center;padding:8px 6px 4px"><img src="${imgSrc}" alt="${title}" style="width:100%;max-width:230px;display:block;margin:0 auto;border:1px solid #a2a9b1" onerror="this.style.display='none'"></div>`
    : '';
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><th style="padding:3px 8px;border-top:1px solid #eaecf0;text-align:left;font-size:12px">${k}</th><td style="padding:3px 8px;border-top:1px solid #eaecf0">${v}</td></tr>`
  ).join('');
  return `<div class="infobox"><div class="infobox-title">${title}</div>${img}<table style="width:100%;border-collapse:collapse">${rowsHtml}</table></div>`;
}

/** Indice / TOC */
function wikiTOC(voci) {
  const items = voci.map((v, i) => `<li><a href="#${v.id}">${v.label}</a></li>`).join('');
  return `<div class="toc-box"><div class="toc-title">Indice</div><ol>${items}</ol></div>`;
}

/** Sezione H2 con link modifica */
function wikiH2(id, label, page) {
  return `<h2 id="${id}">${label} <span class="edit-link" onclick="openEditor('${page}')">[modifica]</span></h2>`;
}

/** Stub finale */
function wikiStub(icon, text) {
  return `<div class="stub-box"><span style="font-size:22px">${icon}</span><span>${text}</span></div>`;
}

// ── 2. GRAFICO RELAZIONI ─────────────────────────────────────────────

/**
 * Genera l'HTML del grafico relazioni per una pagina personaggio.
 * Viene chiamato automaticamente da buildPageFromRegistry() se
 * la voce ha relazioni o eventi definiti.
 */
function buildRelationsGraph(entry, allEntries) {
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const BG   = dark ? '#1e1e1c' : '#ffffff';

  // Raccoglie i nodi collegati
  const linkedIds = new Set();
  (entry.relazioni || []).forEach(r => linkedIds.add(r.con));
  (entry.eventi    || []).forEach(e => linkedIds.add(e.con));

  // Nodo centrale
  const nodes = [{
    id: entry.id, shape: 'circle', type: entry.tipo || 'main',
    r: 34, x: 340, y: 230,
    bio: entry.bio || ''
  }];

  // Nodi collegati
  let angle = 0;
  const step = (2 * Math.PI) / Math.max(linkedIds.size, 1);
  linkedIds.forEach(id => {
    const other = allEntries.find(e => e.id === id);
    const isEvent = other && other.kind === 'event';
    const rx = isEvent ? 120 : 0;
    const ry = isEvent ? 38  : 0;
    const r  = isEvent ? 0   : 24;
    nodes.push({
      id,
      shape: isEvent ? 'rect' : 'circle',
      type:  isEvent ? 'event' : (other ? (other.tipo || 'neut') : 'neut'),
      r, w: rx * 2, h: ry * 2,
      x: 340 + Math.cos(angle) * 170,
      y: 230 + Math.sin(angle) * 155,
      bio: other ? (other.bio || '') : ''
    });
    angle += step;
  });

  // Archi
  const edges = [];
  (entry.relazioni || []).forEach(r => {
    edges.push({ a: entry.id, b: r.con, tipo: r.tipo || 'neutro', label: r.label || '' });
  });
  (entry.eventi || []).forEach(e => {
    edges.push({ a: entry.id, b: e.con, tipo: 'partecipa', label: e.label || '' });
  });

  const canvasId  = 'rel-graph-' + entry.id.replace(/\s/g, '_');
  const tooltipId = 'rel-tip-'   + entry.id.replace(/\s/g, '_');
  const wrapId    = 'rel-wrap-'  + entry.id.replace(/\s/g, '_');
  const initFn    = 'initGraph_' + entry.id.replace(/[^a-zA-Z0-9]/g, '_');

  return `
<div style="margin:18px 0 24px">
<h2 style="font-family:'Linux Libertine Display',Georgia,serif;font-size:19px;font-weight:400;border-bottom:1px solid #a2a9b1;padding-bottom:4px;margin-bottom:10px">
  🕸️ Rete di relazioni
</h2>
<div id="${wrapId}" style="position:relative;width:100%;font-family:sans-serif">
  <canvas id="${canvasId}" width="680" height="460" style="display:block;width:100%;cursor:grab;touch-action:none"></canvas>
  <div id="${tooltipId}" style="position:absolute;background:#fff;border:1px solid #a2a9b1;border-radius:4px;font-size:12px;padding:6px 10px;pointer-events:none;opacity:0;transition:opacity .15s;max-width:200px;line-height:1.55;z-index:10;color:#202122"></div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#54595d;align-items:center">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#534AB7;display:inline-block"></span> Protagonista</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#0F6E56;display:inline-block"></span> Alleato</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#993C1D;display:inline-block"></span> Antagonista</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#185FA5;display:inline-block"></span> Neutro</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:8px;background:#5F5E5A;border-radius:2px;display:inline-block"></span> Evento</span>
    <span style="color:#a2a9b1">· Clicca per evidenziare · Trascina per spostare</span>
  </div>
</div>
<script>
(function() {
  function ${initFn}() {
    const CV  = document.getElementById('${canvasId}');
    if (!CV) return;
    const ctx = CV.getContext('2d');
    const tip = document.getElementById('${tooltipId}');
    const wrp = document.getElementById('${wrapId}');
    const W = 680, H = 460;
    CV.width = W; CV.height = H;

    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const BG = dark ? '#1e1e1c' : '#ffffff';

    const C = {
      main:  { fill: dark ? '#3C3489':'#534AB7', text:'#EEEDFE' },
      ally:  { fill: dark ? '#085041':'#0F6E56', text:'#E1F5EE' },
      enemy: { fill: dark ? '#712B13':'#993C1D', text:'#FAECE7' },
      neut:  { fill: dark ? '#0C447C':'#185FA5', text:'#E6F1FB' },
      event: { fill: dark ? '#444441':'#5F5E5A', text:'#F1EFE8' },
    };
    const EC = {
      nemico:   { color: dark?'#F09595':'#A32D2D', dash:[6,3] },
      alleato:  { color: dark?'#85B7EB':'#185FA5', dash:[3,3] },
      amico:    { color: dark?'#5DCAA5':'#0F6E56', dash:[] },
      neutro:   { color: dark?'#B4B2A9':'#888780', dash:[2,4] },
      partecipa:{ color: dark?'#FAC775':'#854F0B', dash:[4,2] },
    };

    const nodes = ${JSON.stringify(nodes)};
    const edges = ${JSON.stringify(edges)};
    const nmap  = Object.fromEntries(nodes.map(n=>[n.id,n]));
    const vels  = nodes.map(()=>({vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2}));
    let sel = null, drag = null;

    function borderPt(n, px, py) {
      const dx=px-n.x, dy=py-n.y, d=Math.hypot(dx,dy)||1;
      if (n.shape==='circle') return {x:n.x+dx/d*n.r, y:n.y+dy/d*n.r};
      const tx=dx/d, ty=dy/d;
      let t=Infinity;
      if(tx!==0) t=Math.min(t,(n.w/2)/Math.abs(tx));
      if(ty!==0) t=Math.min(t,(n.h/2)/Math.abs(ty));
      return {x:n.x+tx*t, y:n.y+ty*t};
    }

    function wrapTxt(txt, maxW) {
      const words=txt.split(' '); const lines=[]; let cur='';
      words.forEach(w=>{
        const t=cur?cur+' '+w:w;
        if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}
        else cur=t;
      });
      if(cur) lines.push(cur);
      return lines;
    }

    function sim() {
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) {
        const a=nodes[i],b=nodes[j];
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
        const ra=a.shape==='circle'?a.r:Math.max(a.w,a.h)/2;
        const rb=b.shape==='circle'?b.r:Math.max(b.w,b.h)/2;
        const minD=ra+rb+55;
        if(d<minD){const f=(minD-d)/d*0.09;vels[i].vx-=dx*f;vels[i].vy-=dy*f;vels[j].vx+=dx*f;vels[j].vy+=dy*f;}
      }
      edges.forEach(e=>{
        const a=nmap[e.a],b=nmap[e.b]; if(!a||!b) return;
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
        const tgt=e.tipo==='partecipa'?130:160;
        const f=(d-tgt)/d*0.022;
        const ai=nodes.indexOf(a),bi=nodes.indexOf(b);
        vels[ai].vx+=dx*f;vels[ai].vy+=dy*f;
        vels[bi].vx-=dx*f;vels[bi].vy-=dy*f;
      });
      nodes.forEach((n,i)=>{
        if(drag===i) return;
        vels[i].vx*=0.76;vels[i].vy*=0.76;
        vels[i].vx+=(W/2-n.x)*0.003;vels[i].vy+=(H/2-n.y)*0.003;
        const hw=n.shape==='circle'?n.r:n.w/2;
        const hh=n.shape==='circle'?n.r:n.h/2;
        n.x=Math.max(hw+6,Math.min(W-hw-6,n.x+vels[i].vx));
        n.y=Math.max(hh+6,Math.min(H-hh-6,n.y+vels[i].vy));
      });
    }

    function draw() {
      ctx.clearRect(0,0,W,H);
      edges.forEach(e=>{
        const a=nmap[e.a],b=nmap[e.b]; if(!a||!b) return;
        const st=EC[e.tipo]||EC.neutro;
        const isSel=sel&&(sel.id===e.a||sel.id===e.b);
        const pa=borderPt(a,b.x,b.y), pb=borderPt(b,a.x,a.y);
        ctx.save();
        ctx.strokeStyle=isSel?st.color:(dark?'rgba(200,200,190,0.15)':'rgba(80,80,70,0.13)');
        ctx.lineWidth=isSel?1.8:1;
        ctx.setLineDash(isSel?st.dash:[]);
        ctx.globalAlpha=isSel?1:0.8;
        ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();
        if(isSel){
          const dx=pb.x-pa.x,dy=pb.y-pa.y,ang=Math.atan2(dy,dx),as=7;
          ctx.setLineDash([]);ctx.globalAlpha=1;
          ctx.fillStyle=st.color;ctx.beginPath();
          ctx.moveTo(pb.x,pb.y);
          ctx.lineTo(pb.x-as*Math.cos(ang-.4),pb.y-as*Math.sin(ang-.4));
          ctx.lineTo(pb.x-as*Math.cos(ang+.4),pb.y-as*Math.sin(ang+.4));
          ctx.closePath();ctx.fill();
          if(e.label){
            const mx=(pa.x+pb.x)/2,my=(pa.y+pb.y)/2;
            ctx.font='11px sans-serif';
            const tw=ctx.measureText(e.label).width;
            ctx.fillStyle=BG;ctx.fillRect(mx-tw/2-3,my-8,tw+6,15);
            ctx.fillStyle=st.color;ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(e.label,mx,my);
          }
        }
        ctx.restore();
      });
      nodes.forEach(n=>{
        const c=C[n.type]||C.neut, isSel=sel&&sel.id===n.id;
        ctx.save();
        if(n.shape==='circle'){
          ctx.beginPath();ctx.arc(n.x,n.y,n.r+(isSel?3:0),0,Math.PI*2);
          ctx.fillStyle=c.fill;ctx.fill();
          if(isSel){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
          const fs=n.r>26?12:10;
          ctx.font='500 '+fs+'px sans-serif';ctx.fillStyle=c.text;
          ctx.textAlign='center';ctx.textBaseline='middle';
          const lines=wrapTxt(n.id,n.r*2-8),lh=fs+2;
          lines.forEach((l,li)=>ctx.fillText(l,n.x,n.y+(li-(lines.length-1)/2)*lh));
        } else {
          const hw=n.w/2+(isSel?2:0),hh=n.h/2+(isSel?2:0);
          ctx.beginPath();ctx.roundRect(n.x-hw,n.y-hh,hw*2,hh*2,6);
          ctx.fillStyle=c.fill;ctx.fill();
          if(isSel){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
          ctx.font='500 10px sans-serif';ctx.fillStyle=c.text;
          ctx.textAlign='center';ctx.textBaseline='middle';
          const lines=wrapTxt(n.id,n.w-10),lh=12;
          lines.forEach((l,li)=>ctx.fillText(l,n.x,n.y+(li-(lines.length-1)/2)*lh));
        }
        ctx.restore();
      });
    }

    function tick(){sim();draw();requestAnimationFrame(tick);}
    tick();

    function scale(){return W/CV.getBoundingClientRect().width;}
    function toC(ex,ey){const r=CV.getBoundingClientRect(),s=scale();return{cx:(ex-r.left)*s,cy:(ey-r.top)*s};}
    function nodeAt(cx,cy){
      return nodes.find(n=>{
        if(n.shape==='circle') return Math.hypot(n.x-cx,n.y-cy)<n.r+4;
        return cx>=n.x-n.w/2-4&&cx<=n.x+n.w/2+4&&cy>=n.y-n.h/2-4&&cy<=n.y+n.h/2+4;
      });
    }

    CV.addEventListener('mousedown',e=>{const{cx,cy}=toC(e.clientX,e.clientY);const n=nodeAt(cx,cy);if(n){drag=nodes.indexOf(n);}});
    CV.addEventListener('mousemove',e=>{
      const{cx,cy}=toC(e.clientX,e.clientY);
      if(drag!==null){nodes[drag].x=cx;nodes[drag].y=cy;}
      const n=nodeAt(cx,cy);
      if(n){
        const r=wrp.getBoundingClientRect();
        tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top-10)+'px';
        tip.innerHTML='<strong>'+n.id+'</strong>'+(n.bio?'<br>'+n.bio:'');
        tip.style.opacity=1;CV.style.cursor='pointer';
        // Clic sulla pagina collegata se rilasciato (gestito in click)
      } else {tip.style.opacity=0;if(drag===null)CV.style.cursor='grab';}
    });
    CV.addEventListener('mouseup',()=>{drag=null;CV.style.cursor='grab';});
    CV.addEventListener('mouseleave',()=>{drag=null;tip.style.opacity=0;});
    CV.addEventListener('click',e=>{
      const{cx,cy}=toC(e.clientX,e.clientY);
      const n=nodeAt(cx,cy);
      if(n){
        if(sel&&sel.id===n.id){ sel=null; }
        else { sel=n; }
        // Doppio click per navigare (gestito tramite dblclick)
      } else { sel=null; }
    });
    CV.addEventListener('dblclick',e=>{
      const{cx,cy}=toC(e.clientX,e.clientY);
      const n=nodeAt(cx,cy);
      if(n && n.id!=='${entry.id}' && typeof navigateTo==='function') navigateTo(n.id);
    });
    CV.addEventListener('touchstart',e=>{e.preventDefault();const t=e.touches[0];const{cx,cy}=toC(t.clientX,t.clientY);const n=nodeAt(cx,cy);if(n)drag=nodes.indexOf(n);},{passive:false});
    CV.addEventListener('touchmove',e=>{e.preventDefault();if(drag===null)return;const t=e.touches[0];const{cx,cy}=toC(t.clientX,t.clientY);nodes[drag].x=cx;nodes[drag].y=cy;},{passive:false});
    CV.addEventListener('touchend',()=>{drag=null;});
  }

  // Inizializza subito se il canvas è già nel DOM, altrimenti aspetta
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ${initFn});
  } else {
    setTimeout(${initFn}, 0);
  }
})();
<\/script>
</div>`;
}

// ── 3. BUILD PAGINA DA REGISTRO ──────────────────────────────────────

/**
 * Costruisce la pagina completa di un personaggio interamente dal registro.
 * Non chiama più le vecchie funzioni build() di app.js.
 * Genera: infobox, grafico relazioni, sezioni strutturate (governa, eventi, ruoli).
 */
function buildPersonaggioFromRegistry(entry, allEntries) {
  const name = entry.id;

  // ── Tipo colore badge ──
  const TIPO_LABEL = { main: '⭐ Protagonista', ally: '🟢 Alleato', enemy: '🔴 Antagonista', neut: '🔵 Neutro' };
  const tipoLabel = TIPO_LABEL[entry.tipo] || '🔵 Neutro';

  // ── Icona per kind ──
  const kindIcon = { person: '👤', place: '📍', event: '📅', group: '👥', other: '📄' };

  // ── Costruisci righe infobox ──
  const rows = [];
  if (entry.tipo)     rows.push(['Tipo',    tipoLabel]);
  if (entry.ruolo)    rows.push(['Ruolo',   entry.ruolo]);
  if (entry.nascita)  rows.push(['Nascita', entry.nascita]);
  if (entry.morte)    rows.push(['Morte',   entry.morte]);
  if (entry.gruppo) {
    const g = Array.isArray(entry.gruppo) ? entry.gruppo : [entry.gruppo];
    rows.push(['Gruppo', g.map(x => `<a onclick="navigateTo('${x}')">${x}</a>`).join(', ')]);
  }
  if (entry.governa && entry.governa.length > 0) {
    rows.push(['Governa / ha governato',
      entry.governa.map(g => `<a onclick="navigateTo('${g.luogo}')">${g.luogo}</a> <span style="color:#54595d;font-size:11px">(${g.periodo}${g.ruolo ? ' · ' + g.ruolo : ''})</span>`).join('<br>')
    ]);
  }
  if (entry.alleati && entry.alleati.length > 0) {
    rows.push(['Alleati principali',
      entry.alleati.map(a => `<a onclick="navigateTo('${a}')">${a}</a>`).join(', ')
    ]);
  }
  if (entry.nemici && entry.nemici.length > 0) {
    rows.push(['Nemici principali',
      entry.nemici.map(a => `<a onclick="navigateTo('${a}')">${a}</a>`).join(', ')
    ]);
  }

  // ── Notice banner ──
  const notice = entry.bio
    ? wikiNotice('👤', `<b>${name}</b> — ${entry.bio}`)
    : '';

  // ── Infobox ──
  const infobox = wikiInfobox(name, rows, entry.img || null);

  // ── Grafico relazioni ──
  const hasGraph = (entry.relazioni && entry.relazioni.length > 0) ||
                   (entry.eventi    && entry.eventi.length    > 0);
  const graph = hasGraph ? buildRelationsGraph(entry, allEntries) : '';

  // ── Sezione: governa ──
  let governaSection = '';
  if (entry.governa && entry.governa.length > 0) {
    governaSection = `
<h2 id="governa-${name.replace(/\s/g,'_')}">🏛️ Territori governati <span class="edit-link" onclick="openEditor('${name}')">[modifica]</span></h2>
<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px;margin-bottom:16px">
<tr style="background:#f8f9fa"><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Luogo</th><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Periodo</th><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Ruolo</th></tr>
${entry.governa.map(g => `<tr>
  <td style="padding:5px 10px;border:1px solid #eaecf0"><a onclick="navigateTo('${g.luogo}')">${g.luogo}</a></td>
  <td style="padding:5px 10px;border:1px solid #eaecf0">${g.periodo}</td>
  <td style="padding:5px 10px;border:1px solid #eaecf0">${g.ruolo || '—'}</td>
</tr>`).join('')}
</table>`;
  }

  // ── Sezione: eventi/guerre ──
  let eventiSection = '';
  if (entry.eventi && entry.eventi.length > 0) {
    const eventiDetails = entry.eventi.map(ev => {
      const evEntry = allEntries.find(e => e.id === ev.con);
      const evBio = evEntry ? evEntry.bio || '' : '';
      return `<tr>
  <td style="padding:5px 10px;border:1px solid #eaecf0"><a onclick="navigateTo('${ev.con}')">${ev.con}</a></td>
  <td style="padding:5px 10px;border:1px solid #eaecf0">${ev.label}</td>
  <td style="padding:5px 10px;border:1px solid #eaecf0;color:#54595d;font-size:12px">${evBio}</td>
</tr>`;
    }).join('');

    eventiSection = `
<h2 id="eventi-${name.replace(/\s/g,'_')}">⚔️ Guerre ed eventi <span class="edit-link" onclick="openEditor('${name}')">[modifica]</span></h2>
<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px;margin-bottom:16px">
<tr style="background:#f8f9fa"><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Evento</th><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Ruolo</th><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Note</th></tr>
${eventiDetails}
</table>`;
  }

  // ── Sezione: relazioni ──
  let relazioniSection = '';
  if (entry.relazioni && entry.relazioni.length > 0) {
    const TIPO_REL = { nemico: '🔴 Nemico', alleato: '🔵 Alleato', amico: '🟢 Amico', neutro: '⚪ Neutro' };
    const rows = entry.relazioni.map(r => {
      const other = allEntries.find(e => e.id === r.con);
      const otherBio = other ? other.bio || '' : '';
      return `<tr>
  <td style="padding:5px 10px;border:1px solid #eaecf0"><a onclick="navigateTo('${r.con}')">${r.con}</a></td>
  <td style="padding:5px 10px;border:1px solid #eaecf0">${TIPO_REL[r.tipo] || r.tipo}</td>
  <td style="padding:5px 10px;border:1px solid #eaecf0">${r.label}</td>
  <td style="padding:5px 10px;border:1px solid #eaecf0;color:#54595d;font-size:12px">${otherBio}</td>
</tr>`;
    }).join('');

    relazioniSection = `
<h2 id="relazioni-${name.replace(/\s/g,'_')}">🕸️ Relazioni <span class="edit-link" onclick="openEditor('${name}')">[modifica]</span></h2>
<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px;margin-bottom:16px">
<tr style="background:#f8f9fa"><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Personaggio</th><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Tipo</th><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Legame</th><th style="padding:6px 10px;border:1px solid #eaecf0;text-align:left">Note</th></tr>
${rows}
</table>`;
  }

  // ── TOC ──
  const tocVoci = [];
  if (graph)             tocVoci.push({ id: 'grafo-'+name.replace(/\s/g,'_'),      label: '🕸️ Rete di relazioni' });
  if (governaSection)    tocVoci.push({ id: 'governa-'+name.replace(/\s/g,'_'),    label: '🏛️ Territori governati' });
  if (eventiSection)     tocVoci.push({ id: 'eventi-'+name.replace(/\s/g,'_'),     label: '⚔️ Guerre ed eventi' });
  if (relazioniSection)  tocVoci.push({ id: 'relazioni-'+name.replace(/\s/g,'_'),  label: '🕸️ Relazioni' });
  const toc = tocVoci.length > 1 ? wikiTOC(tocVoci) : '';

  // ── Categorie ──
  const cats = entry.cats && entry.cats.length > 0 ? wikiCats(...entry.cats) : '';

  return notice
    + wikiHeader(name)
    + infobox
    + (entry.bio ? `<p style="font-family:sans-serif;font-size:13px;line-height:1.6;margin-bottom:12px">${entry.bio}</p>` : '')
    + toc
    + graph
    + governaSection
    + eventiSection
    + relazioniSection
    + wikiClose()
    + cats;
}

/**
 * Dispatcher principale: decide come costruire ogni pagina.
 * Per i personaggi usa buildPersonaggioFromRegistry.
 * Per eventi/luoghi/altri senza build: stub.
 */
function buildPageFromRegistry(entry, allEntries) {
  if (entry.kind === 'person') {
    return buildPersonaggioFromRegistry(entry, allEntries);
  }

  if (entry.kind === 'event' && !entry.build) {
    return wikiNotice('📅', `Questa voce sull'evento <b>${entry.id}</b> è in costruzione.`)
         + wikiHeader(entry.id)
         + (entry.bio ? `<p>${entry.bio}</p>` : '<p>Voce in costruzione.</p>')
         + wikiClose()
         + wikiCats(...(entry.cats || ['Eventi']));
  }

  if (entry.build) {
    return entry.build();
  }

  return '';
}

// ── 4. REGISTRO CENTRALE ─────────────────────────────────────────────
//
//  Aggiungi qui ogni pagina. Campi:
//    id       — nome esatto della pagina (usato per navigateTo e DEFAULT_PAGES)
//    kind     — 'person' | 'event' | 'place' | 'group' | 'other'
//    sidebar  — true = appare nella sidebar
//    cats     — array di categorie
//    build    — funzione che genera l'HTML (definita in app.js)
//    bio      — breve descrizione (usata nel tooltip del grafico)
//    tipo     — colore nodo: 'main'|'ally'|'enemy'|'neut'
//    relazioni— [ { con, tipo, label } ]
//    eventi   — [ { con, label } ]

const PAGE_REGISTRY = [

  // ── PAGINA PRINCIPALE ─────────────────────────────────────────────
  { id: 'Main', kind: 'other', sidebar: false },

  // ══════════════════════════════════════════════════════════════════
  //  PERSONAGGI — generati interamente da buildPersonaggioFromRegistry
  // ══════════════════════════════════════════════════════════════════

  // ── CLAN SPISSO ───────────────────────────────────────────────────
  {
    id: 'Alessio Spisso', kind: 'person', sidebar: true,
    cats: ['Clan Spisso', 'Serrano', 'Protagonisti'],
    bio: 'Il fratello ribelle, sopravvissuto alla Bomba Spissica. Controlla Serrano dal cielo.',
    tipo: 'main',
    ruolo: 'Signore di Serrano',
    governa: [
      { luogo: 'Serrano', periodo: '109 dM → oggi', ruolo: 'Signore della città volante' },
    ],
    relazioni: [
      { con: 'Alex Spisso',           tipo: 'nemico',  label: 'fratello-nemico' },
      { con: 'Ilaria Spisso',         tipo: 'alleato', label: 'madre' },
      { con: 'Ermenegildo Spisso',    tipo: 'alleato', label: 'zio' },
      { con: 'AleDoria',              tipo: 'neutro',  label: 'rivale politico' },
      { con: 'Nicolò Donno',          tipo: 'nemico',  label: 'nemico' },
      { con: 'Flavia Aventeggiato',   tipo: 'nemico',  label: 'nemico' },
    ],
    eventi: [
      { con: 'Bomba Spissica',                       label: 'sopravvissuto' },
      { con: 'Terza Guerra degli Avengers',          label: 'protagonista (Alessio²)' },
      { con: 'Vandalismo Democratico di Serrano',    label: 'bersaglio simbolico' },
    ],
  },

  {
    id: 'Alex Spisso', kind: 'person', sidebar: true,
    cats: ['Clan Spisso', 'Avengers', 'America'],
    bio: 'Iron Spisso Man. Fondatore e traditore degli Avengers, dittatore dell'America (107–119 dM).',
    tipo: 'enemy',
    ruolo: 'Dittatore / Iron Spisso Man',
    governa: [
      { luogo: 'America (Avengers)', periodo: '107–119 dM', ruolo: 'Dittatore' },
    ],
    relazioni: [
      { con: 'Alessio Spisso',  tipo: 'nemico', label: 'fratello-nemico' },
      { con: 'Ilaria Spisso',   tipo: 'alleato', label: 'madre' },
      { con: 'Zella',           tipo: 'nemico', label: 'rivale' },
      { con: 'Pete Hegseth',    tipo: 'alleato', label: 'figlio biologico' },
    ],
    eventi: [
      { con: 'Prima Guerra degli Avengers',   label: 'protagonista' },
      { con: 'Seconda Guerra degli Avengers', label: 'protagonista' },
      { con: 'Terza Guerra degli Avengers',   label: 'sconfitto / disintegrato' },
      { con: 'Bomba Spissica',                label: 'autore' },
      { con: 'La Prima Guerra Pocchiana',     label: 'belligerante' },
    ],
  },

  {
    id: 'Ilaria Spisso', kind: 'person', sidebar: true,
    cats: ['Clan Spisso', 'Avengers'],
    bio: 'La Donna delle Torte. Madre di Alex e Alessio Spisso. Ex-Avenger (Spisshor).',
    tipo: 'neut',
    ruolo: 'Ex-Avenger (Spisshor)',
    relazioni: [
      { con: 'Alex Spisso',     tipo: 'amico',  label: 'figlio' },
      { con: 'Alessio Spisso',  tipo: 'amico',  label: 'figlio' },
    ],
    eventi: [
      { con: 'Prima Guerra degli Avengers',   label: 'Avenger' },
      { con: 'Seconda Guerra degli Avengers', label: 'Avenger' },
    ],
  },

  {
    id: 'Ermenegildo Spisso', kind: 'person', sidebar: true,
    cats: ['Clan Spisso', 'Scienza'],
    bio: 'Fisico teorico. Autore delle F.O.N.D.A.M.E.N.T.A. e delle L.E.G.G.I. sotto pseudonimo.',
    tipo: 'neut',
    ruolo: 'Fisico teorico',
    relazioni: [
      { con: 'Alessio Spisso', tipo: 'alleato', label: 'nipote' },
      { con: 'Alex Spisso',    tipo: 'alleato', label: 'nipote' },
      { con: 'Mancarella',     tipo: 'amico',   label: 'collega di ricerca' },
    ],
    eventi: [],
  },

  {
    id: 'Pete Hegseth', kind: 'person', sidebar: true,
    cats: ['Clan Spisso', 'America'],
    bio: 'Figlio biologico di Alex Spisso. Consigliere di Guerra. Arrestato nel 121 dM.',
    tipo: 'enemy',
    ruolo: 'Consigliere di Guerra',
    relazioni: [
      { con: 'Alex Spisso', tipo: 'alleato', label: 'padre biologico' },
    ],
    eventi: [
      { con: 'Terza Guerra degli Avengers', label: 'consigliere' },
    ],
  },

  // ── NAPOLI / ETÀ DELL'ORO ─────────────────────────────────────────
  {
    id: 'Morello', kind: 'person', sidebar: true,
    cats: ['Napoli', 'Camorra Salentina', 'Castri'],
    bio: 'Co-governatore di Napoli nell'Età dell'Oro. Fondatore della Camorra Salentina. Oggi diarca di Castri.',
    tipo: 'main',
    ruolo: 'Co-governatore / Diarca',
    governa: [
      { luogo: 'Napoli', periodo: '0–17 dM', ruolo: 'Co-governatore con Sal da Spicci' },
      { luogo: 'Castri', periodo: '157 dM → oggi', ruolo: 'Diarca con Zio di Sbost' },
    ],
    relazioni: [
      { con: 'Sal da Spicci',    tipo: 'amico',  label: 'co-governatore di Napoli' },
      { con: 'Zio di Sbost',     tipo: 'amico',  label: 'diarca di Castri' },
      { con: 'Riccardo Pascali', tipo: 'neutro', label: 'storico rivale' },
      { con: 'Filippo Pascali',  tipo: 'neutro', label: 'conosce da tempo' },
    ],
    eventi: [
      { con: 'La caduta di Napoli',      label: 'catturato' },
      { con: 'Processo a Charlie Sbirk', label: 'accusatore' },
    ],
  },

  {
    id: 'Sal da Spicci', kind: 'person', sidebar: true,
    cats: ['Napoli', 'Età dell'Oro'],
    bio: 'Co-governatore di Napoli. Cantante straordinario. Scomparso nel 17 dM, forse diventato Sal da Vinci.',
    tipo: 'neut',
    ruolo: 'Co-governatore di Napoli',
    governa: [
      { luogo: 'Napoli', periodo: '0–17 dM', ruolo: 'Co-governatore con Morello' },
    ],
    relazioni: [
      { con: 'Morello',          tipo: 'amico',  label: 'co-governatore' },
      { con: 'Filippo Pascali',  tipo: 'amico',  label: 'conosciuto da bambino' },
      { con: 'Sal da Vinci',     tipo: 'neutro', label: 'forse la stessa persona' },
    ],
    eventi: [],
  },

  {
    id: 'Sal da Vinci', kind: 'person', sidebar: true,
    cats: ['Musica', 'Napoli'],
    bio: 'Cantante neomelodico. Identità reale disputata: potrebbe essere Sal da Spicci dopo il 17 dM.',
    tipo: 'neut',
    ruolo: 'Cantante',
    relazioni: [
      { con: 'Sal da Spicci',   tipo: 'neutro', label: 'forse la stessa persona' },
      { con: 'Filippo Pascali', tipo: 'amico',  label: 'collegamento indiretto' },
    ],
    eventi: [],
  },

  // ── SBOST / CASTRI ────────────────────────────────────────────────
  {
    id: 'Zio di Sbost', kind: 'person', sidebar: true,
    cats: ['Sbost', 'La Cantina', 'Castri'],
    bio: 'Funzionario doganale. Fondatore de La Cantina. Oggi diarca di Castri con Morello.',
    tipo: 'neut',
    ruolo: 'Fondatore / Diarca',
    governa: [
      { luogo: 'La Cantina', periodo: '? → 126 dM', ruolo: 'Fondatore e signore' },
      { luogo: 'Castri',     periodo: '157 dM → oggi', ruolo: 'Diarca con Morello' },
    ],
    relazioni: [
      { con: 'AleDoria',      tipo: 'nemico',  label: 'rovesciato da lui' },
      { con: 'Morello',       tipo: 'amico',   label: 'diarca di Castri' },
      { con: 'Primo Clone dello Zio di Sbost', tipo: 'nemico', label: 'clone ribelle' },
    ],
    eventi: [
      { con: 'Grande Spaccatura degli Sbost', label: 'sconfitto' },
      { con: 'Processo a Charlie Sbirk',      label: 'accusatore' },
    ],
  },

  {
    id: 'AleDoria', kind: 'person', sidebar: true,
    cats: ['Sbost', 'Castri', 'Regno d'Italia'],
    bio: 'Inventore degli Sbost Bot. Cacciò lo Zio di Sbost da Castri. Oggi Re d'Italia.',
    tipo: 'ally',
    ruolo: 'Re d'Italia',
    governa: [
      { luogo: 'Castri',         periodo: '126–156 dM', ruolo: 'Primo ministro democratico' },
      { luogo: 'Regno d'Italia', periodo: '219 dM → oggi', ruolo: 'Re' },
    ],
    relazioni: [
      { con: 'Zio di Sbost',                   tipo: 'nemico',  label: 'ribellione contro' },
      { con: 'Primo Clone dello Zio di Sbost',  tipo: 'alleato', label: 'alleato temporaneo' },
      { con: 'Alessio Spisso',                  tipo: 'neutro',  label: 'rivale politico' },
    ],
    eventi: [
      { con: 'Grande Spaccatura degli Sbost',   label: 'protagonista' },
      { con: 'Proclamazione Regno d'Italia',   label: 'fondatore' },
    ],
  },

  {
    id: 'Primo Clone dello Zio di Sbost', kind: 'person', sidebar: true,
    cats: ['Sbost', 'Castri', 'Democratici'],
    bio: 'Charlie Sbirk. Filosofo democratico, poi dittatore, processato e giustiziato nel 157 dM.',
    tipo: 'neut',
    ruolo: 'Filosofo / Dittatore',
    governa: [
      { luogo: 'Castri', periodo: '126–156 dM', ruolo: 'Dittatore (fase finale)' },
    ],
    relazioni: [
      { con: 'AleDoria',    tipo: 'alleato', label: 'alleato iniziale' },
      { con: 'Zio di Sbost',tipo: 'nemico',  label: 'originale da cui è clonato' },
      { con: 'Nicolò Donno',tipo: 'amico',   label: 'ispirazione ai Puma' },
    ],
    eventi: [
      { con: 'Grande Spaccatura degli Sbost', label: 'ispiratore' },
      { con: 'Rivolta di Castri',             label: 'caduta' },
      { con: 'Processo a Charlie Sbirk',      label: 'imputato' },
    ],
  },

  {
    id: 'Elisa Sbost', kind: 'person', sidebar: false,
    cats: ['Sbost', 'Castri'],
    bio: 'Estetista di Castri. Ha rimosso i capelli di Morello dallo Zio di Sbost.',
    tipo: 'neut',
    ruolo: 'Estetista',
    relazioni: [
      { con: 'Zio di Sbost', tipo: 'amico', label: 'cliente' },
      { con: 'Morello',      tipo: 'amico', label: 'coinvolta in modo indiretto' },
    ],
    eventi: [],
  },

  // ── AVENGERS ─────────────────────────────────────────────────────
  {
    id: 'Zella', kind: 'person', sidebar: true,
    cats: ['Avengers', 'America'],
    bio: 'L'Albanese. Capo degli Avengers. Governatore dell'America dopo la Terza Guerra.',
    tipo: 'ally',
    ruolo: 'Capo degli Avengers / Governatore',
    governa: [
      { luogo: 'America (Avengers)', periodo: '119 dM → oggi', ruolo: 'Governatore' },
    ],
    relazioni: [
      { con: 'Alex Spisso',    tipo: 'nemico',  label: 'rivale' },
      { con: 'Alessio Spisso', tipo: 'alleato', label: 'alleato' },
      { con: 'Valerio Mozzarella', tipo: 'alleato', label: 'Avenger' },
      { con: 'Nicolò',         tipo: 'alleato', label: 'Avenger' },
    ],
    eventi: [
      { con: 'Prima Guerra degli Avengers',   label: 'protagonista' },
      { con: 'Seconda Guerra degli Avengers', label: 'protagonista' },
      { con: 'Terza Guerra degli Avengers',   label: 'vincitore' },
    ],
  },

  {
    id: 'Valerio Mozzarella', kind: 'person', sidebar: false,
    cats: ['Avengers'],
    bio: 'Capitan Bianco. Acceca i nemici con la sua bianchezza.',
    tipo: 'ally',
    ruolo: 'Avenger',
    relazioni: [
      { con: 'Zella',   tipo: 'alleato', label: 'Avenger' },
      { con: 'Nicolò',  tipo: 'alleato', label: 'Avenger' },
    ],
    eventi: [
      { con: 'Prima Guerra degli Avengers',   label: 'Avenger' },
      { con: 'Seconda Guerra degli Avengers', label: 'Avenger' },
      { con: 'Terza Guerra degli Avengers',   label: 'Avenger' },
    ],
  },

  {
    id: 'Nicolò', kind: 'person', sidebar: false,
    cats: ['Avengers'],
    bio: 'Avenger. Fratello di Francesco Maggiore. Agilità sovrumana.',
    tipo: 'ally',
    ruolo: 'Avenger',
    relazioni: [
      { con: 'Francesco Maggiore', tipo: 'amico',   label: 'fratello' },
      { con: 'Zella',              tipo: 'alleato', label: 'Avenger' },
    ],
    eventi: [
      { con: 'Terza Guerra degli Avengers', label: 'Avenger' },
    ],
  },

  {
    id: 'Francesco Maggiore', kind: 'person', sidebar: false,
    cats: ['Avengers'],
    bio: 'Lo Scudo Maggiore. Fratello di Nicolò.',
    tipo: 'ally',
    ruolo: 'Avenger',
    relazioni: [
      { con: 'Nicolò', tipo: 'amico',   label: 'fratello' },
      { con: 'Zella',  tipo: 'alleato', label: 'Avenger' },
    ],
    eventi: [
      { con: 'Terza Guerra degli Avengers', label: 'Avenger' },
    ],
  },

  {
    id: 'Spider Trovè', kind: 'person', sidebar: false,
    cats: ['Avengers'],
    bio: 'L'inventore degli Avengers. Ha rivelato il suo volto dopo la guerra.',
    tipo: 'ally',
    ruolo: 'Fondatore degli Avengers',
    relazioni: [
      { con: 'Zella',      tipo: 'alleato', label: 'Avenger' },
      { con: 'Alex Spisso',tipo: 'nemico',  label: 'traditore degli Avengers' },
    ],
    eventi: [
      { con: 'Prima Guerra degli Avengers', label: 'fondatore / Avenger' },
    ],
  },

  {
    id: 'Emanuele Pascali', kind: 'person', sidebar: false,
    cats: ['Avengers', 'Famiglia Pocchia'],
    bio: 'Della Famiglia Pocchia. Avenger con poteri di volo.',
    tipo: 'ally',
    ruolo: 'Avenger',
    relazioni: [
      { con: 'Filippo Pascali',  tipo: 'amico',   label: 'famiglia' },
      { con: 'Zella',            tipo: 'alleato', label: 'Avenger' },
    ],
    eventi: [
      { con: 'Terza Guerra degli Avengers', label: 'Avenger' },
    ],
  },

  // ── FAMIGLIA POCCHIA ─────────────────────────────────────────────
  {
    id: 'Gianluca Pascali', kind: 'person', sidebar: true,
    cats: ['Famiglia Pocchia', 'Filippine'],
    bio: 'Patriarca della Famiglia Pocchia. Militare in pensione. Ha salvato Riccardo da bambino.',
    tipo: 'ally',
    ruolo: 'Patriarca / Militare',
    relazioni: [
      { con: 'Anna Pocchia',     tipo: 'amico',   label: 'moglie' },
      { con: 'Filippo Pascali',  tipo: 'amico',   label: 'figlio' },
      { con: 'Riccardo Pascali', tipo: 'amico',   label: 'ha salvato da bambino' },
      { con: 'Pierpaolo',        tipo: 'amico',   label: 'commilitone' },
    ],
    eventi: [],
  },

  {
    id: 'Anna Pocchia', kind: 'person', sidebar: false,
    cats: ['Famiglia Pocchia'],
    bio: 'Moglie di Gianluca Pascali. Mai una parola fuori posto.',
    tipo: 'ally',
    ruolo: 'Matriarca',
    relazioni: [
      { con: 'Gianluca Pascali', tipo: 'amico', label: 'marito' },
      { con: 'Filippo Pascali',  tipo: 'amico', label: 'figlio' },
    ],
    eventi: [],
  },

  {
    id: 'Filippo Pascali', kind: 'person', sidebar: true,
    cats: ['Famiglia Pocchia', 'Filippine'],
    bio: 'Militare. Co-fondatore delle Filippine. Amico d'infanzia di Morello.',
    tipo: 'ally',
    ruolo: 'Co-fondatore delle Filippine / Militare',
    governa: [
      { luogo: 'Filippine', periodo: '? → oggi', ruolo: 'Co-fondatore' },
    ],
    relazioni: [
      { con: 'Alice Sportella',  tipo: 'amico',   label: 'moglie' },
      { con: 'Gianluca Pascali', tipo: 'amico',   label: 'padre' },
      { con: 'Riccardo Pascali', tipo: 'amico',   label: 'cugino' },
      { con: 'Sal da Spicci',    tipo: 'amico',   label: 'amico d'infanzia' },
      { con: 'Morello',          tipo: 'neutro',  label: 'amico d'infanzia' },
    ],
    eventi: [
      { con: 'La Prima Guerra Pocchiana', label: 'protagonista' },
    ],
  },

  {
    id: 'Riccardo Pascali', kind: 'person', sidebar: true,
    cats: ['Famiglia Pocchia', 'Filippine'],
    bio: 'Rick Brick. Investigatore. Ha smantellato il Clan Spisso nell'89 dM.',
    tipo: 'ally',
    ruolo: 'Investigatore',
    relazioni: [
      { con: 'Gianluca Pascali', tipo: 'amico',   label: 'salvato da lui' },
      { con: 'Filippo Pascali',  tipo: 'amico',   label: 'cugino' },
      { con: 'Clan Spisso',      tipo: 'nemico',  label: 'ha smantellato' },
    ],
    eventi: [
      { con: 'Operazione Brick', label: 'protagonista' },
    ],
  },

  {
    id: 'Alice Sportella', kind: 'person', sidebar: false,
    cats: ['Famiglia Pocchia', 'Filippine'],
    bio: 'Moglie di Filippo. Co-comandante della conquista di Serrano.',
    tipo: 'ally',
    ruolo: 'Co-comandante militare',
    governa: [
      { luogo: 'Filippine', periodo: '? → oggi', ruolo: 'Co-fondatrice' },
    ],
    relazioni: [
      { con: 'Filippo Pascali',  tipo: 'amico', label: 'marito' },
      { con: 'Gianluca Pascali', tipo: 'amico', label: 'suocero' },
    ],
    eventi: [
      { con: 'La Prima Guerra Pocchiana', label: 'co-comandante' },
    ],
  },

  {
    id: 'Figli di Filippo', kind: 'person', sidebar: false,
    cats: ['Famiglia Pocchia'],
    bio: 'Luca, Gino e Carla Pascali. I tre figli di Filippo e Alice, nati con la sindrome di Down.',
    tipo: 'ally',
    ruolo: 'Figli di Filippo e Alice',
    relazioni: [
      { con: 'Filippo Pascali', tipo: 'amico', label: 'padre' },
      { con: 'Alice Sportella', tipo: 'amico', label: 'madre' },
    ],
    eventi: [],
  },

  {
    id: 'Luca Pascali', kind: 'person', sidebar: false,
    cats: ['Famiglia Pocchia'],
    bio: 'Il primogenito di Filippo. Inventore involontario del nome "Giachele".',
    tipo: 'ally',
    ruolo: 'Figlio di Filippo',
    relazioni: [
      { con: 'Filippo Pascali', tipo: 'amico', label: 'padre' },
    ],
    eventi: [],
  },

  // ── I PUMA ───────────────────────────────────────────────────────
  {
    id: 'Nicolò Donno', kind: 'person', sidebar: true,
    cats: ['I Puma', 'Serrano', 'Democratici'],
    bio: 'Leader dei Puma. Organizzatore silenzioso. Occhiali da sole anche di notte.',
    tipo: 'enemy',
    ruolo: 'Leader dei Puma',
    relazioni: [
      { con: 'Alessio Spisso',        tipo: 'nemico',  label: 'nemico' },
      { con: 'Maria Grazia Calò',     tipo: 'alleato', label: 'Puma' },
      { con: 'Flavia Aventeggiato',   tipo: 'alleato', label: 'Puma' },
      { con: 'Antonio Cazzato',       tipo: 'alleato', label: 'Puma' },
      { con: 'Andrea Sponziello',     tipo: 'alleato', label: 'Puma' },
      { con: 'Primo Clone dello Zio di Sbost', tipo: 'amico', label: 'ispirazione' },
      { con: 'Giulia Donno',          tipo: 'amico',   label: 'sorella' },
    ],
    eventi: [
      { con: 'Vandalismo Democratico di Serrano', label: 'organizzatore' },
    ],
  },

  {
    id: 'Maria Grazia Calò', kind: 'person', sidebar: true,
    cats: ['I Puma', 'Serrano', 'Street art'],
    bio: 'Artista dei Puma. Ogni puma stilizzato è suo. Ha disegnato il logo in 18 secondi.',
    tipo: 'enemy',
    ruolo: 'Artista / Puma',
    relazioni: [
      { con: 'Nicolò Donno',          tipo: 'alleato', label: 'Puma' },
      { con: 'Antonio Cazzato',       tipo: 'alleato', label: 'Puma' },
      { con: 'Flavia Aventeggiato',   tipo: 'alleato', label: 'Puma' },
      { con: 'Andrea Sponziello',     tipo: 'alleato', label: 'Puma' },
      { con: 'Alessio Spisso',        tipo: 'nemico',  label: 'nemico' },
    ],
    eventi: [
      { con: 'Vandalismo Democratico di Serrano', label: 'artista principale' },
    ],
  },

  {
    id: 'Antonio Cazzato', kind: 'person', sidebar: true,
    cats: ['I Puma', 'Serrano'],
    bio: 'Il Matematico e Fisico Ribelle. Calcola traiettorie di bombolette.',
    tipo: 'enemy',
    ruolo: 'Pianificatore / Puma',
    relazioni: [
      { con: 'Nicolò Donno',          tipo: 'alleato', label: 'Puma' },
      { con: 'Maria Grazia Calò',     tipo: 'alleato', label: 'Puma' },
      { con: 'Flavia Aventeggiato',   tipo: 'alleato', label: 'Puma' },
      { con: 'Andrea Sponziello',     tipo: 'alleato', label: 'Puma' },
    ],
    eventi: [
      { con: 'Vandalismo Democratico di Serrano', label: 'pianificatore operativo' },
    ],
  },

  {
    id: 'Flavia Aventeggiato', kind: 'person', sidebar: true,
    cats: ['I Puma', 'Calimera', 'FlaNova'],
    bio: 'Di Calimera. Forma a pera. Co-fondatrice FlaNova. Odia Alessio Spisso in modo strutturale, politico e personale.',
    tipo: 'enemy',
    ruolo: 'Logistica / Co-fondatrice FlaNova',
    relazioni: [
      { con: 'Alessio Spisso',    tipo: 'nemico',  label: 'odio personale dichiarato' },
      { con: 'Nicolò Donno',      tipo: 'alleato', label: 'Puma' },
      { con: 'Andrea Sponziello', tipo: 'alleato', label: 'co-fondatrice FlaNova' },
      { con: 'Maria Grazia Calò', tipo: 'alleato', label: 'Puma' },
      { con: 'Antonio Cazzato',   tipo: 'alleato', label: 'Puma' },
    ],
    eventi: [
      { con: 'Vandalismo Democratico di Serrano', label: 'logistica / fuga' },
    ],
  },

  {
    id: 'Andrea Sponziello', kind: 'person', sidebar: true,
    cats: ['I Puma', 'Serrano', 'FlaNova'],
    bio: 'Fisico con la startup FlaNova. Tentò la proiezione luminosa. Portò 12 bombolette.',
    tipo: 'enemy',
    ruolo: 'Tecnologo / Co-fondatore FlaNova',
    relazioni: [
      { con: 'Nicolò Donno',          tipo: 'alleato', label: 'Puma' },
      { con: 'Flavia Aventeggiato',   tipo: 'alleato', label: 'co-fondatore FlaNova' },
      { con: 'Maria Grazia Calò',     tipo: 'alleato', label: 'Puma' },
      { con: 'Antonio Cazzato',       tipo: 'alleato', label: 'Puma' },
      { con: 'Alessio Spisso',        tipo: 'nemico',  label: 'monopolio da abbattere' },
    ],
    eventi: [
      { con: 'Vandalismo Democratico di Serrano', label: 'Puma / tecnologo' },
    ],
  },

  // ── RELIGIONE / DIVINITÀ ─────────────────────────────────────────
  {
    id: 'Ludovico Pio Tommasi', kind: 'person', sidebar: true,
    cats: ['Religione', 'Topismo'],
    bio: 'Il Dio creatore di questo mondo, detto anche "Cheddar" o "Re dei topi".',
    tipo: 'main',
    ruolo: 'Dio creatore',
    relazioni: [
      { con: 'VitoCarlo Tommasi', tipo: 'amico', label: 'figlio di' },
      { con: 'Topus Maximus',     tipo: 'nemico', label: 'falso figlio' },
      { con: 'La Fede',           tipo: 'alleato', label: 'terza entità divina' },
    ],
    eventi: [],
  },

  {
    id: 'VitoCarlo Tommasi', kind: 'person', sidebar: true,
    cats: ['Religione', 'Topismo'],
    bio: 'L'Architetto. Padre di Ludovico Pio Tommasi. Progettò le fondamenta del mondo.',
    tipo: 'main',
    ruolo: 'L'Architetto',
    relazioni: [
      { con: 'Ludovico Pio Tommasi', tipo: 'amico', label: 'padre di' },
    ],
    eventi: [],
  },

  {
    id: 'Topus Maximus', kind: 'person', sidebar: true,
    cats: ['Topismo', 'Religione'],
    bio: 'Falso figlio di Dio incarnato. Fondatore del Topismo. Scoppulato nel 103 dM.',
    tipo: 'enemy',
    ruolo: 'Falso profeta / Fondatore del Topismo',
    relazioni: [
      { con: 'Ludovico Pio Tommasi', tipo: 'nemico', label: 'falso figlio' },
      { con: 'Cheddar Mussolini',    tipo: 'nemico', label: 'erede ribelle' },
      { con: 'Bomber',               tipo: 'neutro', label: 'falso erede' },
    ],
    eventi: [],
  },

  {
    id: 'Cheddar Mussolini', kind: 'person', sidebar: true,
    cats: ['Topismo', 'Religione'],
    bio: 'La Strega Cheddar. Leader dei Ludotopici, fazione di Topismo.',
    tipo: 'enemy',
    ruolo: 'Leader dei Ludotopici',
    relazioni: [
      { con: 'Topus Maximus',        tipo: 'neutro',  label: 'predecessore' },
      { con: 'Ludovico Pio Tommasi', tipo: 'neutro',  label: 'oggetto di culto' },
    ],
    eventi: [],
  },

  {
    id: 'Bomber', kind: 'person', sidebar: false,
    cats: ['Topismo', 'Corigliano'],
    bio: 'Falso Topus Maximus resuscitato nel 131 dM. Ora fa gol.',
    tipo: 'neut',
    ruolo: 'Falso erede / Calciatore',
    relazioni: [
      { con: 'Renna',        tipo: 'amico',  label: 'in squadra' },
      { con: 'Topus Maximus',tipo: 'neutro', label: 'falso erede' },
    ],
    eventi: [
      { con: 'La Grande Partita tra le Fiamme', label: 'protagonista' },
    ],
  },

  {
    id: 'Renna', kind: 'person', sidebar: false,
    cats: ['104 Nigeriani', 'Corigliano'],
    bio: 'Rennino104. Partecipò alla Grande Partita che liberò Corigliano.',
    tipo: 'ally',
    ruolo: 'Calciatore / Guerriero',
    relazioni: [
      { con: 'Bomber', tipo: 'amico', label: 'in squadra' },
    ],
    eventi: [
      { con: 'La Grande Partita tra le Fiamme', label: 'protagonista' },
    ],
  },

  // ── UK E ANNESSE ─────────────────────────────────────────────────
  {
    id: 'Anna Colella', kind: 'person', sidebar: true,
    cats: ['UK di GB e Francia'],
    bio: 'Fondatrice del The United Kingdom of Great Britain and France (189 dM). Istituì i Calassi con l'Editto di Colella (193 dM).',
    tipo: 'ally',
    ruolo: 'Fondatrice e Regina',
    governa: [
      { luogo: 'The United Kingdom of Great Britain and France', periodo: '189 dM → ?', ruolo: 'Fondatrice e Regina' },
    ],
    relazioni: [
      { con: 'Maria Marzo',  tipo: 'amico', label: 'corte' },
      { con: 'Calogiuri',    tipo: 'amico', label: 'corte' },
    ],
    eventi: [
      { con: 'Editto di Colella', label: 'autrice' },
    ],
  },

  {
    id: 'Maria Marzo', kind: 'person', sidebar: false,
    cats: ['UK di GB e Francia'],
    bio: 'Figura della corte del The United Kingdom of Great Britain and France.',
    tipo: 'neut',
    ruolo: 'Corte reale',
    relazioni: [
      { con: 'Anna Colella', tipo: 'amico', label: 'corte' },
    ],
    eventi: [],
  },

  {
    id: 'Calogiuri', kind: 'person', sidebar: false,
    cats: ['UK di GB e Francia'],
    bio: 'Figura della corte del The United Kingdom of Great Britain and France.',
    tipo: 'neut',
    ruolo: 'Corte reale',
    relazioni: [
      { con: 'Anna Colella', tipo: 'amico', label: 'corte' },
    ],
    eventi: [],
  },

  // ── SCIENZA ──────────────────────────────────────────────────────
  {
    id: 'Mancarella', kind: 'person', sidebar: false,
    cats: ['Scienza'],
    bio: 'La scienziata che scoprì l'anti-invecchiamento insieme a Ermenegildo Spisso.',
    tipo: 'neut',
    ruolo: 'Scienziata',
    relazioni: [
      { con: 'Ermenegildo Spisso', tipo: 'amico', label: 'collega di ricerca' },
    ],
    eventi: [],
  },

  {
    id: 'Giovanni Zecca', kind: 'person', sidebar: false,
    cats: ['Scienza'],
    bio: 'Trasformato nel Pianeta Zecca dopo la sua caduta nel 122 dM.',
    tipo: 'enemy',
    ruolo: 'Antagonista / ora pianeta',
    relazioni: [],
    eventi: [],
  },

  // ── PERSONAGGI SECONDARI ─────────────────────────────────────────
  { id: 'Pierpaolo',          kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Commilitone di Gianluca Pascali.',
    tipo: 'ally', ruolo: 'Commilitone',
    relazioni: [{ con: 'Gianluca Pascali', tipo: 'amico', label: 'commilitone' }],
    eventi: [] },

  { id: 'Massimo Floris',     kind: 'person', sidebar: false, cats: ['Personaggi', 'Calimera'],
    bio: 'Don Massimo Floris. Figura di Calimera.',
    tipo: 'neut', ruolo: 'Figura locale',
    relazioni: [], eventi: [] },

  { id: 'Jacopo Martucci',    kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Personaggio minore.',
    tipo: 'neut', ruolo: '—',
    relazioni: [], eventi: [] },

  { id: 'Giulia Donno',       kind: 'person', sidebar: false, cats: ['Personaggi', 'Corigliano'],
    bio: 'Sorella di Nicolò Donno.',
    tipo: 'ally', ruolo: 'Sorella di Nicolò',
    relazioni: [{ con: 'Nicolò Donno', tipo: 'amico', label: 'fratello' }],
    eventi: [] },

  { id: 'Deta',               kind: 'person', sidebar: false, cats: ['Personaggi', 'Corigliano'],
    bio: 'Figura di Corigliano.',
    tipo: 'neut', ruolo: '—',
    relazioni: [], eventi: [] },

  { id: 'Il Ciciliano',       kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Investitore calabrese paranoico, ossessionato per decenni dal fantasma di Giachele.',
    tipo: 'neut', ruolo: 'Investitore',
    relazioni: [{ con: 'Greta Rizzo', tipo: 'amico', label: 'moglie (poi lasciata)' }],
    eventi: [] },

  { id: 'Greta Rizzo',        kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Moglie del Ciciliano. Pompaiola. Lasciata sola con tre figli.',
    tipo: 'neut', ruolo: 'Moglie del Ciciliano',
    relazioni: [{ con: 'Il Ciciliano', tipo: 'amico', label: 'marito' }],
    eventi: [] },

  { id: 'Carola La Rosa',     kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Personaggio secondario.',
    tipo: 'neut', ruolo: '—', relazioni: [], eventi: [] },

  { id: 'Carola Feudo',       kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Personaggio secondario.',
    tipo: 'neut', ruolo: '—', relazioni: [], eventi: [] },

  { id: 'Nestola',            kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Il Medico Nano.',
    tipo: 'neut', ruolo: 'Medico', relazioni: [], eventi: [] },

  { id: 'MariaTeresa Friolo', kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Personaggio secondario.',
    tipo: 'neut', ruolo: '—', relazioni: [], eventi: [] },

  { id: 'Massimiliano Dimitri', kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Personaggio secondario.',
    tipo: 'neut', ruolo: '—', relazioni: [], eventi: [] },

  { id: 'Tommaso Pascali',    kind: 'person', sidebar: false, cats: ['Famiglia Pocchia'],
    bio: 'Membro della famiglia Pocchia.',
    tipo: 'ally', ruolo: '—',
    relazioni: [{ con: 'Gianluca Pascali', tipo: 'amico', label: 'famiglia' }],
    eventi: [] },

  { id: 'Jerry',              kind: 'person', sidebar: false, cats: ['Personaggi'],
    bio: 'Personaggio minore.',
    tipo: 'neut', ruolo: '—', relazioni: [], eventi: [] },

];

// ── 5. ESPONI FUNZIONI UTILI GLOBALMENTE ────────────────────────────
// Esponi funzioni utili globalmente
window.PAGE_REGISTRY      = PAGE_REGISTRY;
window.wikiNotice         = wikiNotice;
window.wikiHeader         = wikiHeader;
window.wikiClose          = wikiClose;
window.wikiCats           = wikiCats;
window.wikiInfobox        = wikiInfobox;
window.wikiTOC            = wikiTOC;
window.wikiH2             = wikiH2;
window.wikiStub           = wikiStub;
window.buildRelationsGraph = buildRelationsGraph;

// ── 6. SIDEBAR AUTO-AGGIORNATA ────────────────────────────────────────
// Sovrascrive updateSidebar() se esiste, oppure espone la lista sidebar
window.REGISTRY_SIDEBAR_IDS = PAGE_REGISTRY
  .filter(e => e.sidebar)
  .map(e => e.id);

// ── 7. RICERCA AUTO-AGGIORNATA ────────────────────────────────────────
window.REGISTRY_ALL_IDS = PAGE_REGISTRY.map(e => e.id);
