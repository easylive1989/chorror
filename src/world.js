import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { buildDecor } from './decor.js';

// Room: x ∈ [-5, 5], z ∈ [-4, 4], y ∈ [0, 3.6]. Back wall (z = -4) holds the moon gate and the window.
export const GATE = { x: -1.6, y: 1.3, r: 1.15 };
export const WIN = { x0: 1.4, x1: 4.4, y0: 1.15, y1: 2.75 };

// Curio shelf cells. u runs left → right as seen from inside the room, y is height in metres.
export const CURIO_CELLS = {
  A: { u0: 0, u1: 0.45, y0: 1.78, y1: 2.44, puzzle: true },
  B: { u0: 0.45, u1: 1, y0: 1.78, y1: 2.44, puzzle: true },
  C: { u0: 0, u1: 0.28, y0: 1.18, y1: 1.74, decor: 'books' },
  D: { u0: 0.28, u1: 0.64, y0: 1.18, y1: 1.74, puzzle: true },
  E: { u0: 0.64, u1: 1, y0: 1.18, y1: 1.74, decor: 'plate' },
  F: { u0: 0, u1: 0.6, y0: 0.74, y1: 1.14, puzzle: true },
  G: { u0: 0.6, u1: 1, y0: 0.74, y1: 1.14, decor: 'jar' },
};
export const CURIO_START = { A: 'vase', B: 'drum', D: 'bell', F: 'pot' };
export const CURIO_ANSWER = { A: 'pot', B: 'bell', D: 'drum', F: 'vase' };
export const CURIO_NAMES = { vase: '青花瓶', bell: '銅鈴', pot: '紫砂壺', drum: '撥浪鼓' };

export const SPECIAL_BOOKS = [
  { title: '搜神記', char: '還', bay: 0, row: 1, slot: 7, color: '#1e2f4f' },
  { title: '聊齋誌異', char: '我', bay: 2, row: 3, slot: 4, color: '#1f3d2c' },
  { title: '子不語', char: '名', bay: 1, row: 0, slot: 11, color: '#c9b48e' },
  { title: '夜雨秋燈錄', char: '字', bay: 1, row: 4, slot: 3, color: '#7a1a1a' },
];

const TITLES = [
  '論語', '孟子', '大學', '中庸', '詩經', '尚書', '禮記', '周易', '春秋左傳', '史記', '漢書', '後漢書', '三國志', '資治通鑑',
  '楚辭', '文選', '古文觀止', '唐詩三百首', '宋詞三百首', '元曲選', '紅樓夢', '水滸傳', '西遊記', '三國演義', '儒林外史',
  '封神演義', '牡丹亭', '西廂記', '長生殿', '桃花扇', '山海經', '黃帝內經', '本草綱目', '天工開物', '夢溪筆談', '世說新語',
  '太平廣記', '酉陽雜俎', '閱微草堂筆記', '剪燈新話', '洛陽伽藍記', '水經注', '說文解字', '爾雅', '千字文', '百家姓',
  '幼學瓊林', '增廣賢文', '菜根譚', '人間詞話', '老子', '莊子', '荀子', '韓非子', '墨子', '孫子兵法', '傳習錄', '近思錄',
  '浮生六記', '容齋隨筆', '東京夢華錄', '宋史', '明史', '陶庵夢憶',
];

const std = (o) => new THREE.MeshStandardMaterial(o);

function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function setLayer(obj, n) {
  obj.traverse((o) => o.layers.set(n));
}

// Book box whose +x face (spine) shows `spine` rect of the texture and other faces a sliver of `body`.
function bookGeometry(w, h, d, spine, body) {
  const g = new THREE.BoxGeometry(d, h, w);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const face = (i / 4) | 0;
    const r = face === 0 ? spine : body;
    uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
  }
  return g;
}

