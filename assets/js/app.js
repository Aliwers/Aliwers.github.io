/* Каталог, телевизор и переключение каналов. */

const ALL = [...HOMEBREW, ...GAMES];

const el = (id) => document.getElementById(id);

const tv = el("tv");
const screen = el("screen");
const viewIdle = el("viewIdle");
const viewDetail = el("viewDetail");
const viewGame = el("viewGame");
const channelBadge = el("channel");
const slotTitle = el("slotTitle");
const grid = el("grid");
const search = el("search");
const chipRow = el("chips");
const resultCount = el("resultCount");
const dropzone = el("dropzone");
const btnEject = el("btnEject");
const fileInput = el("fileInput");

const STATIC_MS = 420;

let activeGenre = "all";
let activeGame = null;
let objectUrl = null;

/* --- Питание ------------------------------------------------ */

function setPower(on) {
  tv.classList.toggle("is-on", on);
  el("power").setAttribute("aria-pressed", String(on));
  if (!on) stopGame();
}

el("power").addEventListener("click", () => setPower(!tv.classList.contains("is-on")));

/* --- Переключение «каналов» --------------------------------- */

function showView(view) {
  for (const v of [viewIdle, viewDetail, viewGame]) {
    v.classList.toggle("is-active", v === view);
  }
}

/* Помеха между каналами: короткий снег, потом картинка. */
function switchChannel(view, channelText, tint) {
  if (!tv.classList.contains("is-on")) setPower(true);
  screen.classList.add("is-static");
  if (tint) tv.style.setProperty("--glow-tint", tint);
  window.setTimeout(() => {
    showView(view);
    screen.classList.remove("is-static");
    if (channelText) {
      channelBadge.textContent = channelText;
      channelBadge.classList.add("is-visible");
      window.setTimeout(() => channelBadge.classList.remove("is-visible"), 1800);
    }
  }, STATIC_MS);
}

const genreColor = (key, light = 62) => {
  const g = GENRES[key];
  return `hsl(${g ? g.hue : 200} 70% ${light}%)`;
};

/* --- Карточка игры на экране -------------------------------- */

function romNote(game) {
  if (isHomebrew(game)) {
    return "ROM свободно распространяется автором. Источники — в разделе «Откуда взялись картриджи».";
  }
  return "Картриджа нет: ROM этой игры защищён авторским правом, и в комплект он не входит. "
    + "Если она у вас есть на диске — перетащите файл на страницу, и телевизор её запустит.";
}

const isHomebrew = (game) => Boolean(game.rom || game.cdn || game.dl);

/* Сайт живёт в двух режимах: с папкой roms/ рядом и без неё.
   Поэтому наличие картриджа проверяется в момент запуска, а не на вере. */
async function fileExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function resolveRom(game, localPath) {
  const local = localPath || game.rom;
  if (local && await fileExists(local)) return local;
  if (game.cdn && await fileExists(game.cdn)) return game.cdn;
  return null;
}

/* Картридж не приехал — показываем, откуда его скачать. */
function showDownloadPrompt(game) {
  const actions = viewDetail.querySelector(".detail-actions");
  const note = viewDetail.querySelector(".detail-note");
  if (!actions) return;
  actions.innerHTML = game.dl
    ? `<a class="screen-btn screen-btn-primary" href="${escapeHtml(game.dl)}" download>СКАЧАТЬ КАРТРИДЖ</a>`
    : `<a class="screen-btn" href="${escapeHtml(game.src || "#")}" target="_blank" rel="noopener">СТРАНИЦА ПРОЕКТА</a>`;
  if (note) {
    note.textContent = "Картридж лежит у автора, а не на этом сайте. Скачайте файл и перетащите "
      + "его на страницу — телевизор запустит его сразу.";
  }
}

