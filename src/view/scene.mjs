import * as THREE from 'three';
import { terrainHeight } from '../core/maps.mjs';

const C = { sky: 0x0E1430, fog: 0x1B2350, grass: 0x2F5D50, sand: 0xC9B48A, wood: 0x6B4A2F,
  sea: 0x12384A, light: 0xFFB347, core: 0xFFE9B0, off: 0x5B5F6E, mote: 0xFFF6C2,
  shade: 0x120A1A, rim: 0x7A3CFF, stunned: 0x3A3450, shirt: 0xE8E2D0, red: 0xC8102E };
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
const mesh = (geo, mat, pos = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); return m; };
export class WorldView {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    container.append(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(C.sky); this.scene.fog = new THREE.FogExp2(C.fog, .007);
    this.camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 500);
    this.ambient = new THREE.AmbientLight(0xb7d1ed, .15); this.scene.add(this.ambient);
    const moon = new THREE.DirectionalLight(0xa6c4f0, 1.5); moon.position.set(-25, 50, -10); this.scene.add(moon);
    const fill = new THREE.DirectionalLight(0xffdba1, .45); fill.position.set(10, 12, 30); this.scene.add(fill);
    this.stage = new THREE.Group(); this.scene.add(this.stage);
    this.buildSky(); this.buildPlayer(); this.lamps = [];
    this.moteMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 5, 4), new THREE.MeshBasicMaterial({ color: C.mote }), 1024);
    this.glowMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.25, 5, 4), new THREE.MeshBasicMaterial({ color: 0xFFE58A, transparent: true, opacity: .2, depthWrite: false }), 1024);
    this.shadeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.68, 8, 6), material(C.shade, { emissive: C.rim, emissiveIntensity: .12 }), 256);
    this.eyeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.10, 5, 4), new THREE.MeshBasicMaterial({ color: C.rim }), 512);
    this.scene.add(this.moteMesh, this.glowMesh, this.shadeMesh, this.eyeMesh);
    this.pulseMesh = mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: C.light, wireframe: true, transparent: true, opacity: .3 }));
    this.pulseMesh.visible = false; this.scene.add(this.pulseMesh); this.pulseAge = 100;
    this.dummy = new THREE.Object3D(); this.yaw = 0; this.cameraInitialized = false;
    window.addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
  }
  buildSky() {
    const positions = [], random = (() => { let n = 123; return () => { n = Math.imul(n, 1664525) + 1013904223 | 0; return (n >>> 0) / 4294967296; }; })();
    for (let i = 0; i < 650; i++) { const a = random() * Math.PI * 2, r = 140 + random() * 80; positions.push(Math.cos(a) * r, 35 + random() * 130, Math.sin(a) * r); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe4e8ff, size: .23, transparent: true, opacity: .65 })));
    const sea = mesh(new THREE.CircleGeometry(250, 80), material(C.sea), [0, -5, 0]); sea.rotation.x = -Math.PI / 2; this.scene.add(sea);
    const moon = mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffedbf }), [-75, 65, 90]); this.scene.add(moon);
    const cloudMat = material(0x314c66, { transparent: true, opacity: .6 });
    for (let i = 0; i < 24; i++) { const a = i * 2.4, r = 48 + i % 5 * 10; const cloud = mesh(new THREE.SphereGeometry(1, 8, 6), cloudMat, [Math.cos(a) * r, -4 - i % 3, Math.sin(a) * r]); cloud.scale.set(12, 1.5, 7); this.scene.add(cloud); }
  }
  buildPlayer() {
    this.may = new THREE.Group(); this.scene.add(this.may);
    const coat = mesh(new THREE.CylinderGeometry(.28, .42, .7, 8), material(C.shirt), [0, .88, 0]); this.may.add(coat);
    this.may.add(mesh(new THREE.SphereGeometry(.25, 10, 8), material(0xd8ac82), [0, 1.43, 0]));
    this.may.add(mesh(new THREE.ConeGeometry(.7, .32, 24), material(C.sand), [0, 1.72, 0]));
    const scarf = mesh(new THREE.BoxGeometry(.65, .13, .4), material(C.red), [0, 1.14, 0]); this.may.add(scarf);
    this.legs = [-1, 1].map(side => { const leg = mesh(new THREE.CylinderGeometry(.09, .1, .48, 6), material(0x25394b), [side * .16, .3, 0]); this.may.add(leg); return leg; });
    const lamp = mesh(new THREE.SphereGeometry(.16, 8, 6), material(C.light, { emissive: C.light, emissiveIntensity: 1.3 }), [.55, .92, .1]); this.may.add(lamp);
    this.playerLight = new THREE.PointLight(C.light, 9, 8, 2); this.playerLight.position.set(.5, 1, .1); this.may.add(this.playerLight);
    const shadow = mesh(new THREE.CircleGeometry(.55, 20), new THREE.MeshBasicMaterial({ color: 0x091b24, transparent: true, opacity: .5 }), [0, .015, 0]); shadow.rotation.x = -Math.PI / 2; this.shadow = shadow; this.scene.add(shadow);
  }
  load(game) {
    for (const obj of [...this.stage.children]) { this.stage.remove(obj); obj.traverse(child => { child.geometry?.dispose(); if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material?.dispose(); }); }
    this.lamps = []; this.cameraInitialized = false;
    for (const island of game.map.islands) {
      this.stage.add(mesh(new THREE.CylinderGeometry(island.radius, island.radius * .9, 3.2, 64), material(C.sand), [island.x, -1.65, island.z]));
      this.stage.add(mesh(new THREE.CylinderGeometry(island.radius - .8, island.radius - .8, .15, 64), material(C.grass), [island.x, -.08, island.z]));
      const path = mesh(new THREE.RingGeometry(10.5, 13.5, 64), material(0x597363), [island.x, .012, island.z]); path.rotation.x = -Math.PI / 2; this.stage.add(path);
      // Low-poly reeds and stones are decorative, without collision or simulation entities.
      for (let i = 0; i < 55; i++) {
        const a = i * 2.39996, r = 5 + (i * 13 % Math.floor(island.radius - 6));
        const x = island.x + Math.cos(a) * r, z = island.z + Math.sin(a) * r;
        const grass = mesh(new THREE.ConeGeometry(.25, .7 + i % 3 * .2, 4), material(i % 3 ? 0x3c7562 : 0x6d9569), [x, .35, z]); this.stage.add(grass);
      }
    }
    for (const l of game.lanterns) {
      const group = new THREE.Group(); group.position.set(...l.pos);
      group.add(mesh(new THREE.CylinderGeometry(.09, .12, 3, 8), material(C.wood), [0, 1.5, 0]));
      group.add(mesh(new THREE.BoxGeometry(1.4, .12, .12), material(C.wood), [.5, 2.9, 0]));
      const paper = mesh(new THREE.SphereGeometry(.6, 12, 10), material(C.off, { emissive: C.light, emissiveIntensity: 0 }), [.92, 2.25, 0]); paper.scale.set(.8, 1, .8); group.add(paper);
      const ring = mesh(new THREE.TorusGeometry(.5, .025, 4, 18), material(C.wood), [.92, 2.25, 0]); ring.rotation.x = Math.PI / 2; group.add(ring);
      group.add(mesh(new THREE.ConeGeometry(.65, .25, 8), material(C.wood), [.92, 2.9, 0]));
      const light = new THREE.PointLight(C.light, 0, 15, 2); light.position.set(.92, 2.1, 0); group.add(light);
      const halo = mesh(new THREE.RingGeometry(1.4, 1.5, 40), new THREE.MeshBasicMaterial({ color: C.light, transparent: true, opacity: .3 }), [0, .03, 0]); halo.rotation.x = -Math.PI / 2; group.add(halo);
      this.stage.add(group); this.lamps.push({ group, paper, light, halo });
    }
  }
  pulse(pos) { this.pulseAge = 0; this.pulseMesh.position.set(pos[0], pos[1] + .8, pos[2]); }
  update(game, seconds, dt, { menu = false, benchmark = false } = {}) {
    this.may.position.set(...game.player.pos); this.may.rotation.y = Math.atan2(game.player.face[0], game.player.face[1]);
    const speed = Math.hypot(game.player.vel[0], game.player.vel[2]);
    this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(seconds * 13 + i * Math.PI) * Math.min(.5, speed * .07); });
    const h = terrainHeight(game.map, game.player.pos[0], game.player.pos[2]); this.shadow.visible = Number.isFinite(h); this.shadow.position.set(game.player.pos[0], Number.isFinite(h) ? h + .02 : 0, game.player.pos[2]);
    this.may.visible = !game.player.respawn;
    const lit = game.lanterns.filter(l => l.lit).length; this.ambient.intensity = .15 + .55 * lit / game.lanterns.length;
    game.lanterns.forEach((l, i) => { const v = this.lamps[i]; v.paper.material.color.setHex(l.lit ? C.light : C.off); v.paper.material.emissiveIntensity = l.lit ? 1.5 : 0; v.paper.scale.y = l.lit ? 1 : .8; v.light.intensity = l.lit ? 45 : 0; v.halo.visible = l.lit; });
    this.moteMesh.count = this.glowMesh.count = Math.min(game.motes.length, 1024);
    game.motes.slice(0, 1024).forEach((m, i) => {
      this.dummy.position.set(m.pos[0], m.pos[1] + .65 + Math.sin(seconds * 2 + i) * .16, m.pos[2]); this.dummy.scale.setScalar(1); this.dummy.updateMatrix();
      this.moteMesh.setMatrixAt(i, this.dummy.matrix); this.glowMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.moteMesh.instanceMatrix.needsUpdate = this.glowMesh.instanceMatrix.needsUpdate = true;
    this.shadeMesh.count = Math.min(game.shades.length, 256); this.eyeMesh.count = this.shadeMesh.count * 2;
    game.shades.slice(0, 256).forEach((s, i) => {
      this.dummy.position.set(s.pos[0], s.pos[1] + Math.sin(seconds * 2 + i) * .08, s.pos[2]); this.dummy.scale.set(.8, 1.2, .8); this.dummy.updateMatrix(); this.shadeMesh.setMatrixAt(i, this.dummy.matrix);
      this.shadeMesh.setColorAt(i, new THREE.Color(s.state === 'stunned' ? C.stunned : C.shade));
      [-1, 1].forEach((side, eye) => { this.dummy.position.set(s.pos[0] + side * .2, s.pos[1] + .12, s.pos[2] - .52); this.dummy.scale.setScalar(1); this.dummy.updateMatrix(); this.eyeMesh.setMatrixAt(i * 2 + eye, this.dummy.matrix); });
    });
    this.shadeMesh.instanceMatrix.needsUpdate = this.eyeMesh.instanceMatrix.needsUpdate = true; if (this.shadeMesh.instanceColor) this.shadeMesh.instanceColor.needsUpdate = true;
    this.pulseAge += dt; this.pulseMesh.visible = this.pulseAge < .6; if (this.pulseMesh.visible) { this.pulseMesh.scale.setScalar(1 + this.pulseAge * 8); this.pulseMesh.material.opacity = .35 * (1 - this.pulseAge / .6); }
    if (benchmark) {
      const a = seconds * Math.PI * 2 / 15; this.camera.position.set(30 * Math.cos(a), 15, 30 * Math.sin(a)); this.camera.lookAt(0, 0, 0);
    } else if (menu) {
      const a = .35 + seconds * .025; this.camera.position.set(Math.sin(a) * 45, 27, -Math.cos(a) * 45); this.camera.lookAt(0, 1, 5);
    } else {
      const p = game.player.pos, target = new THREE.Vector3(p[0] - Math.sin(this.yaw) * 13, Math.max(-3, p[1] + 9), p[2] - Math.cos(this.yaw) * 13);
      if (!this.cameraInitialized) { this.camera.position.copy(target); this.cameraInitialized = true; }
      else this.camera.position.lerp(target, 1 - Math.exp(-8 * dt));
      this.camera.lookAt(p[0], Math.max(-8, p[1] + 1), p[2]);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
