import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { GATE, WIN } from './world.js';

// Set dressing from the redesign canvas: three story layers (the scholar's study, the funeral
// that was never cleared away, the player's half-finished packing) placed around the puzzle
// furniture without touching it.

const std = (o) => new THREE.MeshStandardMaterial(o);

// Collects primitives per material and merges them, so each prop costs a handful of meshes.
class Kit {
  constructor() { this.parts = new Map(); }

  add(mat, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    geo.applyMatrix4(m);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geo);
    return geo;
  }

  box(mat, w, h, d, x, y, z, rx, ry, rz) { return this.add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); }
  cyl(mat, rt, rb, h, x, y, z, seg = 16, rx, ry, rz) { return this.add(mat, new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, ry, rz); }

  build(group, { cast = true, receive = true } = {}) {
    for (const [mat, geos] of this.parts) {
      const indexed = geos.every((g) => g.index);
      const list = indexed ? geos : geos.map((g) => (g.index ? g.toNonIndexed() : g));
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

function place(root, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  root.add(g);
  return g;
}

// Facing helpers: a group's local +z points into the room.
const FACE_NEG_X = -Math.PI / 2; // against the right wall
const FACE_POS_X = Math.PI / 2; // against the left wall
const FACE_NEG_Z = Math.PI; // against the front wall

export function buildDecor(W, reg, mats) {
  const { mWood, mWoodMid, mBrass, mBronze } = mats;
  const root = W.root;
  const R = W.refs;
  const mCamphor = std({ map: T.wood('camphor', '#6b3c1e', '#3a1f0e'), roughness: 0.6 });
  const mRobe = std({ map: T.robeTex('#a3150f', 'dress'), roughness: 0.75, side: THREE.DoubleSide });
  const mGold = std({ color: '#c9a45c', metalness: 0.7, roughness: 0.35 });
  const mPaperWhite = std({ color: '#ece8de', roughness: 0.95, side: THREE.DoubleSide });
  const mRed = std({ color: '#a3140c', roughness: 0.6 });
  const mBlack = std({ color: '#0d0b0a', roughness: 0.7 });
  const mPorcelain = std({ color: '#e9ece8', roughness: 0.22 });
  const mDried = std({ color: '#4a3a26', roughness: 0.9 });

  buildWainscot(root, mWood, mWoodMid);
  buildFretwork(root);

  // ---------- 衣桁・紅嫁衣 (right wall, beside the desk) ----------
  {
    const g = place(root, 4.6, 0, -2.2, FACE_NEG_X);
    const k = new Kit();
    for (const s of [-1, 1]) {
      k.box(mWood, 0.06, 1.85, 0.06, s * 0.72, 0.925, 0);
      k.box(mWood, 0.1, 0.06, 0.42, s * 0.72, 0.03, 0);
      k.box(mWood, 0.1, 0.05, 0.05, s * 0.86, 1.86, 0, 0, 0, s * 0.35);
    }
    k.box(mWood, 1.62, 0.06, 0.06, 0, 1.82, 0);
    k.box(mWood, 1.44, 0.04, 0.04, 0, 0.98, 0);
    // the robe hangs from the bar with its sleeves spread
    // flattened so it reads as cloth hanging off the bar
    k.add(mRobe, new THREE.CylinderGeometry(0.24, 0.4, 1.25, 18, 1, true).scale(1, 1, 0.45), 0, 1.13, 0.04);
    k.box(mRobe, 1.3, 0.34, 0.06, 0, 1.62, 0.05);
    for (const s of [-1, 1]) k.box(mRobe, 0.26, 0.62, 0.06, s * 0.6, 1.2, 0.05, 0, 0, s * 0.06);
    k.box(mGold, 0.06, 0.95, 0.065, 0.02, 1.25, 0.1);
    k.box(mGold, 1.3, 0.03, 0.065, 0, 1.78, 0.06);
    for (const s of [-1, 1]) k.box(mGold, 0.26, 0.03, 0.065, s * 0.6, 0.9, 0.06);
    // phoenix crown resting on the bar
    k.cyl(mGold, 0.09, 0.11, 0.1, 0, 1.92, 0, 14);
    for (let i = 0; i < 5; i++) k.add(mRed, new THREE.SphereGeometry(0.018, 8, 6), (i - 2) * 0.04, 1.98, 0.06);
    k.build(g);
    const wet = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), std({ color: '#160606', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.75 }));
    wet.rotation.x = -Math.PI / 2;
    wet.position.set(0, 0.004, 0.12);
    wet.scale.set(1.5, 0.8, 1);
    g.add(wet);
    reg(g, 'dress', '紅嫁衣', null);
    R.dress = g;
  }

  // ---------- 紙厝 (paper house, right of the altar) ----------
  {
    const g = place(root, 4.52, 0, 2.6, FACE_NEG_X);
    const k = new Kit();
    const walls = std({ map: T.paperHouseTex(), roughness: 0.95 });
    const roof = std({ map: T.roofTex(), roughness: 0.8 });
    k.box(mWoodMid, 0.5, 0.04, 0.5, 0, 0.02, 0);
    k.box(walls, 0.42, 0.26, 0.42, 0, 0.17, 0);
    k.add(roof, new THREE.ConeGeometry(0.33, 0.12, 4, 1, true), 0, 0.36, 0, 0, Math.PI / 4, 0);
    k.box(walls, 0.32, 0.2, 0.32, 0, 0.5, 0);
    k.add(roof, new THREE.ConeGeometry(0.27, 0.16, 4), 0, 0.68, 0, 0, Math.PI / 4, 0);
    k.box(mGold, 0.03, 0.08, 0.03, 0, 0.8, 0);
    // two paper servants at the door
    for (const s of [-1, 1]) {
      k.cyl(mPaperWhite, 0.025, 0.035, 0.13, s * 0.12, 0.105, 0.27, 8);
      k.add(mPaperWhite, new THREE.SphereGeometry(0.025, 10, 8), s * 0.12, 0.19, 0.27);
    }
    k.build(g);
    reg(g, 'paperHouse', '紙厝', null);
  }

  // ---------- 花圈 ×2 flanking the altar ----------
  const flowers = std({ map: T.wreathTex(), roughness: 0.95 });
  for (const [z, torn] of [[-1.25, true], [1.98, false]]) {
    const g = place(root, 4.6, 0, z, FACE_NEG_X);
    const k = new Kit();
    for (const a of [0, 2.1, -2.1]) {
      k.cyl(mDried, 0.012, 0.012, 1.25, Math.sin(a) * 0.16, 0.6, Math.cos(a) * 0.16 - 0.06, 6, Math.cos(a) * 0.13, 0, -Math.sin(a) * 0.13);
    }
    k.add(flowers, new THREE.TorusGeometry(0.3, 0.075, 10, 32), 0, 1.18, 0);
    k.add(mPaperWhite, new THREE.CircleGeometry(0.2, 24), 0, 1.18, -0.01);
    k.build(g);
    const ribbonMat = (t) => std({ map: T.ribbonTex(t), roughness: 0.9, side: THREE.DoubleSide });
    const ribbons = torn ? ['千古'] : ['千古', '永懷'];
    ribbons.forEach((t, i) => {
      const rb = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.55), ribbonMat(t));
      rb.position.set((i ? 1 : -1) * 0.09, 0.82, 0.08);
      rb.rotation.z = (i ? -1 : 1) * 0.06;
      g.add(rb);
    });
    reg(g, 'wreath', '花圈', null);
  }

  // ---------- 輓聯 flanking the 奠 banner ----------
  for (const [z, text] of [[0.02, '德範長存'], [1.18, '音容宛在']]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 1.3), std({ map: T.coupletTex(text), roughness: 0.95, side: THREE.DoubleSide }));
    m.position.set(4.982, 2.0, z);
    m.rotation.y = -Math.PI / 2;
    root.add(m);
    reg(m, 'couplet', '輓聯', null);
  }

  // ---------- 火盆 (brazier, the room's new light) ----------
  {
    const g = place(root, 1.25, 0, -0.5);
    const k = new Kit();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      k.cyl(mBronze, 0.014, 0.018, 0.26, Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2, 8, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    }
    const bowl = [[0.0, 0.2], [0.2, 0.21], [0.29, 0.27], [0.32, 0.35], [0.3, 0.355]].map(([x, y]) => new THREE.Vector2(x, y));
    k.add(mBronze, new THREE.LatheGeometry(bowl, 24));
    k.add(std({ color: '#3a3430', roughness: 1 }), new THREE.CircleGeometry(0.28, 24), 0, 0.3, 0, -Math.PI / 2);
    const burnt = std({ color: '#2a2018', roughness: 1, side: THREE.DoubleSide });
    const rp = T.rng(12);
    for (let i = 0; i < 9; i++) k.add(burnt, new THREE.PlaneGeometry(0.09, 0.09), (rp() - 0.5) * 0.36, 0.31 + rp() * 0.03, (rp() - 0.5) * 0.36, -Math.PI / 2 + (rp() - 0.5) * 0.6, rp() * 3, 0);
    k.build(g);
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.75, 28), new THREE.MeshBasicMaterial({ map: T.shadowBlobTex(), transparent: true, depthWrite: false, opacity: 0.6 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 0.003;
    g.add(ash);
    const light = new THREE.PointLight('#ff7a30', 6, 6, 1.6);
    light.position.set(0, 0.65, 0);
    g.add(light);
    const emberMat = new THREE.SpriteMaterial({ map: T.glowTex('255,110,30'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const embers = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(emberMat.clone());
      s.userData = { a: rp() * 6.28, r: rp() * 0.22, ph: rp() * 6, rise: i >= 8 ? rp() : -1 };
      g.add(s);
      embers.push(s);
    }
    W.updaters.push((t, dt) => {
      const f = 1 + Math.sin(t * 8.3) * 0.12 + Math.sin(t * 19.7) * 0.08 + (Math.random() - 0.5) * 0.1;
      light.intensity = (R.brazierBase ?? 6) * f;
      for (const s of embers) {
        const u = s.userData;
        if (u.rise < 0) {
          s.position.set(Math.cos(u.a) * u.r, 0.32, Math.sin(u.a) * u.r);
          const sc = 0.07 + Math.sin(t * 3 + u.ph) * 0.02;
          s.scale.set(sc, sc, 1);
          s.material.opacity = 0.75 + Math.sin(t * 5 + u.ph) * 0.25;
        } else {
          // sparks drifting up from the coals
          u.rise += dt * 0.35;
          if (u.rise > 1) { u.rise = 0; u.a = Math.random() * 6.28; }
          s.position.set(Math.cos(u.a) * u.r * (1 - u.rise) + Math.sin(t + u.ph) * 0.05, 0.34 + u.rise * 1.1, Math.sin(u.a) * u.r * (1 - u.rise));
          s.scale.set(0.025, 0.025, 1);
          s.material.opacity = (1 - u.rise) * 0.9 * ((R.brazierBase ?? 6) > 0.5 ? 1 : 0);
        }
      }
    });
    reg(g, 'brazier', '火盆', null);
    R.brazierLight = light;
  }

  // ---------- 八仙桌・鼓凳・茶具 on the rug ----------
  {
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.2), std({ map: T.rugTex(), roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.6, 0.004, 0.4);
    rug.receiveShadow = true;
    root.add(rug);
    reg(rug, 'rug', '地毯', null);

    const g = place(root, -0.9, 0, 0.3, 0.12);
    const k = new Kit();
    k.box(mWood, 0.9, 0.05, 0.9, 0, 0.825, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(mWood, 0.06, 0.8, 0.06, sx * 0.41, 0.4, sz * 0.41);
    for (const [ax, az, w, d] of [[0, 0.41, 0.76, 0.02], [0, -0.41, 0.76, 0.02], [0.41, 0, 0.02, 0.76], [-0.41, 0, 0.02, 0.76]]) {
      k.box(mWood, w, 0.07, d, ax, 0.765, az);
      k.box(mWood, w, 0.03, d, ax, 0.18, az);
    }
    // curved spandrels at each leg
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      k.box(mWood, 0.12, 0.03, 0.02, sx * 0.33, 0.715, sz * 0.41, 0, 0, sx * 0.5);
      k.box(mWood, 0.02, 0.03, 0.12, sx * 0.41, 0.715, sz * 0.33, -sz * 0.5, 0, 0);
    }
    // tea set: a pot and three cups, one knocked over
    const clay = std({ color: '#5a2e22', roughness: 0.5 });
    k.add(clay, new THREE.SphereGeometry(0.07, 18, 12), -0.12, 0.9, 0.05);
    k.cyl(clay, 0.01, 0.018, 0.08, -0.04, 0.91, 0.05, 8, 0, 0, -0.9);
    k.add(clay, new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), -0.19, 0.9, 0.05, 0, 0, Math.PI / 2);
    for (const [x, z] of [[0.12, -0.12], [0.18, 0.1]]) k.cyl(mPorcelain, 0.03, 0.022, 0.04, x, 0.87, z, 14);
    k.cyl(mPorcelain, 0.03, 0.022, 0.04, -0.02, 0.87, 0.24, 14, Math.PI / 2, 0, 0.3);
    k.build(g);
    const spill = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), std({ color: '#2a1206', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }));
    spill.rotation.x = -Math.PI / 2;
    spill.scale.set(1.6, 1, 1);
    spill.position.set(0.02, 0.852, 0.32);
    g.add(spill);
    // drum stools
    const stoolPts = [[0, 0], [0.13, 0], [0.17, 0.12], [0.18, 0.24], [0.17, 0.36], [0.14, 0.46], [0, 0.46]].map(([x, y]) => new THREE.Vector2(x, y));
    for (const [x, z] of [[-0.9, -0.38], [-1.62, 0.36]]) {
      const sg = place(root, x, 0, z);
      const sk = new Kit();
      sk.add(mWood, new THREE.LatheGeometry(stoolPts, 18));
      for (const y of [0.08, 0.4]) sk.add(mBrass, new THREE.TorusGeometry(0.155 + (y > 0.2 ? -0.01 : 0), 0.008, 6, 24), 0, y, 0, Math.PI / 2);
      sk.build(sg);
      g.add(sg);
      sg.position.sub(g.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), -g.rotation.y);
    }
    reg(g, 'teaTable', '八仙桌', null);
  }

  // ---------- 紙箱 ×3: the packing you abandoned ----------
  {
    const g = place(root, 0, 0, 0);
    const k = new Kit();
    const books = std({ map: T.cardboardTex('書・爺爺'), roughness: 0.9 });
    const misc = std({ map: T.cardboardTex('雜物'), roughness: 0.9 });
    const plain = std({ map: T.cardboardTex(''), roughness: 0.9 });
    k.box(books, 0.5, 0.4, 0.4, -3.95, 0.2, 2.15, 0, 0.12, 0);
    k.box(misc, 0.45, 0.38, 0.38, -3.55, 0.19, 2.82, 0, -0.2, 0);
    k.box(plain, 0.36, 0.26, 0.3, -3.55, 0.51, 2.8, 0, 0.15, 0);
    // the open one, flaps folded out and books half packed
    const ox = -3.05, oz = 2.22, oh = 0.36;
    k.box(books, 0.5, 0.02, 0.4, ox, 0.01, oz);
    for (const s of [-1, 1]) {
      k.box(plain, 0.5, oh, 0.012, ox, oh / 2, oz + s * 0.2);
      k.box(plain, 0.012, oh, 0.4, ox + s * 0.25, oh / 2, oz);
      k.box(plain, 0.5, 0.012, 0.2, ox, oh + 0.06, oz + s * 0.29, s * 0.9, 0, 0);
    }
    const atlas = std({ color: '#3a4a3a', roughness: 0.8 });
    const atlas2 = std({ color: '#6a2a1c', roughness: 0.8 });
    for (let i = 0; i < 6; i++) k.box(i % 2 ? atlas : atlas2, 0.06, 0.28, 0.2, ox - 0.18 + i * 0.065, 0.16, oz - 0.05, 0, 0, i === 5 ? 0.3 : 0);
    k.box(atlas2, 0.2, 0.05, 0.28, ox + 0.45, 0.025, oz - 0.1, 0, 0.5, 0);
    // a roll of packing tape on top of the stack
    k.add(std({ color: '#d9c79a', roughness: 0.4 }), new THREE.TorusGeometry(0.05, 0.02, 8, 18), -3.95, 0.42, 2.15, Math.PI / 2);
    k.build(g);
    reg(g, 'boxes', '紙箱', null);
  }

  // ---------- 條案・掛鐘 (front wall, left of the vanished door) ----------
  {
    const g = place(root, -1.9, 0, 3.78, FACE_NEG_Z);
    const k = new Kit();
    k.box(mWood, 1.4, 0.05, 0.36, 0, 0.83, 0);
    for (const s of [-1, 1]) {
      k.box(mWood, 0.05, 0.8, 0.05, s * 0.6, 0.4, 0.13);
      k.box(mWood, 0.05, 0.8, 0.05, s * 0.6, 0.4, -0.13);
      k.box(mWood, 0.12, 0.05, 0.36, s * 0.72, 0.87, 0, 0, 0, s * 0.35);
      k.box(mWood, 0.03, 0.06, 0.28, s * 0.6, 0.12, 0);
    }
    k.box(mWood, 1.14, 0.07, 0.02, 0, 0.77, 0.17);
    // a picture frame lying face down, an incense box, a candle stub
    k.box(mBlack, 0.2, 0.015, 0.26, -0.3, 0.862, 0.02, 0, 0.3, 0);
    k.box(mRed, 0.16, 0.06, 0.1, 0.25, 0.885, -0.05);
    k.cyl(mBrass, 0.03, 0.04, 0.03, 0.45, 0.87, 0.05, 12);
    k.cyl(std({ color: '#e6e0d0', roughness: 0.7 }), 0.018, 0.018, 0.06, 0.45, 0.91, 0.05, 10);
    k.build(g);
    reg(g, 'sideTable', '條案', null);

    const cg = place(root, -1.9, 2.05, 3.94, FACE_NEG_Z);
    const ck = new Kit();
    ck.box(mWood, 0.34, 0.66, 0.1, 0, 0, 0);
    ck.add(mWood, new THREE.CylinderGeometry(0.17, 0.17, 0.1, 24, 1, false, 0, Math.PI), 0, 0.33, 0, Math.PI / 2, 0, Math.PI / 2);
    ck.box(std({ color: '#2a1a10', roughness: 0.3 }), 0.22, 0.26, 0.012, 0, -0.16, 0.05);
    ck.box(mBrass, 0.012, 0.18, 0.012, 0, -0.14, 0.058);
    ck.cyl(mBrass, 0.035, 0.035, 0.01, 0, -0.24, 0.058, 16, Math.PI / 2);
    ck.build(cg);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), std({ map: T.clockTex(), roughness: 0.4 }));
    face.position.set(0, 0.15, 0.052);
    cg.add(face);
    reg(cg, 'clock', '掛鐘', null);
  }

  // ---------- 樟木箱 ×2 (front wall, right) ----------
  {
    const g = place(root, 1.8, 0, 3.72, FACE_NEG_Z);
    const k = new Kit();
    k.box(mCamphor, 0.8, 0.42, 0.42, 0, 0.21, 0);
    k.box(mCamphor, 0.68, 0.34, 0.36, 0.04, 0.59, 0.02, 0, 0.06, 0);
    for (const [y, w, h] of [[0.21, 0.8, 0.42], [0.59, 0.68, 0.34]]) {
      for (const sx of [-1, 1]) k.box(mBrass, 0.05, h * 0.25, 0.012, sx * (w / 2 - 0.03), y + h * 0.35, 0.215);
      k.box(mBrass, 0.07, 0.09, 0.015, 0, y + h * 0.3, 0.215);
    }
    k.build(g);
    reg(g, 'chests', '樟木箱', null);
  }

  // ---------- 屏風 (three-panel screen, front-left corner) ----------
  {
    const g = place(root, -4.3, 0, 3.35, (3 * Math.PI) / 4);
    for (let i = -1; i <= 1; i++) {
      const p = new THREE.Group();
      p.position.set(i * 0.5, 0, i === 0 ? 0 : -0.08);
      p.rotation.y = i * 0.35;
      g.add(p);
      const k = new Kit();
      k.box(mWood, 0.5, 0.04, 0.04, 0, 1.62, 0);
      k.box(mWood, 0.5, 0.04, 0.04, 0, 0.18, 0);
      k.box(mWood, 0.5, 0.03, 0.04, 0, 0.42, 0);
      for (const s of [-1, 1]) k.box(mWood, 0.04, 1.64, 0.04, s * 0.23, 0.82, 0);
      k.box(mWood, 0.2, 0.05, 0.12, 0, 0.025, 0);
      k.build(p);
      const silk = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.18), std({ map: T.screenTex('p' + i), roughness: 0.9, side: THREE.DoubleSide }));
      silk.position.set(0, 1.02, 0);
      silk.castShadow = true;
      p.add(silk);
    }
    reg(g, 'screen', '屏風', null);
  }

  // ---------- 宮燈 ×2 (unlit, hanging) ----------
  R.palaceLanterns = [];
  const panel = std({ map: T.lanternPanelTex(), roughness: 0.9, side: THREE.DoubleSide, emissive: '#120a04' });
  for (const [x, z] of [[-2.6, -0.3], [2.4, 1.65]]) {
    const g = place(root, x, 2.72, z);
    const k = new Kit();
    k.add(panel, new THREE.CylinderGeometry(0.17, 0.17, 0.38, 6, 1, true), 0, 0, 0);
    k.cyl(mWood, 0.21, 0.2, 0.05, 0, 0.215, 0, 6);
    k.cyl(mWood, 0.2, 0.21, 0.05, 0, -0.215, 0, 6);
    k.cyl(mWood, 0.05, 0.1, 0.08, 0, 0.28, 0, 6);
    k.cyl(mWood, 0.06, 0.02, 0.08, 0, -0.28, 0, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.box(mWood, 0.02, 0.4, 0.02, Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17);
      k.cyl(mRed, 0.006, 0.012, 0.26, Math.cos(a) * 0.2, -0.36, Math.sin(a) * 0.2, 6);
    }
    k.cyl(mRed, 0.01, 0.025, 0.3, 0, -0.45, 0, 8);
    k.cyl(mBlack, 0.006, 0.006, 3.6 - 2.72 - 0.3, 0, 0.3 + (3.6 - 2.72 - 0.3) / 2, 0, 6);
    k.build(g, { cast: false });
    reg(g, 'palaceLantern', '宮燈', null);
    R.palaceLanterns.push(g);
  }
  W.updaters.push((t) => {
    R.palaceLanterns.forEach((g, i) => { g.rotation.z = Math.sin(t * 0.5 + i * 2) * 0.025; g.rotation.y = Math.sin(t * 0.21 + i) * 0.08; });
  });

  // ---------- 花几・枯蘭 (back-right corner) ----------
  {
    const g = place(root, 4.6, 0, -3.55);
    const k = new Kit();
    k.box(mWood, 0.36, 0.03, 0.36, 0, 1.0, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(mWood, 0.035, 1.0, 0.035, sx * 0.15, 0.5, sz * 0.15);
    k.box(mWood, 0.32, 0.02, 0.32, 0, 0.25, 0);
    k.cyl(mPorcelain, 0.1, 0.075, 0.13, 0, 1.08, 0, 18);
    k.add(std({ color: '#2a1e14', roughness: 1 }), new THREE.CircleGeometry(0.09, 16), 0, 1.14, 0, -Math.PI / 2);
    const rl = T.rng(44);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      // withered leaves, all bending toward the moon gate (−x)
      const lean = 0.9 + rl() * 0.5;
      k.box(mDried, 0.016, 0.38, 0.004, Math.cos(a) * 0.03 - 0.1, 1.28, Math.sin(a) * 0.04, Math.sin(a) * 0.3, 0, lean);
    }
    k.build(g);
    reg(g, 'plantStand', '花几', null);
  }

  // ---------- 落地大瓶・枯枝 (back wall, left of the gate) ----------
  {
    const g = place(root, -3.6, 0, -3.62);
    const k = new Kit();
    const pts = [[0, 0], [0.12, 0], [0.17, 0.12], [0.18, 0.3], [0.13, 0.5], [0.08, 0.58], [0.09, 0.65], [0.07, 0.65]].map(([x, y]) => new THREE.Vector2(x, y));
    k.add(std({ map: T.vaseTex(), roughness: 0.25 }), new THREE.LatheGeometry(pts, 26));
    const rb = T.rng(8);
    for (let i = 0; i < 6; i++) {
      const a = rb() * Math.PI * 2, tilt = 0.25 + rb() * 0.35, len = 0.7 + rb() * 0.5;
      k.cyl(mDried, 0.006, 0.012, len, Math.cos(a) * Math.sin(tilt) * len / 2, 0.6 + Math.cos(tilt) * len / 2, Math.sin(a) * Math.sin(tilt) * len / 2, 5, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    }
    k.add(mRed, new THREE.TorusGeometry(0.02, 0.006, 6, 12), 0.08, 1.05, 0.02);
    k.build(g);
    reg(g, 'floorVase', '落地大瓶', null);
  }

  buildAtmosphere(W);
}

