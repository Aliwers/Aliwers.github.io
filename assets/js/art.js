/* Процедурные пиксель-обложки.
   Реальных скриншотов игр здесь нет и быть не может — вместо них
   для каждой игры детерминированно рисуется сцена в духе её жанра.
   Один и тот же тайтл всегда даёт одну и ту же картинку. */

const ART_W = 160;
const ART_H = 120;

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — короткий детерминированный PRNG */
function makeRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;

/* Время суток. Без него все платформеры одного жанра выходят
   на одно лицо — а «Соников» в каталоге подряд идёт три штуки. */
const MOODS = [
  { key: "day",   sky: [40, 60], far: 42, mid: 32, near: 21, ground: 36, sat: 58 },
  { key: "dusk",  sky: [26, 48], far: 34, mid: 25, near: 16, ground: 29, sat: 70 },
  { key: "night", sky: [9, 19],  far: 24, mid: 17, near: 11, ground: 19, sat: 46 },
];

/* Палитра выводится из жанрового тона, чтобы жанр читался по цвету,
   но время суток и разброс тона делают каждую игру своей. */
function makePalette(hue, rnd) {
  const mood = MOODS[Math.floor(rnd() * MOODS.length)];
  const base = hue + Math.round((rnd() - 0.5) * 140);
  const s = mood.sat;
  return {
    mood: mood.key,
    sky: [hsl(base, s, mood.sky[0]), hsl(base + 25, s + 6, mood.sky[1])],
    far: hsl(base + 200, s - 20, mood.far),
    mid: hsl(base + 190, s - 14, mood.mid),
    near: hsl(base + 180, s - 8, mood.near),
    ground: hsl(base + 15, s - 12, mood.ground),
    accent: hsl(base + 165, 85, mood.key === "night" ? 64 : 56),
    hot: hsl(base + 300, 90, 62),
    ink: hsl(base, 45, 6),
  };
}