export function buildWorld(scene) {
  const root = new THREE.Group();
  const W = { root, refs: {}, updaters: [], interactables: [] };
  const R = W.refs;

  const reg = (obj, id, label, station) => {
    obj.userData.id = id;
    obj.userData.label = label;
    if (station) obj.userData.station = station;
    W.interactables.push(obj);
    return obj;
  };

  // ---------- Materials ----------
  const mWood = std({ map: T.wood('dark', '#3d2215', '#170904'), roughness: 0.55, metalness: 0.05 });
  const mWoodMid = std({ map: T.wood('mid', '#4a2615', '#1f0e06'), roughness: 0.5 });
  const mCeil = std({ map: T.wood('ceil', '#2a1a10', '#140904', [3, 3]), roughness: 0.8 });
  const mBronze = std({ color: '#8a6a34', metalness: 0.85, roughness: 0.38 });
  const mBrass = std({ color: '#b08a42', metalness: 0.9, roughness: 0.3 });
  const mStone = std({ color: '#55575a', roughness: 0.92 });
  const mPaper = std({ color: '#e6dcc6', roughness: 0.9 });
  const mRed = std({ color: '#8f1610', roughness: 0.6 });
  const mBlack = std({ color: '#0e0b09', roughness: 0.7 });
  const plasterTex = T.plaster();
  const mPlaster = std({ map: plasterTex, roughness: 0.95, color: '#c9c0b0' });

  // ---------- Shell ----------
  const floorGeo = new THREE.PlaneGeometry(10, 8);
  const floor = new THREE.Mesh(floorGeo, std({ map: T.floorTiles(), roughness: 0.75, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.floor = true;
  root.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), mCeil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 3.6;
  ceil.castShadow = ceil.receiveShadow = true;
  root.add(ceil);

  // Back wall with the moon gate and window cut out.
  const shape = new THREE.Shape();
  shape.moveTo(-5, 0); shape.lineTo(5, 0); shape.lineTo(5, 3.6); shape.lineTo(-5, 3.6); shape.lineTo(-5, 0);
  const gateHole = new THREE.Path();
  gateHole.absarc(GATE.x, GATE.y, GATE.r, 0, Math.PI * 2, true);
  shape.holes.push(gateHole);
  const winHole = new THREE.Path();
  winHole.moveTo(WIN.x0, WIN.y0); winHole.lineTo(WIN.x0, WIN.y1); winHole.lineTo(WIN.x1, WIN.y1); winHole.lineTo(WIN.x1, WIN.y0); winHole.lineTo(WIN.x0, WIN.y0);
  shape.holes.push(winHole);
  const backGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false, curveSegments: 64 });
  scaleUV(backGeo, 0.3, 0.3);
  const back = new THREE.Mesh(backGeo, mPlaster);
  back.position.z = -4.25;
  back.castShadow = back.receiveShadow = true;
  root.add(back);

  const wall = (w, h, x, y, z, ry) => {
    const g = scaleUV(new THREE.PlaneGeometry(w, h), w * 0.3, h * 0.3);
    const m = new THREE.Mesh(g, mPlaster);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  wall(8, 3.6, -5, 1.8, 0, Math.PI / 2);
  wall(8, 3.6, 5, 1.8, 0, -Math.PI / 2);
  const front = wall(10, 3.6, 0, 1.8, 4, Math.PI);

  // skirting, pillars, beams
  box(0.04, 0.14, 8, mWood, -4.98, 0.07, 0, root);
  box(0.04, 0.14, 8, mWood, 4.98, 0.07, 0, root);
  box(10, 0.14, 0.04, mWood, 0, 0.07, 3.98, root);
  for (const [x, z] of [[-4.88, -3.88], [4.88, -3.88], [-4.88, 3.88], [4.88, 3.88]]) box(0.24, 3.6, 0.24, mWood, x, 1.8, z, root);
  box(10, 0.3, 0.3, mWood, 0, 3.2, -3.85, root);
  box(10, 0.3, 0.3, mWood, 0, 3.2, 3.85, root);
  for (let x = -4.75; x <= 4.76; x += 0.5) box(0.1, 0.14, 8, mWood, x, 3.52, 0, root).castShadow = false;
  box(10, 0.22, 0.22, mWood, 0, 3.38, -1.5, root);
  box(10, 0.22, 0.22, mWood, 0, 3.38, 1.5, root);

  // Where the door used to be: only scratch marks remain.
  const scratch = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), new THREE.MeshStandardMaterial({ map: T.scratchTex(), transparent: true, roughness: 1 }));
  scratch.position.set(0, 1.15, 3.985);
  scratch.rotation.y = Math.PI;
  root.add(scratch);
  reg(scratch, 'frontwall', '原本的門', null);

  // ---------- Outside ----------
  const outside = new THREE.Group();
  outside.userData.noray = true;
  root.add(outside);
  const backdropMat = new THREE.MeshBasicMaterial({ map: T.landscape('night'), fog: false, color: '#8d8f96' });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(34, 17), backdropMat);
  backdrop.position.set(1, 2.6, -11);
  outside.add(backdrop);
  R.backdrop = backdrop;

  const water = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), std({ color: '#15181d', roughness: 0.12, metalness: 0.4 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(1, -0.3, -7.7);
  water.receiveShadow = true;
  outside.add(water);
  R.water = water;

  // little wooden pier beyond the moon gate
  for (let i = 0; i < 12; i++) box(2.1, 0.05, 0.17, mWoodMid, GATE.x, 0.02, -4.4 - i * 0.2, outside);
  for (const dx of [-1, 1]) cyl(0.05, 0.05, 1.4, mWood, GATE.x + dx, 0.05, -6.6, outside);
  const lampPost = cyl(0.04, 0.04, 1.3, mWood, GATE.x + 1.05, 0.65, -6.5, outside);
  lampPost.castShadow = false;

  const rainMat = new THREE.MeshBasicMaterial({ map: T.rainTex(), transparent: true, opacity: 0.45, depthWrite: false, fog: false });
  const rain = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), rainMat);
  rain.position.set(1, 2.4, -5.2);
  outside.add(rain);
  R.rain = rain;

  // drifting joss paper (紙錢)
  const jossMat = new THREE.MeshBasicMaterial({ map: T.joss(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.3, color: '#bcb39a' });
  const N_JOSS = 46;
  const joss = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.09), jossMat, N_JOSS);
  joss.frustumCulled = false;
  const jossData = [];
  const jr = T.rng(4);
  for (let i = 0; i < N_JOSS; i++) jossData.push({ x: -4 + jr() * 10, y: jr() * 4.5, z: -4.6 - jr() * 4, s: 0.2 + jr() * 0.35, r: jr() * 6, w: 0.5 + jr() * 2 });
  outside.add(joss);
  const dummy = new THREE.Object3D();
  W.updaters.push((t, dt) => {
    for (let i = 0; i < N_JOSS; i++) {
      const d = jossData[i];
      d.y -= d.s * dt;
      if (d.y < -0.4) d.y = 4.5;
      dummy.position.set(d.x + Math.sin(t * d.w + d.r) * 0.3, d.y, d.z);
      dummy.rotation.set(t * d.w + d.r, t * 0.7 * d.w, d.r);
      dummy.updateMatrix();
      joss.setMatrixAt(i, dummy.matrix);
    }
    joss.instanceMatrix.needsUpdate = true;
    rain.material.map.offset.y += dt * 1.6 * (R.rainSpeed ?? 1);
  });

  // a shadow that walks past the window
  const sil = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.5), new THREE.MeshBasicMaterial({ map: T.silhouetteTex(), transparent: true, depthWrite: false, fog: false }));
  sil.position.set(0, 1.55, -4.7);
  sil.visible = false;
  outside.add(sil);
  R.silhouette = sil;

  // ---------- Moon gate ----------
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, GATE.r + 0.17, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path();
  ringHole.absarc(0, 0, GATE.r, 0, Math.PI * 2, true);
  ringShape.holes.push(ringHole);
  const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.36, bevelEnabled: false, curveSegments: 72 }), mStone);
  ring.position.set(GATE.x, GATE.y, -4.3);
  ring.castShadow = true;
  root.add(ring);

  const gate = new THREE.Group();
  root.add(gate);
  reg(gate, 'gate', '月洞門', 'gate');
  // invisible click target filling the opening, so the gate stays clickable once its doors swing away
  const gateHit = new THREE.Mesh(new THREE.CircleGeometry(GATE.r, 32), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  gateHit.position.set(GATE.x, GATE.y, -4.02);
  gate.add(gateHit);
  const latTex = T.latticeTexture('gate', 1024, 1024, 14000, 30);
  const latMat = std({ map: latTex, color: '#3a2112', alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  const halves = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(GATE.x + side * GATE.r, GATE.y, -4.08);
    const geo = new THREE.CircleGeometry(GATE.r, 48, side < 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI);
    const half = new THREE.Mesh(geo, latMat);
    half.position.x = -side * GATE.r;
    half.castShadow = true;
    pivot.add(half);
    const stile = box(0.05, GATE.r * 2 * 0.98, 0.05, mWood, -side * 0.03, 0, 0, pivot);
    stile.position.x = -side * GATE.r + side * 0.025;
    gate.add(pivot);
    halves.push(pivot);
  }
  R.gateHalves = halves;
  const talisman = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.44), std({ map: T.talismanTex(), roughness: 0.9, emissive: '#2a1e05' }));
  talisman.position.set(GATE.x, GATE.y + 0.15, -4.03);
  gate.add(talisman);
  R.talisman = talisman;
  const cordMat = std({ color: '#a3140c', roughness: 0.6 });
  R.cords = [];
  for (const s of [-1, 1]) {
    const c = cyl(0.009, 0.009, 2.25, cordMat, GATE.x, GATE.y, -4.0, gate, 6);
    c.rotation.z = s * 0.78;
    R.cords.push(c);
  }

  // ---------- Window ----------
  const win = new THREE.Group();
  root.add(win);
  reg(win, 'window', '窗', 'window');
  const wz = -4.12;
  box(3.15, 0.1, 0.3, mWood, (WIN.x0 + WIN.x1) / 2, WIN.y1 + 0.05, wz, win);
  box(3.3, 0.07, 0.42, mWood, (WIN.x0 + WIN.x1) / 2, WIN.y0 - 0.03, wz + 0.06, win);
  box(0.1, 1.75, 0.3, mWood, WIN.x0 - 0.05, (WIN.y0 + WIN.y1) / 2, wz, win);
  box(0.1, 1.75, 0.3, mWood, WIN.x1 + 0.05, (WIN.y0 + WIN.y1) / 2, wz, win);
  const pw = (WIN.x1 - WIN.x0) / 4;
  for (let i = 0; i < 4; i++) {
    const cx = WIN.x0 + pw * (i + 0.5), cy = (WIN.y0 + WIN.y1) / 2, ph = WIN.y1 - WIN.y0;
    box(0.04, ph, 0.06, mWood, cx - pw / 2 + 0.02, cy, wz + 0.02, win);
    box(pw, 0.04, 0.06, mWood, cx, WIN.y1 - 0.02, wz + 0.02, win);
    box(pw, 0.04, 0.06, mWood, cx, WIN.y0 + 0.02, wz + 0.02, win);
    if (i === 0 || i === 3) {
      const lat = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.04, ph - 0.04), std({ map: T.latticeTexture('win' + i, 384, 820, 7000, 22), color: '#3a2112', alphaTest: 0.5, side: THREE.DoubleSide }));
      lat.position.set(cx, cy, wz + 0.02);
      lat.castShadow = true;
      win.add(lat);
    }
  }

  // ---------- Scroll ----------
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.48), std({ map: T.scrollTex('上善若水'), roughness: 0.9 }));
  scroll.position.set(0.3, 2.02, -3.985);
  root.add(scroll);
  cyl(0.018, 0.018, 0.5, mWood, 0.3, 2.77, -3.98, root).rotation.z = Math.PI / 2;
  cyl(0.022, 0.022, 0.52, mWood, 0.3, 1.27, -3.975, root).rotation.z = Math.PI / 2;
  reg(scroll, 'scroll', '字畫', null);
  R.scroll = scroll;

  // ---------- Lantern ----------
  const lantern = new THREE.Group();
  lantern.position.set(0, 2.85, 0.6);
  root.add(lantern);
  const lpts = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; lpts.push(new THREE.Vector2(Math.sin(a) * 0.22 + 0.04, -Math.cos(a) * 0.24)); }
  const lanternMat = std({ map: T.lanternTex(), emissive: '#ff3a1a', emissiveMap: T.lanternTex(), emissiveIntensity: 0.9, side: THREE.DoubleSide });
  const lanternBody = new THREE.Mesh(new THREE.LatheGeometry(lpts, 24), lanternMat);
  lantern.add(lanternBody);
  cyl(0.07, 0.07, 0.04, mWood, 0, 0.25, 0, lantern);
  cyl(0.07, 0.07, 0.04, mWood, 0, -0.25, 0, lantern);
  cyl(0.004, 0.004, 0.55, mBlack, 0, 0.5, 0, lantern);
  cyl(0.02, 0.005, 0.22, std({ color: '#b3140c' }), 0, -0.38, 0, lantern);
  reg(lantern, 'lantern', '紅燈籠', null);
  R.lanternMat = lanternMat;
  R.lantern = lantern;

  // ---------- Bookshelf ----------
  buildBookshelf(W, reg, { mWood, mWoodMid, mBrass });
  // ---------- Curio shelf ----------
  buildCurio(W, reg, { mWood, mWoodMid, mBronze, mBrass, mRed });
  // ---------- Desk ----------
  buildDesk(W, reg, { mWood, mWoodMid, mBronze, mBrass, mBlack, mPaper, mRed });
  // ---------- Radio table ----------
  buildRadio(W, reg, { mWood, mWoodMid, mBrass });
  // ---------- Altar ----------
  buildAltar(W, reg, { mWood, mWoodMid, mBronze, mBrass, mRed, mPaper });
  // ---------- Chair + paper effigy ----------
  buildChair(W, reg, { mWood });
  const effigy = buildEffigy();
  effigy.position.set(4.15, 0, 3.15);
  effigy.lookAt(0, 0, 1.2);
  root.add(effigy);
  reg(effigy, 'effigy', '紙紮新娘', 'effigy');
  R.effigy = effigy;
  // ---------- Set dressing from the redesign ----------
  buildDecor(W, reg, { mWood, mWoodMid, mBrass, mBronze });
  // ---------- Ghost (only seen in the mirror, at the end, and when the incense dies) ----------
  const ghost = buildGhost();
  ghost.visible = false;
  root.add(ghost);
  R.ghost = ghost;

  // ---------- Lights ----------
  const hemi = new THREE.HemisphereLight('#7a86b0', '#2a1c12', 1.5);
  root.add(hemi);
  R.hemi = hemi;
  const moon = new THREE.DirectionalLight('#9db0ff', 2.6);
  moon.position.set(3.2, 6.5, -11);
  moon.target.position.set(0.3, 0, 1.6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.03;
  root.add(moon, moon.target);
  R.moon = moon;

  // cold spill from the moon gate so the shelves on the left wall stay readable
  const fill = new THREE.PointLight('#8796c8', 7, 8, 1.4);
  fill.position.set(-3.0, 2.3, -0.6);
  root.add(fill);
  R.fill = fill;

  const lanternLight = new THREE.PointLight('#ff4a2a', 5, 8, 1.5);
  lanternLight.position.set(0, 2.6, 0.6);
  root.add(lanternLight);
  R.lanternLight = lanternLight;

  W.updaters.push((t) => {
    const f = 0.85 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1) * 0.05 + (Math.random() < 0.01 ? -0.4 : 0);
    lanternLight.intensity = (R.lanternBase ?? 5) * f;
    lanternMat.emissiveIntensity = 0.9 * f * ((R.lanternBase ?? 5) / 5);
    lantern.rotation.z = Math.sin(t * 0.6) * 0.03;
  });

  scene.add(root);

  // Everything except the outside scenery blocks and receives clicks.
  W.rayTargets = [];
  root.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh) {
      let p = o, skip = false;
      while (p) { if (p.userData.noray) { skip = true; break; } p = p.parent; }
      if (!skip) W.rayTargets.push(o);
    }
  });
  return W;
}

