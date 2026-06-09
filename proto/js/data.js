// Мок-данные: пользователи, артефакты (GLSL), дерево ремиксов.

export const USERS = {
  you:  { handle: 'appledev', name: 'Ты', hue: 36 },
  kira: { handle: 'kira_glsl', name: 'Кира', hue: 210 },
  den:  { handle: 'd3n', name: 'Ден', hue: 152 },
  mura: { handle: 'murasaki', name: 'Мура', hue: 276 },
  sol:  { handle: 'sol.frag', name: 'Соль', hue: 18 },
  ann:  { handle: 'annwave', name: 'Аня', hue: 330 },
  rey:  { handle: 'rey_p5', name: 'Рей', hue: 190 },
};

const NOISE_LIB = `float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}`;

export const ARTIFACTS = [
  {
    id: 'a1', title: 'Жидкий хром', author: 'kira', parent: null,
    sparks: 247, saves: 61, when: '2 ч назад', engine: 'GLSL',
    code: `// жидкий металл: fbm поверх fbm
${NOISE_LIB}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * 0.10;
  vec2 warp = vec2(fbm(uv * 2.2 + t), fbm(uv * 2.2 - t));
  float n = fbm(uv * 1.4 + warp * 1.5);
  float ridge = abs(fract(n * 3.0) - 0.5) * 2.0;
  vec3 deep   = vec3(0.020, 0.024, 0.034);
  vec3 chrome = vec3(0.86, 0.89, 0.95);
  vec3 gold   = vec3(0.91, 0.86, 0.75);
  vec3 col = mix(deep, chrome, smoothstep(0.12, 0.96, ridge));
  col = mix(col, gold, pow(smoothstep(0.72, 1.0, ridge), 3.0) * 0.7);
  col *= 1.0 - 0.35 * dot(uv, uv);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a2', title: 'Плазма /64', author: 'den', parent: null,
    sparks: 183, saves: 40, when: '5 ч назад', engine: 'GLSL',
    code: `// классика жанра, 64 строки не понадобились
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * 0.6;
  float v = sin(uv.x * 3.0 + t)
          + sin(uv.y * 4.0 - t * 0.8)
          + sin((uv.x + uv.y) * 3.5 + t * 1.3)
          + sin(length(uv) * 5.0 - t);
  vec3 col = 0.5 + 0.5 * cos(v + vec3(0.0, 2.1, 4.2));
  col *= col;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a3', title: 'Неоновая плазма', author: 'mura', parent: 'a2',
    sparks: 96, saves: 22, when: '4 ч назад', engine: 'GLSL',
    code: `// классика жанра, 64 строки не понадобились
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * 0.6;
  float v = sin(uv.x * 3.0 + t)
          + sin(uv.y * 4.0 - t * 0.8)
          + sin((uv.x + uv.y) * 3.5 + t * 1.3)
          + sin(length(uv) * 5.0 - t);
  vec3 col = 0.5 + 0.5 * cos(v * 1.4 + vec3(4.7, 2.0, 0.6));
  col = pow(col, vec3(2.4)) * 1.6;
  float scan = 0.88 + 0.12 * sin(gl_FragCoord.y * 1.7);
  gl_FragColor = vec4(col * scan, 1.0);
}`,
  },
  {
    id: 'a4', title: 'Плазма: глитч', author: 'kira', parent: 'a3',
    sparks: 71, saves: 18, when: '1 ч назад', engine: 'GLSL',
    code: `// классика жанра + сломанная развёртка
float gh(float p){ return fract(sin(p * 127.1) * 43758.5453); }

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * 0.6;
  float row = floor(gl_FragCoord.y / 14.0);
  float jolt = step(0.93, gh(row + floor(t * 3.0))) * (gh(row) - 0.5) * 1.2;
  uv.x += jolt;
  float v = sin(uv.x * 3.0 + t)
          + sin(uv.y * 4.0 - t * 0.8)
          + sin((uv.x + uv.y) * 3.5 + t * 1.3)
          + sin(length(uv) * 5.0 - t);
  vec3 col = 0.5 + 0.5 * cos(v * 1.4 + vec3(4.7, 2.0, 0.6));
  col = pow(col, vec3(2.4)) * 1.6;
  col.r += abs(jolt) * 2.0;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a5', title: 'Вороной-поток', author: 'sol', parent: null,
    sparks: 154, saves: 47, when: 'вчера', engine: 'GLSL',
    code: `// клетки дышат
vec2 hash2(vec2 p){
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y * 2.4;
  float t = u_time * 0.6;
  vec2 g = floor(uv); vec2 f = fract(uv);
  float d1 = 8.0; float d2 = 8.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 p = 0.5 + 0.5 * sin(t + hash2(g + o) * 6.2831);
    float d = length(o + p - f);
    if (d < d1) { d2 = d1; d1 = d; }
    else if (d < d2) { d2 = d; }
  }
  float edge = d2 - d1;
  vec3 col = mix(vec3(0.03, 0.05, 0.10), vec3(0.15, 0.55, 0.80), d1);
  col += vec3(0.9, 0.95, 1.0) * smoothstep(0.06, 0.0, edge) * 0.8;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a6', title: 'Чернильные клетки', author: 'ann', parent: 'a5',
    sparks: 58, saves: 15, when: '20 ч назад', engine: 'GLSL',
    code: `// клетки дышат — теперь тушью по бумаге
vec2 hash2(vec2 p){
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y * 2.4;
  float t = u_time * 0.35;
  vec2 g = floor(uv); vec2 f = fract(uv);
  float d1 = 8.0; float d2 = 8.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 p = 0.5 + 0.5 * sin(t + hash2(g + o) * 6.2831);
    float d = length(o + p - f);
    if (d < d1) { d2 = d1; d1 = d; }
    else if (d < d2) { d2 = d; }
  }
  float edge = d2 - d1;
  vec3 paper = vec3(0.93, 0.91, 0.86);
  vec3 ink = vec3(0.07, 0.08, 0.10);
  vec3 col = mix(paper, ink, smoothstep(0.14, 0.0, edge));
  col = mix(col, ink * 0.5 + paper * 0.5, d1 * 0.15);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a7', title: 'Аврора', author: 'mura', parent: null,
    sparks: 312, saves: 88, when: '2 дн назад', engine: 'GLSL',
    code: `// четыре ленты света
float star(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * 0.3;
  vec3 col = vec3(0.010, 0.012, 0.030);
  for (float i = 1.0; i <= 4.0; i += 1.0) {
    float y = uv.y - 0.45
            - 0.10 * sin(uv.x * 2.0 * i + t * i + i * 1.7)
            - 0.04 * sin(uv.x * 7.0 + t * 2.0 * i);
    float band = exp(-abs(y) * 16.0 / i) * 0.4;
    vec3 tint = mix(vec3(0.0, 0.9, 0.55), vec3(0.45, 0.20, 1.0),
                    fract(uv.x * 0.7 + 0.2 * sin(t + i)));
    col += band * tint;
  }
  col += vec3(1.0) * pow(star(floor(uv * 220.0)), 30.0) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a8', title: 'Тоннель 91', author: 'rey', parent: null,
    sparks: 129, saves: 33, when: '3 дн назад', engine: 'GLSL',
    code: `// полярная развёртка, привет демосцене
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float a = atan(uv.y, uv.x);
  float r = max(length(uv), 1e-3);
  vec2 p = vec2(a * 6.0 / 6.28318, 0.45 / r + u_time * 1.1);
  float gx = abs(sin(p.x * 3.14159 * 2.0));
  float gy = abs(sin(p.y * 3.14159 * 2.0));
  float grid = smoothstep(0.85, 1.0, gx) + smoothstep(0.85, 1.0, gy);
  vec3 col = vec3(0.9, 0.55, 0.25) * grid;
  col += vec3(0.25, 0.08, 0.35) * (1.0 - grid) * 0.6;
  col *= smoothstep(0.0, 0.55, r);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a9', title: 'Метаболы', author: 'ann', parent: null,
    sparks: 95, saves: 21, when: '3 дн назад', engine: 'GLSL',
    code: `// пять капель, одно поле
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * 0.8;
  float f = 0.0;
  for (float i = 1.0; i <= 5.0; i += 1.0) {
    vec2 c = vec2(sin(t * 0.55 * i + i * 2.1), cos(t * 0.42 * i + i * 0.7)) * 0.55;
    f += 0.045 / (0.012 + dot(uv - c, uv - c));
  }
  vec3 bg = vec3(0.02, 0.03, 0.05);
  vec3 body = vec3(0.92, 0.30, 0.45);
  float m = smoothstep(2.8, 3.0, f);
  float rim = smoothstep(2.2, 2.8, f) - m;
  vec3 col = bg + body * m + vec3(1.0, 0.8, 0.9) * rim * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'a10', title: 'Солнечная вспышка', author: 'den', parent: 'a7',
    sparks: 64, saves: 12, when: '6 ч назад', engine: 'GLSL',
    code: `// четыре ленты света, но звезда близко
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 cuv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float t = u_time * 0.3;
  vec3 col = vec3(0.05, 0.015, 0.005);
  for (float i = 1.0; i <= 4.0; i += 1.0) {
    float y = uv.y - 0.45
            - 0.10 * sin(uv.x * 2.0 * i + t * i + i * 1.7)
            - 0.04 * sin(uv.x * 7.0 + t * 2.0 * i);
    float band = exp(-abs(y) * 14.0 / i) * 0.5;
    vec3 tint = mix(vec3(1.0, 0.55, 0.10), vec3(1.0, 0.15, 0.25),
                    fract(uv.x * 0.7 + 0.2 * sin(t + i)));
    col += band * tint;
  }
  col += vec3(1.0, 0.7, 0.3) * 0.35 / (0.2 + dot(cuv, cuv) * 4.0);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
];

export function byId(id) { return ARTIFACTS.find((a) => a.id === id); }
export function childrenOf(id) { return ARTIFACTS.filter((a) => a.parent === id); }

export function rootOf(a) {
  let cur = a;
  while (cur.parent) {
    const p = byId(cur.parent);
    if (!p) break;
    cur = p;
  }
  return cur;
}

// Грубый подсчёт изменённых строк относительно родителя (для чипа в UI).
export function diffLines(childCode, parentCode) {
  const count = (lines) => {
    const m = new Map();
    for (const l of lines) m.set(l, (m.get(l) || 0) + 1);
    return m;
  };
  const a = count(parentCode.split('\n'));
  const b = childCode.split('\n');
  let changed = 0;
  for (const l of b) {
    const n = a.get(l) || 0;
    if (n > 0) a.set(l, n - 1);
    else changed++;
  }
  return changed;
}

export const BLANK_TEMPLATE = `// новый артефакт
// доступны uniform-ы: vec2 u_res, float u_time

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float d = length(uv);
  float ring = sin(d * 10.0 - u_time * 2.0);
  vec3 col = 0.5 + 0.5 * cos(ring + vec3(0.0, 2.1, 4.2));
  col *= smoothstep(1.4, 0.4, d);
  gl_FragColor = vec4(col, 1.0);
}`;
