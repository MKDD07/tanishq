import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG, DESIGNS } from './data.js';

const gsap = window.gsap;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 }; };
const params = new URLSearchParams(location.search);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

let modelsPromise;
const S = {
  current: -1, busy: false, queue: null, running: false,
  focus: -1, focusAmt: 0, yaw: 0, pitch: 0, zoom: 1, velX: 0, velY: 0, dragging: false, hsShow: 0, hs: [],
  mouse: { x: 0, y: 0 }, sm: { x: 0, y: 0 },
};

/* ═══════════════════════ loading ═══════════════════════ */
function loadModels() {
  return new Promise((res, rej) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(CONFIG.modelSrc, res, (e) => {
      if (e.lengthComputable) {
        const p = e.loaded / e.total;
        $('#logoLoad').textContent = `Preparing designs ${Math.round(p * 100)}%`;
      }
    }, rej);
  });
}
function fatal(e) {
  console.error(e);
  const f = $('#fatal');
  f.style.display = 'grid';
  f.innerHTML = `<div>Could not load <code>${CONFIG.modelSrc}</code>.<br>Open this folder through a local web server<br>(e.g. <code>npx serve</code> or <code>python -m http.server</code>) — browsers block 3D files on <code>file://</code>.</div>`;
}

/* ═══════════════════════ PRE-VIDEO PARALLAX ═══════════════════════ */
let experienceStarted = false;
function startExperienceFromScroll() {
  if (experienceStarted) return;
  experienceStarted = true;
  const pv = $('#pinPreviewVideo');
  if (pv) pv.pause();
  document.body.classList.add('is-locked');
  const pre = $('#preScroll');
  if (pre) pre.style.display = 'none';
  if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((st) => st.kill());
  runIntro();
}

function initPreScroll() {
  if (window.lucide) window.lucide.createIcons();
  const sp = $('#scrollPrompt');
  if (sp) {
    const hidePrompt = () => gsap.to(sp, { opacity: 0, y: 10, duration: 0.5, ease: 'power2.in', onComplete: () => { sp.style.display = 'none'; } });
    const timer = setTimeout(hidePrompt, 4000);
    addEventListener('scroll', () => { if (scrollY > 20) { clearTimeout(timer); hidePrompt(); } }, { once: true, passive: true });
  }
  const hb = $('#hamburgerBtn');
  const mnav = $('#mobileNav');
  const mclose = $('#mobileNavClose');
  const setNav = (open) => {
    if (!mnav) return;
    mnav.classList.toggle('is-open', open);
    mnav.setAttribute('aria-hidden', String(!open));
    if (hb) hb.setAttribute('aria-expanded', String(open));
  };
  if (hb) hb.addEventListener('click', () => setNav(true));
  if (mclose) mclose.addEventListener('click', () => setNav(false));
  $$('#preScroll .nav-dropdown-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const dd = btn.closest('.nav-dropdown');
      if (!dd) return;
      if (btn.tagName === 'A' && innerWidth > 991) return;
      e.preventDefault();
      const wasOpen = dd.classList.contains('open');
      $$('#preScroll .nav-dropdown').forEach((d) => d.classList.remove('open'));
      if (!wasOpen) dd.classList.add('open');
      btn.setAttribute('aria-expanded', String(!wasOpen));
    });
  });
  const ST = window.ScrollTrigger;
  if (!ST) { startExperienceFromScroll(); return; }
  gsap.registerPlugin(ST);

  const pv = $('#pinPreviewVideo');
  if (pv) {
    pv.src = CONFIG.introSrc;
    pv.play().catch(() => {});
  }

  // Blog hero image & text parallax
  gsap.to('.blog-hero-img', {
    yPercent: 18,
    ease: 'none',
    scrollTrigger: { trigger: '.blog-hero-banner', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.blog-title', {
    yPercent: -20,
    opacity: 0.35,
    ease: 'none',
    scrollTrigger: { trigger: '.blog-hero-banner', start: 'top 10%', end: 'bottom top', scrub: true },
  });
  gsap.to('.blog-lead', {
    yPercent: -10,
    ease: 'none',
    scrollTrigger: { trigger: '.blog-intro', start: 'top 60%', end: 'bottom top', scrub: true },
  });
  gsap.from('.blog-body', {
    y: 40,
    ease: 'none',
    scrollTrigger: { trigger: '.blog-body', start: 'top bottom', end: 'top 55%', scrub: true },
  });

  // Video entry parallax as it scrolls into view
  gsap.fromTo('#pinPreviewVideo', { yPercent: -16, scale: 1.18 }, {
    yPercent: -6,
    scale: 1.12,
    ease: 'none',
    scrollTrigger: { trigger: '#parallaxPin', start: 'top bottom', end: 'top top', scrub: true },
  });

  // Pinned video parallax before launching the full intro
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#parallaxPin',
      start: 'top top',
      end: '+=100%',
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      onLeave: startExperienceFromScroll,
    },
  });
  tl.fromTo('#pinPreviewVideo', { yPercent: -6, scale: 1.12 }, { yPercent: 0, scale: 1, ease: 'none' }, 0)
    .to('.pin-watermark', { yPercent: -24, opacity: 0, ease: 'none' }, 0);
}

