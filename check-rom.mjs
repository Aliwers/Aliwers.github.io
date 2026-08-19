import fs from "node:fs";
import assert from "node:assert";

const src = fs.readFileSync("assets/js/app.js", "utf8");
const start = src.indexOf("const ROM_EXTS");
const end = src.indexOf("/* Картридж не приехал");
const code = src.slice(start, end);

function run(existing) {
  const log = [];
  globalThis.fetch = async (url) => { log.push(url); return { ok: existing.has(url) }; };
  const mod = new Function(code + "\nreturn { resolveRom };")();
  return { log, resolveRom: mod.resolveRom };
}

const game = { t: "Streets of Rage 2", g: 0 };

// Папки roms/ нет (GitHub Pages): два промаха-маркера, дальше тишина.
{
  const { log, resolveRom } = run(new Set());
  assert.equal(await resolveRom(game), null);
  assert.equal(await resolveRom({ t: "Golden Axe" }), null);
  assert.deepEqual(log, ["roms/sega-2048.bin", "roms/roms/sega-2048.bin"]);
  console.log("нет папки: запросов всего", log.length);
}

// Папка на месте: маркер найден, свой ROM подхвачен.
{
  const { log, resolveRom } = run(new Set(["roms/sega-2048.bin", "roms/streets-of-rage-2.gen"]));
  assert.equal(await resolveRom(game), "roms/streets-of-rage-2.gen");
  console.log("папка есть:", log.length, "запросов ->", log.at(-1));
}

// Папка вложена на уровень (так она и лежит на GitHub Pages).
{
  const { log, resolveRom } = run(new Set(["roms/roms/sega-2048.bin", "roms/roms/mega-tetris.bin"]));
  assert.equal(await resolveRom({ t: "Mega Tetris", rom: "roms/mega-tetris.bin" }), "roms/roms/mega-tetris.bin");
  console.log("вложенная папка:", log.at(-1));
}

// Папки нет, но есть CDN — уходим на него, а не в null.
{
  const { resolveRom } = run(new Set(["https://cdn/x.bin"]));
  assert.equal(await resolveRom({ t: "Sega 2048", cdn: "https://cdn/x.bin" }), "https://cdn/x.bin");
  console.log("CDN-фолбэк: ок");
}
