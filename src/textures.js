import * as THREE from 'three';

export const KAI = '"LXGW WenKai TC", "BiauKai", "Kaiti TC", "STKaiti", "KaiTi", serif';

// Deterministic RNG so the room looks the same on every restart.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

function speckle(ctx, w, h, n, r, colors, alpha, rand) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * rand();
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const s = r * (0.3 + rand());
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

// ---------- Surfaces ----------

export function wood(key = 'dark', base = '#2a160d', line = '#140904', repeat = [1, 1]) {
  const t = cached('wood-' + key, () => {
    const [c, ctx] = canvas(512, 512);
    const r = rng(key.length * 97 + 7);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 140; i++) {
      const y0 = r() * 512;
      ctx.strokeStyle = line;
      ctx.globalAlpha = 0.15 + r() * 0.35;
      ctx.lineWidth = 0.5 + r() * 2.2;
      ctx.beginPath();
      const amp = 2 + r() * 6, freq = 0.005 + r() * 0.02, ph = r() * 6;
      for (let x = 0; x <= 512; x += 8) ctx.lineTo(x, y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * 0.07 + ph) * 0.8);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = r() > 0.5 ? '#000' : '#5a3520';
      ctx.fillRect(0, r() * 512, 512, 1 + r() * 6);
    }
    ctx.globalAlpha = 1;
    return c;
  });
  const out = tex(t, { repeat });
  return out;
}