/* ═══════════════════════ INTRO VIDEO ═══════════════════════ */
function runIntro() {
  const v = $('#introVideo');
  gsap.set('#intro', { visibility: 'visible' });
  v.src = CONFIG.introSrc;
  v.muted = CONFIG.introMuted;
  let done = false;
  const finish = () => { if (done) return; done = true; toLogo(); };
  v.addEventListener('ended', finish);
  v.addEventListener('error', finish);
  if (CONFIG.introSeconds > 0) {
    v.addEventListener('timeupdate', () => { if (v.currentTime >= CONFIG.introSeconds - 0.03) { v.pause(); finish(); } });
    setTimeout(finish, (CONFIG.introSeconds + 2) * 1000);
  }
  v.play().catch(finish);
}

/* ═══════════════════════ OUTRO VIDEO ═══════════════════════ */
let outroPlaying = false;
function runOutro(targetUrl) {
  if (outroPlaying) return;
  outroPlaying = true;
  const stage = $('#outro');
  const v = $('#outroVideo');

  stage.setAttribute('aria-hidden', 'false');
  gsap.set(stage, { visibility: 'visible', opacity: 0 });
  gsap.to(stage, { opacity: 1, duration: 0.45, ease: 'power2.out' });

  v.src = CONFIG.outroSrc;
  v.currentTime = 0;
  v.muted = CONFIG.outroMuted;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    v.pause();
    if (targetUrl && targetUrl !== '#') {
      location.href = targetUrl;
    } else {
      gsap.to(stage, {
        opacity: 0, duration: 0.35, ease: 'power2.in',
        onComplete: () => {
          gsap.set(stage, { visibility: 'hidden' });
          stage.setAttribute('aria-hidden', 'true');
          outroPlaying = false;
        },
      });
    }
  };

  v.addEventListener('ended', finish, { once: true });
  v.addEventListener('error', finish, { once: true });

  v.play().catch(() => {
    v.muted = true;
    v.play().catch(finish);
  });
}

