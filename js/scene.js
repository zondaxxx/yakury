/* ════════════════════════════════════════════════════════════════
   AĒRIS — liquid glass stage
   Three.js scene · scroll-driven camera journey · cursor physics
   ════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const { gsap } = window;

/* ── GLSL: simplex noise (Ashima) ─────────────────────────────── */
const SIMPLEX = /* glsl */ `
vec3 aer_mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 aer_mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 aer_permute(vec4 x){ return aer_mod289(((x*34.0)+1.0)*x); }
vec4 aer_taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float aer_snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = aer_mod289(i);
  vec4 p = aer_permute(aer_permute(aer_permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = aer_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const LIQUID_FN = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform vec3  uMouse;
uniform float uMouseStrength;
${SIMPLEX}
vec3 aer_displace(vec3 p, vec3 n){
  float t = uTime;
  float d = aer_snoise(p * uFreq + vec3(0.0, t * 0.22, t * 0.16)) * uAmp;
  d += aer_snoise(p * uFreq * 2.6 + vec3(t * 0.34, 0.0, t * 0.27)) * uAmp * 0.22;
  float md = distance(p, uMouse);
  d -= uMouseStrength * 0.26 * exp(-md * md * 2.6)
       * (0.7 + 0.3 * sin(md * 9.0 - t * 5.0));
  return p + n * d;
}
`;