export function plaster() {
  return cached('plaster', () => {
    const [c, ctx] = canvas(1024, 1024);
    const r = rng(11);
    ctx.fillStyle = '#d6cdbb';
    ctx.fillRect(0, 0, 1024, 1024);
    speckle(ctx, 1024, 1024, 9000, 3, ['#bfb39b', '#e4dccb', '#a99c84'], 0.35, r);
    // water stains & mould
    for (let i = 0; i < 18; i++) {
      const x = r() * 1024, y = r() * 1024, rad = 40 + r() * 200;
      const g = ctx.createRadialGradient(x, y, rad * 0.2, x, y, rad);
      g.addColorStop(0, 'rgba(90,70,40,0.0)');
      g.addColorStop(0.8, `rgba(90,70,40,${0.08 + r() * 0.12})`);
      g.addColorStop(1, 'rgba(90,70,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 14; i++) {
      // drips from the top
      const x = r() * 1024, len = 100 + r() * 500;
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, 'rgba(60,45,30,0.25)');
      g.addColorStop(1, 'rgba(60,45,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 3 + r() * 10, len);
    }
    ctx.strokeStyle = 'rgba(60,50,40,0.45)';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 0.6 + r();
      ctx.beginPath();
      let x = r() * 1024, y = r() * 1024;
      ctx.moveTo(x, y);
      for (let k = 0; k < 12; k++) { x += (r() - 0.5) * 50; y += r() * 30; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    return tex(c, { repeat: [1, 1] });
  });
}

export function floorTiles() {
  return cached('floor', () => {
    const [c, ctx] = canvas(1024, 1024);
    const r = rng(23);
    const n = 4, s = 1024 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 70 + r() * 25;
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
        ctx.fillRect(i * s, j * s, s, s);
        ctx.save();
        ctx.beginPath(); ctx.rect(i * s, j * s, s, s); ctx.clip();
        speckle(ctx, 1024, 1024, 0, 0, [], 0, r);
        for (let k = 0; k < 900; k++) {
          ctx.globalAlpha = 0.35 * r();
          ctx.fillStyle = r() > 0.5 ? '#c8ccd2' : '#2a2c30';
          const sz = 1 + r() * 3.5;
          ctx.fillRect(i * s + r() * s, j * s + r() * s, sz, sz);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    ctx.strokeStyle = '#1b1c1e';
    ctx.lineWidth = 6;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(1024, i * s); ctx.stroke();
    }
    return tex(c, { repeat: [2.5, 2] });
  });
}

// ---------- Outside: ink-wash landscape ----------

function ridge(ctx, W, H, baseY, amp, color, blur, r, rough = 1) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-50, H);
  let y = baseY;
  const peaks = [];
  for (let i = 0; i < 6; i++) peaks.push({ x: r() * W, h: amp * (0.4 + r()) , w: 120 + r() * 300 });
  for (let x = -50; x <= W + 50; x += 6) {
    let yy = baseY;
    for (const p of peaks) {
      const d = (x - p.x) / p.w;
      yy -= p.h * Math.exp(-d * d * 2);
    }
    yy += Math.sin(x * 0.05) * 3 * rough + (r() - 0.5) * 4 * rough;
    ctx.lineTo(x, yy);
    y = yy;
  }
  ctx.lineTo(W + 50, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function landscape(mode = 'night') {
  return cached('land-' + mode, () => {
    const W = 2048, H = 1024;
    const [c, ctx] = canvas(W, H);
    const r = rng(5);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (mode === 'red') {
      sky.addColorStop(0, '#2a0605'); sky.addColorStop(0.55, '#7a1a12'); sky.addColorStop(1, '#3a0806');
    } else if (mode === 'dawn') {
      sky.addColorStop(0, '#c9c3b8'); sky.addColorStop(0.5, '#f1d9b5'); sky.addColorStop(1, '#cfc4b0');
    } else {
      sky.addColorStop(0, '#6d7076'); sky.addColorStop(0.55, '#a9a9a6'); sky.addColorStop(1, '#5c5e62');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // moon / sun
    const mx = W * 0.72, my = H * 0.22;
    const moonCol = mode === 'red' ? '#ff2a10' : mode === 'dawn' ? '#ffd08a' : '#f3efe2';
    const g = ctx.createRadialGradient(mx, my, 10, mx, my, 160);
    g.addColorStop(0, moonCol); g.addColorStop(0.25, moonCol); g.addColorStop(0.3, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(mx - 200, my - 200, 400, 400);

    const ink = mode === 'red' ? ['#4a0d08', '#2c0604', '#120201'] : mode === 'dawn' ? ['#7d766c', '#4f4942', '#24211d'] : ['#8a8b8c', '#55575a', '#26272a'];
    ridge(ctx, W, H, H * 0.52, 260, ink[0], 10, r, 0.5);
    ridge(ctx, W, H, H * 0.58, 200, ink[1], 5, r, 1);
    // mist band
    const mist = ctx.createLinearGradient(0, H * 0.48, 0, H * 0.62);
    mist.addColorStop(0, 'rgba(255,255,255,0)');
    mist.addColorStop(0.5, mode === 'red' ? 'rgba(120,30,20,0.55)' : 'rgba(220,220,215,0.55)');
    mist.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, H * 0.48, W, H * 0.14);
    // lake
    const lake = ctx.createLinearGradient(0, H * 0.6, 0, H);
    if (mode === 'red') { lake.addColorStop(0, '#5a110b'); lake.addColorStop(1, '#1c0302'); }
    else if (mode === 'dawn') { lake.addColorStop(0, '#d8cbb5'); lake.addColorStop(1, '#8a8274'); }
    else { lake.addColorStop(0, '#8f9092'); lake.addColorStop(1, '#3c3d40'); }
    ctx.fillStyle = lake;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
    ctx.strokeStyle = mode === 'red' ? 'rgba(20,0,0,0.35)' : 'rgba(30,30,30,0.18)';
    for (let i = 0; i < 70; i++) {
      ctx.lineWidth = 1 + r() * 2;
      const y = H * 0.62 + r() * H * 0.38, x = r() * W, l = 40 + r() * 220;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (r() - 0.5) * 3); ctx.stroke();
    }
    // island with pavilion & pines (left)
    ctx.fillStyle = ink[2];
    ctx.beginPath();
    ctx.ellipse(W * 0.2, H * 0.62, 260, 26, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(W * 0.2 - 50, H * 0.53, 8, 70);
    ctx.fillRect(W * 0.2 + 42, H * 0.53, 8, 70);
    ctx.beginPath();
    ctx.moveTo(W * 0.2 - 110, H * 0.54); ctx.quadraticCurveTo(W * 0.2, H * 0.46, W * 0.2 + 110, H * 0.54);
    ctx.lineTo(W * 0.2 + 70, H * 0.52); ctx.lineTo(W * 0.2, H * 0.475); ctx.lineTo(W * 0.2 - 70, H * 0.52); ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const x = W * 0.07 + i * 60 + r() * 30, top = H * 0.4 + r() * 60;
      ctx.fillRect(x, top, 5, H * 0.62 - top);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (r() - 0.5) * 40, top + k * 22, 34 - k * 4, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // boat with a figure
    const bx = W * 0.62, by = H * 0.72;
    ctx.beginPath();
    ctx.moveTo(bx - 70, by); ctx.quadraticCurveTo(bx, by + 22, bx + 70, by - 4); ctx.lineTo(bx + 52, by + 2); ctx.lineTo(bx - 52, by + 4); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mode === 'red' ? '#a3150d' : ink[2];
    ctx.beginPath();
    ctx.moveTo(bx + 4, by - 2); ctx.lineTo(bx + 16, by - 50); ctx.lineTo(bx + 28, by - 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 16, by - 56, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink[2]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx - 30, by - 4); ctx.lineTo(bx - 110, by + 34); ctx.stroke();
    // birds
    if (mode !== 'red') {
      ctx.strokeStyle = ink[2]; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const x = W * 0.45 + i * 40 + r() * 20, y = H * 0.18 + r() * 40;
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 3, y - 5, x, y); ctx.quadraticCurveTo(x + 3, y - 5, x + 8, y); ctx.stroke();
      }
    }
    // paper grain
    speckle(ctx, W, H, 6000, 2, ['#000', '#fff'], 0.06, r);
    const t = tex(c);
    return t;
  });
}

export function rainTex() {
  return cached('rain', () => {
    const [c, ctx] = canvas(512, 512);
    const r = rng(3);
    ctx.strokeStyle = 'rgba(230,235,240,0.55)';
    for (let i = 0; i < 260; i++) {
      ctx.lineWidth = 0.6 + r();
      ctx.globalAlpha = 0.2 + r() * 0.6;
      const x = r() * 512, y = r() * 512, l = 10 + r() * 30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + l); ctx.stroke();
    }
    return tex(c, { repeat: [3, 2] });
  });
}