// ======================================================================
// Wainscot: framed dark panels along the lower walls, merged into two meshes.
function buildWainscot(root, mFrame, mPanel) {
  const k = new Kit();
  const H = 0.95;
  // [axis, fixed, from, to] — runs along the walls where furniture leaves the wall bare
  const runs = [
    ['z', -3.985, -4.75, -2.95], ['z', -3.985, -0.25, 1.4], ['z', -3.985, 4.4, 4.75],
    ['z', 3.985, -4.75, -0.66], ['z', 3.985, 0.66, 4.75],
    ['x', 4.985, -3.75, 3.75],
    ['x', -4.985, 2.82, 3.75],
  ];
  for (const [axis, fixed, a, b] of runs) {
    const len = b - a, mid = (a + b) / 2;
    const inward = fixed > 0 ? -1 : 1;
    const put = (mat, along, w, h, d, y, off) => {
      if (axis === 'z') k.box(mat, w, h, d, along, y, fixed + inward * off);
      else k.box(mat, d, h, w, fixed + inward * off, y, along);
    };
    put(mPanel, mid, len, H, 0.02, H / 2, 0.01);
    put(mFrame, mid, len, 0.06, 0.05, H, 0.025);
    put(mFrame, mid, len, 0.05, 0.035, 0.17, 0.02);
    const n = Math.max(1, Math.round(len / 0.6));
    for (let i = 0; i <= n; i++) put(mFrame, a + (len * i) / n, 0.05, H - 0.1, 0.035, (H + 0.1) / 2, 0.02);
  }
  k.build(root, { cast: false });
}