/* ── Final grade pass: chromatic edge, vignette, grain ────────── */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVig: { value: 0.24 },
    uGrain: { value: 0.028 },
    uCA: { value: 0.0032 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uVig;
    uniform float uGrain;
    uniform float uCA;
    varying vec2 vUv;
    float aer_hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    void main(){
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      float ca = uCA * smoothstep(0.04, 0.5, r2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d * ca).b;
      col = col * vec3(0.996, 1.0, 1.015) + vec3(0.003, 0.004, 0.008);
      col *= 1.0 - uVig * smoothstep(0.15, 0.92, r2 * 2.2);
      float g = aer_hash(uv * uRes * 0.5 + fract(uTime * 0.713) * 167.0) - 0.5;
      col += g * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

/* ════════════════════════════════════════════════════════════════
   createScene
   ════════════════════════════════════════════════════════════════ */

export function createScene({ canvas, reducedMotion = false } = {}) {
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.6 : 2);

  /* ── Renderer ─────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.042);

  const camera = new THREE.PerspectiveCamera(
    46, window.innerWidth / window.innerHeight, 0.1, 140
  );
  camera.position.set(0, 0.05, 9.2);

  /* ── Environment / lights ─────────────────────────────────── */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  pmrem.dispose();

  const keyLight = new THREE.DirectionalLight(0xeaf0ff, 2.0);
  keyLight.position.set(5, 7, 4);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x8fb0ff, 60, 60, 1.8);
  rimLight.position.set(-9, 4, -14);
  scene.add(rimLight);

  const emberLight = new THREE.PointLight(0xffd9a0, 26, 40, 1.9);
  emberLight.position.set(6, -5, -3);
  scene.add(emberLight);

  /* ── Backdrop: gradient void with breathing glow ──────────── */
  const bgMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vDir;
      float aer_hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      void main(){
        vec3 dir = normalize(vDir);
        float h = dir.y * 0.5 + 0.5;
        vec3 col = mix(vec3(0.008, 0.010, 0.016), vec3(0.028, 0.034, 0.055), pow(h, 1.35));
        float g1 = exp(-pow(distance(dir, normalize(vec3(0.55, 0.38, -0.55))), 2.0) * 3.0);
        col += vec3(0.060, 0.082, 0.135) * g1 * (0.78 + 0.22 * sin(uTime * 0.11));
        float g2 = exp(-pow(distance(dir, normalize(vec3(-0.72, -0.22, -0.4))), 2.0) * 3.8);
        col += vec3(0.095, 0.070, 0.040) * g2 * (0.82 + 0.18 * sin(uTime * 0.085 + 2.1));
        float g3 = exp(-pow(distance(dir, normalize(vec3(0.0, 0.04, -1.0))), 2.0) * 2.1);
        col += vec3(0.028, 0.036, 0.062) * g3;
        col += (aer_hash(gl_FragCoord.xy) - 0.5) * 0.012;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(75, 48, 32), bgMat));

  /* ── Light blades: faked volumetric beams ─────────────────── */
  const blades = new THREE.Group();
  const bladeDefs = [
    { c: [0.55, 0.66, 0.88], o: 0.05, p: [-4, 3.5, -11], rz: -0.62, s: 1.0, ph: 0.0 },
    { c: [0.91, 0.82, 0.62], o: 0.032, p: [6, -2.5, -16], rz: -0.4, s: 1.35, ph: 2.2 },
    { c: [0.48, 0.58, 0.85], o: 0.038, p: [1, 1.5, -22], rz: -0.75, s: 1.8, ph: 4.1 },
  ];
  const bladeGeo = new THREE.PlaneGeometry(38, 9);
  for (const def of bladeDefs) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Vector3(...def.c) },
        uOpacity: { value: def.o },
        uPhase: { value: def.ph },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uPhase;
        varying vec2 vUv;
        void main(){
          float band = smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          float across = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          float flow = 0.72 + 0.28 * sin(uTime * 0.2 + uPhase + vUv.x * 4.5);
          gl_FragColor = vec4(uColor, band * band * across * uOpacity * flow);
        }`,
    });
    const blade = new THREE.Mesh(bladeGeo, mat);
    blade.position.set(...def.p);
    blade.rotation.z = def.rz;
    blade.scale.setScalar(def.s);
    blades.add(blade);
  }
  scene.add(blades);

  /* ── Dust motes ───────────────────────────────────────────── */
  function makeDust(count, size, opacity, spin) {
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = 64;
    const ctx = cnv.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cnv);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = 2 - Math.random() * 32;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: tex, size, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true, color: 0xbfd0ea,
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData.spin = spin;
    return pts;
  }
  const dustA = makeDust(isCoarse ? 120 : 260, 0.065, 0.17, 0.006);
  const dustB = makeDust(isCoarse ? 70 : 140, 0.13, 0.09, -0.004);
  scene.add(dustA, dustB);

  /* ── Materials ────────────────────────────────────────────── */
  const liquidUniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.3 },
    uFreq: { value: 0.68 },
    uMouse: { value: new THREE.Vector3(99, 99, 99) },
    uMouseStrength: { value: 0 },
  };

  const liquidGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.055,
    transmission: 1,
    thickness: 2.4,
    ior: 1.48,
    attenuationColor: new THREE.Color(0xdfeaff),
    attenuationDistance: 6,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 0.32,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [120, 460],
    envMapIntensity: 1.25,
    specularIntensity: 1,
  });
  liquidGlass.dispersion = isCoarse ? 0 : 0.24;

  liquidGlass.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, liquidUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${LIQUID_FN}\nvoid main() {`)
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        vec3 aerN = normalize(normal);
        vec3 aerT = normalize(cross(aerN, vec3(0.31, 0.97, 0.41)));
        vec3 aerB = normalize(cross(aerN, aerT));
        float aerE = 0.025;
        vec3 aerP0 = aer_displace(position, aerN);
        vec3 aerP1 = aer_displace(position + aerT * aerE, aerN);
        vec3 aerP2 = aer_displace(position + aerB * aerE, aerN);
        vec3 objectNormal = normalize(cross(aerP1 - aerP0, aerP2 - aerP0));
        if (dot(objectNormal, aerN) < 0.0) objectNormal = -objectNormal;
        `
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = aerP0;');
  };
  liquidGlass.customProgramCacheKey = () => 'aeris-liquid';

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.06,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.2,
  });

  const frost = new THREE.MeshPhysicalMaterial({
    color: 0xdde7f5,
    metalness: 0,
    roughness: 0.4,
    transmission: 1,
    thickness: 1.1,
    ior: 1.46,
    attenuationColor: new THREE.Color(0xe8efff),
    attenuationDistance: 4,
    envMapIntensity: 0.7,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
  });

  /* ── Objects ──────────────────────────────────────────────── */
  // Liquid blob — the protagonist
  const blobG = new THREE.Group();
  const blobSeg = isCoarse ? [120, 80] : [220, 140];
  const blobMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, blobSeg[0], blobSeg[1]),
    liquidGlass
  );
  blobG.add(blobMesh);
  scene.add(blobG);

  // Chrome torus — the gate we fly through
  const ringG = new THREE.Group();
  const ringMesh = new THREE.Mesh(
    new THREE.TorusGeometry(2.3, 0.42, 72, 220),
    chrome
  );
  ringG.add(ringMesh);
  scene.add(ringG);

  // Frosted lens disc
  const lensG = new THREE.Group();
  const lensMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 96, 64), frost);
  lensMesh.scale.set(1, 1, 0.34);
  lensG.add(lensMesh);
  scene.add(lensG);

  // Floating shards constellation
  const shardsG = new THREE.Group();
  const shardDefs = [
    { geo: new THREE.SphereGeometry(0.5, 48, 32), mat: chrome, p: [-2.2, 1.1, -1.4] },
    { geo: new THREE.SphereGeometry(0.3, 40, 28), mat: chrome, p: [2.4, -0.9, -2.2] },
    { geo: new THREE.SphereGeometry(0.2, 32, 24), mat: chrome, p: [1.6, 1.6, 0.8] },
    { geo: new THREE.OctahedronGeometry(0.42, 0), mat: frost, p: [-1.7, -1.3, 0.6] },
    { geo: new THREE.OctahedronGeometry(0.3, 0), mat: frost, p: [2.9, 0.7, -0.6] },
    { geo: new THREE.TorusGeometry(0.46, 0.12, 32, 96), mat: chrome, p: [-2.9, -0.2, -2.6] },
    { geo: new THREE.CapsuleGeometry(0.16, 0.7, 12, 24), mat: chrome, p: [0.4, -1.8, -1.2] },
  ];
  for (const d of shardDefs) {
    const m = new THREE.Mesh(d.geo, d.mat);
    m.position.set(...d.p);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    m.userData = {
      baseY: d.p[1],
      ph: Math.random() * Math.PI * 2,
      rs: 0.1 + Math.random() * 0.25,
      bob: 0.1 + Math.random() * 0.16,
    };
    shardsG.add(m);
  }
  scene.add(shardsG);

  /* ── Post-processing ──────────────────────────────────────── */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(DPR);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    0.32, 0.85, 0.86
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const gradePass = new ShaderPass(GradeShader);
  gradePass.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
  composer.addPass(gradePass);

  /* ════════════════════════════════════════════════════════════
     Scroll journey — camera + object states per chapter
     ════════════════════════════════════════════════════════════ */

  const camPos = { x: 0, y: 0.05, z: 9.2 };
  const camTgt = { x: 0, y: 0, z: 0 };
  const camAux = { fov: 46, roll: 0 };

  const STATES = [
    { // 0 · hero
      cam: [0, 0.05, 10.4], tgt: [0, 0, 0], fov: 46, roll: 0,
      blob: { p: [0, -0.85, 0], r: [0, 0, 0], s: 0.85, amp: 0.3 },
      ring: { p: [3.9, -1.6, -7], r: [0.9, 0.45, 0.3], s: 1.0 },
      lens: { p: [-4.6, 2.2, -10], r: [0.4, -0.5, 0.2], s: 1.0 },
      shards: { p: [0, 0.2, -6], r: [0, 0, 0], s: 0.85 },
    },
    { // 1 · material
      cam: [1.35, 0.3, 5.8], tgt: [1.75, 0.05, 0], fov: 42, roll: -0.02,
      blob: { p: [1.85, 0.05, 0], r: [0.15, 0.7, 0], s: 0.9, amp: 0.38 },
      ring: { p: [4.6, -1.9, -8], r: [1.2, 0.6, 0.5], s: 1.0 },
      lens: { p: [-3.4, 1.5, -7.5], r: [0.5, -0.7, 0.3], s: 1.0 },
      shards: { p: [-2.6, 1.0, -4.5], r: [0, 0.5, 0], s: 0.9 },
    },
    { // 2 · optics — flythrough the chrome gate
      cam: [-0.35, 0.1, -2.8], tgt: [-0.7, 0, -10], fov: 56, roll: 0.05,
      blob: { p: [-2.7, 0.85, -8.2], r: [0.3, 1.6, 0.2], s: 0.85, amp: 0.45 },
      ring: { p: [-0.32, 0.05, -0.85], r: [0.08, -0.07, 0.7], s: 1.0 },
      lens: { p: [-0.75, -0.12, -9.6], r: [0.15, 0.35, -0.2], s: 1.25 },
      shards: { p: [-0.8, 0.2, -10.2], r: [0.4, 1.2, 0.2], s: 0.8 },
    },
    { // 3 · interface
      cam: [-0.2, 0.18, -5.6], tgt: [0, 0, -12.5], fov: 48, roll: -0.015,
      blob: { p: [-3.4, 1.35, -12.5], r: [0.5, 2.4, 0.4], s: 0.8, amp: 0.26 },
      ring: { p: [-4.9, -2.2, -15.5], r: [0.7, 0.8, 1.3], s: 1.0 },
      lens: { p: [3.2, -1.1, -13.5], r: [0.4, -0.9, 0.5], s: 0.9 },
      shards: { p: [0.2, -0.1, -12.0], r: [0.8, 2.2, 0.5], s: 0.95 },
    },
    { // 4 · manifesto — quiet drift
      cam: [0, 0.55, -8.0], tgt: [0, 0.4, -15.5], fov: 44, roll: 0,
      blob: { p: [0, 1.0, -17.8], r: [0.7, 3.4, 0.6], s: 0.9, amp: 0.3 },
      ring: { p: [4.4, 2.4, -19], r: [1.3, 1.1, 1.8], s: 1.0 },
      lens: { p: [-4.2, -1.5, -18.5], r: [0.7, -1.3, 0.8], s: 0.85 },
      shards: { p: [0, 0.6, -16.5], r: [1.3, 3.0, 0.9], s: 0.85 },
    },
    { // 5 · finale — the constellation regroups
      cam: [0, 0.15, -9.7], tgt: [0, 0.05, -16.6], fov: 47, roll: 0,
      blob: { p: [0, 0.0, -16.6], r: [0.9, 4.2, 0.8], s: 0.95, amp: 0.36 },
      ring: { p: [0, 0.0, -16.8], r: [0.3, -0.08, 2.4], s: 1.06 },
      lens: { p: [3.1, 1.7, -15.0], r: [0.9, -1.6, 1.0], s: 0.62 },
      shards: { p: [0, 0, -16.4], r: [1.8, 4.0, 1.2], s: 0.72 },
    },
  ];

  function applyState(st) {
    [camPos.x, camPos.y, camPos.z] = st.cam;
    [camTgt.x, camTgt.y, camTgt.z] = st.tgt;
    camAux.fov = st.fov;
    camAux.roll = st.roll;
    for (const [g, key] of [[blobG, 'blob'], [ringG, 'ring'], [lensG, 'lens'], [shardsG, 'shards']]) {
      g.position.set(...st[key].p);
      g.rotation.set(...st[key].r);
      g.scale.setScalar(st[key].s);
    }
    liquidUniforms.uAmp.value = st.blob.amp;
  }
  applyState(STATES[0]);

  const SECTION_IDS = ['hero', 'material', 'optics', 'interface', 'manifesto', 'finale'];
  const fogProxy = { d: 0.042 };
  let journey = null;
  const onProgress = []; // listeners (rail fill etc.)

  function buildJourney() {
    if (reducedMotion) return;
    if (journey) {
      journey.scrollTrigger?.kill();
      journey.kill();
    }

    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const F = SECTION_IDS.map((id) => {
      const el = document.getElementById(id);
      return Math.min(1, Math.max(0, (el?.offsetTop ?? 0) / range));
    });

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '#page',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.9,
        onUpdate: (st) => onProgress.forEach((fn) => fn(st.progress)),
      },
    });

    for (let i = 0; i < STATES.length - 1; i++) {
      const t0 = F[i];
      const dur = Math.max(0.0001, F[i + 1] - F[i]);
      const next = STATES[i + 1];
      tl.to(camPos, { x: next.cam[0], y: next.cam[1], z: next.cam[2], duration: dur }, t0);
      tl.to(camTgt, { x: next.tgt[0], y: next.tgt[1], z: next.tgt[2], duration: dur }, t0);
      tl.to(camAux, { fov: next.fov, roll: next.roll, duration: dur }, t0);
      for (const [g, key] of [[blobG, 'blob'], [ringG, 'ring'], [lensG, 'lens'], [shardsG, 'shards']]) {
        const s = next[key];
        tl.to(g.position, { x: s.p[0], y: s.p[1], z: s.p[2], duration: dur }, t0);
        tl.to(g.rotation, { x: s.r[0], y: s.r[1], z: s.r[2], duration: dur }, t0);
        tl.to(g.scale, { x: s.s, y: s.s, z: s.s, duration: dur }, t0);
      }
      tl.to(liquidUniforms.uAmp, { value: next.blob.amp, duration: dur }, t0);
    }

    // Bloom score — swells as the camera threads the chrome gate
    const gate = F[1] + (F[2] - F[1]) * 0.82;
    const bloomKeys = [
      [0, 0.32], [F[1], 0.26], [gate, 0.85], [F[2], 0.45],
      [F[3], 0.24], [F[4], 0.36], [F[5], 0.34],
    ];
    for (let i = 1; i < bloomKeys.length; i++) {
      const [t, v] = bloomKeys[i];
      const prev = bloomKeys[i - 1][0];
      tl.to(bloomPass, { strength: v, duration: Math.max(0.0001, t - prev) }, prev);
    }

    // Fog density — thickens in the deep chapters
    const fogKeys = [[0, 0.042], [F[1], 0.046], [F[2], 0.055], [F[3], 0.05], [F[4], 0.062], [F[5], 0.04]];
    for (let i = 1; i < fogKeys.length; i++) {
      const [t, v] = fogKeys[i];
      const prev = fogKeys[i - 1][0];
      tl.to(fogProxy, {
        d: v,
        duration: Math.max(0.0001, t - prev),
        onUpdate: () => { scene.fog.density = fogProxy.d; },
      }, prev);
    }

    // Pad to exactly 1 so scroll fraction === timeline time
    if (F[F.length - 1] < 1) tl.to({}, { duration: 1 - F[F.length - 1] }, F[F.length - 1]);

    journey = tl;
  }

  /* ── Pointer: parallax + liquid agitation ─────────────────── */
  const pointer = new THREE.Vector2(0, 0);
  const par = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const blobSphere = new THREE.Sphere(new THREE.Vector3(), 1.6);
  const hitWorld = new THREE.Vector3();
  let mouseTargetStrength = 0;

  if (!isCoarse) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });
  }

  /* ── Render loop ──────────────────────────────────────────── */
  const clock = new THREE.Clock();
  let elapsed = 0;
  let frame = 0;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const t = elapsed;
    frame++;

    liquidUniforms.uTime.value = t;
    bgMat.uniforms.uTime.value = t;
    gradePass.uniforms.uTime.value = t;
    for (const b of blades.children) b.material.uniforms.uTime.value = t;

    // idle life on the children (groups belong to the scroll journey)
    blobMesh.rotation.y = t * 0.12;
    blobMesh.rotation.z = Math.sin(t * 0.07) * 0.18;
    blobMesh.position.y = Math.sin(t * 0.5) * 0.07;
    ringMesh.rotation.z = t * 0.07;
    ringMesh.rotation.x = Math.sin(t * 0.16) * 0.1;
    lensMesh.rotation.z = t * 0.09;
    lensMesh.rotation.x = Math.sin(t * 0.13) * 0.12;
    for (const s of shardsG.children) {
      const u = s.userData;
      s.rotation.x += dt * u.rs;
      s.rotation.y += dt * u.rs * 0.7;
      s.position.y = u.baseY + Math.sin(t * 0.6 + u.ph) * u.bob;
    }
    dustA.rotation.y += dt * dustA.userData.spin;
    dustB.rotation.y += dt * dustB.userData.spin;

    // pointer parallax (lerped, layered)
    par.x += (pointer.x * 0.5 - par.x) * 0.045;
    par.y += (pointer.y * 0.3 - par.y) * 0.045;

    camera.position.set(camPos.x + par.x, camPos.y + par.y, camPos.z);
    camera.lookAt(camTgt.x - par.x * 0.5, camTgt.y - par.y * 0.4, camTgt.z);
    if (camAux.roll) camera.rotateZ(camAux.roll);
    if (Math.abs(camera.fov - camAux.fov) > 0.01) {
      camera.fov += (camAux.fov - camera.fov) * 0.12;
      camera.updateProjectionMatrix();
    }

    // cursor → liquid agitation on the blob (cheap sphere raycast)
    if (!isCoarse && frame % 2 === 0) {
      raycaster.setFromCamera(pointer, camera);
      blobG.getWorldPosition(blobSphere.center);
      blobSphere.radius = 1.65 * blobG.scale.x;
      const hit = raycaster.ray.intersectSphere(blobSphere, hitWorld);
      mouseTargetStrength = hit ? 1 : 0;
      if (hit) liquidUniforms.uMouse.value.copy(blobMesh.worldToLocal(hitWorld.clone()));
    }
    liquidUniforms.uMouseStrength.value +=
      (mouseTargetStrength - liquidUniforms.uMouseStrength.value) * 0.07;

    composer.render();
  }

  /* ── Resize ───────────────────────────────────────────────── */
  let resizeTimer = 0;
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    gradePass.uniforms.uRes.value.set(w, h);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildJourney();
      window.ScrollTrigger?.refresh();
    }, 220);
  }
  window.addEventListener('resize', onResize);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.body.classList.add('no-webgl');
  });

  /* ── Warm-up: compile shaders before the veil lifts ───────── */
  async function ready() {
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    composer.render(); // first heavyweight frame happens behind the veil
    gsap.ticker.add(tick);
    return true;
  }

  return { ready, buildJourney, onProgress, applyState, STATES };
}