// Ice-crack (冰裂紋) lattice: recursively split polygons, draw thick edges, alpha elsewhere.
export function lattice(key, w = 512, h = 1024, minArea = 9000, border = 26) {
  return cached('lattice-' + key, () => {
    const [c, ctx] = canvas(w, h);
    const r = rng(key.length * 131 + w);
    const polys = [[[0, 0], [w, 0], [w, h], [0, h]]];
    const area = (p) => {
      let a = 0;
      for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; }
      return Math.abs(a / 2);
    };
    const split = (p) => {
      // cut across the longest edge to its opposite edge so cells stay compact
      const n = p.length;
      let e1 = 0, best = -1;
      for (let i = 0; i < n; i++) {
        const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n];
        const l = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (l > best) { best = l; e1 = i; }
      }
      let e2 = (e1 + Math.max(1, Math.floor(n / 2)) + (n > 4 && r() < 0.3 ? 1 : 0)) % n;
      if (e2 === e1) e2 = (e1 + 1) % n;
      const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const p1 = lerp(p[e1], p[(e1 + 1) % n], 0.25 + r() * 0.5);
      const p2 = lerp(p[e2], p[(e2 + 1) % n], 0.25 + r() * 0.5);
      const A = [p1], B = [p2];
      for (let i = (e1 + 1) % n; ; i = (i + 1) % n) { A.push(p[i]); if (i === e2) break; }
      A.push(p2);
      for (let i = (e2 + 1) % n; ; i = (i + 1) % n) { B.push(p[i]); if (i === e1) break; }
      B.push(p1);
      return [A, B];
    };
    const out = [];
    while (polys.length) {
      const p = polys.pop();
      if (area(p) < minArea * (0.6 + r() * 0.8) || out.length > 400) { out.push(p); continue; }
      polys.push(...split(p));
    }
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'miter';
    ctx.lineWidth = 9;
    for (const p of out) {
      ctx.beginPath();
      p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.lineWidth = border * 2;
    ctx.strokeRect(0, 0, w, h);
    return c;
  });
}

export function latticeTexture(key, w, h, minArea, border) {
  const t = tex(lattice(key, w, h, minArea, border));
  return t;
}

// ---------- Text & paper ----------

function vtext(ctx, text, x, y, size, gap = 1.08, font = KAI) {
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...text].forEach((ch, i) => ctx.fillText(ch, x, y + i * size * gap));
}