// ======================================================================
function buildBookshelf(W, reg, { mWood, mBrass }) {
  const R = W.refs;
  const g = new THREE.Group();
  g.position.set(-5, 0, 0.8);
  W.root.add(g);
  const D = 0.42, H = 2.85;
  const frame = new THREE.Group();
  g.add(frame);
  reg(frame, 'bookshelf', '書架', 'bookshelf');
  box(0.03, H, 4, mWood, 0.015, H / 2, 0, frame);
  for (const z of [-2, 2]) box(D, H, 0.05, mWood, D / 2, H / 2, z - Math.sign(z) * 0.025, frame);
  for (const z of [-0.667, 0.667]) box(D - 0.02, H - 0.6, 0.04, mWood, D / 2, 0.6 + (H - 0.6) / 2, z, frame);
  box(D + 0.05, 0.07, 4.08, mWood, D / 2, H + 0.03, 0, frame);
  const shelfY = [0.62, 1.06, 1.5, 1.94, 2.38];
  for (const y of shelfY) box(D - 0.02, 0.035, 3.96, mWood, D / 2, y, 0, frame);
  box(D, 0.06, 4, mWood, D / 2, 0.03, 0, frame);

  // bottom cabinet doors: centre bay opens
  const bays = [[-1.95, -0.687], [-0.647, 0.647], [0.687, 1.95]];
  R.bookDoors = [];
  bays.forEach(([z0, z1], b) => {
    const w = (z1 - z0) / 2;
    for (const s of [0, 1]) {
      const hingeZ = s === 0 ? z0 : z1;
      const pivot = new THREE.Group();
      pivot.position.set(D - 0.01, 0.33, hingeZ);
      const door = box(0.02, 0.5, w - 0.01, mWood, 0, 0, (s === 0 ? 1 : -1) * w / 2, pivot);
      const knob = box(0.02, 0.05, 0.02, mBrass, 0.02, 0, (s === 0 ? 1 : -1) * (w - 0.05), pivot);
      knob.castShadow = false;
      door.userData.dir = s === 0 ? 1 : -1;
      g.add(pivot);
      if (b === 1) {
        reg(pivot, 'bookCabinet', '書架下的櫃子', 'bookshelf');
        R.bookDoors.push({ pivot, dir: s === 0 ? 1 : -1 });
      } else frame.add(pivot);
    }
  });
  // spirit tablet hidden in the centre cabinet
  const tablet = makeTablet();
  tablet.position.set(0.22, 0.07, 0);
  tablet.rotation.y = 0;
  g.add(tablet);
  reg(tablet, 'tabletPickup', '無字牌位', 'bookshelf');
  R.tabletInCab = tablet;

  // books
  const atlas = T.spineAtlas(TITLES);
  const cellRect = (i) => {
    const col = i % 16, row = (i / 16) | 0;
    const u0 = col / 16, u1 = (col + 1) / 16, v1 = 1 - row / 4, v0 = 1 - (row + 1) / 4;
    return { spine: [u0, v0, u1, v1], body: [u0 + 0.003, v0 + 0.12, u0 + 0.005, v0 + 0.13] };
  };
  const r = T.rng(7);
  const geos = [];
  R.specialBooks = {};
  R.handprints = [];
  let titleIdx = 0;
  const rowRanges = shelfY.map((y, i) => [y + 0.0175, (shelfY[i + 1] ?? H) - 0.0175]);
  bays.forEach(([z0, z1], b) => {
    rowRanges.forEach(([y0, y1], row) => {
      let z = z0 + 0.01, slot = 0;
      while (true) {
        const special = SPECIAL_BOOKS.find((s) => s.bay === b && s.row === row && s.slot === slot);
        const t = special ? 0.06 : 0.032 + r() * 0.05;
        if (z + t > z1 - 0.01) break;
        if (!special && r() < 0.035) { z += 0.06 + r() * 0.08; slot++; continue; }
        const h = special ? 0.33 : Math.min(y1 - y0 - 0.03, 0.25 + r() * 0.12);
        const d = special ? 0.28 : 0.22 + r() * 0.1;
        const cz = z + t / 2, cx = D - 0.035 - d / 2, cy = y0 + h / 2;
        if (special) {
          const tex = T.singleSpine(special.title, special.color);
          const geo = bookGeometry(t, h, d, [0, 0, 1, 1], [0.02, 0.5, 0.03, 0.51]);
          const m = new THREE.Mesh(geo, std({ map: tex, roughness: 0.7 }));
          m.position.set(cx, cy, cz);
          m.receiveShadow = true;
          g.add(m);
          const hp = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.1), new THREE.MeshBasicMaterial({ map: T.handprintTex(), transparent: true, depthWrite: false, color: '#ff6655' }));
          hp.rotation.y = Math.PI / 2;
          hp.position.set(d / 2 + 0.003, 0.03, 0);
          m.add(hp);
          setLayer(hp, 1);
          R.handprints.push(hp);
          reg(m, 'book:' + special.title, '《' + special.title + '》', 'bookshelf');
          m.userData.book = special;
          R.specialBooks[special.title] = m;
        } else {
          const c = cellRect(titleIdx++ % TITLES.length);
          const geo = bookGeometry(t, h, d, c.spine, c.body);
          const tilt = r() < 0.06 ? (r() - 0.5) * 0.12 : 0;
          geo.rotateX(tilt);
          geo.translate(cx, cy, cz);
          geos.push(geo);
        }
        z += t + 0.002;
        slot++;
      }
    });
  });
  const books = new THREE.Mesh(mergeGeometries(geos), std({ map: atlas, roughness: 0.75 }));
  books.receiveShadow = true;
  g.add(books);
  frame.add(books);

  // the genealogy: a thick blue volume lying on the middle shelf
  const genTex = T.genealogyCoverTex();
  const gen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.28), [
    std({ color: '#d9cfb6' }), std({ color: '#d9cfb6' }), std({ map: genTex }), std({ color: '#1d2a3c' }), std({ color: '#d9cfb6' }), std({ color: '#d9cfb6' }),
  ]);
  gen.position.set(D - 0.16, shelfY[2] + 0.0175 + 0.03, -0.42);
  gen.rotation.y = 0.15;
  gen.castShadow = true;
  g.add(gen);
  reg(gen, 'genealogy', '陳氏族譜', 'bookshelf');
}