function renderDetail(game) {
  const g = GENRES[game.g];
  const playable = isHomebrew(game);
  viewDetail.innerHTML = `
    <h2 class="detail-title">${escapeHtml(game.t)}</h2>
    <dl class="detail-rows">
      <dt>ГОД</dt><dd>${game.y}</dd>
      <dt>ЖАНР</dt><dd>${escapeHtml(g.ru)}</dd>
      <dt>СТУДИЯ</dt><dd>${escapeHtml(game.d)}</dd>
      <dt>ИЗДАТЕЛЬ</dt><dd>${escapeHtml(game.p)}</dd>
      <dt>ИГРОКОВ</dt><dd>${game.n}</dd>
    </dl>
    <p class="detail-text">${escapeHtml(game.s)}</p>
    <div class="detail-actions">
      ${playable ? '<button class="screen-btn screen-btn-primary" data-act="play">ИГРАТЬ</button>' : ""}
      ${playable && game.alt ? altButtons(game) : ""}
      ${playable ? "" : '<button class="screen-btn" data-act="own">СВОЙ КАРТРИДЖ</button>'}
    </div>
    <p class="detail-note">${escapeHtml(romNote(game))}</p>
  `;
  viewDetail.querySelectorAll("[data-act]").forEach((b) => {
    b.addEventListener("click", async () => {
      if (b.dataset.act === "own") { fileInput.click(); return; }
      const wanted = b.dataset.act === "alt" ? b.dataset.rom : game.rom;
      const label = b.dataset.act === "alt" ? `${game.t} (${b.dataset.lang})` : game.t;
      b.disabled = true;
      const source = await resolveRom(game, wanted);
      b.disabled = false;
      if (source) playRom(source, label);
      else showDownloadPrompt(game);
    });
  });
}

function altButtons(game) {
  return Object.entries(game.alt)
    .map(([lang, path]) =>
      `<button class="screen-btn" data-act="alt" data-rom="${escapeHtml(path)}" data-lang="${escapeHtml(lang)}">${escapeHtml(lang)}</button>`)
    .join("");
}

function openGame(game, index) {
  activeGame = game;
  renderDetail(game);
  slotTitle.textContent = game.t;
  slotTitle.dataset.empty = "false";
  btnEject.disabled = false;
  switchChannel(viewDetail, "CH " + String(index + 1).padStart(2, "0"), genreColor(game.g, 45));
  tv.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
}

/* --- Запуск эмулятора --------------------------------------- */

function playRom(romPath, name) {
  viewGame.innerHTML = "";
  const frame = document.createElement("iframe");
  frame.title = "Эмулятор: " + name;
  frame.allow = "autoplay; gamepad; fullscreen";
  frame.style.cssText = "width:100%;height:100%;border:0;display:block";
  frame.src = "player.html?rom=" + encodeURIComponent(romPath) + "&name=" + encodeURIComponent(name);
  viewGame.appendChild(frame);
  slotTitle.textContent = name;
  slotTitle.dataset.empty = "false";
  btnEject.disabled = false;
  switchChannel(viewGame, "PLAY", "#2f6fe4");
}

function stopGame() {
  viewGame.innerHTML = "";
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
}

function eject() {
  stopGame();
  activeGame = null;
  slotTitle.textContent = "слот пуст";
  slotTitle.dataset.empty = "true";
  btnEject.disabled = true;
  switchChannel(viewIdle, "CH 00", "#2e7dd8");
}

btnEject.addEventListener("click", eject);

/* --- Свой картридж: файл или перетаскивание ------------------ */

const ROM_EXT = /\.(md|bin|gen|smd|68k|sgd|zip)$/i;

function loadFile(file) {
  if (!file) return;
  if (!ROM_EXT.test(file.name)) {
    alert("Это не картридж Mega Drive. Нужен файл .md, .bin, .gen, .smd или .zip");
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  playRom(objectUrl, file.name.replace(ROM_EXT, ""));
}

fileInput.addEventListener("change", (e) => loadFile(e.target.files[0]));
el("btnLoad").addEventListener("click", () => fileInput.click());

let dragDepth = 0;
window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragDepth++;
  dropzone.classList.add("is-hot");
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropzone.classList.remove("is-hot");
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  dropzone.classList.remove("is-hot");
  loadFile(e.dataTransfer.files[0]);
});