export function scrollTex(text = '上善若水', red = false) {
  return cached('scroll-' + text + red, () => {
    const W = 256, H = 900;
    const [c, ctx] = canvas(W, H);
    const r = rng(text.charCodeAt(0));
    ctx.fillStyle = '#5c4630';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7a6040';
    ctx.fillRect(10, 0, W - 20, H);
    ctx.fillStyle = '#e4d8bd';
    ctx.fillRect(26, 120, W - 52, H - 220);
    speckle(ctx, W, H, 1500, 2, ['#9a8a6a', '#c0a87e'], 0.3, r);
    if (red) {
      ctx.fillStyle = '#7d0c07';
      vtext(ctx, text, W / 2, 230, 118, 1.12);
      // drips
      for (let i = 0; i < 26; i++) {
        const x = 60 + r() * (W - 120), y = 200 + r() * 520, l = 20 + r() * 140;
        const g = ctx.createLinearGradient(0, y, 0, y + l);
        g.addColorStop(0, 'rgba(125,12,7,0.95)'); g.addColorStop(1, 'rgba(125,12,7,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 3 + r() * 4, l);
      }
    } else {
      ctx.fillStyle = '#1a120c';
      vtext(ctx, text, W / 2, 230, 118, 1.12);
      ctx.fillStyle = '#a31a10';
      ctx.fillRect(W / 2 - 14, 720, 28, 28);
    }
    return tex(c);
  });
}

export function bannerTex() {
  return cached('banner', () => {
    const [c, ctx] = canvas(400, 600);
    ctx.fillStyle = '#e9e6de';
    ctx.fillRect(0, 0, 400, 600);
    ctx.fillStyle = '#d5d0c4';
    for (let i = 0; i < 400; i += 6) ctx.fillRect(i, 0, 1, 600);
    ctx.fillStyle = '#111';
    ctx.font = `bold 300px ${KAI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('奠', 200, 300);
    return tex(c);
  });
}

export function talismanTex(burnt = 0) {
  return cached('talisman', () => {
    const [c, ctx] = canvas(200, 520);
    const r = rng(77);
    ctx.fillStyle = '#d9b43a';
    ctx.fillRect(0, 0, 200, 520);
    speckle(ctx, 200, 520, 800, 2, ['#b38d22', '#efd370'], 0.4, r);
    ctx.fillStyle = '#b5150c';
    vtext(ctx, '敕令', 100, 60, 56, 1.05);
    ctx.strokeStyle = '#b5150c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    let x = 100, y = 180;
    ctx.moveTo(x, y);
    for (let i = 0; i < 26; i++) { x = 50 + r() * 100; y += 10; ctx.quadraticCurveTo(100 + (r() - 0.5) * 140, y - 14, x, y); }
    ctx.stroke();
    vtext(ctx, '鎮', 100, 450, 70);
    return tex(c);
  });
}

export function tabletTex(name = '') {
  const key = 'tablet-' + name;
  return cached(key, () => {
    const [c, ctx] = canvas(160, 512);
    const g = ctx.createLinearGradient(0, 0, 160, 0);
    g.addColorStop(0, '#3a1f10'); g.addColorStop(0.5, '#5e341a'); g.addColorStop(1, '#3a1f10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 160, 512);
    ctx.strokeStyle = '#c9a45c';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 132, 484);
    if (name) {
      ctx.fillStyle = '#d6271a';
      vtext(ctx, name, 80, 90, 64, 1.1);
      ctx.fillStyle = '#e7c77b';
      vtext(ctx, '之靈位', 80, 300, 52, 1.12);
    }
    return tex(c);
  });
}

export function diaryCoverTex() {
  return cached('diary', () => {
    const [c, ctx] = canvas(256, 360);
    ctx.fillStyle = '#3b2a1f';
    ctx.fillRect(0, 0, 256, 360);
    ctx.fillStyle = '#d8c9a5';
    ctx.fillRect(150, 30, 70, 210);
    ctx.fillStyle = '#2a1a10';
    vtext(ctx, '守仁手記', 185, 66, 44, 1.05);
    ctx.strokeStyle = '#1a0f08';
    ctx.lineWidth = 3;
    for (let y = 20; y < 360; y += 60) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(28, y); ctx.stroke(); }
    return tex(c);
  });
}

export function genealogyCoverTex() {
  return cached('genealogy', () => {
    const [c, ctx] = canvas(256, 360);
    ctx.fillStyle = '#1d2a3c';
    ctx.fillRect(0, 0, 256, 360);
    ctx.fillStyle = '#e1d6bd';
    ctx.fillRect(160, 26, 64, 230);
    ctx.fillStyle = '#1a120c';
    vtext(ctx, '陳氏族譜', 192, 62, 46, 1.08);
    return tex(c);
  });
}

// Book spine atlas: 16 x 4 cells, each 128 x 512.
export const SPINE_COLORS = ['#2a5a3e', '#9a2420', '#27406a', '#c9b48e', '#3c6a4e', '#7a2418', '#3a3a3a', '#a07a34', '#46603a', '#8a3a24'];
export function spineAtlas(titles) {
  return cached('atlas', () => {
    const [c, ctx] = canvas(2048, 2048);
    const r = rng(41);
    titles.forEach((title, i) => {
      const col = i % 16, row = (i / 16) | 0;
      drawSpine(ctx, col * 128, row * 512, 128, 512, title, SPINE_COLORS[i % SPINE_COLORS.length], r);
    });
    const t = tex(c);
    t.anisotropy = 8;
    return t;
  });
}

export function drawSpine(ctx, x, y, w, h, title, color, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  // aging
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(0.2, 'rgba(255,255,255,0.08)'); g.addColorStop(0.8, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, 300, 2, ['#000', '#d8c9a5'], 0.25, r);
  const light = color === '#c9b48e';
  const band = light ? '#5c1b14' : '#c9a45c';
  ctx.fillStyle = band;
  ctx.fillRect(0, 26, w, 7); ctx.fillRect(0, 40, w, 3);
  ctx.fillRect(0, h - 40, w, 7); ctx.fillRect(0, h - 50, w, 3);
  const n = [...title].length;
  const labelled = (title.charCodeAt(0) + n) % 3 === 0;
  const lw = w * 0.5;
  let size = Math.min(w * 0.6, (h - 170) / (n * 1.06));
  if (labelled) {
    // a pasted paper title slip
    ctx.fillStyle = '#e2d6bb';
    ctx.fillRect((w - lw) / 2, 64, lw, Math.min(h - 140, n * size * 1.06 + 30));
    ctx.fillStyle = '#1a120c';
    size = Math.min(lw * 0.82, size);
  } else {
    ctx.fillStyle = light ? '#2a1a10' : '#e0c98e';
  }
  vtext(ctx, title, w / 2, 64 + 18 + size / 2, size, 1.06);
  ctx.restore();
}

export function singleSpine(title, color) {
  return cached('spine-' + title, () => {
    const [c, ctx] = canvas(128, 512);
    drawSpine(ctx, 0, 0, 128, 512, title, color, rng(title.length + 9));
    return tex(c);
  });
}

export function handprintTex() {
  return cached('hand', () => {
    const [c, ctx] = canvas(256, 256);
    const r = rng(66);
    ctx.fillStyle = 'rgba(150,8,6,0.95)';
    ctx.translate(128, 150);
    ctx.rotate(-0.15);
    ctx.beginPath();
    ctx.ellipse(0, 20, 46, 54, 0, 0, Math.PI * 2);
    ctx.fill();
    const fingers = [[-38, -40, 11, 40, -0.35], [-16, -64, 11, 50, -0.1], [8, -70, 11, 54, 0.05], [30, -58, 10, 46, 0.2], [56, 0, 11, 34, 0.9]];
    for (const [fx, fy, fw, fh, rot] of fingers) {
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(rot);
      ctx.beginPath(); ctx.ellipse(0, 0, fw, fh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 9; i++) {
      const x = -40 + r() * 80, y = 50 + r() * 20, l = 20 + r() * 60;
      ctx.fillRect(x, y, 3 + r() * 4, l);
    }
    return tex(c);
  });
}

export function scratchTex() {
  return cached('scratch', () => {
    const [c, ctx] = canvas(512, 1024);
    const r = rng(19);
    ctx.clearRect(0, 0, 512, 1024);
    ctx.strokeStyle = 'rgba(40,25,15,0.55)';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 472, 1000);
    for (let i = 0; i < 70; i++) {
      const x = 80 + r() * 350, y = 250 + r() * 550, l = 60 + r() * 200;
      ctx.lineWidth = 1.5 + r() * 2.5;
      ctx.strokeStyle = r() > 0.7 ? 'rgba(110,14,8,0.75)' : 'rgba(35,22,14,0.7)';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 9, y);
        ctx.quadraticCurveTo(x + k * 9 + 5, y + l * 0.5, x + k * 9 + (r() - 0.5) * 16, y + l);
        ctx.stroke();
      }
    }
    return tex(c);
  });
}

export function faceTex() {
  return cached('face', () => {
    const [c, ctx] = canvas(512, 512);
    ctx.fillStyle = '#efe8dc';
    ctx.fillRect(0, 0, 512, 512);
    // paper creases
    ctx.strokeStyle = 'rgba(120,110,95,0.25)';
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(Math.random() * 512, 0); ctx.lineTo(Math.random() * 512, 512); ctx.stroke(); }
    const cx = 256; // face centred at u=0.5 (front of sphere is u=0.75 for default sphere; we rotate mesh instead)
    // cheeks
    for (const dx of [-70, 70]) {
      const g = ctx.createRadialGradient(cx + dx, 300, 4, cx + dx, 300, 46);
      g.addColorStop(0, 'rgba(225,40,60,0.95)'); g.addColorStop(1, 'rgba(225,40,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx + dx, 300, 46, 0, Math.PI * 2); ctx.fill();
    }
    // brows
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + s * 20, 196); ctx.quadraticCurveTo(cx + s * 55, 178, cx + s * 92, 200); ctx.stroke();
    }
    // eyes: solid black, no whites
    ctx.fillStyle = '#050505';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + s * 55, 238, 22, 13, s * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 55 + 6, 233, 2.5, 0, Math.PI * 2); ctx.fill(); }
    // tiny red mouth with a faint smile
    ctx.fillStyle = '#c0101a';
    ctx.beginPath();
    ctx.moveTo(cx - 22, 352); ctx.quadraticCurveTo(cx, 340, cx + 22, 352); ctx.quadraticCurveTo(cx, 372, cx - 22, 352);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,10,20,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 22, 352); ctx.quadraticCurveTo(cx - 34, 344, cx - 40, 336); ctx.moveTo(cx + 22, 352); ctx.quadraticCurveTo(cx + 34, 344, cx + 40, 336); ctx.stroke();
    // nose
    ctx.strokeStyle = 'rgba(80,60,50,0.6)';
    ctx.beginPath(); ctx.moveTo(cx - 6, 300); ctx.quadraticCurveTo(cx, 308, cx + 6, 300); ctx.stroke();
    return tex(c);
  });
}

export function ghostFaceTex() {
  return cached('ghostface', () => {
    const [c, ctx] = canvas(512, 512);
    const r = rng(13);
    ctx.fillStyle = '#c9c6bf';
    ctx.fillRect(0, 0, 512, 512);
    speckle(ctx, 512, 512, 3000, 2, ['#9c9890', '#e0ddd6'], 0.3, r);
    const cx = 256;
    // sunken, empty eye sockets
    for (const s of [-1, 1]) {
      const g = ctx.createRadialGradient(cx + s * 56, 236, 4, cx + s * 56, 236, 52);
      g.addColorStop(0, '#000'); g.addColorStop(0.45, 'rgba(10,5,5,0.95)'); g.addColorStop(1, 'rgba(60,40,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx + s * 56, 236, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,230,220,0.9)';
      ctx.beginPath(); ctx.arc(cx + s * 52, 238, 3.5, 0, Math.PI * 2); ctx.fill();
      // blood tears
      for (let k = 0; k < 3; k++) {
        const x = cx + s * (44 + k * 10), l = 80 + r() * 120;
        const tg = ctx.createLinearGradient(0, 262, 0, 262 + l);
        tg.addColorStop(0, 'rgba(110,0,0,0.95)'); tg.addColorStop(1, 'rgba(110,0,0,0)');
        ctx.fillStyle = tg;
        ctx.fillRect(x, 262, 3 + r() * 3, l);
      }
    }
    // gaping dark mouth with rouge smeared around it
    ctx.fillStyle = 'rgba(150,10,15,0.8)';
    ctx.beginPath(); ctx.ellipse(cx, 370, 40, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#080303';
    ctx.beginPath(); ctx.ellipse(cx, 372, 24, 18, 0, 0, Math.PI * 2); ctx.fill();
    return tex(c);
  });
}

export function robeTex(base = '#9c1410', key = 'robe') {
  return cached('robe-' + key, () => {
    const [c, ctx] = canvas(512, 512);
    const r = rng(key.length * 7);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 30; i++) { ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); const x = r() * 512; ctx.moveTo(x, 0); ctx.lineTo(x + (r() - 0.5) * 60, 512); ctx.stroke(); }
    ctx.fillStyle = '#d9b45a';
    ctx.font = `bold 64px ${KAI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 60; y < 512; y += 128) for (let x = 64; x < 512; x += 128) ctx.fillText('囍', x + ((y / 128) % 2) * 64, y);
    ctx.fillRect(0, 490, 512, 22);
    ctx.fillRect(0, 0, 512, 10);
    return tex(c, { repeat: [2, 1] });
  });
}

export function lanternTex() {
  return cached('lantern', () => {
    const [c, ctx] = canvas(512, 256);
    ctx.fillStyle = '#b3140c';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(60,0,0,0.5)';
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
    ctx.fillStyle = '#ffd36b';
    ctx.font = `bold 120px ${KAI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('囍', 128, 132);
    ctx.fillText('囍', 384, 132);
    return tex(c);
  });
}

export function radioTex() {
  return cached('radio', () => {
    const [c, ctx] = canvas(512, 320);
    ctx.fillStyle = '#4a2a16';
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = '#c7b48f';
    ctx.fillRect(30, 30, 260, 230);
    ctx.strokeStyle = 'rgba(80,60,40,0.6)';
    for (let x = 30; x < 290; x += 6) { ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 260); ctx.stroke(); }
    ctx.fillStyle = '#e7d9b5';
    ctx.fillRect(310, 40, 175, 70);
    ctx.fillStyle = '#2a1a10';
    ctx.font = '16px serif';
    for (let i = 0; i < 6; i++) ctx.fillText(String(55 + i * 25), 316 + i * 28, 66);
    ctx.fillRect(316, 80, 160, 2);
    ctx.fillStyle = '#b3140c';
    ctx.fillRect(400, 70, 3, 30);
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.arc(350, 200, 34, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(445, 200, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9a45c';
    ctx.beginPath(); ctx.arc(350, 200, 26, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(445, 200, 26, 0, Math.PI * 2); ctx.fill();
    return tex(c);
  });
}

export function vaseTex() {
  return cached('vase', () => {
    const [c, ctx] = canvas(512, 256);
    ctx.fillStyle = '#eef0f2';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#1d3f8a';
    ctx.fillStyle = '#1d3f8a';
    ctx.lineWidth = 4;
    ctx.fillRect(0, 30, 512, 6);
    ctx.fillRect(0, 220, 512, 6);
    for (let x = 0; x < 512; x += 64) {
      ctx.beginPath();
      ctx.arc(x + 32, 128, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 32, 98); ctx.quadraticCurveTo(x + 60, 128, x + 32, 158); ctx.quadraticCurveTo(x + 4, 128, x + 32, 98); ctx.fill();
    }
    return tex(c);
  });
}

export function joss() {
  return cached('joss', () => {
    const [c, ctx] = canvas(128, 128);
    ctx.fillStyle = '#e8dcb0';
    ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();
    ctx.clearRect(48, 48, 32, 32);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(48, 48, 32, 32);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(150,120,60,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(64, 64, 50, 0, Math.PI * 2); ctx.stroke();
    return tex(c);
  });
}

export function glowTex(color = '255,170,80') {
  return cached('glow-' + color, () => {
    const [c, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(255,255,230,1)`);
    g.addColorStop(0.2, `rgba(${color},0.9)`);
    g.addColorStop(0.5, `rgba(${color},0.25)`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return tex(c);
  });
}

export function flameTex() {
  return cached('flame', () => {
    const [c, ctx] = canvas(64, 128);
    const g = ctx.createRadialGradient(32, 90, 2, 32, 80, 50);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.3, 'rgba(255,190,80,0.95)');
    g.addColorStop(0.7, 'rgba(255,80,20,0.4)');
    g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 4); ctx.quadraticCurveTo(62, 80, 32, 124); ctx.quadraticCurveTo(2, 80, 32, 4);
    ctx.fill();
    return tex(c);
  });
}