/* ═══════════════════════ VIDEO → LOGO (fade out + particle formation) ═══════════════════════ */
function toLogo() {
  const stage = $('#logoStage');
  gsap.set(stage, { visibility: 'visible', opacity: 0, clipPath: 'circle(150% at 50% 50%)' });
  const tl = gsap.timeline();
  tl.to('#intro', { opacity: 0, duration: 1.0, ease: 'power2.inOut' }, 0)
    .to('#introVideo', { scale: 1.06, duration: 1.0, ease: 'power2.out' }, 0)
    .to(stage, { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, 0.1)
    .add(() => formLogo().then(dockLogo), '-=0.45')
    .add(() => { gsap.set('#intro', { visibility: 'hidden' }); $('#introVideo').pause(); });
}

function formLogo() {
  return new Promise((resolve) => {
    const cv = $('#logoCanvas'), ctx = cv.getContext('2d');
    const img = $('#logoImg');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const LW = Math.min(W * (W < 700 ? 0.42 : 0.18), 240);
    const LH = LW * 1197 / 1837;
    const x0 = (W - LW) / 2, y0 = H * 0.45 - LH / 2;
    Object.assign(img.style, { left: x0 + 'px', top: y0 + 'px', width: LW + 'px', height: LH + 'px' });
    Object.assign($('#logoTag').style, { top: (y0 + LH + 20) + 'px' });
    gsap.set('#logoLoad', { opacity: 0 });

    // sample the logo alpha into target points
    const STEP = 2;
    const sw = Math.round(LW / STEP), sh = Math.round(LH / STEP);
    const off = document.createElement('canvas'); off.width = sw; off.height = sh;
    const octx = off.getContext('2d', { willReadFrequently: true });
    const draw = () => {
      octx.drawImage(img, 0, 0, sw, sh);
      const data = octx.getImageData(0, 0, sw, sh).data;
      const cols = ['#ffffff', '#f6efe2', '#e8dcc6', '#e2b96b'];
      const P = [];
      const R = Math.hypot(W, H) * 0.6;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        if (data[(y * sw + x) * 4 + 3] < 140) continue;
        const a = Math.random() * Math.PI * 2, r = R * (0.55 + Math.random() * 0.6);
        const c = Math.random() < 0.05 ? 3 : (Math.random() * 3) | 0;
        P.push({
          tx: x0 + x * STEP + STEP / 2, ty: y0 + y * STEP + STEP / 2,
          sx: W / 2 + Math.cos(a) * r - (x0 + x * STEP), sy: H / 2 + Math.sin(a) * r - (y0 + y * STEP),
          d: Math.random() * 0.5, l: 0.5, s: (Math.random() - 0.5) * 4.4, c,
        });
      }
      P.sort((a, b) => a.c - b.c);
      const st = { p: 0 };
      const render = () => {
        ctx.clearRect(0, 0, W, H);
        let last = -1;
        for (const q of P) {
          const t = clamp((st.p - q.d) / q.l, 0, 1);
          const e = 1 - Math.pow(1 - t, 3);
          const ang = (1 - e) * q.s, ca = Math.cos(ang), sa = Math.sin(ang);
          const ox = (q.sx * ca - q.sy * sa) * (1 - e), oy = (q.sx * sa + q.sy * ca) * (1 - e);
          if (q.c !== last) { ctx.fillStyle = cols[q.c]; last = q.c; }
          ctx.globalAlpha = clamp(t * 3, 0, 1);
          ctx.fillRect(q.tx + ox - 1.6, q.ty + oy - 1.6, 3.2, 3.2);
        }
      };
      gsap.ticker.add(render);
      gsap.timeline()
        .to(st, { p: 1, duration: REDUCE ? 0.6 : 2.4, ease: 'none' })
        .to(img, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, '-=0.15')
        .to(cv, { opacity: 0, duration: 0.5 }, '-=0.35')
        .fromTo('#logoTag', { opacity: 0, y: 14, letterSpacing: '0.14em' }, { opacity: 1, y: 0, letterSpacing: '0.02em', duration: 1.0, ease: 'power3.out' }, '-=0.5')
        .add(() => { gsap.ticker.remove(render); })
        .to({}, { duration: 0.9 })
        .add(resolve);
    };
    if (img.complete && img.naturalWidth) draw(); else img.onload = draw;
  });
}

async function dockLogo() {
  const load = $('#logoLoad');
  let ready = false;
  modelsPromise.then(() => { ready = true; }).catch(() => {});
  if (!ready) { gsap.to(load, { opacity: 1, duration: 0.3 }); }
  await modelsPromise.catch(() => {});
  gsap.to(load, { opacity: 0, duration: 0.2 });

  const img = $('#logoImg');
  const hl = $('#headerLogo').getBoundingClientRect();
  const lr = img.getBoundingClientRect();
  const hx = hl.left + hl.width / 2, hy = hl.top + hl.height / 2;
  const sx = hl.width / lr.width;
  const tl = gsap.timeline();
  tl.to('#logoTag', { opacity: 0, duration: 0.35 }, 0)
    .to(img, { x: hx - (lr.left + lr.width / 2), y: hy - (lr.top + lr.height / 2), scale: sx, duration: 1.0, ease: 'power3.inOut' }, 0.1)
    .add(() => enterMain(), '>-0.15')
    .to('#logoStage', { clipPath: `circle(0% at ${hx}px ${hy}px)`, duration: 1.4, ease: 'power3.inOut' }, '>')
    .to('#headerLogo', { opacity: 1, duration: 0.5 }, '-=0.45')
    .set('#logoStage', { visibility: 'hidden' });
}

/* ═══════════════════════ THREE SCENE ═══════════════════════ */
let renderer, scene, cam, bgScene, bgCam, bg, stage, inner, pivots = [], sparks, dust, scanLine, keyLight, rimLight, mouseLight;
const L = { x: 0, y: 0, scale: 1, vh: 5, vw: 8 };
const clock = new THREE.Timer();