// ======================================================================
function makeTablet() {
  const grp = new THREE.Group();
  const front = std({ map: T.tabletTex(''), roughness: 0.6 });
  const side = std({ color: '#3a1f10', roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.12), [front, side, side, side, side, side]);
  body.position.y = 0.04 + 0.18;
  body.castShadow = true;
  grp.add(body);
  const base = box(0.09, 0.04, 0.17, side, 0, 0.02, 0, grp);
  base.castShadow = true;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 20, 1, false, 0, Math.PI), side);
  top.rotation.set(0, 0, Math.PI / 2);
  top.rotation.y = Math.PI / 2;
  top.position.y = 0.4;
  grp.add(top);
  grp.userData.front = front;
  return grp;
}

// ======================================================================
function curioItem(kind, mats) {
  const g = new THREE.Group();
  if (kind === 'vase') {
    const p = [[0, 0], [0.07, 0], [0.11, 0.06], [0.12, 0.14], [0.09, 0.22], [0.04, 0.27], [0.035, 0.31], [0.05, 0.34], [0.0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(p, 32), std({ map: T.vaseTex(), roughness: 0.2, metalness: 0.05 }));
    m.castShadow = true;
    g.add(m);
  } else if (kind === 'bell') {
    box(0.16, 0.02, 0.16, mats.mWood, 0, 0.01, 0, g);
    const p = [[0, 0.24], [0.03, 0.235], [0.05, 0.2], [0.065, 0.12], [0.085, 0.05], [0.095, 0.035], [0.0, 0.035]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(p, 28), mats.mBronze);
    m.castShadow = true;
    g.add(m);
    const knob = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 16), mats.mBronze);
    knob.position.y = 0.255;
    g.add(knob);
  } else if (kind === 'pot') {
    const clay = std({ color: '#5a2e22', roughness: 0.55 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), clay);
    b.scale.set(1, 0.72, 1);
    b.position.y = 0.068;
    b.castShadow = true;
    g.add(b);
    cyl(0.04, 0.05, 0.02, clay, 0, 0.13, 0, g);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), clay);
    knob.position.y = 0.15;
    g.add(knob);
    const spout = cyl(0.012, 0.022, 0.1, clay, 0.1, 0.09, 0, g, 10);
    spout.rotation.z = -0.9;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 16, Math.PI), clay);
    handle.position.set(-0.09, 0.07, 0);
    handle.rotation.z = Math.PI / 2;
    g.add(handle);
  } else if (kind === 'drum') {
    box(0.06, 0.04, 0.06, mats.mWood, 0, 0.02, 0, g);
    cyl(0.008, 0.008, 0.2, mats.mWood, 0, 0.12, 0, g, 8);
    // drum axis along local z, which faces into the room once the item is turned
    const drum = cyl(0.075, 0.075, 0.05, mats.mRed, 0, 0.27, 0, g, 24);
    drum.rotation.x = Math.PI / 2;
    const skin = std({ color: '#e0d0a8', roughness: 0.8 });
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.CircleGeometry(0.072, 24), skin);
      f.position.set(0, 0.27, s * 0.026);
      f.rotation.y = s > 0 ? 0 : Math.PI;
      g.add(f);
      const string = cyl(0.002, 0.002, 0.07, mats.mWood, s * 0.1, 0.25, 0, g, 4);
      string.rotation.z = Math.PI / 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mats.mWood);
      bead.position.set(s * 0.135, 0.25, 0);
      g.add(bead);
    }
  }
  g.userData.kind = kind;
  return g;
}

