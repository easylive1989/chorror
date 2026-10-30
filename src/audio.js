// Every sound is synthesised with Web Audio — no audio files.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.heartTimer = null;
    this.radioNodes = null;
  }

  init() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.dry = ctx.createGain();
    this.dry.connect(this.master);
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(3.2, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.verb.connect(wet).connect(this.master);
    this.noiseBuf = this.makeNoise(4);
  }

  get t() { return this.ctx.currentTime; }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.t, 0.1);
  }

  impulse(sec, decay) {
    const ctx = this.ctx, len = ctx.sampleRate * sec;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  makeNoise(sec) {
    const ctx = this.ctx, len = ctx.sampleRate * sec;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  noise(loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = loop;
    return s;
  }

  // out: { wet: 0..1, pan: -1..1 }
  out(node, { wet = 0.4, pan = 0 } = {}) {
    let n = node;
    if (pan) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      n.connect(p);
      n = p;
    }
    const d = this.ctx.createGain(); d.gain.value = 1 - wet * 0.5;
    const w = this.ctx.createGain(); w.gain.value = wet;
    n.connect(d).connect(this.dry);
    n.connect(w).connect(this.verb);
  }

  env(gainNode, t, a, peak, dec) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  // ---------- Ambience ----------
  ambience() {
    if (!this.ctx || this.amb) return;
    const ctx = this.ctx, t = this.t;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, t + 4);
    this.amb = g;
    this.out(g, { wet: 0.3 });
    // drone
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 3;
    const dg = ctx.createGain(); dg.gain.value = 0.05;
    for (const f of [55, 55.35, 82.6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp);
      o.start();
    }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 120;
    lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    lp.connect(dg).connect(g);
    this.droneGain = dg;
    // wind
    const wn = this.noise(true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.8;
    const wg = ctx.createGain(); wg.gain.value = 0.05;
    const wl = ctx.createOscillator(); wl.frequency.value = 0.11;
    const wlg = ctx.createGain(); wlg.gain.value = 0.035;
    wl.connect(wlg).connect(wg.gain); wl.start();
    const wf = ctx.createOscillator(); wf.frequency.value = 0.05;
    const wfg = ctx.createGain(); wfg.gain.value = 180;
    wf.connect(wfg).connect(bp.frequency); wf.start();
    wn.connect(bp).connect(wg).connect(g); wn.start();
    // rain
    const rn = this.noise(true);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const rg = ctx.createGain(); rg.gain.value = 0.022;
    rn.connect(hp).connect(rg).connect(g); rn.start();
    this.rainGain = rg;
  }

  stopRain() {
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(0, this.t, 1.5);
  }

  resumeRain() {
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(0.022, this.t, 1);
    if (this.droneGain) this.droneGain.gain.setTargetAtTime(0.05, this.t, 1);
  }

  tension(k) {
    // 0..1 raises the drone as the incense burns down
    if (this.droneGain) this.droneGain.gain.setTargetAtTime(0.05 + k * 0.07, this.t, 2);
  }

  // ---------- One-shots ----------
  knock(n = 3, pan = -0.3) {
    if (!this.ctx) return;
    for (let i = 0; i < n; i++) {
      const t = this.t + i * 0.42 + Math.random() * 0.05;
      const o = this.ctx.createOscillator();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      const g = this.ctx.createGain();
      this.env(g, t, 0.004, 0.9, 0.22);
      o.connect(g);
      const nz = this.noise();
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const ng = this.ctx.createGain();
      this.env(ng, t, 0.002, 0.5, 0.08);
      nz.connect(lp).connect(ng);
      this.out(g, { wet: 0.6, pan });
      this.out(ng, { wet: 0.6, pan });
      o.start(t); o.stop(t + 0.4);
      nz.start(t); nz.stop(t + 0.2);
    }
  }

  bell(base = 520, pan = 0) {
    if (!this.ctx) return;
    const t = this.t;
    [[1, 0.3], [2.76, 0.18], [5.4, 0.1], [8.93, 0.05], [1.007, 0.2]].forEach(([r, a]) => {
      const o = this.ctx.createOscillator();
      o.frequency.value = base * r;
      const g = this.ctx.createGain();
      this.env(g, t, 0.003, a, 3.5 / Math.sqrt(r));
      o.connect(g);
      this.out(g, { wet: 0.8, pan });
      o.start(t); o.stop(t + 5);
    });
  }

  woodblock() {
    if (!this.ctx) return;
    const t = this.t;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.06);
    const g = this.ctx.createGain();
    this.env(g, t, 0.002, 0.35, 0.09);
    o.connect(g);
    this.out(g, { wet: 0.3 });
    o.start(t); o.stop(t + 0.2);
  }

  tick() {
    if (!this.ctx) return;
    const t = this.t;
    const nz = this.noise();
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 4;
    const g = this.ctx.createGain();
    this.env(g, t, 0.001, 0.5, 0.03);
    nz.connect(bp).connect(g);
    this.out(g, { wet: 0.1 });
    nz.start(t); nz.stop(t + 0.06);
  }

  whisper(dur = 1.8, pan = (Math.random() - 0.5) * 1.6) {
    if (!this.ctx) return;
    const t = this.t;
    const nz = this.noise();
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(900, t);
    for (let i = 1; i < 10; i++) bp.frequency.linearRampToValueAtTime(700 + Math.random() * 2600, t + (dur * i) / 10);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 1; i < 14; i++) g.gain.linearRampToValueAtTime(Math.random() * 0.5 * Math.sin((i / 14) * Math.PI), t + (dur * i) / 14);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    nz.connect(bp).connect(g);
    this.out(g, { wet: 0.7, pan });
    nz.start(t); nz.stop(t + dur + 0.1);
  }

  stinger(level = 1) {
    if (!this.ctx) return;
    const t = this.t;
    for (const f of [98, 103.8, 146.8, 155.6, 207.6, 311]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 0.94, t + 2.5);
      const g = this.ctx.createGain();
      this.env(g, t, 0.02, 0.09 * level, 2.6);
      o.connect(g);
      this.out(g, { wet: 0.5 });
      o.start(t); o.stop(t + 3);
    }
    const sc = this.ctx.createOscillator();
    sc.frequency.setValueAtTime(1700, t);
    sc.frequency.exponentialRampToValueAtTime(2600, t + 0.8);
    const vib = this.ctx.createOscillator(); vib.frequency.value = 23;
    const vg = this.ctx.createGain(); vg.gain.value = 80;
    vib.connect(vg).connect(sc.frequency);
    const sg = this.ctx.createGain();
    this.env(sg, t, 0.03, 0.06 * level, 1.4);
    sc.connect(sg);
    this.out(sg, { wet: 0.7 });
    sc.start(t); sc.stop(t + 2); vib.start(t); vib.stop(t + 2);
    const nz = this.noise();
    const ng = this.ctx.createGain();
    this.env(ng, t, 0.01, 0.35 * level, 0.9);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    nz.connect(lp).connect(ng);
    this.out(ng, { wet: 0.5 });
    nz.start(t); nz.stop(t + 1.2);
  }

  heartbeat(on) {
    if (!this.ctx) return;
    clearInterval(this.heartTimer);
    this.heartTimer = null;
    if (!on) return;
    const beat = () => {
      for (const [dt, a] of [[0, 0.9], [0.24, 0.6]]) {
        const t = this.t + dt;
        const o = this.ctx.createOscillator();
        o.frequency.setValueAtTime(62, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.15);
        const g = this.ctx.createGain();
        this.env(g, t, 0.01, a, 0.2);
        o.connect(g);
        this.out(g, { wet: 0.1 });
        o.start(t); o.stop(t + 0.35);
      }
    };
    beat();
    this.heartTimer = setInterval(beat, 820);
  }

  creak(dur = 2.2) {
    if (!this.ctx) return;
    const t = this.t;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    for (let i = 1; i < 20; i++) o.frequency.linearRampToValueAtTime(55 + Math.random() * 60, t + (dur * i) / 20);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.2);
    g.gain.linearRampToValueAtTime(0.18, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(g);
    this.out(g, { wet: 0.5 });
    o.start(t); o.stop(t + dur + 0.1);
  }

  slide(dur = 0.5) {
    if (!this.ctx) return;
    const t = this.t;
    const nz = this.noise();
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.05);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    nz.connect(lp).connect(g);
    this.out(g, { wet: 0.2 });
    nz.start(t); nz.stop(t + dur + 0.05);
    setTimeout(() => this.woodblock(), dur * 900);
  }

  rattle() {
    if (!this.ctx) return;
    for (let i = 0; i < 8; i++) {
      const t = this.t + i * 0.07;
      const o = this.ctx.createOscillator();
      o.frequency.value = 380 + (i % 2) * 40;
      const g = this.ctx.createGain();
      this.env(g, t, 0.002, 0.3, 0.05);
      o.connect(g);
      this.out(g, { wet: 0.4 });
      o.start(t); o.stop(t + 0.1);
    }
  }

  match() {
    if (!this.ctx) return;
    const t = this.t;
    const nz = this.noise();
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.2);
    nz.connect(bp).connect(g);
    this.out(g, { wet: 0.2 });
    nz.start(t); nz.stop(t + 1.3);
  }

  burn(dur = 3) {
    if (!this.ctx) return;
    const t0 = this.t;
    for (let i = 0; i < dur * 22; i++) {
      const t = t0 + Math.random() * dur;
      const nz = this.noise();
      const g = this.ctx.createGain();
      this.env(g, t, 0.001, 0.15 + Math.random() * 0.3, 0.02);
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
      nz.connect(hp).connect(g);
      this.out(g, { wet: 0.2 });
      nz.start(t); nz.stop(t + 0.05);
    }
  }

  gong() {
    if (!this.ctx) return;
    const t = this.t;
    [[110, 0.4], [164, 0.2], [231, 0.15], [392, 0.06]].forEach(([f, a]) => {
      const o = this.ctx.createOscillator();
      o.frequency.setValueAtTime(f * 1.02, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 1);
      const g = this.ctx.createGain();
      this.env(g, t, 0.01, a, 6);
      o.connect(g);
      this.out(g, { wet: 0.8 });
      o.start(t); o.stop(t + 7);
    });
  }

  radio(on) {
    if (!this.ctx) return;
    if (!on) {
      if (this.radioNodes) { this.radioNodes.g.gain.setTargetAtTime(0, this.t, 0.05); const n = this.radioNodes; setTimeout(() => n.src.stop(), 400); clearInterval(n.timer); }
      this.radioNodes = null;
      return;
    }
    if (this.radioNodes) return;
    const src = this.noise(true);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = 0.06;
    src.connect(bp).connect(g);
    this.out(g, { wet: 0.1, pan: -0.1 });
    src.start();
    // an old opera tune bleeding through the static: pentatonic plucks
    const scale = [293.7, 329.6, 392, 440, 523.3, 587.3];
    const timer = setInterval(() => {
      if (Math.random() < 0.35) return;
      const t = this.t;
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = scale[(Math.random() * scale.length) | 0] * (Math.random() < 0.2 ? 0.5 : 1);
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
      const og = this.ctx.createGain();
      this.env(og, t, 0.005, 0.12, 0.5);
      o.connect(f).connect(og);
      this.out(og, { wet: 0.3, pan: -0.1 });
      o.start(t); o.stop(t + 0.7);
    }, 260);
    this.radioNodes = { src, g, timer };
  }

  drip() {
    if (!this.ctx) return;
    const t = this.t;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(500, t + 0.08);
    const g = this.ctx.createGain();
    this.env(g, t, 0.002, 0.2, 0.1);
    o.connect(g);
    this.out(g, { wet: 0.8, pan: (Math.random() - 0.5) });
    o.start(t); o.stop(t + 0.2);
  }

  dispose() {
    this.heartbeat(false);
    this.radio(false);
  }
}
