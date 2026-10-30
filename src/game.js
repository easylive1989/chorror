import * as THREE from 'three';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { setLayer, GATE, CURIO_ANSWER, CURIO_CELLS, CURIO_START, CURIO_NAMES, SPECIAL_BOOKS } from './world.js';
import * as T from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const ui = new UI();
export const sound = new Sound();

const DURATION = 25 * 60;
const HINT_COST = 60;
const NAME = '陳秋繡';

const ITEMS = {
  matches: { name: '火柴盒', desc: '受潮的火柴，大概還點得著幾根。', icon: 'matches' },
  photo: { name: '老照片', desc: '一張泛黃的照片，拍的是博古架。', icon: 'photo', inspect: true },
  tablet: { name: '無字牌位', desc: '一塊沒有寫字的牌位，冰冷得不像木頭。', icon: 'tablet' },
  shoe: { name: '紅繡花鞋', desc: '只有一隻。鞋是濕的。', icon: 'shoe', inspect: true },
  brush: { name: '毛筆', desc: '筆尖乾得發硬。', icon: 'brush' },
  brushRed: { name: '紅墨毛筆', desc: '蘸飽了暗紅色的墨，聞起來有鐵鏽味。', icon: 'brushRed' },
};

const VIEWS = {
  center: { pos: V(0, 1.6, 1.9), look: V(0, 1.35, -4) },
  bookshelf: { pos: V(-2.45, 1.62, 0.8), look: V(-5, 1.5, 0.8) },
  curio: { pos: V(-2.65, 1.55, -2.65), look: V(-5, 1.5, -2.65) },
  desk: { pos: V(2.7, 1.72, -1.45), look: V(2.75, 0.85, -3.45) },
  altar: { pos: V(2.55, 1.6, 0.6), look: V(5, 1.2, 0.6) },
  gate: { pos: V(-1.6, 1.5, -1.0), look: V(-1.6, 1.3, -4) },
  drawer: { pos: V(2.9, 1.3, -2.1), look: V(2.9, 0.68, -2.95) },
  radio: { pos: V(0.3, 1.35, -2.5), look: V(0.3, 0.84, -3.55) },
  window: { pos: V(2.9, 1.78, -2.0), look: V(2.9, 1.95, -4.5) },
  frontwall: { pos: V(0, 1.6, 1.5), look: V(0, 1.3, 4) },
  ritual: { pos: V(1.9, 1.6, 0.15), look: V(4.6, 1.15, 0.85) },
};
const FOCUS = new Set(['mirror', 'effigy', 'window', 'radio']);

const BRANCHES = [
  ['子', '23–1時'], ['丑', '1–3時'], ['寅', '3–5時'], ['卯', '5–7時'], ['辰', '7–9時'], ['巳', '9–11時'],
  ['午', '11–13時'], ['未', '13–15時'], ['申', '15–17時'], ['酉', '17–19時'], ['戌', '19–21時'], ['亥', '21–23時'],
];
const LOCK_ANSWER = [9, 11, 0]; // 酉 去時・亥 尋時・子 歸時

const DIARY = [
  { cover: true },
  { date: '民國五十三年　七月初九', text: '林家今日來下聘。爹收了。\n阿繡在房裡哭了一整夜——\n林家那位少爺，去年冬天就病死了。' },
  { date: '七月十二', text: '阿繡說，她寧可跳進湖裡，\n也不要抱著一塊牌位拜堂。\n娘打了她一巴掌。\n我什麼都沒說。' },
  { date: '七月十五　中元', text: '<span class="red">酉時</span>，阿繡穿著那雙紅繡鞋出了門。\n我們找了一整夜。\n<span class="red">亥時</span>，才在湖邊找到一隻鞋。' },
  { date: '七月二十', text: '爹把她的名字從族譜上塗掉了。\n他說，沒出嫁的女兒死了，\n不能進祠堂，也不配有名字。' },
  { date: '民國五十四年　七月十五', text: '<span class="red">子時</span>一到，書齋的門就不見了。\n我聽見她在書架那邊，\n一本一本地翻書。\n她問我：\n「哥，我叫什麼名字？」' },
  { date: '（字跡越來越潦草）', text: '五十多年了。\n每年這一夜，我替她點一炷香。\n只要香燒完以前天亮，\n就沒事。' },
  { date: '（最後一頁，墨跡未乾）', text: '我老了，香快點不起了。\n若有後人讀到這裡——\n別讓香燒完。\n把她的名字還給她。\n把她的鞋還給她。\n\n　　　　　　　　陳守仁', shaky: true },
];

const RADIO = [
  '⋯⋯沙⋯⋯本台消息⋯⋯昨夜湖畔尋獲紅色繡花鞋一隻⋯⋯陳姓少女⋯⋯至今下落不明⋯⋯',
  '⋯⋯一拜天地⋯⋯二拜高堂⋯⋯夫妻⋯⋯對拜⋯⋯送入⋯⋯洞房⋯⋯',
  '⋯⋯秋繡——秋繡——回家吃飯了——⋯⋯',
  '⋯⋯哥⋯⋯我叫什麼名字⋯⋯',
];

const EFFIGY_LINES = [
  '一尊紙紮新娘。冥婚用的紙人，怎麼會放在書齋裡？',
  '她臉上的胭脂，畫得像剛哭過。',
  '紙人的眼睛沒有眼白。你總覺得她在看你。',
  '別盯著她太久。',
];
const EFFIGY_SPOTS = [V(4.15, 0, 3.15), V(3.85, 0, 1.9), V(-2.9, 0, 3.25), V(-1.0, 0, 3.0), V(0.15, 0, 3.05)];

const NAME_CHARS = ['陳', '林', '秋', '春', '繡', '秀', '阿', '守', '月', '仁', '紅', '王'];

export class Game {
  static VIEWS = VIEWS;

  constructor(ctx) {
    this.ctx = ctx;
    this.W = ctx.world;
    this.R = ctx.world.refs;
    this.rig = ctx.rig;
    this.camera = ctx.camera;
    this.ac = new AbortController();
    this.s = {
      running: false, elapsed: 0, penalty: 0, hints: 0,
      inv: [], sel: null, newId: null,
      diaryRead: false, drawerOpen: false, dials: [0, 0, 0],
      lampLit: false, mirrorSeen: false, handsRevealed: false,
      pulled: {}, bookCabOpen: false,
      curio: { ...CURIO_START }, curioSolved: false,
      brushRed: false, tabletPlaced: false, nameWritten: false, shoePlaced: false,
      ritualDone: false, gateOpen: false, ended: false,
      radioOn: false, radioIdx: 0, effigyStage: 0, effigyLine: 0, effigyMovedSinceLook: false,
      redPhase: false, knocked: false, lowWarned: false, wrongNames: 0,
      nextAmbient: 70,
    };
    this.busy = false;
    this.view = 'center';
    this.picked = null;
    this.ray = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.frustum = new THREE.Frustum();
    this.lastHover = 0;
    this.lastHint = -10;

    const { post, scene } = ctx;
    Object.assign(post.uniforms, {});
    post.uniforms.uRed.value = 0;
    post.uniforms.uAberr.value = 0.002;
    post.uniforms.uDark.value = 0;
    post.uniforms.uVignette.value = 0.25;
    scene.fog.density = 0.035;
    this.R.lampBase = 22;
    this.R.altarBase = 10;
    this.R.lanternBase = 5;

    this.rig.set(VIEWS.frontwall.pos, VIEWS.frontwall.look);
    this.bindInput();
    this.renderInv();
    ui.setIncense(1, '', false);
  }