function buildCurio(W, reg, mats) {
  const { mWood } = mats;
  const R = W.refs;
  const g = new THREE.Group();
  g.position.set(-5, 0, -2.65);
  W.root.add(g);
  const curioLight = new THREE.PointLight('#d9b48a', 3.5, 3.2, 1.4);
  curioLight.position.set(1.2, 2.2, 0);
  g.add(curioLight);
  const D = 0.38, H = 2.46, HW = 1.1;
  const zOf = (u) => HW - u * HW * 2;
  const frame = new THREE.Group();
  g.add(frame);
  reg(frame, 'curio', '博古架', 'curio');
  box(0.03, H, HW * 2, mWood, 0.015, H / 2, 0, frame);
  for (const s of [-1, 1]) box(D, H, 0.05, mWood, D / 2, H / 2, s * (HW - 0.025), frame);
  for (const y of [0.72, 1.16, 1.76, 2.46]) box(D, 0.035, HW * 2, mWood, D / 2, y, 0, frame);
  // vertical dividers per row
  box(D - 0.02, 0.6, 0.03, mWood, D / 2, 1.76 + 0.35, zOf(0.45), frame);
  box(D - 0.02, 0.6, 0.03, mWood, D / 2, 1.16 + 0.3, zOf(0.28), frame);
  box(D - 0.02, 0.6, 0.03, mWood, D / 2, 1.16 + 0.3, zOf(0.64), frame);
  box(D - 0.02, 0.44, 0.03, mWood, D / 2, 0.72 + 0.22, zOf(0.6), frame);
  // decorative scalloped top
  box(D + 0.04, 0.08, HW * 2 + 0.06, mWood, D / 2, H + 0.05, 0, frame);
  // base cabinet
  box(0.02, 0.62, HW * 2 - 0.1, mats.mWoodMid, D - 0.01, 0.38, 0, frame).position.z = 0;
  R.curioDoors = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(D + 0.005, 0.38, s * 0.5);
    box(0.022, 0.56, 0.49, mWood, 0, 0, -s * 0.245, pivot);
    box(0.02, 0.06, 0.02, mats.mBrass, 0.02, 0, -s * 0.44, pivot).castShadow = false;
    g.add(pivot);
    reg(pivot, 'curioCabinet', '博古架下的櫃子', 'curio');
    R.curioDoors.push({ pivot, dir: -s });
  }
  // the red shoe waiting inside
  const shoe = makeShoe();
  shoe.position.set(D + 0.03, 0.12, 0);
  shoe.rotation.y = 0.4;
  shoe.visible = false;
  g.add(shoe);
  reg(shoe, 'shoePickup', '紅繡花鞋', 'curio');
  R.shoeInCab = shoe;

  // decor
  const decor = new THREE.Group();
  g.add(decor);
  reg(decor, 'curioDecor', '擺飾', 'curio');
  const cellCenter = (c) => ({ z: (zOf(c.u0) + zOf(c.u1)) / 2, y: c.y0 });
  {
    const c = cellCenter(CURIO_CELLS.C);
    for (let i = 0; i < 3; i++) box(0.2, 0.035, 0.14 - i * 0.01, std({ color: ['#1f3d2c', '#7a1a1a', '#c9b48e'][i] }), D / 2, c.y + 0.018 + i * 0.036, c.z, decor);
  }
  {
    const c = cellCenter(CURIO_CELLS.E);
    const plate = cyl(0.13, 0.11, 0.02, std({ color: '#7e9c8c', roughness: 0.25 }), D / 2 - 0.05, c.y + 0.16, c.z, decor, 32);
    plate.rotation.z = Math.PI / 2 - 0.25;
    box(0.08, 0.04, 0.1, mWood, D / 2 + 0.02, c.y + 0.02, c.z, decor);
  }
  {
    const c = cellCenter(CURIO_CELLS.G);
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 14), std({ color: '#3b4a3e', roughness: 0.3 }));
    jar.scale.set(1, 1.2, 1);
    jar.position.set(D / 2, c.y + 0.1, c.z);
    decor.add(jar);
    cyl(0.04, 0.05, 0.03, mWood, D / 2, c.y + 0.2, c.z, decor);
  }

  // puzzle items
  R.curioItems = {};
  R.curioSlotPos = {};
  for (const [id, c] of Object.entries(CURIO_CELLS)) {
    if (!c.puzzle) continue;
    const { z, y } = cellCenter(c);
    R.curioSlotPos[id] = new THREE.Vector3(D / 2, y + 0.0175, z);
  }
  for (const [cell, kind] of Object.entries(CURIO_START)) {
    const it = curioItem(kind, mats);
    it.scale.setScalar(1.15);
    it.position.copy(R.curioSlotPos[cell]);
    it.rotation.y = Math.PI / 2;
    g.add(it);
    reg(it, 'curio:' + kind, CURIO_NAMES[kind], 'curio');
    R.curioItems[kind] = it;
  }
}

function makeShoe() {
  const g = new THREE.Group();
  const red = std({ color: '#8f1610', roughness: 0.5 });
  const sole = box(0.2, 0.02, 0.07, std({ color: '#e9dcc0' }), 0, 0.01, 0, g);
  sole.castShadow = true;
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), red);
  upper.scale.set(1.7, 0.9, 0.62);
  upper.position.set(0.01, 0.02, 0);
  g.add(upper);
  const heel = box(0.05, 0.05, 0.065, red, -0.075, 0.045, 0, g);
  heel.castShadow = true;
  const gold = std({ color: '#d9b45a', metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), gold);
    f.position.set(0.02 + i * 0.025, 0.065 - i * 0.006, 0.02);
    g.add(f);
  }
  return g;
}

