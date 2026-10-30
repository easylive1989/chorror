import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld } from './world.js';
import { Rig } from './camera.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// the moonlight only falls on furniture that barely moves, so refresh its shadow map every few frames
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050506');
scene.fog = new THREE.FogExp2('#07080b', 0.035);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.03, 60);
// portrait screens get a taller FOV so the horizontal view isn't a slit
const fitFov = () => { camera.fov = camera.aspect < 1 ? 80 : 58; };
fitFov();
const rig = new Rig(camera);

const PostShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.25 }, uGrain: { value: 0.045 },
    uRed: { value: 0 }, uAberr: { value: 0.002 }, uDesat: { value: 0.25 }, uDark: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uRed, uAberr, uDesat, uDark;
    varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 dir = vUv - 0.5; float d = length(dir);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + dir * uAberr * (1.0 + d * 8.0)).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - dir * uAberr * (1.0 + d * 8.0)).b;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(l), uDesat);
      col = mix(col, vec3(l * 1.4, l * 0.18, l * 0.14) + vec3(0.03, 0.0, 0.0), uRed);
      float vig = smoothstep(0.95, 0.15, d * (1.0 + uVignette));
      col *= mix(0.3, 1.0, vig);
      col *= 1.0 - uDark;
      col += (rand(vUv * 731.0 + fract(uTime)) - 0.5) * uGrain;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
composer.addPass(new RenderPass(scene, camera));
const post = new ShaderPass(PostShader);
composer.addPass(post);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  fitFov();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

const FONT_TEXT = '上善若水還我名字奠敕令鎮守仁手記陳氏族譜之靈位秋繡囍火柴搜神記聊齋誌異子不語夜雨秋燈錄民國五十三年春攝於書齋博古架前阿繡十六歲東西要放回原來的地方論語孟子大學中庸詩經尚書禮記周易春秋左傳史記漢書後三國志資治通鑑楚辭文選古觀止唐百首宋詞元曲紅樓夢水滸傳西遊演義儒林外封神牡丹亭廂長生殿桃花扇山海黃帝內本草綱目天工開物溪筆談世說新太平廣酉陽雜俎閱微堂剪燈話洛伽藍注解字爾千家姓幼學瓊增賢菜根譚人間老莊荀韓非墨孫兵法習錄近思浮六容隨東京華明陶庵憶';

async function loadFonts() {
  const fams = ['"LXGW WenKai TC"', '"Noto Serif TC"'];
  const jobs = [];
  for (const f of fams) for (const w of [400, 700]) jobs.push(document.fonts.load(`${w} 40px ${f}`, FONT_TEXT));
  await Promise.race([Promise.all(jobs).catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
}

export const ctx = { renderer, scene, camera, rig, composer, post, world: null };

await loadFonts();
ctx.world = buildWorld(scene);
if (ctx.world.refs.mirror) ctx.world.refs.mirror.getReflectionCamera(camera).layers.enable(1);

const { Game, ui, sound } = await import('./game.js');
let game = new Game(ctx);

const clock = new THREE.Clock();
let frame = 0;
renderer.setAnimationLoop(() => {
  if (frame++ % 4 === 0) renderer.shadowMap.needsUpdate = true;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  for (const u of ctx.world.updaters) u(t, dt);
  game.update(dt, t);
  rig.update(dt, t);
  post.uniforms.uTime.value = t;
  composer.render();
});

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isReflector && o.dispose) o.dispose();
  });
}

ctx.restart = () => {
  game.dispose();
  scene.remove(ctx.world.root);
  disposeTree(ctx.world.root);
  ctx.world = buildWorld(scene);
  ctx.world.refs.mirror.getReflectionCamera(camera).layers.enable(1);
  scene.fog.color.set('#07080b');
  sound.resumeRain();
  game = new Game(ctx);
  if (import.meta.env.DEV) window.__game = game;
  game.begin(true);
};

const startBtn = document.getElementById('btn-start');
startBtn.disabled = false;
startBtn.textContent = '點香';
startBtn.addEventListener('click', () => {
  sound.init();
  sound.ambience();
  document.getElementById('title').classList.add('out');
  setTimeout(() => document.getElementById('title').classList.add('hidden'), 1500);
  game.begin(false);
}, { once: true });

document.getElementById('btn-restart').addEventListener('click', () => {
  ui.hideEnding();
  ctx.restart();
});

if (import.meta.env.DEV) {
  window.__ctx = ctx;
  window.__game = game;
  window.__solve = () => window.__game.debugSolve();
  window.__fail = () => { window.__game.s.elapsed = 25 * 60; };
  // debug: jump straight to a view without the intro
  window.__peek = (name) => {
    document.getElementById('title').classList.add('hidden');
    ui.showHUD(true);
    const g = window.__game;
    const v = name === 'mirror' ? g.mirrorView() : name === 'effigy' ? g.effigyView() : g.constructor.VIEWS[name];
    g.view = name;
    g.updateBack();
    rig.set(v.pos, v.look);
    return name;
  };
}