  // ======================= lifecycle =======================
  async begin(restart = false) {
    ui.showHUD(false);
    this.rig.set(VIEWS.frontwall.pos, VIEWS.frontwall.look);
    if (restart) {
      await ui.story(['你又站在了書齋裡。', '供桌上的香，<span class="red">重新點著了</span>。'], { hold: 1900 });
    } else {
      await ui.story([
        '民國一一五年，農曆七月十四。',
        '祖父走了。老宅要賣，你回來整理他的書齋。',
        '推開門的那一刻，供桌上的香，<span class="red">自己點著了</span>。',
      ]);
    }
    if (this.disposed) return;
    sound.knock(1, 0);
    this.busy = true;
    await ui.msg('身後「喀」的一聲。你回過頭——', 2600);
    await ui.msg('門⋯⋯不見了。牆上只剩下指甲刮過的痕跡。', 3200);
    sound.whisper(2.2, 0.4);
    await this.rig.goTo(VIEWS.center.pos, VIEWS.center.look, 2.6);
    this.view = 'center';
    ui.showHUD(true);
    this.busy = false;
    this.s.running = true;
    ui.msg('在<em>香燒盡</em>之前，離開這裡。', 4200);
  }

  dispose() {
    this.disposed = true;
    this.ac.abort();
    sound.heartbeat(false);
    sound.radio(false);
    ui.closeModal();
    ui.setTooltip(null);
    ui.setUsing(null);
  }

  get left() { return DURATION - this.s.elapsed - this.s.penalty; }

