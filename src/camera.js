import * as THREE from 'three';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function yawPitch(from, to) {
  const d = new THREE.Vector3().subVectors(to, from).normalize();
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) };
}

// First-person rig: the camera sits at a point and looks around by yaw/pitch.
export class Rig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 1.6, 1.9);
    this.yaw = 0;
    this.pitch = 0;
    this.anim = null;
    this.shake = 0;
    camera.rotation.order = 'YXZ';
  }

  set(pos, look) {
    this.pos.copy(pos);
    const { yaw, pitch } = yawPitch(pos, look);
    this.yaw = yaw;
    this.pitch = pitch;
    this.anim = null;
  }

  goTo(pos, look, dur = 1.1) {
    const to = yawPitch(pos, look);
    return this.tweenTo(pos, to.yaw, to.pitch, dur);
  }

  tweenTo(pos, yaw, pitch, dur = 1.1) {
    if (this.anim) this.anim.resolve();
    return new Promise((resolve) => {
      this.anim = {
        p0: this.pos.clone(), p1: pos.clone(),
        y0: this.yaw, y1: this.yaw + wrap(yaw - this.yaw),
        q0: this.pitch, q1: pitch,
        t: 0, dur, resolve,
      };
    });
  }

  turn(dyaw, dur = 0.4) {
    return this.tweenTo(this.pos, this.yaw + dyaw, this.pitch * 0.3, dur);
  }

  get moving() { return !!this.anim; }

  look(dx, dy) {
    if (this.anim) return;
    this.yaw += dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy, -1.25, 1.25);
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  update(dt, t) {
    const a = this.anim;
    if (a) {
      a.t = Math.min(1, a.t + dt / a.dur);
      const k = ease(a.t);
      this.pos.lerpVectors(a.p0, a.p1, k);
      this.yaw = a.y0 + (a.y1 - a.y0) * k;
      this.pitch = a.q0 + (a.q1 - a.q0) * k;
      if (a.t >= 1) { this.anim = null; a.resolve(); }
    }
    const s = this.shake;
    this.camera.position.copy(this.pos);
    // gentle breathing sway keeps the room from feeling static
    this.camera.position.y += Math.sin(t * 0.9) * 0.006;
    this.camera.rotation.set(
      this.pitch + Math.sin(t * 0.7) * 0.003 + (s ? (Math.random() - 0.5) * s : 0),
      this.yaw + Math.sin(t * 0.5) * 0.004 + (s ? (Math.random() - 0.5) * s : 0),
      s ? (Math.random() - 0.5) * s * 0.5 : 0,
    );
    this.shake = Math.max(0, s - dt * 0.6);
  }
}