async function initScene() {
  const gltf = await modelsPromise;
  const canvas = $('#gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  renderer.autoClear = false;

  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  cam.position.set(0, 0, 11);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;

  keyLight = new THREE.DirectionalLight(0xffffff, 2.4); keyLight.position.set(3, 4, 6); scene.add(keyLight);
  rimLight = new THREE.PointLight(0xe2b96b, 60, 18, 1.6); rimLight.position.set(-4, 2.5, -2); scene.add(rimLight);
  mouseLight = new THREE.PointLight(0xffffff, 26, 14, 1.6); mouseLight.position.set(0, 0, 4); scene.add(mouseLight);

  buildBackground();

  stage = new THREE.Group(); inner = new THREE.Group();
  stage.add(inner); scene.add(stage);

  const M = CONFIG.material;
  DESIGNS.forEach((d) => {
    const mesh = gltf.scene.getObjectByName(d.node);
    // glossy metal: physical material built from the baked GLB maps
    const old = mesh.material;
    const mat = new THREE.MeshPhysicalMaterial({
      map: old.map, normalMap: old.normalMap, roughnessMap: old.roughnessMap, metalnessMap: old.metalnessMap, aoMap: old.aoMap,
      metalness: M.metalness, roughness: M.roughness,
      clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness,
      envMapIntensity: M.envMapIntensity, normalScale: new THREE.Vector2(M.normalScale, M.normalScale),
    });
    mesh.material = mat;
    mesh.frustumCulled = false;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e4);
    mat.clippingPlanes = [plane];

    const holder = new THREE.Group(); holder.add(mesh); holder.rotation.y = CONFIG.modelYaw;
    holder.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(holder);
    const k = CONFIG.modelHeight / b.getSize(new THREE.Vector3()).y;
    holder.scale.setScalar(k); holder.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(holder);
    holder.position.sub(b.getCenter(new THREE.Vector3())); holder.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(holder);

    const pivot = new THREE.Group(); pivot.add(holder);
    pivot.userData = { box: b, plane, mat };
    pivots.push(pivot);
  });

  buildFx();
  layout();
  addEventListener('resize', layout);
  bindPointer(canvas);

  // pre-warm GPU (shaders + textures + geometry) while the intro plays
  for (const p of pivots) {
    inner.add(p);
    renderer.render(scene, cam);
    inner.remove(p);
    await new Promise((r) => setTimeout(r, 30));
  }
}

function buildBackground() {
  bgScene = new THREE.Scene(); bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const t = hex2rgb(DESIGNS[0].theme.a), t2 = hex2rgb(DESIGNS[0].theme.b), t3 = hex2rgb(DESIGNS[0].theme.accent);
  bg = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: {
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
      uColA: { value: new THREE.Vector3(t.r, t.g, t.b) }, uColB: { value: new THREE.Vector3(t2.r, t2.g, t2.b) },
      uAccent: { value: new THREE.Vector3(t3.r, t3.g, t3.b) },
      uGlow: { value: new THREE.Vector2(0.4, 0.5) }, uPulse: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime, uPulse; uniform vec2 uRes, uGlow; uniform vec3 uColA, uColB, uAccent; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
      void main(){
        float asp = uRes.x/uRes.y; vec2 uv = vUv; vec2 p = vec2(uv.x*asp, uv.y);
        // slow horizontal water streaks
        vec2 q = vec2(p.x*.8 + uTime*.025, p.y*7. + fbm(vec2(p.x*1.4, uTime*.05))*1.6);
        float n = fbm(q + vec2(fbm(q*.7 + uTime*.06), 0.));
        float streak = smoothstep(.32, .86, n);
        vec3 col = mix(uColA, uColB, streak*.85);
        // light pool behind the jewellery
        float d = distance(p, vec2(uGlow.x*asp, uGlow.y));
        col += uAccent * (.10 + uPulse*.18) * exp(-d*d*4.2) * (1. + .15*sin(uTime*1.3));
        // soft ripple ring on transitions
        float ring = abs(d - uPulse*1.6); col += uAccent * .10 * smoothstep(.06, 0., ring) * (1.-uPulse) * step(.001, uPulse);
        col *= mix(.38, 1., smoothstep(1.2, .2, distance(uv, vec2(.5))));
        col += (hash(uv*uRes + uTime) - .5) * .018;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bg));
}

function pointsMaterial(vs, fs, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
}