  // ======================= input =======================
  bindInput() {
    const el = this.ctx.renderer.domElement;
    const sig = { signal: this.ac.signal };
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0 };
      el.setPointerCapture(e.pointerId);
    }, sig);
    el.addEventListener('pointermove', (e) => {
      this.mx = e.clientX; this.my = e.clientY;
      if (down) {
        const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
        down.lx = e.clientX; down.ly = e.clientY;
        down.moved += Math.abs(dx) + Math.abs(dy);
        if (down.moved > 6) {
          el.classList.add('dragging');
          this.rig.look(dx * 0.0042, dy * 0.0042);
          ui.setTooltip(null);
        }
      }
      if (this.s.sel) ui.setUsing('使用：' + ITEMS[this.s.sel].name, e.clientX, e.clientY);
    }, sig);
    el.addEventListener('pointerup', (e) => {
      if (down && down.moved <= 6) this.click(e.clientX, e.clientY);
      down = null;
      el.classList.remove('dragging');
    }, sig);
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.select(null); }, sig);

    document.getElementById('btn-hint').addEventListener('click', () => this.hint(), sig);
    const sb = document.getElementById('btn-sound');
    sb.classList.toggle('off', sound.muted);
    sb.addEventListener('click', () => { sound.setMuted(!sound.muted); sb.classList.toggle('off', sound.muted); }, sig);
    document.getElementById('btn-inspect').addEventListener('click', () => this.inspect(this.s.sel), sig);
    addEventListener('keydown', (e) => {
      if (ui.modalOpen) return;
      if (e.key === 'Escape') this.select(null);
    }, sig);
  }

  pick(x, y) {
    this.mouse.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
    const hits = this.ray.intersectObjects(this.W.rayTargets, false);
    for (const h of hits) {
      let o = h.object, vis = true;
      for (let p = o; p; p = p.parent) if (!p.visible) { vis = false; break; }
      if (!vis) continue;
      while (o && !o.userData.id) o = o.parent;
      return o ? { obj: o, id: o.userData.id, dist: h.distance } : null;
    }
    return null;
  }

  labelFor(hit) {
    if (hit.id.startsWith('book:') && !this.s.handsRevealed) return '書架';
    return hit.obj.userData.label;
  }

  hover() {
    if (this.mx == null || this.busy || ui.modalOpen || this.rig.moving) { ui.setTooltip(null); return; }
    const hit = this.pick(this.mx, this.my);
    const el = this.ctx.renderer.domElement;
    el.classList.toggle('pointer', !!hit);
    ui.setTooltip(hit ? this.labelFor(hit) : null, this.mx, this.my);
  }

  async click(x, y) {
    if (this.busy || ui.modalOpen || this.rig.moving || !this.s.running && !this.s.ritualDone) return;
    const hit = this.pick(x, y);
    if (!hit) { if (this.s.sel) this.select(null); return; }
    const st = hit.obj.userData.station;
    if (FOCUS.has(st)) {
      if (this.view !== st) await this.go(st);
    } else if (st && this.view !== st && hit.dist > 2.6) {
      await this.go(st);
      return;
    }
    if (this.s.sel) this.useItem(this.s.sel, hit.id, hit.obj);
    else this.interact(hit.id, hit.obj);
  }

  async go(name) {
    if (this.busy || ui.modalOpen) return;
    let v = VIEWS[name];
    if (name === 'mirror') v = this.mirrorView();
    if (name === 'effigy') v = this.effigyView();
    if (!v) return;
    this.view = name;
    this.dropPicked();
    await this.rig.goTo(v.pos, v.look, 1.1);
    if (name === 'effigy') this.s.effigyMovedSinceLook = false;
  }

  mirrorView() {
    const { mirrorPos: m, mirrorNormal: n } = this.R;
    return { pos: m.clone().addScaledVector(n, 0.46).add(V(0, -0.08, 0)), look: m.clone() };
  }

  effigyView() {
    const e = this.R.effigy.position;
    const dir = V(0, 0, 1.2).sub(e).setY(0).normalize();
    return { pos: e.clone().addScaledVector(dir, 1.5).setY(1.5), look: e.clone().setY(1.2) };
  }

  // ======================= inventory =======================
  renderInv() {
    ui.renderInventory(this.s.inv, this.s.sel, ITEMS, (id) => this.slotClick(id), this.s.newId);
  }

  slotClick(id) {
    if (this.busy) return;
    const now = performance.now();
    if (this.lastSlot === id && now - this.lastSlotT < 350 && ITEMS[id].inspect) { this.inspect(id); return; }
    this.lastSlot = id; this.lastSlotT = now;
    this.select(this.s.sel === id ? null : id);
    if (this.s.sel) ui.msg(`${ITEMS[id].name}：${ITEMS[id].desc}`, 3000);
  }

  select(id) {
    this.s.sel = id;
    this.s.newId = null;
    this.renderInv();
    if (!id) ui.setUsing(null);
    else if (this.mx != null) ui.setUsing('使用：' + ITEMS[id].name, this.mx, this.my);
  }

  has(id) { return this.s.inv.includes(id); }

  give(id, quiet = false) {
    if (this.has(id)) return;
    this.s.inv.push(id);
    this.s.newId = id;
    this.renderInv();
    sound.woodblock();
    if (!quiet) ui.msg(`獲得「<em>${ITEMS[id].name}</em>」。${ITEMS[id].desc}`, 4200);
  }

  remove(id) {
    this.s.inv = this.s.inv.filter((x) => x !== id);
    if (this.s.sel === id) this.select(null);
    else this.renderInv();
  }

  inspect(id) {
    if (id === 'photo') this.openPhoto();
    if (id === 'shoe') this.openShoe();
  }

  // ======================= interactions =======================
  interact(id, obj) {
    const s = this.s, R = this.R;
    if (id.startsWith('book:')) return this.bookAction(id.slice(5));
    if (id.startsWith('curio:')) return this.curioClick(id.slice(6));
    switch (id) {
      case 'diary': return this.openDiary();
      case 'drawer':
        if (!s.drawerOpen) return this.openLock();
        return ui.msg(R.matchesMesh.visible || R.photoMesh.visible ? '抽屜開著，裡面還有東西。' : '抽屜已經空了。');
      case 'matchesPickup': R.matchesMesh.visible = false; return this.give('matches');
      case 'photoPickup': R.photoMesh.visible = false; this.give('photo', true); return ui.msg('獲得「<em>老照片</em>」。照片裡是這座博古架——還有一個臉被刮花的女孩。<br>（在背包選取照片，按「查看」可以細看）', 6000);
      case 'lamp':
        if (s.lampLit) return ui.msg('燈芯燒得劈啪作響，火光把影子拉得好長。');
        return ui.msg(this.has('matches') ? '油燈裡還有油，但沒有火。（先在下方背包選取火柴，再點油燈）' : '油燈裡還有油，但沒有火。');
      case 'mirror': return this.mirrorAction();
      case 'brush': R.brushMesh.visible = false; return this.give('brush');
      case 'brushHolder': return ui.msg('筆筒裡的筆都乾裂了。');
      case 'inkstone': return ui.msg('硯台裡的墨是暗紅色的，還沒乾透。');
      case 'desk': return ui.msg('祖父的書桌。東西都還擺在他離開時的位置。');
      case 'radio': return this.radioAction();
      case 'bookshelf':
        return ui.msg(s.handsRevealed ? '找出沾著血手印的書，把它們抽出來。' : '滿架的舊書，大多受潮了。書頁黏在一起，翻不開。');
      case 'genealogy': return this.openGenealogy();
      case 'bookCabinet':
        if (!s.bookCabOpen) return ui.msg('櫃門卡死了。像是有人從裡面拉著。');
        return ui.msg(R.tabletInCab.visible ? '櫃子裡立著一塊牌位。' : '櫃子裡空了。');
      case 'tabletPickup': R.tabletInCab.visible = false; return this.give('tablet');
      case 'curio':
        return ui.msg(this.has('photo') ? '擺設的位置，和照片裡不一樣。（點一件擺飾拿起，再點另一件交換）' : '祖父的博古架，擺著幾件老東西。');
      case 'curioDecor': return ui.msg('一些舊擺飾。積了很厚的灰，像是幾十年沒人碰過。');
      case 'curioCabinet':
        if (!s.curioSolved) return ui.msg('櫃門鎖得很緊，鎖孔裡塞滿了香灰。');
        return ui.msg(R.shoeInCab.visible ? '櫃子裡放著一隻紅色的繡花鞋。' : '櫃子裡只剩一灘水漬。');
      case 'shoePickup': R.shoeInCab.visible = false; return this.give('shoe');
      case 'altar':
        if (!s.tabletPlaced) return ui.msg('供桌上點著白蠟燭，香爐裡插著一炷香。牌位座上，空著。');
        return ui.msg('牌位立在供桌上。');
      case 'altarSlot':
        if (!s.tabletPlaced) return ui.msg('牌位座是空的。原本放在這裡的牌位呢？');
        return this.interact('tablet');
      case 'tablet':
        if (!s.nameWritten) return ui.msg('牌位上沒有名字。得用筆寫上去。');
        return ui.msg('「陳秋繡之靈位」。紅字在燭光下微微發亮。');
      case 'censer': {
        if (s.ritualDone) return ui.msg('香停在那裡，沒有再燒下去。');
        const m = Math.ceil(this.left / 60);
        return ui.msg(`一炷香，燒得比平常快得多。大概只剩<em>${m}</em>分鐘。`);
      }
      case 'banner': return ui.msg('白布上一個「奠」字。這是祖父的靈堂⋯⋯還是她的？');
      case 'effigy': {
        if (s.effigyMovedSinceLook && s.effigyStage > 0) { s.effigyMovedSinceLook = false; return ui.msg('⋯⋯她剛才，不是站在這裡的。'); }
        const l = EFFIGY_LINES[s.effigyLine++ % EFFIGY_LINES.length];
        return ui.msg(l);
      }
      case 'chair': return ui.msg('祖父生前最常坐的椅子。椅墊⋯⋯還是溫的。');
      case 'gate': return this.gateAction();
      case 'window': {
        sound.drip();
        if (s.ritualDone) return ui.msg('雨停了。湖面上起了霧，天邊泛白。');
        if (s.redPhase) return ui.msg('湖水是紅的。那艘小船，比剛才更靠岸了。');
        return ui.msg('窗外是湖。雨一直下，湖心有一艘小船，船上站著一個人。');
      }
      case 'scroll':
        return ui.msg(s.mirrorSeen ? '「還我名字」。墨還在往下滴。' : '「上善若水」。祖父的字。');
      case 'lantern': return ui.msg('紅燈籠上貼著「囍」字。辦喜事用的燈籠，掛在這裡很不對勁。');
      case 'frontwall': return ui.msg('門不見了。牆上只有指甲刮出來的痕跡⋯⋯是從裡面刮的。');
      case 'dress': sound.drip(); return ui.msg('衣桁上攤著一件紅嫁衣。袖口是濕的，還在滴水。');
      case 'paperHouse': return ui.msg('燒給往生者的紙厝。二樓的小窗裡，好像有人影。');
      case 'wreath': return ui.msg('輓帶上寫著「千古」。另一個花圈的輓帶，被撕掉了。');
      case 'couplet': return ui.msg('「音容宛在，德範長存」。白布上的墨，暈開了一點。');
      case 'brazier': return ui.msg('火盆裡的紙錢還沒燒完。灰燼底下，露出一角紅紙。');
      case 'teaTable': return ui.msg('桌上擺著三個茶杯。可是你只泡了一杯茶。');
      case 'rug': return ui.msg('地毯上有幾個燒焦的小洞，排成一行，像腳印。');
      case 'boxes': return ui.msg('紙箱上是你自己的字：「書・爺爺」。才收到一半。');
      case 'sideTable': return ui.msg('條案上有一個相框，正面朝下。你沒有把它翻過來。');
      case 'clock': return ui.msg('掛鐘停了。停在十一點五十九分——子時前一分。');
      case 'chests':
        sound.whisper(1.2, 0.5);
        return ui.msg('樟木箱上了鎖。裡面傳出指甲刮木頭的聲音。');
      case 'screen': return ui.msg('絹面山水，下緣發了霉。屏風後面⋯⋯你不太想看。');
      case 'palaceLantern': return ui.msg('宮燈裡的蠟燭早就燒完了。燈罩上畫著紅梅。');
      case 'plantStand': return ui.msg('蘭花枯了，葉子全朝月洞門那邊彎過去。');
      case 'floorVase': return ui.msg('瓶裡插著枯枝。其中一根枝上，綁著一條紅繩。');
    }
  }

  useItem(item, id) {
    const s = this.s;
    const onAltar = ['altar', 'altarSlot', 'censer', 'tablet', 'banner'].includes(id);
    if (item === 'matches') {
      if (id === 'lamp') return this.lightLamp();
      if (id === 'gate') return ui.msg('火柴一湊近黃符，就熄了。');
      if (id === 'effigy') { sound.whisper(1.2); return ui.msg('火柴還沒擦亮，你就聽見耳邊一聲「不要」。你放下了手。'); }
      if (onAltar) return ui.msg('蠟燭本來就點著。');
    }
    if (item === 'brush') {
      if (id === 'inkstone') {
        this.remove('brush');
        this.give('brushRed', true);
        sound.drip();
        s.brushRed = true;
        return ui.msg('你把毛筆浸進硯台。墨是溫的。<br>獲得「<em>紅墨毛筆</em>」。', 4500);
      }
      if (id === 'tablet') return ui.msg('筆是乾的，寫不出字。');
    }
    if (item === 'brushRed' && (id === 'tablet' || id === 'altarSlot')) {
      if (!s.tabletPlaced) return ui.msg('牌位座上什麼都沒有。');
      if (s.nameWritten) return ui.msg('名字已經寫上了。');
      return this.openNamer();
    }
    if (item === 'brushRed' && id === 'tabletPickup') return ui.msg('先把牌位請到供桌上吧。');
    if (item === 'tablet' && onAltar) return this.placeTablet();
    if (item === 'shoe' && onAltar) {
      if (!s.tabletPlaced) return ui.msg('要放在哪裡呢⋯⋯總得先有她的牌位。');
      return this.placeShoe();
    }
    if (item === 'photo' && id.startsWith('curio')) { this.openPhoto(); return; }
    if (item === 'shoe' && id === 'effigy') return ui.msg('紙人的腳上已經穿著一雙紙鞋。這隻鞋，不是她的。');
    if (id === 'gate') return ui.msg('打不開。門外的人還在敲。');
    ui.msg(['沒有用。', '這樣做沒有意義。', '什麼也沒發生。'][(Math.random() * 3) | 0], 2200);
  }

  // ======================= puzzles =======================
  openDiary() {
    let page = 0;
    const el = document.createElement('div');
    el.className = 'diary paper';
    const render = () => {
      const p = DIARY[page];
      el.innerHTML = p.cover
        ? '<div class="cover"><h3>守仁手記</h3><p>民國五十三年起</p></div>'
        : `<div class="date">${p.date}</div><div class="text${p.shaky ? ' shaky' : ''}">${p.text}</div>`;
      if (page === DIARY.length - 1) el.innerHTML += '<div class="blot" style="width:90px;height:70px;right:40px;top:60px"></div><div class="blot" style="width:40px;height:30px;left:60px;bottom:90px"></div>';
      const pager = document.createElement('div');
      pager.className = 'pager';
      pager.innerHTML = `<button ${page === 0 ? 'disabled' : ''}>◀ 上一頁</button><span>${page + 1} / ${DIARY.length}</span><button ${page === DIARY.length - 1 ? 'disabled' : ''}>下一頁 ▶</button>`;
      const [prev, , next] = pager.children;
      prev.onclick = () => { page = Math.max(0, page - 1); sound.tick(); render(); };
      next.onclick = () => { page = Math.min(DIARY.length - 1, page + 1); sound.tick(); render(); if (page === 5) sound.whisper(1.6); };
      el.appendChild(pager);
    };
    render();
    const keys = (e) => {
      if (e.key === 'ArrowRight' && page < DIARY.length - 1) { page++; render(); }
      if (e.key === 'ArrowLeft' && page > 0) { page--; render(); }
    };
    addEventListener('keydown', keys);
    ui.modal(el, () => {
      removeEventListener('keydown', keys);
      if (!this.s.diaryRead) {
        this.s.diaryRead = true;
        setTimeout(() => this.knockEvent(), 1800);
      }
    });
  }

  async knockEvent() {
    if (this.s.knocked || this.disposed) return;
    this.s.knocked = true;
    sound.knock(3, -0.5);
    await wait(1500);
    ui.msg('⋯⋯叩、叩、叩。<br>月洞門外，有人在敲門。', 4000);
  }

  openLock() {
    const el = document.createElement('div');
    el.className = 'lock';
    el.innerHTML = '<h3>時辰鎖</h3><div class="hint">銅片上刻著：「她走的那一夜」</div><div class="dials"></div><button class="btn-main">拉開抽屜</button>';
    const dialsEl = el.querySelector('.dials');
    const labels = ['去時', '尋時', '歸時'];
    const faces = [];
    labels.forEach((lab, i) => {
      const d = document.createElement('div');
      d.className = 'dial';
      d.innerHTML = `<div class="lab">${lab}</div><button>▲</button><div class="face"><b></b><small></small></div><button>▼</button>`;
      const [, up, face, dn] = d.children;
      const show = () => { face.querySelector('b').textContent = BRANCHES[this.s.dials[i]][0]; face.querySelector('small').textContent = BRANCHES[this.s.dials[i]][1]; };
      up.onclick = () => { this.s.dials[i] = (this.s.dials[i] + 11) % 12; sound.tick(); show(); };
      dn.onclick = () => { this.s.dials[i] = (this.s.dials[i] + 1) % 12; sound.tick(); show(); };
      show();
      faces.push(show);
      dialsEl.appendChild(d);
    });
    el.querySelector('.btn-main').onclick = () => {
      if (this.s.dials.every((v, i) => v === LOCK_ANSWER[i])) {
        ui.closeModal();
        this.unlockDrawer();
      } else {
        sound.woodblock();
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
      }
    };
    ui.modal(el);
  }

  async unlockDrawer() {
    const s = this.s;
    if (s.drawerOpen) return;
    s.drawerOpen = true;
    this.busy = true;
    sound.tick();
    await wait(200);
    sound.slide(0.6);
    await this.go2('drawer');
    await this.tween(0.7, (k) => { this.R.drawer.position.z = 0.32 * k; });
    this.busy = false;
    ui.msg('「喀」。鎖開了。抽屜裡有一盒火柴，和一張老照片。', 4000);
  }

  async lightLamp() {
    const s = this.s, R = this.R;
    if (s.lampLit) return ui.msg('油燈已經點著了。');
    s.lampLit = true;
    this.remove('matches');
    this.busy = true;
    sound.match();
    await wait(700);
    R.lamp.flame.visible = true;
    R.lamp.glow.visible = true;
    await this.tween(1.2, (k) => { R.lampBase = 22 * k; R.lamp.light.intensity = R.lampBase; });
    this.busy = false;
    await ui.msg('火苗跳了一下，書齋亮了起來。', 3000);
    await wait(2500);
    this.silhouetteEvent();
  }

  async silhouetteEvent() {
    if (this.disposed) return;
    const sil = this.R.silhouette;
    sil.visible = true;
    sound.creak(1.4);
    await this.tween(4.5, (k) => { sil.position.x = 1.0 + k * 4.2; });
    sil.visible = false;
  }

  async mirrorAction() {
    const s = this.s, R = this.R;
    if (this.view !== 'mirror') await this.go('mirror');
    if (!s.lampLit) return ui.msg('銅鏡裡一片漆黑，什麼都照不清楚。要是有光就好了。');
    if (s.mirrorSeen) return ui.msg('鏡子裡只有你自己。⋯⋯應該是吧。');
    s.mirrorSeen = true;
    this.busy = true;
    await ui.msg('昏黃的鏡面裡，映出你身後的書架⋯⋯', 2600);
    await wait(900);
    const ghost = R.ghost;
    // stand just over your right shoulder in the reflection
    const side = new THREE.Vector3(-R.mirrorNormal.z, 0, R.mirrorNormal.x);
    const g = R.mirrorPos.clone().addScaledVector(R.mirrorNormal, 1.6).addScaledVector(side, 0.22);
    ghost.position.set(g.x, -0.05, g.z);
    ghost.lookAt(R.mirrorPos.x, 0, R.mirrorPos.z);
    setLayer(ghost, 1);
    ghost.visible = true;
    sound.stinger(0.9);
    this.pulse(0.45, 0.018, 1.6);
    this.rig.shake = 0.02;
    await ui.msg('⋯⋯還有，站在你身後的<em>她</em>。', 2000);
    await wait(1200);
    await this.rig.turn(Math.PI, 0.32);
    ghost.visible = false;
    setLayer(ghost, 0);
    sound.heartbeat(true);
    await ui.msg('⋯⋯沒有人。', 2200);
    await wait(1200);
    sound.heartbeat(false);
    for (const hp of R.handprints) setLayer(hp, 0);
    s.handsRevealed = true;
    R.scroll.material.map = T.scrollTex('還我名字', true);
    R.scroll.material.needsUpdate = true;
    this.view = 'mirror';
    this.busy = false;
    await ui.msg('可是書架上，有四本書沾上了<em>血手印</em>。', 4000);
    await wait(2500);
    // the radio switches itself on
    if (!s.radioOn) { s.radioOn = true; sound.radio(true); R.radioMat.emissive.set('#5a3010'); }
    s.radioIdx = 3;
    this.radioLine();
  }

  radioAction() {
    const s = this.s, R = this.R;
    if (!s.radioOn) {
      s.radioOn = true;
      sound.radio(true);
      R.radioMat.emissive.set('#5a3010');
      s.radioIdx = s.radioIdx % RADIO.length;
      return this.radioLine();
    }
    if (s.radioIdx >= RADIO.length) {
      s.radioOn = false;
      s.radioIdx = 0;
      sound.radio(false);
      R.radioMat.emissive.set('#000000');
      return ui.msg('你關掉了收音機。沙沙聲停了⋯⋯可是你好像還聽得見。');
    }
    this.radioLine();
  }

  radioLine() {
    const l = RADIO[this.s.radioIdx++];
    sound.whisper(1.4, -0.2);
    ui.msg(`<span class="who">收音機</span>　${l}<br><small style="opacity:.6">（再點一次轉台）</small>`, 6500);
  }

  async bookAction(title) {
    const s = this.s, R = this.R;
    const book = SPECIAL_BOOKS.find((b) => b.title === title);
    if (!s.handsRevealed) return this.interact('bookshelf');
    if (s.pulled[title]) return ui.msg(`《${title}》後面的木板上，寫著一個「<em>${book.char}</em>」字。`);
    s.pulled[title] = true;
    const m = R.specialBooks[title];
    const x0 = m.position.x;
    sound.slide(0.45);
    this.tween(0.45, (k) => { m.position.x = x0 + 0.15 * k; m.rotation.z = -0.12 * k; });
    sound.whisper(0.9);
    const n = Object.keys(s.pulled).length;
    await ui.msg(`你抽出《${title}》。書後的木板上，用血寫著一個字——「<em>${book.char}</em>」。`, 3800);
    if (n === SPECIAL_BOOKS.length) {
      this.busy = true;
      await wait(1400);
      await ui.msg('還、我、名、字。', 2600);
      sound.creak(1.8);
      s.bookCabOpen = true;
      await this.tween(1.6, (k) => { for (const d of R.bookDoors) d.pivot.rotation.y = d.dir * -1.75 * k; });
      this.busy = false;
      ui.msg('書架下方的櫃門，自己開了。', 3000);
    }
  }

  openGenealogy() {
    const el = document.createElement('div');
    el.className = 'genealogy paper';
    el.innerHTML = `
      <h3>陳氏族譜</h3>
      <div class="cols">
        <p style="margin:0 8px"><span class="small">第十六世</span>　陳德昌　<span class="small">配王氏</span></p>
        <p style="margin:0 8px"><span class="small">第十七世</span></p>
        <p style="margin:0 8px">長子　守仁</p>
        <p style="margin:0 8px">次子　守義</p>
        <p style="margin:0 8px">長女　<span class="inkout">陳某某</span>　<span class="small">民國五十三年歿</span></p>
        <p style="margin:0 8px" class="scrawl">我叫什麼名字　我叫什麼名字　我叫什麼名字</p>
      </div>`;
    sound.tick();
    ui.modal(el, () => ui.msg('她的名字被濃墨塗掉了。只剩下姓——陳。'));
  }

  openPhoto() {
    const el = document.createElement('div');
    el.className = 'viewer';
    let back = false;
    const front = T.photoCanvas(CURIO_ANSWER, CURIO_CELLS);
    const rear = T.photoCanvas(CURIO_ANSWER, CURIO_CELLS, true);
    const cap = document.createElement('div');
    cap.className = 'cap';
    const btn = document.createElement('button');
    btn.className = 'btn-sub';
    btn.textContent = '翻到背面';
    const show = () => {
      el.querySelectorAll('canvas').forEach((c) => c.remove());
      el.prepend(back ? rear : front);
      cap.textContent = back ? '' : '博古架前的女孩。她的臉被刮得看不清了。';
      btn.textContent = back ? '翻回正面' : '翻到背面';
    };
    btn.onclick = () => { back = !back; sound.tick(); show(); };
    el.append(cap, btn);
    show();
    ui.modal(el);
  }

  openShoe() {
    const el = document.createElement('div');
    el.className = 'viewer';
    el.appendChild(T.shoeCanvas());
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.innerHTML = '鞋墊上，用金線繡著兩個字。<br>鞋還是濕的，像剛從湖裡撈起來。';
    el.appendChild(cap);
    ui.modal(el);
  }

  // ---------- curio swap puzzle ----------
  cellOf(kind) { return Object.keys(this.s.curio).find((c) => this.s.curio[c] === kind); }

  curioClick(kind) {
    const s = this.s, R = this.R;
    if (s.curioSolved) return ui.msg(`${CURIO_NAMES[kind]}。`);
    if (this.swapping) return;
    if (kind === 'drum') sound.rattle(); else if (kind === 'bell') sound.bell(880, -0.4); else sound.woodblock();
    if (!this.picked) {
      this.picked = kind;
      R.curioItems[kind].position.y += 0.05;
      return ui.msg(`拿起了${CURIO_NAMES[kind]}。再點另一件擺飾，交換它們的位置。`, 3000);
    }
    if (this.picked === kind) { this.dropPicked(); return; }
    const a = this.picked, b = kind;
    this.picked = null;
    this.swap(a, b);
  }

  dropPicked() {
    if (!this.picked) return;
    const it = this.R.curioItems[this.picked];
    it.position.copy(this.R.curioSlotPos[this.cellOf(this.picked)]);
    this.picked = null;
  }

  async swap(a, b) {
    const s = this.s, R = this.R;
    const ca = this.cellOf(a), cb = this.cellOf(b);
    s.curio[ca] = b;
    s.curio[cb] = a;
    const A = R.curioItems[a], B = R.curioItems[b];
    const pa = R.curioSlotPos[ca], pb = R.curioSlotPos[cb];
    this.swapping = true;
    await this.tween(0.6, (k) => {
      const lift = Math.sin(k * Math.PI) * 0.06;
      A.position.lerpVectors(pa, pb, k); A.position.x += lift * 2; A.position.y += lift;
      B.position.lerpVectors(pb, pa, k); B.position.x += lift * 3; B.position.y += lift;
    });
    A.position.copy(pb);
    B.position.copy(pa);
    this.swapping = false;
    sound.woodblock();
    if (Object.keys(CURIO_ANSWER).every((c) => s.curio[c] === CURIO_ANSWER[c])) this.solveCurio();
  }

  async solveCurio() {
    const s = this.s, R = this.R;
    s.curioSolved = true;
    this.busy = true;
    await wait(700);
    sound.bell(440);
    await ui.msg('擺設回到了原來的位置。博古架裡，傳出一聲很輕的嘆息。', 3200);
    sound.creak(1.6);
    R.shoeInCab.visible = true;
    await this.tween(1.5, (k) => { for (const d of R.curioDoors) d.pivot.rotation.y = d.dir * 1.7 * k; });
    this.busy = false;
    ui.msg('下方的櫃門開了。裡面有一灘水⋯⋯和一隻紅色的繡花鞋。', 4000);
  }

  // ---------- altar ritual ----------
  async placeTablet() {
    const s = this.s, R = this.R;
    if (s.tabletPlaced) return;
    s.tabletPlaced = true;
    this.remove('tablet');
    R.tabletOnAltar.visible = true;
    sound.woodblock();
    this.flickerCandles();
    await ui.msg('你把牌位請上供桌。燭火同時往旁邊一歪。', 3000);
    ui.msg('牌位上沒有名字。', 2400);
  }

  async placeShoe() {
    const s = this.s, R = this.R;
    if (s.shoePlaced) return;
    s.shoePlaced = true;
    this.remove('shoe');
    R.shoeOnAltar.visible = true;
    sound.drip();
    await ui.msg('你把繡花鞋放在牌位前。鞋尖朝著門外。', 3200);
    if (s.nameWritten) this.ritual();
    else ui.msg('還差一樣——她的名字。', 3000);
  }

  openNamer() {
    const picked = [];
    const el = document.createElement('div');
    el.className = 'namer';
    el.innerHTML = `
      <div class="tablet"><div class="slotc"></div><div class="slotc"></div><div class="slotc"></div><div class="fixed">之<br>靈<br>位</div></div>
      <div class="charpick">
        <h3>寫下她的名字</h3>
        <p>一筆寫下，就改不了了。</p>
        <div class="chargrid"></div>
        <div class="row"><button class="btn-sub">擦掉</button><button class="btn-main">落筆</button></div>
      </div>`;
    const slots = el.querySelectorAll('.slotc');
    const show = () => slots.forEach((sl, i) => (sl.textContent = picked[i] || ''));
    const grid = el.querySelector('.chargrid');
    for (const ch of NAME_CHARS) {
      const b = document.createElement('button');
      b.textContent = ch;
      b.onclick = () => { if (picked.length < 3) { picked.push(ch); sound.tick(); show(); } };
      grid.appendChild(b);
    }
    el.querySelector('.btn-sub').onclick = () => { picked.length = 0; show(); };
    el.querySelector('.btn-main').onclick = () => {
      if (picked.length < 3) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
      ui.closeModal();
      this.writeName(picked.join(''));
    };
    ui.modal(el);
  }

  async writeName(name) {
    const s = this.s, R = this.R;
    if (name !== NAME) {
      s.wrongNames++;
      s.penalty += HINT_COST;
      sound.stinger(0.5);
      sound.whisper(1.8);
      this.pulse(0.5, 0.012, 1.4);
      this.flickerCandles();
      await ui.msg(`「${name}」⋯⋯字跡像被水洗過一樣，慢慢暈開、消失了。`, 3200);
      ui.msg('<span class="who">耳邊有人說：「⋯⋯不是。」</span>　（香燒快了）', 3600);
      return;
    }
    s.nameWritten = true;
    this.remove('brushRed');
    const front = R.tabletOnAltar.userData.front;
    front.map = T.tabletTex(NAME);
    front.needsUpdate = true;
    sound.bell(392);
    await ui.msg('你一筆一畫寫下她的名字。紅墨滲進木紋裡，像血。', 3600);
    if (s.shoePlaced) this.ritual();
    else ui.msg('還差一樣——把她的鞋還給她。', 3000);
  }

  async ritual() {
    const s = this.s, R = this.R, post = this.ctx.post;
    if (s.ritualDone) return;
    s.ritualDone = true;
    s.running = false;
    this.busy = true;
    ui.closeModal();
    sound.heartbeat(false);
    this.select(null);
    await this.go2('ritual');
    await ui.msg('香灰，忽然一動也不動了。', 2800);
    R.lanternBase = 0.3;
    sound.bell(330);
    const ghost = R.ghost;
    ghost.position.set(4.0, 0, 1.7);
    ghost.lookAt(this.rig.pos.x, 0, this.rig.pos.z);
    setLayer(ghost, 0);
    await ui.flash('#000', 120, 250, 700);
    ghost.visible = true;
    await wait(700);
    await ui.seq(['她就站在供桌旁。紅蓋頭底下，傳來很輕、很輕的聲音——', '<span class="who">「我叫⋯⋯陳秋繡。」</span>', '她慢慢低下頭，像是在對你行禮。'], 3000);
    sound.whisper(2.5, 0);
    await ui.fadeTo('#000', 900);
    ghost.visible = false;
    R.effigy.visible = false;
    await wait(500);
    ui.clearFade();
    await wait(600);
    await ui.msg('她不見了。角落的紙紮新娘也不見了，地上只剩一小撮紙灰。', 3600);
    await this.go2('gate');
    sound.burn(2.6);
    const tal = R.talisman;
    await this.tween(2.4, (k) => {
      tal.scale.y = 1 - k * 0.95;
      tal.position.y = GATE.y + 0.15 + 0.21 * k;
      tal.material.color.setRGB(1 - k, 1 - k * 0.9, 1 - k * 0.9);
      tal.material.emissive.setRGB(0.8 * Math.sin(k * Math.PI), 0.25 * Math.sin(k * Math.PI), 0);
    });
    tal.visible = false;
    for (const c of R.cords) c.visible = false;
    sound.tick();
    await wait(500);
    sound.creak(2.8);
    sound.stopRain();
    R.rain.visible = false;
    R.backdrop.material.map = T.landscape('dawn');
    R.backdrop.material.color.set('#d9d2c4');
    R.moon.color.set('#ffd6a0');
    R.hemi.intensity = 1.1;
    R.hemi.color.set('#d8c6a8');
    post.uniforms.uRed.value = 0;
    this.ctx.scene.fog.density = 0.02;
    await this.tween(2.8, (k) => {
      R.gateHalves[0].rotation.y = 1.85 * k;
      R.gateHalves[1].rotation.y = -1.85 * k;
    });
    sound.gong();
    s.gateOpen = true;
    this.busy = false;
    ui.msg('月洞門，開了。門外，天快亮了。', 4500);
  }

  gateAction() {
    const s = this.s;
    if (s.gateOpen) return this.escape();
    if (this.view !== 'gate') return this.go('gate');
    const lines = ['月洞門被一扇格門封死了。門上貼著黃符，纏著紅繩。', '門外有腳步聲，濕的，一步一步。', '你把耳朵貼近格門——外面的人，也貼了過來。'];
    this.gateLine = (this.gateLine ?? -1) + 1;
    if (this.gateLine === 1) sound.knock(2, -0.2);
    ui.msg(lines[this.gateLine % lines.length]);
  }

  async escape() {
    if (this.s.ended) return;
    this.s.ended = true;
    this.busy = true;
    ui.showHUD(false);
    sound.bell(523);
    await this.rig.goTo(V(GATE.x, 1.5, -5.2), V(GATE.x + 0.4, 1.45, -9), 3.2);
    await ui.fadeTo('#f1e7d2', 1800);
    const used = this.fmt(this.s.elapsed + this.s.penalty);
    ui.ending({
      good: true,
      title: '名歸',
      lines: ['月洞門外，天亮了。', '你回頭看，書齋裡空無一人。<br>供桌上的牌位寫著——<span class="red">陳秋繡</span>。', '後來，你把她的名字，<br>一筆一筆，補回了族譜。'],
      stats: `燃香 ${used}　・　提示 ${this.s.hints} 次`,
    });
    await wait(1400);
    ui.clearFade();
  }

  async fail() {
    const s = this.s, R = this.R, post = this.ctx.post;
    if (s.ended) return;
    s.ended = true;
    s.running = false;
    this.busy = true;
    ui.closeModal();
    this.select(null);
    ui.setTooltip(null);
    sound.heartbeat(false);
    sound.radio(false);
    R.incense.stick.visible = false;
    R.incense.ember.visible = false;
    await ui.msg('香，燒完了。', 2400);
    R.lanternBase = 0;
    R.altarBase = 0;
    R.lampBase = 0;
    R.brazierBase = 0;
    for (const c of R.candles) { c.flame.visible = false; c.glow.visible = false; }
    R.lamp.flame.visible = false;
    R.lamp.glow.visible = false;
    sound.whisper(2.5);
    await wait(2400);
    const f = this.rig.forward().setY(0).normalize();
    const g = R.ghost;
    g.position.copy(this.rig.pos).addScaledVector(f, 0.5);
    g.position.y = this.rig.pos.y - 1.5;
    g.lookAt(this.rig.pos.x, g.position.y, this.rig.pos.z);
    // the veil is gone: this time you see her face
    for (const v of g.userData.veilParts) v.visible = false;
    setLayer(g, 0);
    g.visible = true;
    const red = new THREE.PointLight('#ff2010', 3, 3, 1.5);
    red.position.copy(this.rig.pos).addScaledVector(f, 0.2);
    this.W.root.add(red);
    sound.stinger(1.5);
    post.uniforms.uRed.value = 0.6;
    post.uniforms.uAberr.value = 0.02;
    this.rig.shake = 0.06;
    await wait(1100);
    await ui.flash('#4a0000', 40, 160, 200);
    await ui.fadeTo('#000', 300);
    ui.ending({
      good: false,
      title: '替身',
      lines: ['紅蓋頭落了下來，蓋住了你的眼睛。', '有人牽起你的手。冰的，濕的。', '隔年七月半，書齋的門，<br>又被人推開了。'],
      stats: s.wrongNames ? `寫錯名字 ${s.wrongNames} 次・提示 ${s.hints} 次` : `提示 ${s.hints} 次`,
    });
    await wait(1500);
    ui.clearFade();
  }

  // ======================= hints =======================
  currentHint() {
    const s = this.s, R = this.R;
    if (s.gateOpen) return '月洞門開了。走出去吧。';
    if (!s.diaryRead) return '書桌上有一本祖父的手記。';
    if (!s.drawerOpen) return '書桌抽屜的鎖要三個時辰。手記裡記下了那一夜：她出門的時辰、找到鞋的時辰、她回來的時辰。';
    if (R.matchesMesh.visible || R.photoMesh.visible) return '抽屜裡的東西，拿起來吧。';
    if (!s.lampLit) return '太暗了。在背包選取火柴，再點書桌上的油燈。';
    if (!s.mirrorSeen) return '有光了。看看書桌左邊那面銅鏡。';
    if (!s.bookCabOpen) return `書架上有四本沾著血手印的書（還剩 ${SPECIAL_BOOKS.length - Object.keys(s.pulled).length} 本），把它們抽出來。`;
    if (R.tabletInCab.visible) return '書架下方的櫃子開了，裡面有東西。';
    if (!s.curioSolved) return '老照片拍的是博古架原本的擺設。點一件擺飾拿起，再點另一件，就能交換位置。';
    if (R.shoeInCab.visible) return '博古架下方的櫃子開了。';
    if (!s.tabletPlaced) return '選取無字牌位，放到供桌上。';
    if (!s.nameWritten && !this.has('brushRed')) return this.has('brush') ? '毛筆是乾的。書桌上的硯台裡有紅墨。' : '書桌上有一支毛筆。';
    if (!s.nameWritten) return '用紅墨毛筆點牌位，寫下她的名字。姓氏在手記和族譜裡；名字繡在鞋墊上，收音機裡也有人在喊。';
    if (!s.shoePlaced) return '把她的鞋還給她——放到供桌上。';
    return '⋯⋯';
  }

  hint() {
    if ((!this.s.running && !this.s.gateOpen) || this.busy || this.s.ended) return;
    const now = performance.now() / 1000;
    if (now - this.lastHint < 3) return;
    this.lastHint = now;
    this.s.penalty += HINT_COST;
    this.s.hints++;
    sound.whisper(1.2, 0.5);
    ui.msg(`<span class="who">香，燒快了一些。</span><br>${this.currentHint()}`, 8000);
  }

  // ======================= per-frame =======================
  update(dt, t) {
    const now = performance.now();
    if (now - this.lastHover > 60) { this.lastHover = now; this.hover(); }
    const s = this.s, R = this.R, post = this.ctx.post;
    // the effigy watches you once she has started to move
    if (s.effigyStage > 0 && R.effigy.visible) {
      const head = R.effigy.userData.head;
      const q = head.quaternion.clone();
      head.lookAt(this.camera.position);
      head.quaternion.slerpQuaternions(q, head.quaternion, Math.min(1, dt * 1.5));
    }
    if (!s.running) return;
    s.elapsed += dt;
    const left = this.left;
    const frac = THREE.MathUtils.clamp(left / DURATION, 0, 1);
    R.incense.stick.scale.y = Math.max(0.004, R.incense.max * frac);
    const mins = Math.ceil(left / 60);
    ui.setIncense(frac, left < 60 ? '將盡' : `約 ${mins} 分`, left < 180);
    sound.tension(1 - frac);
    if (left <= 0) { this.fail(); return; }
    if (this.busy) return;

    const burnt = 1 - frac;
    if (s.elapsed > 45 && !s.knocked) this.knockEvent();
    if (burnt > 0.5 && !s.redPhase) this.redPhase();
    if (left < 180 && !s.lowWarned) {
      s.lowWarned = true;
      sound.heartbeat(true);
      ui.msg('香，快燒到底了。', 3000);
    }
    if (left < 180) {
      post.uniforms.uRed.value = 0.12 + Math.sin(t * 4.6) * 0.08;
      post.uniforms.uVignette.value = 0.6 + Math.sin(t * 4.6) * 0.15;
    }
    const thresholds = [0.2, 0.42, 0.62, 0.82];
    if (s.effigyStage < thresholds.length && burnt > thresholds[s.effigyStage]) this.tryMoveEffigy();
    if (s.elapsed > s.nextAmbient) {
      s.nextAmbient = s.elapsed + 40 + Math.random() * 50;
      this.ambientEvent();
    }
  }

  inView(pos, r = 0.9) {
    const m = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(m);
    return this.frustum.intersectsSphere(new THREE.Sphere(pos.clone().setY(0.9), r));
  }

  tryMoveEffigy() {
    const R = this.R, s = this.s;
    const next = EFFIGY_SPOTS[s.effigyStage + 1];
    if (this.inView(R.effigy.position) || this.inView(next)) return;
    s.effigyStage++;
    R.effigy.position.copy(next);
    R.effigy.lookAt(this.rig.pos.x, 0, this.rig.pos.z);
    s.effigyMovedSinceLook = true;
    if (s.effigyStage >= 2) sound.whisper(1.4, 0.6);
    if (s.effigyStage === 4) setTimeout(() => sound.drip(), 800);
  }

  async redPhase() {
    const s = this.s, R = this.R;
    s.redPhase = true;
    R.backdrop.material.map = T.landscape('red');
    R.backdrop.material.color.set('#b0a0a0');
    R.moon.color.set('#ff8a7a');
    R.rainSpeed = 2.2;
    sound.bell(196, 0.3);
    this.ctx.scene.fog.color.set('#0c0506');
    await wait(600);
    ui.msg('窗外，有什麼東西變了。湖水⋯⋯是紅的。', 4000);
  }

  ambientEvent() {
    const R = this.R;
    const r = Math.random();
    if (r < 0.25) sound.knock(3, -0.5);
    else if (r < 0.45) sound.bell(260 + Math.random() * 200, (Math.random() - 0.5));
    else if (r < 0.65) sound.whisper(2);
    else if (r < 0.85) {
      // lantern and candles gutter at once
      const b0 = R.lanternBase, a0 = R.altarBase;
      R.lanternBase = 0.2; R.altarBase = 0.5;
      sound.whisper(1);
      setTimeout(() => { if (!this.disposed && this.s.running) { R.lanternBase = b0; R.altarBase = a0; } }, 900 + Math.random() * 800);
    } else sound.drip();
  }

  flickerCandles() {
    const R = this.R;
    const a0 = R.altarBase;
    let n = 0;
    const iv = setInterval(() => {
      R.altarBase = n % 2 ? a0 : a0 * 0.2;
      if (++n > 5) { clearInterval(iv); R.altarBase = a0; }
    }, 90);
  }

  pulse(red, aberr, sec) {
    const post = this.ctx.post;
    this.tween(sec, (k) => {
      const e = 1 - k;
      post.uniforms.uRed.value = red * e;
      post.uniforms.uAberr.value = 0.002 + aberr * e;
    });
  }

  tween(sec, fn) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = () => {
        if (this.disposed) return resolve();
        const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
        fn(k * k * (3 - 2 * k));
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  // go() that ignores busy (for scripted sequences)
  async go2(name) {
    const b = this.busy;
    this.busy = false;
    const p = this.go(name);
    this.busy = b;
    await p;
  }

  fmt(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m} 分 ${String(s).padStart(2, '0')} 秒`;
  }

  // ======================= debug =======================
  async debugSolve() {
    const s = this.s;
    s.diaryRead = true; s.knocked = true;
    await this.unlockDrawer();
    this.interact('matchesPickup'); this.interact('photoPickup');
    await this.lightLamp();
    await this.mirrorAction();
    for (const b of SPECIAL_BOOKS) { await this.bookAction(b.title); }
    while (!s.bookCabOpen || this.busy) await wait(200);
    this.interact('tabletPickup');
    for (const cell of Object.keys(CURIO_ANSWER)) {
      const want = CURIO_ANSWER[cell];
      if (s.curio[cell] !== want) await this.swap(s.curio[cell], want);
    }
    while (!s.curioSolved || this.busy) await wait(200);
    this.interact('shoePickup');
    this.interact('brush');
    this.useItem('brush', 'inkstone');
    await this.placeTablet();
    await this.writeName('陳秋春');
    await this.writeName(NAME);
    await this.placeShoe();
    while (!s.gateOpen) await wait(300);
    this.interact('gate');
  }
}