/* --- Каталог ------------------------------------------------ */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function cartMarkup(game, index) {
  const g = GENRES[game.g];
  return `
    <li>
      <button class="cart" data-index="${index}" style="--genre-color:${genreColor(game.g)}">
        ${isHomebrew(game) ? '<span class="cart-playable">Играть</span>' : ""}
        ${game.hit && !isHomebrew(game) ? '<span class="cart-hit">Хит</span>' : ""}
        <span class="cart-label">
          <canvas class="cart-art" data-index="${index}" width="160" height="120"
                  role="img" aria-label="Обложка: ${escapeHtml(game.t)}"></canvas>
        </span>
        <span class="cart-body">
          <span class="cart-title">${escapeHtml(game.t)}</span>
          <span class="cart-meta">
            <span class="cart-genre">${escapeHtml(g.ru)}</span>
            <span>${game.y}</span>
          </span>
        </span>
      </button>
    </li>`;
}

function currentList() {
  const q = search.value.trim().toLowerCase();
  return ALL.map((game, index) => ({ game, index })).filter(({ game }) => {
    if (activeGenre === "playable" && !isHomebrew(game)) return false;
    if (activeGenre !== "all" && activeGenre !== "playable" && game.g !== activeGenre) return false;
    if (!q) return true;
    return (game.t + " " + game.d + " " + game.p + " " + GENRES[game.g].ru + " " + game.y)
      .toLowerCase().includes(q);
  });
}

function renderGrid() {
  const list = currentList();
  resultCount.textContent = list.length === 0
    ? "ничего не найдено"
    : `${list.length} ${plural(list.length, "картридж", "картриджа", "картриджей")}`;

  if (list.length === 0) {
    grid.innerHTML = '<li class="empty-note">Полка пуста. Попробуйте другой запрос.</li>';
    return;
  }
  grid.innerHTML = list.map(({ game, index }) => cartMarkup(game, index)).join("");
  // Отрисовка всех обложек разом занимает ~9 мс — лениться тут не на чем.
  grid.querySelectorAll(".cart-art").forEach((c) =>
    drawCover(c, ALL[Number(c.dataset.index)], GENRES));
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest(".cart");
  if (!btn) return;
  const index = Number(btn.dataset.index);
  openGame(ALL[index], index);
});

search.addEventListener("input", renderGrid);

/* --- Фильтры ------------------------------------------------ */

function buildChips() {
  const counts = {};
  for (const game of ALL) counts[game.g] = (counts[game.g] || 0) + 1;

  const items = [
    { key: "all", label: `Все · ${ALL.length}` },
    { key: "playable", label: `▶ Можно играть · ${HOMEBREW.length}` },
    ...Object.entries(GENRES)
      .filter(([key]) => counts[key])
      .sort((a, b) => counts[b[0]] - counts[a[0]])
      .map(([key, g]) => ({ key, label: `${g.ru} · ${counts[key]}` })),
  ];

  chipRow.innerHTML = items.map(({ key, label }) =>
    `<button class="chip" data-genre="${key}" aria-pressed="${key === "all"}">${escapeHtml(label)}</button>`
  ).join("");

  chipRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeGenre = chip.dataset.genre;
    chipRow.querySelectorAll(".chip").forEach((c) =>
      c.setAttribute("aria-pressed", String(c === chip)));
    renderGrid();
  });
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* --- Заставка «нет сигнала» --------------------------------- */

function buildIdleBars() {
  const bars = ["#ffffff", "#f2f200", "#00f2f2", "#00f200", "#f200f2", "#f20000", "#0000f2", "#101010"];
  el("idleBars").innerHTML = bars.map((c) => `<span style="background:${c}"></span>`).join("");
}

/* --- Старт -------------------------------------------------- */

buildIdleBars();
buildChips();
renderGrid();
showView(viewIdle);

// Телевизор «прогревается» после загрузки страницы.
window.setTimeout(() => setPower(true), prefersReducedMotion() ? 0 : 700);