function buildFx() {
  const PR = renderer.getPixelRatio();
  // ambient twinkling glints
  const N = 170, pos = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos.set([(Math.random() - 0.5) * 11, (Math.random() - 0.5) * 6.4, (Math.random() - 0.5) * 4], i * 3);
    seed[i] = Math.random() * 100; size[i] = 9 + Math.random() * 26;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  dust = new THREE.Points(g, pointsMaterial(/* glsl */`
    attribute float aSeed, aSize; uniform float uTime, uPR; uniform vec3 uShift; varying float vA;
    void main(){
      vec3 p = position; p.y = mod(p.y + 3.2 + uTime*(.03 + fract(aSeed)*.06), 6.4) - 3.2; p.x += sin(uTime*.2 + aSeed)*.15;
      vec4 mv = viewMatrix * modelMatrix * vec4(p + uShift, 1.);
      gl_Position = projectionMatrix * mv;
      float tw = pow(sin(uTime*(.8 + fract(aSeed*3.1)*1.6) + aSeed)*.5 + .5, 4.);
      vA = tw * (.35 + fract(aSeed*7.)*.65);
      gl_PointSize = aSize * uPR * (11. / -mv.z) * (.4 + tw*.8);
    }`, /* glsl */`
    precision highp float; uniform vec3 uColor; varying float vA;
    void main(){
      vec2 c = gl_PointCoord - .5;
      float core = smoothstep(.22, 0., length(c));
      float h = smoothstep(.5, 0., abs(c.x)) * smoothstep(.05, 0., abs(c.y));
      float v = smoothstep(.5, 0., abs(c.y)) * smoothstep(.05, 0., abs(c.x));
      float a = max(core, max(h, v)) * vA;
      gl_FragColor = vec4(uColor, a);
    }`, { uTime: { value: 0 }, uPR: { value: PR }, uColor: { value: new THREE.Color(1, .9, .68) }, uShift: { value: new THREE.Vector3() } }));
  dust.frustumCulled = false; scene.add(dust);

  // dot particle trail for transitions
  const M = 500, sp = new Float32Array(M * 3), rnd = new Float32Array(M * 4);
  for (let i = 0; i < M; i++) rnd.set([Math.random() - 0.5, Math.random(), (Math.random() - 0.5) * 1.6, Math.random() * 1.1 - 0.3], i * 4);
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  g2.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  sparks = new THREE.Points(g2, pointsMaterial(/* glsl */`
    attribute vec4 aRand; uniform float uLineY, uTop, uBot, uPR, uX, uW; uniform float uAlpha; varying float vA;
    void main(){
      float birthY = mix(uTop, uBot, aRand.y);
      float age = clamp((birthY - uLineY) / 1.4, 0., 1.);
      float alive = step(uLineY, birthY);
      vec3 p = vec3(uX + aRand.x*uW + aRand.z*age*1.4, birthY + aRand.w*age*.9 - age*age*.6, .6 + aRand.z*.35);
      vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      vA = alive * (1. - age) * uAlpha;
      gl_PointSize = (8. + aRand.y*12.) * uPR * (11. / -mv.z) * (1. - age*.45);
    }`, /* glsl */`
    precision highp float; uniform vec3 uColor; varying float vA;
    void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .05, d); gl_FragColor = vec4(uColor, a*a*vA); }`,
  { uLineY: { value: 0 }, uTop: { value: 3 }, uBot: { value: -3 }, uPR: { value: PR }, uX: { value: 0 }, uW: { value: 3 }, uAlpha: { value: 0 }, uColor: { value: new THREE.Color(1, .86, .55) } }));
  sparks.frustumCulled = false; sparks.visible = false; scene.add(sparks);
}

function layout() {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight, asp = w / h;
  renderer.setSize(w, h, false);
  cam.aspect = asp; cam.updateProjectionMatrix();
  L.vh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z; L.vw = L.vh * asp;
  if (w > 900) { L.x = -L.vw * 0.15; L.y = L.vh * 0.045; L.scale = clamp(asp / 1.6, 0.62, 1.05); }
  else { L.x = 0; L.y = L.vh * 0.2; L.scale = clamp(asp * 1.15, 0.38, 0.8); }
  bg.uniforms.uRes.value.set(w, h);
  bg.uniforms.uGlow.value.set(0.5 + L.x / L.vw, 0.5 + L.y / L.vh);
}

/* ═══════════════════════ pointer / drag (360° orbit) ═══════════════════════ */
function bindPointer(canvas) {
  let lx = 0, ly = 0;
  addEventListener('pointermove', (e) => {
    S.mouse.x = (e.clientX / innerWidth) * 2 - 1; S.mouse.y = (e.clientY / innerHeight) * 2 - 1;
    if (S.dragging && S.focus < 0) {
      const dx = (e.clientX - lx) * 0.01;
      const dy = (e.clientY - ly) * 0.007;
      S.yaw += dx;
      S.pitch = clamp(S.pitch + dy, -0.85, 0.85);
      S.velX = dx;
      S.velY = dy;
      if (Math.abs(S.yaw) > 0.08 || Math.abs(S.pitch) > 0.08) $('#resetView').classList.add('show');
      lx = e.clientX; ly = e.clientY;
    }
  });
  canvas.addEventListener('pointerdown', (e) => {
    S.dragging = true;
    S.velX = 0; S.velY = 0;
    lx = e.clientX; ly = e.clientY;
    gsap.killTweensOf(S, 'yaw,pitch');
    canvas.setPointerCapture(e.pointerId);
  });
  const up = () => { S.dragging = false; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    if (!S.running || S.focus >= 0) return;
    e.preventDefault();
    S.zoom = clamp(S.zoom - e.deltaY * 0.0012, 0.75, 2.2);
    if (Math.abs(S.zoom - 1) > 0.05) $('#resetView').classList.add('show');
    else if (S.focus < 0 && Math.abs(S.yaw) <= 0.08 && Math.abs(S.pitch) <= 0.08) $('#resetView').classList.remove('show');
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (!S.running) return;
    if (e.key === 'ArrowRight') goTo((S.current + 1) % DESIGNS.length);
    else if (e.key === 'ArrowLeft') goTo((S.current - 1 + DESIGNS.length) % DESIGNS.length);
    else if (/^[1-4]$/.test(e.key)) goTo(+e.key - 1);
    else if (e.key === 'Escape') unfocus();
  });
}