// ======================================================================
function buildDesk(W, reg, mats) {
  const { mWood, mBrass, mBronze, mBlack, mPaper } = mats;
  const R = W.refs;
  const g = new THREE.Group();
  g.position.set(2.9, 0, -3.25);
  W.root.add(g);
  const frame = new THREE.Group();
  g.add(frame);
  reg(frame, 'desk', '書桌', 'desk');
  box(2.7, 0.05, 0.72, mWood, 0, 0.805, 0, frame);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.07, 0.78, 0.07, mWood, sx * 1.28, 0.39, sz * 0.29, frame);
  for (const sx of [-1, 1]) box(0.97, 0.08, 0.03, mWood, sx * 0.795, 0.74, 0.33, frame);
  box(2.56, 0.08, 0.03, mWood, 0, 0.74, -0.33, frame);
  for (const sx of [-1, 1]) box(0.03, 0.08, 0.6, mWood, sx * 1.28, 0.74, 0, frame);
  for (const sx of [-1, 1]) box(0.04, 0.04, 0.6, mWood, sx * 1.28, 0.12, 0, frame);

  // drawer
  const drawer = new THREE.Group();
  drawer.position.set(0, 0.73, 0);
  g.add(drawer);
  box(0.6, 0.095, 0.025, mats.mWoodMid, 0, 0, 0.335, drawer);
  box(0.57, 0.01, 0.5, mWood, 0, -0.042, 0.09, drawer);
  for (const sx of [-1, 1]) box(0.012, 0.08, 0.5, mWood, sx * 0.28, -0.005, 0.09, drawer);
  box(0.57, 0.08, 0.012, mWood, 0, -0.005, -0.155, drawer);
  const plate = box(0.15, 0.06, 0.008, mBrass, 0, 0, 0.35, drawer);
  plate.castShadow = false;
  for (let i = -1; i <= 1; i++) {
    const d = cyl(0.014, 0.014, 0.012, mBronze, i * 0.04, 0, 0.358, drawer, 12);
    d.rotation.x = Math.PI / 2;
  }
  reg(drawer, 'drawer', '抽屜', 'drawer');
  R.drawer = drawer;
  // contents
  const matches = new THREE.Group();
  box(0.08, 0.022, 0.05, std({ color: '#c9a45c' }), 0, 0, 0, matches);
  box(0.081, 0.023, 0.02, std({ color: '#7b1410' }), 0, 0, 0.012, matches);
  matches.position.set(-0.13, -0.025, 0.24);
  drawer.add(matches);
  reg(matches, 'matchesPickup', '火柴盒', 'drawer');
  R.matchesMesh = matches;
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.09), std({ map: new THREE.CanvasTexture(T.photoCanvas(CURIO_ANSWER, CURIO_CELLS)), roughness: 0.6 }));
  photo.material.map.colorSpace = THREE.SRGBColorSpace;
  photo.rotation.x = -Math.PI / 2;
  photo.rotation.z = 0.3;
  photo.position.set(0.1, -0.035, 0.22);
  drawer.add(photo);
  reg(photo, 'photoPickup', '老照片', 'drawer');
  R.photoMesh = photo;

  // diary
  const diaryTop = std({ map: T.diaryCoverTex(), roughness: 0.8 });
  const diarySide = std({ color: '#d9cfb6' });
  const diary = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.28), [diarySide, diarySide, diaryTop, diarySide, diarySide, diarySide]);
  diary.position.set(-0.55, 0.845, 0.08);
  diary.rotation.y = 0.2;
  diary.castShadow = true;
  g.add(diary);
  reg(diary, 'diary', '守仁手記', 'desk');

  // oil lamp
  const lamp = new THREE.Group();
  lamp.position.set(1.0, 0.83, -0.12);
  g.add(lamp);
  cyl(0.07, 0.09, 0.03, mBrass, 0, 0.015, 0, lamp);
  cyl(0.02, 0.03, 0.12, mBrass, 0, 0.09, 0, lamp);
  const font = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 14), mBrass);
  font.scale.set(1, 0.6, 1);
  font.position.y = 0.17;
  lamp.add(font);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#f5e6c8', transparent: true, opacity: 0.25, roughness: 0.05, transmission: 0, depthWrite: false }));
  glass.scale.set(1, 1.6, 1);
  glass.position.y = 0.27;
  lamp.add(glass);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.flameTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flame.scale.set(0.035, 0.07, 1);
  flame.position.y = 0.26;
  flame.visible = false;
  lamp.add(flame);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
  lampGlow.scale.set(0.5, 0.5, 1);
  lampGlow.position.y = 0.26;
  lampGlow.visible = false;
  lamp.add(lampGlow);
  const lampLight = new THREE.PointLight('#ffa050', 0, 12, 1.3);
  lampLight.position.y = 0.32;
  lamp.add(lampLight);
  reg(lamp, 'lamp', '油燈', 'desk');
  R.lamp = { flame, glow: lampGlow, light: lampLight };
  W.updaters.push((t) => {
    if (!flame.visible) return;
    const f = 1 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23.7) * 0.05 + (Math.random() - 0.5) * 0.08;
    lampLight.intensity = (R.lampBase ?? 22) * f;
    flame.scale.set(0.035 * f, 0.07 * (2 - f), 1);
  });

  // bronze mirror on a stand, facing the bookshelf
  const mirrorPos = new THREE.Vector3(2.9 - 1.05, 1.3, -3.25 - 0.08);
  const target = new THREE.Vector3(-4.6, 1.3, 0.8);
  const n = target.clone().sub(mirrorPos).setY(0).normalize();
  const mg = new THREE.Group();
  mg.position.set(-1.05, 0.83, -0.08);
  mg.rotation.y = Math.atan2(n.x, n.z);
  g.add(mg);
  box(0.16, 0.03, 0.1, mWood, 0, 0.015, 0, mg);
  for (const s of [-1, 1]) {
    const leg = box(0.02, 0.5, 0.02, mWood, s * 0.17, 0.27, -0.02, mg);
    leg.rotation.z = -s * 0.08;
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.016, 10, 48), mBronze);
  rim.position.set(0, 0.47, 0);
  rim.castShadow = true;
  mg.add(rim);
  const backDisc = new THREE.Mesh(new THREE.CircleGeometry(0.17, 48), mBronze);
  backDisc.position.set(0, 0.47, -0.006);
  backDisc.rotation.y = Math.PI;
  mg.add(backDisc);
  const mirror = new Reflector(new THREE.CircleGeometry(0.16, 48), { textureWidth: 640, textureHeight: 640, color: '#b5a385', clipBias: 0.003 });
  mirror.position.set(0, 0.47, 0.002);
  mg.add(mirror);
  reg(mg, 'mirror', '銅鏡', 'mirror');
  R.mirror = mirror;
  R.mirrorPos = mirrorPos;
  R.mirrorNormal = n;

  // brushes & inkstone
  const holder = cyl(0.05, 0.05, 0.14, std({ color: '#d6dbe0', roughness: 0.25, map: T.vaseTex() }), 0.55, 0.9, -0.18, g);
  for (let i = 0; i < 4; i++) {
    const b = cyl(0.006, 0.006, 0.28, std({ color: '#7a5a2a' }), 0.55 + (i - 1.5) * 0.015, 1.0, -0.18 + (i % 2 ? 0.01 : -0.01), g, 6);
    b.rotation.z = (i - 1.5) * 0.08;
  }
  reg(holder, 'brushHolder', '筆筒', 'desk');
  const brush = new THREE.Group();
  const shaft = cyl(0.006, 0.006, 0.22, std({ color: '#7a5a2a' }), 0, 0, 0, brush, 8);
  shaft.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.04, 8), std({ color: '#ddd3bf' }));
  tip.rotation.z = Math.PI / 2;
  tip.position.x = 0.13;
  brush.add(tip);
  box(0.03, 0.015, 0.04, mWood, 0.06, -0.012, 0, brush);
  brush.position.set(0.22, 0.845, 0.16);
  brush.rotation.y = -0.4;
  g.add(brush);
  reg(brush, 'brush', '毛筆', 'desk');
  R.brushMesh = brush;
  const ink = new THREE.Group();
  ink.position.set(-0.08, 0.83, 0.02);
  g.add(ink);
  box(0.17, 0.03, 0.25, mBlack, 0, 0.015, 0, ink);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.12), std({ color: '#4a0604', roughness: 0.08, metalness: 0.2 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.031, 0.04);
  ink.add(pool);
  reg(ink, 'inkstone', '硯台', 'desk');
  // a few loose papers
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), mPaper);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = 0.3 + i * 0.4;
    p.position.set(0.3 + i * 0.05, 0.832 + i * 0.001, -0.02);
    p.receiveShadow = true;
    frame.add(p);
  }
}