export function smokeTex() {
  return cached('smoke', () => {
    const [c, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(200,200,200,0.5)');
    g.addColorStop(1, 'rgba(200,200,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return tex(c);
  });
}

export function silhouetteTex() {
  return cached('silhouette', () => {
    const [c, ctx] = canvas(256, 512);
    ctx.fillStyle = 'rgba(8,4,4,0.92)';
    ctx.beginPath();
    ctx.ellipse(128, 90, 40, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(86, 100); ctx.lineTo(60, 500); ctx.lineTo(196, 500); ctx.lineTo(170, 100); ctx.closePath();
    ctx.fill();
    ctx.fillRect(96, 120, 6, 260);
    ctx.fillRect(154, 120, 6, 260);
    return tex(c);
  });
}

// ---------- 2D illustrations for the modal ----------

function drawItemShape(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = s * 0.05;
  if (kind === 'vase') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.5); ctx.lineTo(s * 0.12, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.1, -s * 0.3, s * 0.3, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.38, s * 0.3, s * 0.15, s * 0.5); ctx.lineTo(-s * 0.15, s * 0.5);
    ctx.quadraticCurveTo(-s * 0.38, s * 0.3, -s * 0.3, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.1, -s * 0.3, -s * 0.12, -s * 0.5);
    ctx.fill();
  } else if (kind === 'bell') {
    ctx.fillRect(-s * 0.04, -s * 0.5, s * 0.08, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, -s * 0.38); ctx.quadraticCurveTo(-s * 0.2, s * 0.1, -s * 0.36, s * 0.32);
    ctx.lineTo(s * 0.36, s * 0.32); ctx.quadraticCurveTo(s * 0.2, s * 0.1, s * 0.14, -s * 0.38); ctx.closePath();
    ctx.fill();
    ctx.fillRect(-s * 0.3, s * 0.4, s * 0.6, s * 0.08);
  } else if (kind === 'pot') {
    ctx.beginPath(); ctx.ellipse(0, s * 0.12, s * 0.3, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-s * 0.1, -s * 0.2, s * 0.2, s * 0.1);
    ctx.beginPath(); ctx.arc(0, -s * 0.24, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.25, s * 0.05); ctx.lineTo(s * 0.48, -s * 0.12); ctx.lineTo(s * 0.46, -s * 0.06); ctx.lineTo(s * 0.26, s * 0.16); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * 0.32, s * 0.1, s * 0.12, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  } else if (kind === 'drum') {
    ctx.fillRect(-s * 0.03, s * 0.05, s * 0.06, s * 0.45);
    ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.24, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = s * 0.02;
    ctx.beginPath(); ctx.moveTo(-s * 0.24, -s * 0.12); ctx.lineTo(-s * 0.42, -s * 0.02); ctx.moveTo(s * 0.24, -s * 0.12); ctx.lineTo(s * 0.42, -s * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.arc(-s * 0.44, 0, s * 0.05, 0, Math.PI * 2); ctx.arc(s * 0.44, 0, s * 0.05, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'books') {
    for (let i = 0; i < 3; i++) ctx.fillRect(-s * 0.3 + i * 0.02 * s, s * 0.3 - i * s * 0.12, s * 0.6, s * 0.1);
  } else if (kind === 'plate') {
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.32, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-s * 0.12, s * 0.3, s * 0.24, s * 0.16);
  } else if (kind === 'jar') {
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.22, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-s * 0.12, -s * 0.2, s * 0.24, s * 0.1);
  }
  ctx.restore();
}

// The old photo of the curio shelf. layout: { A: 'pot', B: 'bell', D: 'drum', F: 'vase' }
export function photoCanvas(layout, cells, back = false) {
  const W = 640, H = 480;
  const [c, ctx] = canvas(W, H);
  const r = rng(99);
  ctx.fillStyle = '#efe6d2';
  ctx.fillRect(0, 0, W, H);
  if (back) {
    ctx.fillStyle = '#e9e0cb';
    ctx.fillRect(0, 0, W, H);
    speckle(ctx, W, H, 2500, 2, ['#b9a988', '#fff'], 0.3, r);
    ctx.fillStyle = '#2b2018';
    ctx.font = `34px ${KAI}`;
    ctx.textAlign = 'left';
    ctx.fillText('民國五十三年 春', 90, 160);
    ctx.fillText('攝於書齋・博古架前', 90, 220);
    ctx.fillText('阿繡　十六歲', 90, 280);
    ctx.fillStyle = 'rgba(140,16,10,0.75)';
    ctx.font = `26px ${KAI}`;
    ctx.fillText('東西要放回原來的地方', 250, 400);
    return c;
  }
  // sepia photo area
  const px = 30, py = 30, pw = W - 60, ph = H - 60;
  const g = ctx.createLinearGradient(0, py, 0, py + ph);
  g.addColorStop(0, '#6b5a43'); g.addColorStop(1, '#3d3020');
  ctx.fillStyle = g;
  ctx.fillRect(px, py, pw, ph);
  // shelf drawn in photo space; cells are given in shelf units (u: 0..1 left->right, v: 0..1 bottom->top)
  const sx = px + 70, sy = py + 20, sw = 320, sh = ph - 40;
  ctx.fillStyle = '#21180f';
  ctx.fillRect(sx - 8, sy - 8, sw + 16, sh + 16);
  // cells are given in metres (y0..y1 of a 2.46 m shelf)
  const vOf = (y) => y / 2.46;
  ctx.fillStyle = '#3b2e1f';
  ctx.fillRect(sx + 4, sy + (1 - vOf(0.7)) * sh + 4, sw - 8, vOf(0.7) * sh - 8);
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(sx + sw * 0.27, sy + (1 - vOf(0.66)) * sh, sw * 0.46, vOf(0.56) * sh);
  for (const [id, cell] of Object.entries(cells)) {
    const v0 = vOf(cell.y0), v1 = vOf(cell.y1);
    const x = sx + cell.u0 * sw, y = sy + (1 - v1) * sh, w = (cell.u1 - cell.u0) * sw, h = (v1 - v0) * sh;
    ctx.fillStyle = '#5a4934';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    const kind = layout[id] || cell.decor;
    if (kind) drawItemShape(ctx, kind, x + w / 2, y + h / 2 + 4, Math.min(w, h) * 0.75, layout[id] ? '#1b140d' : '#3a2e20');
  }
  // the girl, face scratched out
  const gx = sx + sw + 110, gy = sy + 70;
  ctx.fillStyle = '#1e160e';
  ctx.beginPath(); ctx.ellipse(gx, gy, 36, 44, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(gx - 40, gy + 40); ctx.lineTo(gx - 70, gy + 330); ctx.lineTo(gx + 70, gy + 330); ctx.lineTo(gx + 40, gy + 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a1e12';
  ctx.fillRect(gx - 34, gy + 30, 6, 160); ctx.fillRect(gx + 28, gy + 30, 6, 160);
  ctx.strokeStyle = 'rgba(240,230,210,0.85)';
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(gx - 30 + r() * 60, gy - 40 + r() * 20);
    ctx.lineTo(gx - 30 + r() * 60, gy + 20 + r() * 30);
    ctx.stroke();
  }
  // red shoes
  ctx.fillStyle = '#7a1510';
  ctx.fillRect(gx - 34, gy + 330, 26, 10); ctx.fillRect(gx + 8, gy + 330, 26, 10);
  // aging
  speckle(ctx, W, H, 4000, 2, ['#000', '#f5ecd8'], 0.25, r);
  const v = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 420);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,25,10,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

export function shoeCanvas() {
  const [c, ctx] = canvas(640, 420);
  const r = rng(8);
  ctx.fillStyle = '#120b08';
  ctx.fillRect(0, 0, 640, 420);
  // shoe side view
  ctx.fillStyle = '#8f1610';
  ctx.beginPath();
  ctx.moveTo(110, 300);
  ctx.quadraticCurveTo(90, 210, 200, 200);
  ctx.quadraticCurveTo(300, 120, 430, 180);
  ctx.quadraticCurveTo(540, 210, 560, 260);
  ctx.quadraticCurveTo(570, 300, 520, 300);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e9dcc0';
  ctx.fillRect(110, 296, 420, 16);
  ctx.fillStyle = '#d9b45a';
  for (let i = 0; i < 6; i++) {
    const x = 260 + i * 38, y = 200 + Math.sin(i) * 10;
    ctx.beginPath(); ctx.arc(x, y + 30, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 10, y + 22, 10, 4, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // insole close-up
  ctx.fillStyle = '#e4d5b6';
  ctx.beginPath(); ctx.ellipse(320, 90, 170, 52, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a45c';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.ellipse(320, 90, 156, 42, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#b8860b';
  ctx.font = `bold 58px ${KAI}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('秋　繡', 320, 92);
  // wet stains
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(20,40,40,${0.15 + r() * 0.2})`;
    ctx.beginPath(); ctx.arc(120 + r() * 420, 200 + r() * 100, 3 + r() * 10, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

// Small inventory icons
export function iconURL(kind) {
  return cached('icon-' + kind, () => {
    const [c, ctx] = canvas(128, 128);
    ctx.translate(64, 64);
    switch (kind) {
      case 'matches':
        ctx.fillStyle = '#c9a45c'; ctx.fillRect(-40, -26, 80, 52);
        ctx.fillStyle = '#7b1410'; ctx.fillRect(-40, -26, 80, 16);
        ctx.fillStyle = '#2a1a10'; ctx.font = `bold 26px ${KAI}`; ctx.textAlign = 'center'; ctx.fillText('火柴', 0, 18);
        ctx.fillStyle = '#e8dcc0'; ctx.fillRect(18, -46, 4, 26); ctx.fillStyle = '#a31a10'; ctx.fillRect(16, -52, 8, 9);
        break;
      case 'photo':
        ctx.rotate(-0.12);
        ctx.fillStyle = '#efe6d2'; ctx.fillRect(-42, -32, 84, 64);
        ctx.fillStyle = '#5a4934'; ctx.fillRect(-36, -26, 72, 52);
        ctx.fillStyle = '#1e160e'; ctx.beginPath(); ctx.arc(14, -8, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(6, 0, 16, 26);
        break;
      case 'tablet':
        ctx.fillStyle = '#5e341a';
        ctx.beginPath(); ctx.moveTo(-18, 50); ctx.lineTo(-18, -34); ctx.quadraticCurveTo(0, -56, 18, -34); ctx.lineTo(18, 50); ctx.fill();
        ctx.strokeStyle = '#c9a45c'; ctx.lineWidth = 3; ctx.strokeRect(-12, -30, 24, 74);
        ctx.fillStyle = '#3a1f10'; ctx.fillRect(-28, 46, 56, 10);
        break;
      case 'tabletName':
        ctx.fillStyle = '#5e341a';
        ctx.beginPath(); ctx.moveTo(-18, 50); ctx.lineTo(-18, -34); ctx.quadraticCurveTo(0, -56, 18, -34); ctx.lineTo(18, 50); ctx.fill();
        ctx.fillStyle = '#d6271a'; ctx.font = `bold 16px ${KAI}`; ctx.textAlign = 'center';
        ctx.fillText('陳', 0, -18); ctx.fillText('秋', 0, 0); ctx.fillText('繡', 0, 18);
        ctx.fillStyle = '#3a1f10'; ctx.fillRect(-28, 46, 56, 10);
        break;
      case 'shoe':
        ctx.fillStyle = '#8f1610';
        ctx.beginPath(); ctx.moveTo(-50, 22); ctx.quadraticCurveTo(-52, -6, -20, -8); ctx.quadraticCurveTo(10, -30, 40, -10); ctx.quadraticCurveTo(58, 4, 50, 22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e9dcc0'; ctx.fillRect(-50, 20, 100, 7);
        ctx.fillStyle = '#d9b45a'; ctx.beginPath(); ctx.arc(10, -4, 5, 0, Math.PI * 2); ctx.arc(24, 0, 4, 0, Math.PI * 2); ctx.fill();
        break;
      case 'brush':
      case 'brushRed':
        ctx.rotate(-0.8);
        ctx.fillStyle = '#7a5a2a'; ctx.fillRect(-4, -50, 8, 72);
        ctx.fillStyle = '#2a1a10'; ctx.fillRect(-5, -54, 10, 6);
        ctx.fillStyle = kind === 'brush' ? '#ddd3bf' : '#b3160d';
        ctx.beginPath(); ctx.moveTo(-6, 22); ctx.quadraticCurveTo(0, 60, 6, 22); ctx.fill();
        break;
    }
    return c.toDataURL();
  });
}