// 掛落: step-pattern fretwork hanging under the cross beam, framing the back half of the room.
function buildFretwork(root) {
  const t = new THREE.CanvasTexture(T.fretTex());
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(10, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.34), std({ map: t, color: '#4a2a16', alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }));
  m.position.set(0, 3.1, -1.5);
  root.add(m);
}

// Light shafts, dust, cobwebs and joss paper strewn on the floor.
function buildAtmosphere(W) {
  const root = W.root;
  const R = W.refs;
  const air = new THREE.Group();
  air.userData.noray = true;
  root.add(air);

  // a slab of moonlight from the window, fading toward the floor
  const dir = new THREE.Vector3(-2.9, -6.5, 12.6).normalize();
  const shaft = (corners, endY, color, strength) => {
    const pos = [], col = [];
    const ends = corners.map((c) => c.clone().addScaledVector(dir, (c.y - endY) / -dir.y));
    const c0 = new THREE.Color(color).multiplyScalar(strength);
    const quad = (a, b, c, d, ca, cb, cc, cd) => {
      pos.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
      for (const k of [ca, cb, cc, ca, cc, cd]) col.push(k.r, k.g, k.b);
    };
    const black = new THREE.Color(0, 0, 0);
    for (let i = 0; i < corners.length; i++) {
      const j = (i + 1) % corners.length;
      quad(corners[i], corners[j], ends[j], ends[i], c0, c0, black, black);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    air.add(m);
    return m;
  };
  const z = -3.98;
  R.shafts = [
    shaft([new THREE.Vector3(WIN.x0 + 0.1, WIN.y1, z), new THREE.Vector3(WIN.x1 - 0.1, WIN.y1, z), new THREE.Vector3(WIN.x1 - 0.1, WIN.y0 + 0.05, z), new THREE.Vector3(WIN.x0 + 0.1, WIN.y0 + 0.05, z)], 0.85, '#7d8fd0', 0.055),
    shaft(Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return new THREE.Vector3(GATE.x + Math.cos(a) * (GATE.r - 0.05), GATE.y + Math.sin(a) * (GATE.r - 0.05), z);
    }), 0.6, '#7d8fd0', 0.03),
  ];

  // drifting dust
  const N = 420;
  const dpos = new Float32Array(N * 3);
  const seeds = [];
  const rd = T.rng(71);
  for (let i = 0; i < N; i++) {
    const inShaft = i < 260;
    const p = inShaft
      ? new THREE.Vector3(WIN.x0 + rd() * (WIN.x1 - WIN.x0), 0.9 + rd() * 1.9, -3.9 + rd() * 3.2)
      : new THREE.Vector3(-4.5 + rd() * 9, 0.3 + rd() * 2.8, -3.8 + rd() * 7.4);
    if (inShaft) p.x -= (p.z + 3.9) * 0.23;
    seeds.push({ base: p, ph: rd() * 6.28, sp: 0.2 + rd() * 0.5 });
    dpos.set(p.toArray(), i * 3);
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ map: T.glowTex('220,225,255'), size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: '#c8d0ff' }));
  air.add(dust);
  W.updaters.push((t) => {
    for (let i = 0; i < N; i++) {
      const s = seeds[i], b = s.base;
      dpos[i * 3] = b.x + Math.sin(t * 0.11 * s.sp + s.ph) * 0.25;
      dpos[i * 3 + 1] = b.y + Math.sin(t * 0.07 * s.sp + s.ph * 2) * 0.18;
      dpos[i * 3 + 2] = b.z + Math.cos(t * 0.09 * s.sp + s.ph) * 0.25;
    }
    dgeo.attributes.position.needsUpdate = true;
  });

  // cobwebs in the upper corners
  const webMat = new THREE.MeshBasicMaterial({ map: T.cobwebTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.45, color: '#cfcfc8' });
  // the fan texture spreads from its top-left corner; lay it flat so it fans over +x/+z,
  // let the far edge sag, then turn it to face into the room from each corner
  const webGeo = new THREE.PlaneGeometry(0.9, 0.9).translate(0.45, -0.45, 0);
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const sag = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, -1).normalize(), 0.55);
  for (const [x, zc, ry] of [[-4.76, -3.76, 0], [-4.76, 3.76, Math.PI / 2], [4.76, 3.76, Math.PI], [4.76, -3.76, -Math.PI / 2]]) {
    const web = new THREE.Mesh(webGeo, webMat);
    web.position.set(x, 3.56, zc);
    web.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry).multiply(sag).multiply(flat);
    air.add(web);
  }

  // joss paper blown across the floor
  const jossMat = new THREE.MeshStandardMaterial({ map: T.joss(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1, color: '#b8ad90' });
  const spots = [[1.25, -0.5, 1.2, 70], [4.0, 0.6, 0.9, 30], [-1.6, -3.0, 1.0, 26], [0.2, 2.6, 1.4, 18]];
  const count = spots.reduce((a, s) => a + s[3], 0);
  const floorJoss = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.085, 0.085), jossMat, count);
  const dm = new THREE.Object3D();
  const rj = T.rng(17);
  let n = 0;
  for (const [cx, cz, rad, c] of spots) {
    for (let i = 0; i < c; i++) {
      const a = rj() * Math.PI * 2, d = Math.sqrt(rj()) * rad;
      dm.position.set(cx + Math.cos(a) * d, 0.006 + rj() * 0.004, cz + Math.sin(a) * d);
      dm.rotation.set(-Math.PI / 2 + (rj() - 0.5) * 0.15, 0, rj() * Math.PI * 2);
      dm.updateMatrix();
      floorJoss.setMatrixAt(n++, dm.matrix);
    }
  }
  floorJoss.receiveShadow = true;
  air.add(floorJoss);
}