/* ═══════════════════════ render loop ═══════════════════════ */
const _v = new THREE.Vector3();
function tick() {
  clock.update(); const t = clock.getElapsed();
  S.sm.x += (S.mouse.x - S.sm.x) * 0.06; S.sm.y += (S.mouse.y - S.sm.y) * 0.06;
  if (!S.dragging && S.focus < 0) {
    if (Math.abs(S.velX) > 1e-4) { S.yaw += S.velX; S.velX *= 0.92; } else S.velX = 0;
    if (Math.abs(S.velY) > 1e-4) { S.pitch = clamp(S.pitch + S.velY, -0.85, 0.85); S.velY *= 0.92; } else S.velY = 0;
  }
  const idle = (1 - S.focusAmt) * (REDUCE ? 0.25 : 1);
  stage.position.set(L.x, L.y + Math.sin(t * 0.9) * 0.05 * idle, 0);
  stage.scale.setScalar(L.scale * (S.focus < 0 ? S.zoom : 1));
  stage.rotation.y = (Math.sin(t * 0.5) * 0.3 + S.sm.x * 0.32) * idle + S.yaw;
  stage.rotation.x = (-S.sm.y * 0.1 + Math.sin(t * 0.7) * 0.03) * idle + S.pitch;
  mouseLight.position.set(L.x + S.sm.x * 5, -S.sm.y * 3.2 + L.y, 4);
  rimLight.position.x = -4 + Math.sin(t * 0.4) * 1.5;
  bg.uniforms.uTime.value = t; dust.material.uniforms.uTime.value = t;
  dust.material.uniforms.uShift.value.set(L.x * 0.2, 0, 0);

  renderer.clear(); renderer.render(bgScene, bgCam);
  renderer.clearDepth(); renderer.render(scene, cam);
  updateHotspots();
}

/* ═══════════════════════ entering the experience ═══════════════════════ */
let entered = false;
async function enterMain() {
  if (entered) return; entered = true;
  try { await initScene(); } catch (e) { fatal(e); return; }
  S.running = true;
  gsap.set('#app', { visibility: 'visible' });
  gsap.set('#headerLogo', { opacity: params.has('skip') ? 1 : 0 });
  renderer.setAnimationLoop(tick);
  gsap.from('.top', { opacity: 0, y: -16, duration: 0.9, ease: 'power3.out', delay: 0.3 });
  gsap.from('.th', { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.5 });
  gsap.from('#hint', { opacity: 0, duration: 1, delay: 1.6 });
  goTo(0, true);
}

/* ═══════════════════════ designs: UI + transitions ═══════════════════════ */
function buildThumbs() {
  const nav = $('#thumbs');
  nav.innerHTML = DESIGNS.map((d, i) => `<button class="th" type="button" data-i="${i}" aria-label="${d.name}"><span class="box"><img src="${d.thumb}" alt="" draggable="false"></span><span>${d.name.split(' ')[0]}</span></button>`).join('');
  nav.addEventListener('click', (e) => { const b = e.target.closest('.th'); if (b) goTo(+b.dataset.i); });
}

function applyTheme(th, instant) {
  const A = hex2rgb(th.a), B = hex2rgb(th.b), C = hex2rgb(th.accent);
  const dur = instant ? 0 : 1.6, u = bg.uniforms;
  gsap.to(u.uColA.value, { x: A.r, y: A.g, z: A.b, duration: dur, ease: 'power2.inOut' });
  gsap.to(u.uColB.value, { x: B.r, y: B.g, z: B.b, duration: dur, ease: 'power2.inOut' });
  gsap.to(u.uAccent.value, { x: C.r, y: C.g, z: C.b, duration: dur, ease: 'power2.inOut' });
  document.documentElement.style.setProperty('--accent', th.accent);
  rimLight.color.set(th.accent);
  if (!instant) gsap.fromTo(u.uPulse, { value: 0.001 }, { value: 1, duration: 1.8, ease: 'power2.out', onComplete: () => { u.uPulse.value = 0; } });
}