function fillSky(c, p) {
  const g = c.createLinearGradient(0, 0, 0, ART_H);
  g.addColorStop(0, p.sky[0]);
  g.addColorStop(1, p.sky[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, ART_W, ART_H);
}

function stars(c, rnd, n, color) {
  c.fillStyle = color;
  for (let i = 0; i < n; i++) {
    c.fillRect(Math.floor(rnd() * ART_W), Math.floor(rnd() * ART_H * 0.7), 1, 1);
  }
}

/* Силуэт холмов/зданий одной полосой — используется несколькими сценами */
function ridge(c, rnd, baseY, amp, step, color) {
  c.fillStyle = color;
  let y = baseY;
  for (let x = 0; x < ART_W; x += step) {
    y += Math.round((rnd() - 0.5) * amp);
    y = Math.max(baseY - amp * 2, Math.min(ART_H - 8, y));
    c.fillRect(x, y, step, ART_H - y);
  }
}

function skyline(c, rnd, baseY, color, lightColor) {
  let x = 0;
  while (x < ART_W) {
    const w = 8 + Math.floor(rnd() * 16);
    const h = 12 + Math.floor(rnd() * 46);
    c.fillStyle = color;
    c.fillRect(x, baseY - h, w, h);
    c.fillStyle = lightColor;
    for (let wy = baseY - h + 3; wy < baseY - 3; wy += 6) {
      for (let wx = x + 2; wx < x + w - 2; wx += 5) {
        if (rnd() > 0.45) c.fillRect(wx, wy, 2, 3);
      }
    }
    x += w + 2 + Math.floor(rnd() * 4);
  }
}

/* Человекоподобная фигурка в 8×14 пикселей — читается даже мелко */
function figure(c, x, y, body, skin, flip) {
  const d = flip ? -1 : 1;
  c.fillStyle = skin;
  c.fillRect(x + 2, y, 4, 4);
  c.fillStyle = body;
  c.fillRect(x + 1, y + 4, 6, 6);
  c.fillRect(x + 1 + d * 5, y + 5, 3, 2);
  c.fillRect(x + 1, y + 10, 2, 4);
  c.fillRect(x + 5, y + 10, 2, 4);
}

const SCENES = {
  plat(c, rnd, p) {
    fillSky(c, p);
    if (p.mood === "night") {
      stars(c, rnd, 40, "#ffffff");
      c.fillStyle = "#f4f1dd";
      c.beginPath(); c.arc(126 + rnd() * 20, 24, 9, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = "rgba(255,255,255,0.22)";
      for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
        const cx = rnd() * ART_W, cy = 12 + rnd() * 26;
        c.fillRect(cx, cy, 16 + rnd() * 14, 4);
        c.fillRect(cx + 4, cy - 3, 10, 3);
      }
    }
    const hills = 3 + Math.floor(rnd() * 5);
    const horizon = 70 + Math.floor(rnd() * 16);
    c.fillStyle = p.far;
    for (let i = 0; i < hills; i++) {
      const cx = rnd() * ART_W, r = 12 + rnd() * 26;
      c.beginPath(); c.arc(cx, horizon + 8, r, Math.PI, 0); c.fill();
    }
    ridge(c, rnd, horizon + 16, 4, 8, p.mid);
    const groundY = 96 + Math.floor(rnd() * 10);
    c.fillStyle = p.ground;
    c.fillRect(0, groundY, ART_W, ART_H - groundY);
    c.fillStyle = p.near;
    for (let x = 0; x < ART_W; x += 8) c.fillRect(x, groundY, 7, 3);
    const ledges = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < ledges; i++) {
      const px = 10 + rnd() * 116, py = 48 + rnd() * 38, pw = 18 + rnd() * 26;
      c.fillStyle = p.ground; c.fillRect(px, py, pw, 6);
      c.fillStyle = p.accent; c.fillRect(px, py, pw, 2);
    }
    figure(c, 16 + rnd() * 26, groundY - 16, p.hot, p.accent, false);
    c.fillStyle = p.accent;
    for (let i = 0; i < 2 + Math.floor(rnd() * 4); i++) {
      c.fillRect(70 + rnd() * 80, 34 + rnd() * 44, 5, 5);
    }
  },

  beat(c, rnd, p) {
    fillSky(c, p);
    skyline(c, rnd, 84, p.mid, p.accent);
    c.fillStyle = p.ground; c.fillRect(0, 84, ART_W, 36);
    c.fillStyle = p.near;
    for (let x = -20; x < ART_W; x += 18) {
      c.beginPath(); c.moveTo(x, 120); c.lineTo(x + 9, 84); c.lineTo(x + 12, 84); c.lineTo(x + 6, 120); c.fill();
    }
    figure(c, 40, 92, p.hot, p.accent, false);
    figure(c, 92, 92, p.accent, p.hot, true);
    figure(c, 116, 90, p.far, p.hot, true);
    c.fillStyle = p.hot;
    c.fillRect(60, 96, 26, 2);
  },

  fight(c, rnd, p) {
    fillSky(c, p);
    c.fillStyle = p.far;
    c.fillRect(0, 30, ART_W, 58);
    skyline(c, rnd, 88, p.mid, p.hot);
    c.fillStyle = p.ground; c.fillRect(0, 88, ART_W, 32);
    figure(c, 34, 92, p.hot, p.accent, false);
    figure(c, 108, 92, p.accent, p.hot, true);
    c.fillStyle = p.ink;
    c.fillRect(8, 8, 62, 8); c.fillRect(90, 8, 62, 8);
    c.fillStyle = p.hot;
    c.fillRect(10, 10, 40 + rnd() * 18, 4);
    c.fillStyle = p.accent;
    c.fillRect(92, 10, 30 + rnd() * 26, 4);
  },

  shoot(c, rnd, p) {
    c.fillStyle = p.ink; c.fillRect(0, 0, ART_W, ART_H);
    stars(c, rnd, 70, p.accent);
    stars(c, rnd, 30, "#ffffff");
    c.fillStyle = p.far;
    c.beginPath(); c.arc(126, 30, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.hot;
    for (let i = 0; i < 6; i++) {
      const ex = 60 + rnd() * 90, ey = 12 + rnd() * 90;
      c.fillRect(ex, ey, 7, 5); c.fillRect(ex + 2, ey + 5, 3, 2);
    }
    c.fillStyle = p.accent;
    c.fillRect(20, 56, 14, 6); c.fillRect(26, 52, 6, 14); c.fillRect(16, 58, 4, 2);
    c.fillStyle = "#ffffff";
    for (let i = 0; i < 5; i++) c.fillRect(38 + i * 14, 58 + (i % 2) * 3, 6, 2);
  },

  race(c, rnd, p) {
    const g = c.createLinearGradient(0, 0, 0, 56);
    g.addColorStop(0, p.sky[0]); g.addColorStop(1, p.hot);
    c.fillStyle = g; c.fillRect(0, 0, ART_W, 56);
    c.fillStyle = p.far;
    for (let i = 0; i < 4; i++) {
      const cx = rnd() * ART_W;
      c.beginPath(); c.moveTo(cx - 24, 56); c.lineTo(cx, 24 + rnd() * 14); c.lineTo(cx + 24, 56); c.fill();
    }
    c.fillStyle = p.ground; c.fillRect(0, 56, ART_W, 64);
    // дорога в перспективе
    c.fillStyle = p.near;
    c.beginPath(); c.moveTo(66, 56); c.lineTo(94, 56); c.lineTo(160, 120); c.lineTo(0, 120); c.fill();
    c.fillStyle = "#f2f2f2";
    let y = 58, h = 2;
    while (y < 120) {
      const t = (y - 56) / 64;
      const cx = 80 + (t * 0);
      const w = 1 + t * 5;
      c.fillRect(cx - w / 2, y, w, h);
      y += h + 3 + t * 9; h = 2 + t * 5;
    }
    c.fillStyle = p.accent;
    c.fillRect(58, 100, 44, 14); c.fillRect(66, 92, 28, 8);
    c.fillStyle = p.ink;
    c.fillRect(54, 110, 10, 8); c.fillRect(96, 110, 10, 8);
  },

  rpg(c, rnd, p) {
    c.fillStyle = p.mid; c.fillRect(0, 0, ART_W, ART_H);
    // травяные тайлы
    for (let y = 0; y < ART_H; y += 8) {
      for (let x = 0; x < ART_W; x += 8) {
        c.fillStyle = rnd() > 0.5 ? p.mid : p.far;
        c.fillRect(x, y, 8, 8);
      }
    }
    c.fillStyle = p.sky[1];
    c.beginPath(); c.moveTo(0, 60); c.lineTo(50, 52); c.lineTo(110, 70); c.lineTo(160, 62);
    c.lineTo(160, 86); c.lineTo(0, 84); c.fill();
    // замок
    c.fillStyle = p.near;
    c.fillRect(100, 22, 40, 30);
    c.fillRect(96, 14, 10, 38); c.fillRect(134, 14, 10, 38);
    c.fillStyle = p.hot;
    c.fillRect(99, 8, 4, 7); c.fillRect(137, 8, 4, 7);
    c.fillStyle = p.ink; c.fillRect(114, 36, 12, 16);
    // деревья
    for (let i = 0; i < 7; i++) {
      const tx = rnd() * 88, ty = 60 + rnd() * 48;
      c.fillStyle = p.ink; c.fillRect(tx + 3, ty + 6, 2, 5);
      c.fillStyle = p.accent; c.fillRect(tx, ty, 8, 7);
    }
    figure(c, 30, 92, p.hot, p.accent, false);
  },

  strat(c, rnd, p) {
    c.fillStyle = p.ink; c.fillRect(0, 0, ART_W, ART_H);
    for (let y = 0; y < ART_H; y += 12) {
      for (let x = 0; x < ART_W; x += 16) {
        c.fillStyle = (x / 16 + y / 12) % 2 ? p.mid : p.far;
        c.fillRect(x, y, 16, 12);
      }
    }
    c.strokeStyle = p.ink; c.lineWidth = 1;
    for (let x = 0; x <= ART_W; x += 16) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, ART_H); c.stroke(); }
    for (let y = 0; y <= ART_H; y += 12) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(ART_W, y + 0.5); c.stroke(); }
    for (let i = 0; i < 9; i++) {
      const gx = Math.floor(rnd() * 10) * 16, gy = Math.floor(rnd() * 10) * 12;
      c.fillStyle = rnd() > 0.5 ? p.hot : p.accent;
      c.fillRect(gx + 5, gy + 3, 6, 6);
      c.fillRect(gx + 4, gy + 9, 8, 2);
    }
    c.strokeStyle = p.hot; c.lineWidth = 2;
    c.strokeRect(33, 37, 14, 10);
  },

  puzzle(c, rnd, p) {
    c.fillStyle = p.ink; c.fillRect(0, 0, ART_W, ART_H);
    const cols = 10, rows = 12, cw = 10, ch = 10, ox = 30, oy = 0;
    c.fillStyle = p.sky[0]; c.fillRect(ox, oy, cols * cw, rows * ch);
    const height = [];
    for (let x = 0; x < cols; x++) height[x] = Math.floor(rnd() * 7);
    const hues = [p.accent, p.hot, p.far, p.ground];
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < height[x]; y++) {
        c.fillStyle = hues[Math.floor(rnd() * hues.length)];
        c.fillRect(ox + x * cw, oy + (rows - 1 - y) * ch, cw - 1, ch - 1);
      }
    }
    c.fillStyle = p.hot;
    c.fillRect(ox + 4 * cw, 10, cw - 1, ch - 1);
    c.fillRect(ox + 4 * cw, 20, cw - 1, ch - 1);
    c.fillStyle = p.accent;
    c.fillRect(ox + 4 * cw, 30, cw - 1, ch - 1);
  },

  sport(c, rnd, p) {
    c.fillStyle = p.mid; c.fillRect(0, 0, ART_W, ART_H);
    c.fillStyle = p.far; c.fillRect(0, 0, ART_W, 22);
    for (let i = 0; i < 60; i++) {
      c.fillStyle = rnd() > 0.5 ? p.hot : p.accent;
      c.fillRect(rnd() * ART_W, rnd() * 20, 2, 2);
    }
    c.strokeStyle = "#e8e8e8"; c.lineWidth = 2;
    c.strokeRect(10, 30, 140, 82);
    c.beginPath(); c.moveTo(80, 30); c.lineTo(80, 112); c.stroke();
    c.beginPath(); c.arc(80, 71, 16, 0, Math.PI * 2); c.stroke();
    figure(c, 50, 60, p.hot, "#f0c9a0", false);
    figure(c, 96, 78, p.accent, "#f0c9a0", true);
    c.fillStyle = "#ffffff";
    c.beginPath(); c.arc(74, 84, 3, 0, Math.PI * 2); c.fill();
  },

  action(c, rnd, p) {
    c.fillStyle = p.ink; c.fillRect(0, 0, ART_W, ART_H);
    c.fillStyle = p.near;
    for (let i = 0; i < 6; i++) {
      const x = i * 28;
      c.fillRect(x, 0, 20, 26 + rnd() * 24);
      c.fillRect(x, ART_H - (26 + rnd() * 24), 20, 60);
    }
    c.fillStyle = p.mid; c.fillRect(0, 96, ART_W, 24);
    c.fillStyle = p.accent;
    for (let i = 0; i < 4; i++) c.fillRect(20 + i * 36, 40, 3, 12);
    figure(c, 24, 82, p.hot, p.accent, false);
    figure(c, 104, 82, p.far, p.accent, true);
    c.fillStyle = p.hot;
    for (let i = 0; i < 4; i++) c.fillRect(46 + i * 12, 88, 7, 2);
  },

  adv(c, rnd, p) {
    fillSky(c, p);
    c.fillStyle = p.far;
    c.beginPath(); c.moveTo(0, 46);
    for (let x = 0; x <= ART_W; x += 10) c.lineTo(x, 40 + Math.sin(x / 14) * 8 + rnd() * 4);
    c.lineTo(ART_W, ART_H); c.lineTo(0, ART_H); c.fill();
    c.fillStyle = p.mid;
    c.beginPath(); c.moveTo(0, 72);
    for (let x = 0; x <= ART_W; x += 8) c.lineTo(x, 68 + Math.cos(x / 10) * 6);
    c.lineTo(ART_W, ART_H); c.lineTo(0, ART_H); c.fill();
    c.fillStyle = p.near; c.fillRect(0, 100, ART_W, 20);
    // своды пещеры — только у части игр, иначе жанр выглядит однообразно
    if (rnd() > 0.5) {
      c.fillStyle = p.near;
      for (let x = 0; x < ART_W; x += 14) {
        const h = 8 + rnd() * 18;
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 7, h); c.lineTo(x + 14, 0); c.fill();
      }
    }
    c.fillStyle = p.accent;
    for (let i = 0; i < 8 + Math.floor(rnd() * 14); i++) {
      const bx = rnd() * ART_W, by = 40 + rnd() * 70;
      c.fillRect(bx, by, 2, 2);
    }
    figure(c, 40 + rnd() * 70, 86, p.hot, p.accent, rnd() > 0.5);
    c.fillStyle = p.hot;
    c.fillRect(10 + rnd() * 40, 50 + rnd() * 20, 4, 4);
    c.fillRect(110 + rnd() * 40, 56 + rnd() * 24, 4, 4);
  },
};

/* Публичный API: нарисовать обложку игры в готовый canvas. */
function drawCover(canvas, game, genres) {
  const seed = hashString(game.t + "|" + game.y);
  const rnd = makeRandom(seed);
  const hue = (genres[game.g] || { hue: 200 }).hue;
  const palette = makePalette(hue, rnd);

  canvas.width = ART_W;
  canvas.height = ART_H;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  (SCENES[game.g] || SCENES.action)(c, rnd, palette);

  // лёгкий дизеринг, чтобы картинка не выглядела «слишком чистой»
  c.globalAlpha = 0.06;
  c.fillStyle = "#000";
  for (let y = 0; y < ART_H; y += 2) c.fillRect(0, y, ART_W, 1);
  c.globalAlpha = 1;
}
