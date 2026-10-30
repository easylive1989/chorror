import { iconURL } from './textures.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class UI {
  constructor() {
    this.hud = $('#hud');
    this.msgEl = $('#message');
    this.tip = $('#tooltip');
    this.using = $('#using');
    this.slots = $('#slots');
    this.inspectBtn = $('#btn-inspect');
    this.modalEl = $('#modal');
    this.modalBody = $('#modal .body');
    this.msgTimer = null;
    this.onModalClose = null;
    $('#modal .close').addEventListener('click', () => this.closeModal());
    this.modalEl.addEventListener('pointerdown', (e) => { if (e.target === this.modalEl) this.closeModal(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.modalOpen) this.closeModal(); });
  }

  showHUD(on) { this.hud.classList.toggle('hidden', !on); }

  msg(html, ms) {
    clearTimeout(this.msgTimer);
    this.msgEl.innerHTML = html;
    this.msgEl.classList.add('show');
    const dur = ms ?? Math.max(2800, html.replace(/<[^>]+>/g, '').length * 170);
    this.msgTimer = setTimeout(() => this.msgEl.classList.remove('show'), dur);
    return wait(Math.min(dur, 2600));
  }

  async seq(lines, gap) {
    for (const l of lines) {
      const ms = gap ?? Math.max(2200, l.replace(/<[^>]+>/g, '').length * 150);
      this.msg(l, ms + 400);
      await wait(ms);
    }
  }

  setTooltip(text, x, y) {
    if (!text) { this.tip.style.display = 'none'; return; }
    this.tip.textContent = text;
    this.tip.style.display = 'block';
    this.tip.style.left = x + 'px';
    this.tip.style.top = y + 'px';
  }

  setUsing(text, x, y) {
    if (!text) { this.using.style.display = 'none'; return; }
    this.using.textContent = text;
    this.using.style.display = 'block';
    this.using.style.left = x + 'px';
    this.using.style.top = y + 'px';
  }

  renderInventory(items, sel, defs, onClick, newId) {
    this.slots.innerHTML = '';
    const n = Math.max(6, items.length);
    for (let i = 0; i < n; i++) {
      const id = items[i];
      const d = document.createElement('div');
      d.className = 'slot';
      if (id) {
        const def = defs[id];
        d.innerHTML = `<img src="${iconURL(def.icon)}" alt=""><span class="name">${def.name}</span>`;
        if (id === sel) d.classList.add('sel');
        if (id === newId) d.classList.add('new');
        d.addEventListener('click', (e) => { e.stopPropagation(); onClick(id); });
      }
      this.slots.appendChild(d);
    }
    const def = sel && defs[sel];
    this.inspectBtn.classList.toggle('hidden', !(def && def.inspect));
  }

  get modalOpen() { return !this.modalEl.classList.contains('hidden'); }

  modal(el, onClose) {
    this.modalBody.innerHTML = '';
    if (typeof el === 'string') this.modalBody.innerHTML = el;
    else this.modalBody.appendChild(el);
    this.modalEl.classList.remove('hidden');
    this.onModalClose = onClose || null;
    this.setTooltip(null);
  }

  closeModal() {
    if (!this.modalOpen) return;
    this.modalEl.classList.add('hidden');
    const cb = this.onModalClose;
    this.onModalClose = null;
    if (cb) cb();
  }

  setIncense(frac, text, low) {
    const el = $('#incense');
    el.querySelector('.burn').style.width = (frac * 100).toFixed(1) + '%';
    el.querySelector('.ember').style.left = (frac * 100).toFixed(1) + '%';
    $('#incense-text').textContent = text;
    el.classList.toggle('low', !!low);
  }

  async story(lines, { hold = 2600 } = {}) {
    const el = $('#story');
    const box = el.querySelector('.lines');
    box.innerHTML = '';
    el.classList.remove('hidden', 'fade');
    for (const l of lines) {
      const p = document.createElement('p');
      p.innerHTML = l;
      box.appendChild(p);
      await wait(60);
      p.classList.add('on');
      await wait(hold);
    }
    await wait(800);
    el.classList.add('fade');
    await wait(1600);
    el.classList.add('hidden');
  }

  async ending({ good, lines, title, stats }) {
    const el = $('#ending');
    el.classList.toggle('good', good);
    el.classList.remove('hidden');
    this.showHUD(false);
    const box = el.querySelector('.lines');
    box.innerHTML = '';
    const h2 = el.querySelector('h2');
    h2.textContent = title;
    h2.classList.remove('on');
    const btn = $('#btn-restart');
    btn.classList.remove('on');
    el.querySelector('.stats').textContent = '';
    await wait(1200);
    for (const l of lines) {
      const p = document.createElement('p');
      p.innerHTML = l;
      box.appendChild(p);
      await wait(60);
      p.classList.add('on');
      await wait(2400);
    }
    h2.classList.add('on');
    await wait(1600);
    el.querySelector('.stats').textContent = stats;
    btn.classList.add('on');
  }

  hideEnding() { $('#ending').classList.add('hidden'); }

  flash(color = '#000', inMs = 60, holdMs = 120, outMs = 500) {
    const f = $('#flash');
    f.style.background = color;
    f.style.transition = `opacity ${inMs}ms`;
    f.style.opacity = 1;
    return wait(inMs + holdMs).then(() => {
      f.style.transition = `opacity ${outMs}ms`;
      f.style.opacity = 0;
      return wait(outMs);
    });
  }

  fadeTo(color, ms) {
    const f = $('#flash');
    f.style.background = color;
    f.style.transition = `opacity ${ms}ms`;
    f.style.opacity = 1;
    return wait(ms);
  }

  clearFade() {
    const f = $('#flash');
    f.style.transition = 'opacity 600ms';
    f.style.opacity = 0;
  }
}