// ======================================================================
function buildRadio(W, reg, { mWood, mBrass }) {
  const R = W.refs;
  const g = new THREE.Group();
  g.position.set(0.3, 0, -3.55);
  W.root.add(g);
  box(0.6, 0.03, 0.42, mWood, 0, 0.64, 0, g);
  box(0.56, 0.02, 0.38, mWood, 0, 0.2, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.035, 0.64, 0.035, mWood, sx * 0.27, 0.32, sz * 0.18, g);
  const front = std({ map: T.radioTex(), emissive: '#000000', emissiveMap: T.radioTex(), roughness: 0.6 });
  const side = std({ color: '#4a2a16', roughness: 0.5 });
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.22), [side, side, side, side, front, side]);
  radio.position.set(0, 0.655 + 0.14, 0);
  radio.castShadow = true;
  g.add(radio);
  box(0.2, 0.015, 0.02, mBrass, 0, 0.95, 0, g);
  reg(radio, 'radio', '收音機', 'radio');
  R.radioMat = front;
  // a stack of old letters under the table
  for (let i = 0; i < 4; i++) box(0.22, 0.012, 0.16, std({ color: '#d4c7a8' }), (i - 1.5) * 0.01, 0.217 + i * 0.012, 0, g).rotation.y = i * 0.2;
}

// ======================================================================
function buildAltar(W, reg, mats) {
  const { mWood, mBronze, mBrass } = mats;
  const R = W.refs;
  const g = new THREE.Group();
  W.root.add(g);
  const frame = new THREE.Group();
  g.add(frame);
  reg(frame, 'altar', '供桌', 'altar');
  const X = 4.66, Z = 0.6;
  box(0.56, 0.05, 1.9, mWood, X, 0.9, Z, frame);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.06, 0.88, 0.06, mWood, X + sx * 0.24, 0.44, Z + sz * 0.9, frame);
  for (const sz of [-1, 1]) {
    const end = box(0.56, 0.05, 0.1, mWood, X, 0.95, Z + sz * 0.92, frame);
    end.rotation.x = sz * 0.35;
  }
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), std({ map: T.robeTex('#6e0c08', 'altar'), roughness: 0.85, side: THREE.DoubleSide }));
  cloth.position.set(X - 0.285, 0.6, Z);
  cloth.rotation.y = -Math.PI / 2;
  frame.add(cloth);
  // banner
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.95), std({ map: T.bannerTex(), roughness: 0.95, side: THREE.DoubleSide }));
  banner.position.set(4.985, 2.05, Z);
  banner.rotation.y = -Math.PI / 2;
  g.add(banner);
  reg(banner, 'banner', '奠', 'altar');

  // censer + incense
  const censer = new THREE.Group();
  censer.position.set(4.5, 0.925, Z);
  g.add(censer);
  cyl(0.085, 0.07, 0.1, mBronze, 0, 0.065, 0, censer, 24);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    cyl(0.01, 0.008, 0.03, mBronze, Math.cos(a) * 0.05, 0.015, Math.sin(a) * 0.05, censer, 8);
  }
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), mBronze);
    ear.position.set(0, 0.12, s * 0.085);
    censer.add(ear);
  }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.078, 24), std({ color: '#8e8a82', roughness: 1 }));
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.112;
  censer.add(ash);
  const stickGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6);
  stickGeo.translate(0, 0.5, 0);
  const stick = new THREE.Mesh(stickGeo, std({ color: '#8b2a1a', roughness: 0.8 }));
  stick.position.y = 0.112;
  stick.scale.y = 0.34;
  censer.add(stick);
  const ember = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTex('255,90,30'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  ember.scale.set(0.035, 0.035, 1);
  censer.add(ember);
  reg(censer, 'censer', '香爐', 'altar');
  R.incense = { stick, ember, max: 0.34 };
  // smoke
  const smokeMat = new THREE.SpriteMaterial({ map: T.smokeTex(), depthWrite: false, transparent: true, opacity: 0.25, color: '#c8c4be' });
  const smokes = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(smokeMat.clone());
    s.userData.t = i / 14;
    censer.add(s);
    smokes.push(s);
  }
  W.updaters.push((t, dt) => {
    const top = 0.112 + stick.scale.y;
    ember.position.y = top;
    ember.material.opacity = 0.7 + Math.sin(t * 5) * 0.3;
    for (const s of smokes) {
      s.userData.t = (s.userData.t + dt * 0.12) % 1;
      const k = s.userData.t;
      s.position.set(Math.sin(k * 9 + t) * 0.03 * k * 3, top + k * 0.9, Math.cos(k * 7) * 0.02 * k * 3);
      const sc = 0.03 + k * 0.22;
      s.scale.set(sc, sc, 1);
      s.material.opacity = 0.22 * Math.sin(k * Math.PI) * (stick.visible ? 1 : 0);
    }
  });

  // candles
  R.candles = [];
  const altarLight = new THREE.PointLight('#ff8a40', 10, 7, 1.5);
  altarLight.position.set(4.35, 1.35, Z);
  g.add(altarLight);
  R.altarLight = altarLight;
  for (const dz of [-0.6, 0.6]) {
    const cz = Z + dz;
    cyl(0.04, 0.05, 0.05, mBrass, 4.6, 0.95, cz, g, 16);
    cyl(0.026, 0.026, 0.22, std({ color: '#efe9dc', roughness: 0.6, emissive: '#3a2a18' }), 4.6, 1.085, cz, g, 14);
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.flameTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    f.scale.set(0.03, 0.06, 1);
    f.position.set(4.6, 1.225, cz);
    g.add(f);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    glow.scale.set(0.3, 0.3, 1);
    glow.position.copy(f.position);
    g.add(glow);
    R.candles.push({ flame: f, glow });
  }
  W.updaters.push((t) => {
    const f = 1 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 17.3) * 0.05;
    altarLight.intensity = (R.altarBase ?? 10) * f;
    for (const c of R.candles) c.flame.scale.set(0.03 * f, 0.06 * (2 - f), 1);
  });

  // fruit offering
  const plate = cyl(0.1, 0.08, 0.015, std({ color: '#e8e4da', roughness: 0.3 }), 4.62, 0.93, Z - 0.32, g, 24);
  plate.castShadow = false;
  const orange = std({ color: '#c8621a', roughness: 0.6 });
  [[0, 0], [0.045, 0.03], [-0.04, 0.035], [0.0, 0.0]].forEach(([dx, dz], i) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), orange);
    o.position.set(4.62 + dx, 0.97 + (i === 3 ? 0.055 : 0), Z - 0.32 + dz);
    o.castShadow = true;
    g.add(o);
  });

  // tablet stand (empty) and the placed tablet / shoe
  const stand = box(0.14, 0.03, 0.2, mWood, 4.76, 0.94, Z, g);
  reg(stand, 'altarSlot', '牌位座', 'altar');
  const tablet = makeTablet();
  tablet.position.set(4.76, 0.955, Z);
  tablet.rotation.y = Math.PI;
  tablet.visible = false;
  g.add(tablet);
  reg(tablet, 'tablet', '牌位', 'altar');
  R.tabletOnAltar = tablet;
  const shoe = makeShoe();
  shoe.position.set(4.46, 0.925, Z + 0.3);
  shoe.rotation.y = Math.PI / 2 + 0.3;
  shoe.visible = false;
  g.add(shoe);
  R.shoeOnAltar = shoe;
}

