import { useEffect, useRef } from "react";
import * as THREE from "three";

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

/** Push one line segment (a -> b) with a grey level per end. Additive blending turns grey into transparency. */
function seg(pos, col, a, b, ga, gb) {
  pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  col.push(ga, ga, ga, gb, gb, gb);
}

/** Hundreds of strands spiralling up an hourglass-shaped funnel, half clockwise, half counter-clockwise. */
function buildFunnel(strands, segments) {
  const pos = [];
  const col = [];
  for (let s = 0; s < strands; s++) {
    const dir = s % 2 ? 1 : -1;
    const theta0 = rand(0, TAU);
    const twist = rand(0.42, 0.72) * dir;
    const spread = rand(-0.07, 0.07);
    const gain = rand(0.2, 0.75);
    const t0 = rand(0, 0.25);
    const t1 = rand(0.55, 1);
    let prev = null;
    let prevG = 0;
    for (let i = 0; i <= segments; i++) {
      const t = t0 + (t1 - t0) * (i / segments);
      const dy = t * 7.4;
      const r = (0.42 + 0.062 * Math.pow(dy, 2.4)) * (1 + spread);
      const th = theta0 + twist * dy;
      const p = [Math.cos(th) * r, -0.5 + dy, Math.sin(th) * r];
      const edge = Math.min(i, segments - i) / (segments * 0.2);
      const g = gain * Math.min(1, edge) * (1 - t * 0.65);
      if (prev) seg(pos, col, prev, p, prevG, g);
      prev = p;
      prevG = g;
    }
  }
  return { pos, col };
}

/** Broken concentric arcs on the ground plane that read as a swirling disc. */
function buildFloor(rings, segments) {
  const pos = [];
  const col = [];
  for (let k = 0; k < rings; k++) {
    const rad = 0.7 + Math.pow(Math.random(), 1.7) * 17;
    const start = rand(0, TAU);
    const len = rand(0.9, 1) * rand(0.8, 2.4) * Math.PI;
    const gain = rand(0.15, 0.7) * Math.max(0.1, 1 - rad / 20);
    const y = -0.95 + rand(-0.03, 0.03);
    let prev = null;
    let prevG = 0;
    for (let i = 0; i <= segments; i++) {
      const th = start + len * (i / segments);
      const r = rad * (1 + 0.015 * Math.sin(th * 3 + k)) + th * 0.03;
      const p = [Math.cos(th) * r, y, Math.sin(th) * r];
      const g = gain * Math.min(1, Math.min(i, segments - i) / (segments * 0.25));
      if (prev) seg(pos, col, prev, p, prevG, g);
      prev = p;
      prevG = g;
    }
  }
  return { pos, col };
}

function buildDust(count) {
  const pos = [];
  for (let i = 0; i < count; i++) {
    const dy = rand(0, 7.2);
    const r = (0.42 + 0.062 * Math.pow(dy, 2.4)) * rand(0.7, 1.2);
    const th = rand(0, TAU);
    pos.push(Math.cos(th) * r, -0.5 + dy, Math.sin(th) * r);
  }
  return pos;
}

function makeLines({ pos, col }, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return new THREE.LineSegments(geo, material);
}

export default function VortexCanvas({ className = "" }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 1.7, 0);

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const funnel = makeLines(buildFunnel(isSmall ? 320 : 720, 120), lineMat);
    const floor = makeLines(buildFloor(isSmall ? 160 : 360, 90), lineMat);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(buildDust(isSmall ? 300 : 800), 3));
    const dust = new THREE.Points(dustGeo, dustMat);

    const funnelGroup = new THREE.Group();
    funnelGroup.add(funnel, dust);
    scene.add(funnelGroup, floor);

    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const render = (t) => {
      eased.x += (pointer.x - eased.x) * 0.04;
      eased.y += (pointer.y - eased.y) * 0.04;
      funnelGroup.rotation.y = t * 0.07;
      floor.rotation.y = -t * 0.035;
      camera.position.x = eased.x * 0.6;
      camera.position.y = 0.6 - eased.y * 0.3;
      camera.lookAt(target);
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      const aspect = w / h;
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      // pull the camera back on narrow screens so the funnel isn't cropped
      camera.position.z = aspect < 1.6 ? 9 * Math.pow(1.6 / aspect, 0.55) : 9;
      camera.updateProjectionMatrix();
      if (reduceMotion) render(2);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      render((performance.now() - t0) / 1000);
    };

    let io;
    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      // only animate while the hero is on screen
      io = new IntersectionObserver(([entry]) => {
        cancelAnimationFrame(raf);
        if (entry.isIntersecting) tick();
      });
      io.observe(host);
    }

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      funnel.geometry.dispose();
      floor.geometry.dispose();
      dustGeo.dispose();
      lineMat.dispose();
      dustMat.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