function setText(d, i, first) {
  const fade = () => [$('#tagline'), $('.cta')];
  const swap = () => {
    $('#title').innerHTML = d.name.split(' ').map((w) => `<span class="w"><span>${w}</span></span>`).join('');
    $('#tagline').textContent = d.tagline;
    $('#shop').href = d.shopUrl;
    gsap.set('#title .w>span', { yPercent: 110 });
    gsap.set(fade(), { opacity: 0, y: 22 });
    gsap.to('#title .w>span', { yPercent: 0, duration: 1.0, stagger: 0.09, ease: 'power4.out' });
    gsap.to(fade(), { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.2 });
  };
  if (first) return swap();
  gsap.to('#title .w>span', { yPercent: 110, duration: 0.4, stagger: 0.03, ease: 'power3.in' });
  gsap.to(fade(), { opacity: 0, y: -14, duration: 0.3, stagger: 0.03, onComplete: swap });
}

function buildHotspots(n) {
  const d = DESIGNS[n], b = pivots[n].userData.box;
  const host = $('#hotspots'); host.innerHTML = '';
  S.hs = d.features.map((f, k) => {
    const el = document.createElement('button');
    el.className = 'hs'; el.type = 'button';
    el.innerHTML = `${k + 1}<span class="tip"><strong>${f.title}</strong><small>${f.text}</small></span>`;
    el.setAttribute('aria-label', f.title);
    el.addEventListener('click', () => focusFeature(k));
    host.appendChild(el);
    const a = new THREE.Vector3(b.min.x + f.at[0] * (b.max.x - b.min.x), b.max.y - f.at[1] * (b.max.y - b.min.y), b.max.z);
    return { el, a };
  });
}

function updateHotspots() {
  if (!S.hs.length || S.current < 0) return;
  const piv = pivots[S.current];
  const facing = clamp((Math.cos(stage.rotation.y) - 0.55) * 4, 0, 1);
  $('#hotspots').style.opacity = String(S.hsShow * facing);
  for (const h of S.hs) {
    _v.copy(h.a); piv.localToWorld(_v); _v.project(cam);
    const sx = (_v.x * 0.5 + 0.5) * innerWidth;
    const sy = (-_v.y * 0.5 + 0.5) * innerHeight;
    h.el.style.transform = `translate(${sx}px, ${sy}px)`;
    h.el.classList.toggle('flip', sx > innerWidth * 0.62);
  }
}

function goTo(n, first = false) {
  if (!S.running) return;
  if (S.busy) { S.queue = n; return; }
  if (n === S.current) return;
  S.busy = true; S.queue = null;
  const prev = S.current; S.current = n;
  const d = DESIGNS[n], inc = pivots[n], out = prev >= 0 ? pivots[prev] : null;

  unfocus(true);
  $$('.th').forEach((b, i) => b.classList.toggle('on', i === n));
  applyTheme(d.theme, first);
  setText(d, n, first);
  gsap.to(S, { hsShow: 0, duration: 0.25 });
  S.hs = []; $('#hotspots').innerHTML = '';

  inner.add(inc);
  const half = (CONFIG.modelHeight * L.scale) / 2;
  const top = L.y + half + 0.35, bot = L.y - half - 0.35;
  const su = sparks.material.uniforms;
  su.uTop.value = top; su.uBot.value = bot; su.uX.value = L.x; su.uW.value = CONFIG.modelHeight * L.scale * 0.9;
  inc.userData.plane.normal.set(0, 1, 0);
  if (out) out.userData.plane.normal.set(0, -1, 0);
  const o = { c: top };
  const setC = () => {
    inc.userData.plane.constant = -o.c;
    if (out) out.userData.plane.constant = o.c;
    su.uLineY.value = o.c;
  };
  setC();
  sparks.visible = true;
  const dur = first ? 1.9 : 1.5;

  const tl = gsap.timeline({
    onComplete: () => {
      if (out) { inner.remove(out); out.rotation.set(0, 0, 0); out.scale.setScalar(1); out.userData.plane.normal.set(0, 1, 0); out.userData.plane.constant = 1e4; }
      inc.userData.plane.normal.set(0, 1, 0); inc.userData.plane.constant = 1e4;
      sparks.visible = false;
      S.busy = false;
      if (S.queue !== null && S.queue !== S.current) goTo(S.queue);
    },
  });
  tl.to(o, { c: bot, duration: dur, ease: 'power2.inOut', onUpdate: setC }, 0)
    .fromTo(su.uAlpha, { value: 0 }, { value: 1, duration: dur * 0.25, ease: 'power2.out' }, 0)
    .to(su.uAlpha, { value: 0, duration: dur * 0.35, ease: 'power2.in' }, dur * 0.65)
    .fromTo(inc.rotation, { y: -0.8 }, { y: 0, duration: dur + 0.2, ease: 'power3.out' }, 0)
    .fromTo(inc.scale, { x: 0.88, y: 0.88, z: 0.88 }, { x: 1, y: 1, z: 1, duration: dur + 0.2, ease: 'power3.out' }, 0)
    .fromTo(inc.position, { z: -1.2 }, { z: 0, duration: dur + 0.2, ease: 'power3.out' }, 0);
  if (out) {
    tl.to(out.rotation, { y: 0.7, duration: dur, ease: 'power2.in' }, 0)
      .to(out.scale, { x: 1.1, y: 1.1, z: 1.1, duration: dur, ease: 'power2.in' }, 0);
  }
  tl.add(() => { buildHotspots(n); gsap.to(S, { hsShow: 1, duration: 0.6 }); gsap.from(S.hs.map((h) => h.el), { scale: 0, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.12 }); }, dur - 0.35);
}