// ======================================================================
function buildChair(W, reg, { mWood }) {
  const g = new THREE.Group();
  g.position.set(3.25, 0, 3.05);
  g.rotation.y = Math.atan2(-3.25, -1.6) ;
  W.root.add(g);
  box(0.56, 0.04, 0.46, mWood, 0, 0.48, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.04, 0.48, 0.04, mWood, sx * 0.25, 0.24, sz * 0.2, g);
  box(0.36, 0.5, 0.025, mWood, 0, 0.78, -0.2, g).rotation.x = -0.1;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 32, Math.PI * 1.15), mWood);
  rail.rotation.x = Math.PI / 2;
  rail.rotation.z = -Math.PI * 0.075 + Math.PI;
  rail.position.set(0, 0.74, 0.02);
  rail.castShadow = true;
  g.add(rail);
  const cushion = box(0.5, 0.04, 0.42, std({ color: '#5a4a32', roughness: 0.9 }), 0, 0.52, 0, g);
  cushion.castShadow = false;
  reg(g, 'chair', '圈椅', null);
}

// ======================================================================
export function buildEffigy() {
  const g = new THREE.Group();
  const paperRed = std({ map: T.robeTex('#b0201a', 'effigy'), roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
  const paperWhite = std({ color: '#efe8dc', roughness: 0.95, flatShading: true });
  const black = std({ color: '#0a0908', roughness: 0.7 });
  const skirtPts = [[0, 0], [0.3, 0], [0.29, 0.08], [0.22, 0.5], [0.16, 0.8], [0.13, 0.92], [0, 0.92]].map(([x, y]) => new THREE.Vector2(x, y));
  const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtPts, 12), paperRed);
  skirt.castShadow = true;
  g.add(skirt);
  const torso = cyl(0.13, 0.15, 0.3, paperRed, 0, 1.06, 0, g, 10);
  torso.material = paperRed;
  const collar = cyl(0.05, 0.13, 0.05, std({ color: '#d9b45a', roughness: 0.6, flatShading: true }), 0, 1.22, 0, g, 10);
  collar.castShadow = false;
  for (const s of [-1, 1]) {
    const arm = cyl(0.035, 0.06, 0.42, paperRed, s * 0.17, 0.98, 0.03, g, 8);
    arm.rotation.z = s * 0.18;
    arm.rotation.x = -0.25;
    const hand = box(0.05, 0.08, 0.02, paperWhite, s * 0.2, 0.75, 0.1, g);
    hand.rotation.x = -0.25;
  }
  cyl(0.03, 0.035, 0.08, paperWhite, 0, 1.27, 0, g, 8);
  const head = new THREE.Group();
  head.position.set(0, 1.38, 0);
  g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), std({ map: T.faceTex(), roughness: 0.95 }));
  face.scale.set(0.92, 1.12, 0.95);
  face.rotation.y = -Math.PI / 2;
  head.add(face);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.112, 20, 14), black);
  hair.scale.set(1.04, 1.1, 0.95);
  hair.position.set(0, 0.028, -0.05);
  head.add(hair);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), black);
  bun.position.set(0, 0.11, -0.06);
  head.add(bun);
  const flowerMat = std({ color: '#d0181a', roughness: 0.6, emissive: '#300000' });
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), flowerMat);
    fl.position.set(s * 0.085, 0.07, 0.0);
    head.add(fl);
  }
  g.userData.head = head;
  return g;
}

export function buildGhost() {
  const g = new THREE.Group();
  const robe = std({ map: T.robeTex('#5e0806', 'ghost'), roughness: 0.8, emissive: '#250303', side: THREE.DoubleSide });
  const veilMat = std({ color: '#7a0907', roughness: 0.85, emissive: '#2a0303', side: THREE.DoubleSide });
  const pale = std({ color: '#d8d2c8', roughness: 0.8, emissive: '#1a1a1a' });
  const black = std({ color: '#050404', roughness: 0.6 });
  const pts = [[0, 0], [0.42, 0], [0.36, 0.12], [0.26, 0.6], [0.2, 1.0], [0.21, 1.2], [0.19, 1.3], [0.11, 1.37], [0.045, 1.4], [0.04, 1.46], [0, 1.46]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), robe);
  g.add(body);
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 12, 1, true), robe);
    sleeve.position.set(s * 0.2, 1.02, 0.08);
    sleeve.rotation.set(-0.35, 0, s * 0.12);
    g.add(sleeve);
    const hand = box(0.05, 0.14, 0.025, pale, s * 0.24, 0.72, 0.2, g);
    hand.rotation.x = -0.3;
    for (let k = 0; k < 4; k++) {
      const nail = box(0.006, 0.05, 0.006, black, s * 0.24 + (k - 1.5) * 0.011, 0.63, 0.23, g);
      nail.rotation.x = -0.3;
    }
  }
  // face (hidden under the veil except in the final jumpscare)
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), std({ map: T.ghostFaceTex(), roughness: 0.9, emissive: '#1c1a18', emissiveMap: T.ghostFaceTex() }));
  face.scale.set(0.9, 1.15, 0.92);
  face.rotation.y = -Math.PI / 2;
  face.position.y = 1.5;
  g.add(face);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.108, 20, 14), black);
  hairCap.scale.set(1.06, 1.15, 1);
  hairCap.position.set(0, 1.52, -0.06);
  g.add(hairCap);
  const sideHair = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
    const st = box(0.025, 0.7, 0.02, black, sx * (0.085 + k * 0.012), 1.2, 0.03 - k * 0.02, g);
    st.rotation.z = sx * 0.04;
    sideHair.push(st);
  }
  g.userData.sideHair = sideHair;
  // veil: dome over the head, falling over the shoulders
  const vpts = [[0, 1.69], [0.07, 1.675], [0.115, 1.63], [0.135, 1.55], [0.13, 1.46], [0.15, 1.38], [0.22, 1.31], [0.27, 1.18], [0.3, 1.02]].map(([x, y]) => new THREE.Vector2(x, y));
  const veil = new THREE.Mesh(new THREE.LatheGeometry(vpts, 28), veilMat);
  // let the hem sag unevenly so it reads as cloth
  const vp = veil.geometry.attributes.position;
  for (let i = 0; i < vp.count; i++) {
    const y = vp.getY(i);
    if (y < 1.2) {
      const a = Math.atan2(vp.getZ(i), vp.getX(i));
      vp.setY(i, y - (1.2 - y) * (0.25 + 0.25 * Math.sin(a * 5) + 0.15 * Math.sin(a * 11)));
    }
  }
  veil.geometry.computeVertexNormals();
  g.add(veil);
  const fringe = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 40), std({ color: '#c9a45c', metalness: 0.7, roughness: 0.4 }));
  fringe.rotation.x = Math.PI / 2;
  fringe.position.y = 1.0;
  g.add(fringe);
  g.userData.veilParts = [veil, fringe];
  // long hair spilling out from under the veil, down past the waist
  for (let i = 0; i < 11; i++) {
    const len = 0.42 + ((i * 37) % 5) * 0.06;
    const strand = box(0.02, len, 0.01, black, -0.13 + i * 0.026, 0.98 - len / 2, 0.27 - Math.abs(i - 5) * 0.012, g);
    strand.rotation.x = -0.08;
    strand.rotation.z = (i - 5) * 0.015;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}