/* ═══════════════════════ feature focus (zoom) ═══════════════════════ */
function focusFeature(k) {
  if (S.busy || S.current < 0) return;
  if (S.focus === k) return unfocus();
  const f = DESIGNS[S.current].features[k], a = S.hs[k]?.a; if (!a) return;
  S.focus = k;
  const s = CONFIG.focusZoom;
  $$('#features li').forEach((li, i) => {
    const on = i === k; li.classList.toggle('on', on); li.classList.toggle('dim', !on);
    $('.fb', li).setAttribute('aria-expanded', String(on));
    gsap.to($('.d', li), { height: on ? 'auto' : 0, duration: 0.5, ease: 'power3.inOut' });
  });
  S.hs.forEach((h, i) => h.el.classList.toggle('on', i === k));
  $('#resetView').classList.add('show'); $('#hint').style.opacity = 0;
  gsap.to(inner.scale, { x: s, y: s, z: s, duration: 1.2, ease: 'power3.inOut', overwrite: true });
  gsap.to(inner.position, { x: -a.x * s, y: -a.y * s, z: -a.z * s, duration: 1.2, ease: 'power3.inOut', overwrite: true });
  S.yaw = ((S.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  S.velX = 0; S.velY = 0;
  gsap.to(S, { focusAmt: 1, yaw: 0, pitch: 0, duration: 0.9, ease: 'power2.out' });
}

function unfocus(instant) {
  const rotated = Math.abs(S.yaw) > 0.01 || Math.abs(S.pitch) > 0.01 || Math.abs(S.zoom - 1) > 0.01;
  if (S.focus < 0 && !rotated && !instant) return;
  S.focus = -1;
  const dur = instant ? 0 : 1.1;
  $$('#features li').forEach((li) => { li.classList.remove('on', 'dim'); gsap.to($('.d', li), { height: 0, duration: instant ? 0 : 0.4 }); });
  S.hs.forEach((h) => h.el.classList.remove('on'));
  $('#resetView').classList.remove('show'); $('#hint').style.opacity = '';
  gsap.to(inner.scale, { x: 1, y: 1, z: 1, duration: dur, ease: 'power3.inOut', overwrite: true });
  gsap.to(inner.position, { x: 0, y: 0, z: 0, duration: dur, ease: 'power3.inOut', overwrite: true });
  S.yaw = ((S.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  S.velX = 0; S.velY = 0;
  gsap.to(S, { focusAmt: 0, yaw: 0, pitch: 0, zoom: 1, duration: dur });
}
$('#resetView').addEventListener('click', () => unfocus());

window.__tq = { S, goTo };
/* ═══════════════════════ boot ═══════════════════════ */
buildThumbs();
modelsPromise = loadModels();
modelsPromise.catch((e) => fatal(e));
$('#brandTag').textContent = CONFIG.brandTag;
$('#logoTag').textContent = CONFIG.logoTagline;
$('#logoImg').src = CONFIG.logoSrc;
$('#shop').textContent = CONFIG.shopLabel;
$('#shop').addEventListener('click', (e) => {
  e.preventDefault();
  const d = DESIGNS[S.current];
  const url = (d && d.shopUrl && d.shopUrl !== '#') ? d.shopUrl : CONFIG.defaultShopUrl;
  runOutro(url);
});


if (params.has('skip')) {
  document.body.classList.add('is-locked');
  if ($('#preScroll')) $('#preScroll').style.display = 'none';
  gsap.set('#headerLogo', { opacity: 1 });
  enterMain();
} else {
  initPreScroll();
}

