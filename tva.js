const variantsContainer = document.getElementById("variants-container");
const packetsContainer = document.getElementById("packets-container");
const sparksContainer = document.getElementById("sparks-container");
const explosionsContainer = document.getElementById("explosions-container");
const wavesContainer = document.getElementById("waves-container");
const rulerContainer = document.getElementById("ruler-container");

const timeEl = document.getElementById("current-time");
const dateEl = document.getElementById("current-date");

const hudTitleEl = document.getElementById("hud-title");
const hudStatusEl = document.getElementById("hud-status");
const hudPruneEl = document.getElementById("hud-prune");
const hudIncidentEl = document.getElementById("hud-incident");

const logListEl = document.getElementById("log-list");
const centerHudLayer = document.querySelector(".center-hud-layer");
const markerEl = document.getElementById("current-marker");

const VIEW_W = 1920;
const VIEW_H = 1080;
const mainLineY = VIEW_H / 2;

const FLOW_DISTANCE_PX = 1920;
const FLOW_DURATION_S = 34;
const PX_PER_SECOND = FLOW_DISTANCE_PX / FLOW_DURATION_S;

const RULER_CENTER_X = 960;

const TOP_MARGIN = 140;
const BOTTOM_MARGIN = 160;

function hashStringToUint32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
const DAILY_SEED = hashStringToUint32(`TVA:${ymd()}`);
const seededRand = mulberry32(DAILY_SEED);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function nowHHMMSS(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatTimeHHMMSS(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function renderVerticalCharacters(el, text) {
  el.textContent = "";
  for (const ch of text) {
    const span = document.createElement("span");
    span.textContent = ch;
    el.appendChild(span);
  }
}
function updateClock() {
  renderVerticalCharacters(dateEl, ymd());
  renderVerticalCharacters(timeEl, formatTimeHHMMSS());
}
updateClock();
setInterval(updateClock, 1000);

function triggerGlitchOnce() {
  hudTitleEl.classList.remove("is-glitching");
  void hudTitleEl.offsetWidth;
  hudTitleEl.classList.add("is-glitching");
  const duration = 150 + Math.random() * 120;
  setTimeout(() => hudTitleEl.classList.remove("is-glitching"), duration);
}
function scheduleGlitch() {
  const next = 5000 + Math.random() * 8000;
  setTimeout(() => {
    triggerGlitchOnce();
    scheduleGlitch();
  }, next);
}
setTimeout(triggerGlitchOnce, 900);
scheduleGlitch();

const LOG_MAX = 10;
function addLog(type, message) {
  const item = document.createElement("div");
  item.className = "log-item";

  const t = document.createElement("div");
  t.className = "log-time";
  t.textContent = nowHHMMSS();

  const msg = document.createElement("div");
  msg.className = "log-msg";

  const tag = document.createElement("span");
  tag.className = `tag ${type.toLowerCase()}`;
  tag.textContent = type;

  msg.appendChild(tag);
  msg.appendChild(document.createTextNode(message));

  item.appendChild(t);
  item.appendChild(msg);

  logListEl.prepend(item);
  while (logListEl.children.length > LOG_MAX)
    logListEl.lastElementChild?.remove();
}

function updateStatus() {
  const stable = Math.random() < 0.82;
  hudStatusEl.textContent = stable ? "STATUS: STABLE" : "STATUS: DRIFT";
  hudPruneEl.textContent =
    Math.random() < 0.88 ? "PRUNE: ARMED" : "PRUNE: HOLD";
}
setInterval(updateStatus, 20000 + Math.random() * 20000);

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
function createSvgEl(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

const POOL = { circles: [], lines: [], paths: [] };
function poolGet(tag) {
  let el;
  if (tag === "circle") el = POOL.circles.pop();
  else if (tag === "line") el = POOL.lines.pop();
  else if (tag === "path") el = POOL.paths.pop();
  return el || createSvgEl(tag);
}
function poolRelease(el) {
  el.removeAttribute("style");
  el.removeAttribute("class");
  const tag = el.tagName.toLowerCase();
  if (tag === "circle") POOL.circles.push(el);
  else if (tag === "line") POOL.lines.push(el);
  else if (tag === "path") POOL.paths.push(el);
}
function removeToPool(el) {
  el.remove();
  poolRelease(el);
}

const rulerLabels = [];
function formatTSeconds(value) {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);
  return `T${sign}${abs.toFixed(1)}s`;
}
function getFlowOffsetPx() {
  const t = (performance.now() / 1000) % FLOW_DURATION_S;
  return (t / FLOW_DURATION_S) * FLOW_DISTANCE_PX;
}
function wrapToView(x) {
  let v = x % VIEW_W;
  if (v < 0) v += VIEW_W;
  return v;
}
function generateRuler() {
  clearNode(rulerContainer);
  rulerLabels.length = 0;

  const base = createSvgEl("line");
  base.setAttribute("x1", "0");
  base.setAttribute("y1", String(mainLineY + 18));
  base.setAttribute("x2", "3840");
  base.setAttribute("y2", String(mainLineY + 18));
  base.setAttribute("class", "ruler-baseline");
  rulerContainer.appendChild(base);

  const tickStep = 40;
  const majorEvery = 200;
  const labelEvery = 400;

  for (let x = 0; x <= 3840; x += tickStep) {
    const isMajor = x % majorEvery === 0;
    const h = isMajor ? 12 : 7;

    const tick = createSvgEl("line");
    tick.setAttribute("x1", String(x));
    tick.setAttribute("y1", String(mainLineY + 18));
    tick.setAttribute("x2", String(x));
    tick.setAttribute("y2", String(mainLineY + 18 + h));
    tick.setAttribute("class", `ruler-tick${isMajor ? " major" : ""}`);
    rulerContainer.appendChild(tick);

    if (x % labelEvery === 0) {
      const label = createSvgEl("text");
      label.setAttribute("x", String(x + 6));
      label.setAttribute("y", String(mainLineY + 18 + h + 12));
      label.setAttribute("class", "ruler-label");
      label.textContent = "T+0.0s";
      rulerContainer.appendChild(label);
      rulerLabels.push({ baseX: x, el: label });
    }
  }

  const centerLabel = createSvgEl("text");
  centerLabel.setAttribute("x", String(RULER_CENTER_X + 6));
  centerLabel.setAttribute("y", String(mainLineY + 18 + 24));
  centerLabel.setAttribute("class", "ruler-label strong");
  centerLabel.textContent = "T+0.0s";
  rulerContainer.appendChild(centerLabel);
  rulerLabels.push({ baseX: RULER_CENTER_X, el: centerLabel });
}
function updateRulerLabels() {
  const offsetPx = getFlowOffsetPx();
  for (const { baseX, el } of rulerLabels) {
    const rawScreenX = baseX - offsetPx;
    const screenX = wrapToView(rawScreenX);
    const dxPx = screenX - RULER_CENTER_X;
    const seconds = dxPx / PX_PER_SECOND;
    el.textContent = formatTSeconds(seconds);
  }
  requestAnimationFrame(updateRulerLabels);
}
generateRuler();
requestAnimationFrame(updateRulerLabels);

let hudFadeTarget = 1;
function setHudFade(target) {
  hudFadeTarget = target;
}
(function hudFadeLoop() {
  const current = parseFloat(centerHudLayer.style.opacity || "1");
  const next = current + (hudFadeTarget - current) * 0.12;
  centerHudLayer.style.opacity = String(next);
  requestAnimationFrame(hudFadeLoop);
})();

let incidentTimer = null;
function setIncidentActive(ms) {
  hudIncidentEl.classList.remove("hidden");
  if (incidentTimer) clearTimeout(incidentTimer);
  incidentTimer = setTimeout(() => hudIncidentEl.classList.add("hidden"), ms);
}
let alarmTimer = null;
function triggerAlarmMode(ms) {
  document.body.classList.add("alarm-mode");
  if (alarmTimer) clearTimeout(alarmTimer);
  alarmTimer = setTimeout(
    () => document.body.classList.remove("alarm-mode"),
    ms,
  );
}

function markerPing() {
  markerEl.classList.add("ping");
  setTimeout(() => markerEl.classList.remove("ping"), 120);
}
function lockInFlash() {
  document.body.classList.add("lockin");
  setTimeout(() => document.body.classList.remove("lockin"), 380);
}

let criticalLockUntil = 0;
function isCriticalLocked() {
  return performance.now() < criticalLockUntil;
}
function lockCriticalWindow(ms) {
  criticalLockUntil = Math.max(criticalLockUntil, performance.now() + ms);
}

function createExplosion(x, y) {
  const circleCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < circleCount; i++) {
    setTimeout(() => {
      const circle = poolGet("circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", 5);
      circle.setAttribute("class", "explosion-circle");
      explosionsContainer.appendChild(circle);
      animateExplosion(circle);
      setTimeout(() => removeToPool(circle), 460);
    }, i * 55);
  }
}
function animateExplosion(circle) {
  let progress = 0;
  const duration = 360;
  const interval = setInterval(() => {
    progress += 16;
    const t = Math.min(progress / duration, 1);
    circle.setAttribute("r", 5 + t * 34);
    circle.style.opacity = String(
      t < 0.2 ? t * 4 : 0.9 * (1 - (t - 0.2) / 0.8),
    );
    circle.style.strokeWidth = String(3 * (1 - t * 0.55));
    if (progress >= duration) clearInterval(interval);
  }, 16);
}
function shockRing(x, y) {
  const ring = poolGet("circle");
  ring.setAttribute("cx", x);
  ring.setAttribute("cy", y);
  ring.setAttribute("r", 4);
  ring.setAttribute("class", "shock-ring");
  wavesContainer.appendChild(ring);

  const start = performance.now();
  const duration = 420;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    ring.setAttribute("r", 4 + t * 46);
    ring.style.opacity = String(0.8 * (1 - t));
    ring.style.strokeWidth = String(2.0 * (1 - t * 0.6));
    if (t < 1) requestAnimationFrame(tick);
    else removeToPool(ring);
  }
  requestAnimationFrame(tick);
}
function pruneWave(path, duration = 420) {
  const wave = poolGet("circle");
  wave.setAttribute("r", "8");
  wave.setAttribute("class", "prune-wave");
  wavesContainer.appendChild(wave);

  const len = path.getTotalLength();
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const travel = (1 - t) * len;
    const p = path.getPointAtLength(travel);

    wave.setAttribute("cx", p.x);
    wave.setAttribute("cy", p.y);
    wave.style.opacity = String(0.85 * (1 - t * 0.15));
    wave.setAttribute("r", String(6 + t * 10));

    if (t < 1) requestAnimationFrame(tick);
    else {
      removeToPool(wave);
      const startPoint = path.getPointAtLength(0);
      shockRing(startPoint.x, startPoint.y);
    }
  }
  requestAnimationFrame(tick);
}

function createSparkDot() {
  const dot = poolGet("circle");
  dot.setAttribute("r", String(1.3 + Math.random() * 1.3));
  dot.setAttribute("class", "spark-dot");
  sparksContainer.appendChild(dot);
  return dot;
}
function createSparkStreak() {
  const streak = poolGet("line");
  streak.setAttribute("class", "spark-streak");
  sparksContainer.appendChild(streak);
  return streak;
}
function emitSparkOnPath(path, lifeMs = 520) {
  const dot = createSparkDot();
  const streak = createSparkStreak();

  const len = path.getTotalLength();
  const speed = 0.85 + Math.random() * 0.7;
  const startAt = 0.06 + Math.random() * 0.18;

  const start = performance.now();
  const fadeIn = 70;
  const fadeOut = 150;

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / lifeMs, 1);

    const travel = clamp(startAt + t * speed, 0, 1);
    const p = path.getPointAtLength(travel * len);
    const back = path.getPointAtLength(
      clamp(travel * len - (10 + Math.random() * 10), 0, len),
    );

    dot.setAttribute("cx", p.x);
    dot.setAttribute("cy", p.y);

    streak.setAttribute("x1", back.x);
    streak.setAttribute("y1", back.y);
    streak.setAttribute("x2", p.x);
    streak.setAttribute("y2", p.y);

    let alpha = 0.9;
    if (elapsed < fadeIn) alpha = (elapsed / fadeIn) * 0.9;
    if (elapsed > lifeMs - fadeOut)
      alpha = ((lifeMs - elapsed) / fadeOut) * 0.9;

    dot.style.opacity = String(alpha);
    streak.style.opacity = String(alpha * 0.75);

    if (t < 1) requestAnimationFrame(tick);
    else {
      removeToPool(dot);
      removeToPool(streak);
    }
  }
  requestAnimationFrame(tick);
}

let packetBias = { alert: 0, sync: 0 };
function addPacketBias(kind, amount, durationMs) {
  packetBias[kind] = clamp(packetBias[kind] + amount, 0, 1);
  setTimeout(() => {
    packetBias[kind] = clamp(packetBias[kind] - amount * 0.9, 0, 1);
  }, durationMs);
}
function getPacketWeights() {
  const alertW = clamp(0.16 + packetBias.alert * 0.3, 0.05, 0.6);
  const syncW = clamp(0.1 + packetBias.sync * 0.22, 0.04, 0.45);
  const dataW = clamp(1 - (alertW + syncW), 0.1, 0.92);
  return { dataW, alertW, syncW };
}
function pickPacketType() {
  const { dataW, alertW, syncW } = getPacketWeights();
  const r = Math.random();
  if (r < dataW) return { name: "DATA", cls: "", speed: [520, 820] };
  if (r < dataW + alertW)
    return { name: "ALERT", cls: "alert", speed: [640, 980] };
  return { name: "SYNC", cls: "sync", speed: [420, 700] };
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spawnPacket() {
  const type = pickPacketType();

  const dot = poolGet("circle");
  dot.setAttribute("r", String(2.0 + Math.random() * 1.3));
  dot.setAttribute("class", `packet-dot ${type.cls}`.trim());

  const tail = poolGet("line");
  tail.setAttribute("class", `packet-tail ${type.cls}`.trim());

  packetsContainer.appendChild(tail);
  packetsContainer.appendChild(dot);

  const startX = -120 - Math.random() * 220;
  const y = mainLineY + (Math.random() * 0.8 - 0.4);

  const speed = type.speed[0] + Math.random() * (type.speed[1] - type.speed[0]);
  const fullTravel = VIEW_W + 640;
  const life = (fullTravel / speed) * 1000;

  const willDock = Math.random() < 0.24;
  const dockX = RULER_CENTER_X;
  const dockFrac = clamp((dockX - startX) / fullTravel, 0.1, 0.85);

  const start = performance.now();
  let docked = false;

  function tick(now) {
    const rawT = (now - start) / life;

    if (willDock && !docked && rawT >= dockFrac) {
      docked = true;

      const decelStart = performance.now();
      const decelDuration = 240 + Math.random() * 120;
      const fromX = startX + fullTravel * dockFrac;

      function decelLoop(ts) {
        const tt = clamp((ts - decelStart) / decelDuration, 0, 1);
        const e = easeOutCubic(tt);
        const x = fromX + (dockX - fromX) * e;

        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);

        tail.setAttribute("x1", String(x - 22));
        tail.setAttribute("y1", String(y));
        tail.setAttribute("x2", String(x));
        tail.setAttribute("y2", String(y));

        dot.style.opacity = "0.9";
        tail.style.opacity = "0.65";

        if (tt < 1) requestAnimationFrame(decelLoop);
        else {
          markerPing();
          addLog(type.name, "PACKET DOCKED @ ANCHOR");
          setTimeout(
            () => {
              removeToPool(dot);
              removeToPool(tail);
            },
            180 + Math.random() * 180,
          );
        }
      }

      requestAnimationFrame(decelLoop);
      return;
    }

    const t = clamp(rawT, 0, 1);
    const x = startX + fullTravel * t;

    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);

    tail.setAttribute("x1", String(x - (20 + Math.random() * 18)));
    tail.setAttribute("y1", String(y));
    tail.setAttribute("x2", String(x));
    tail.setAttribute("y2", String(y));

    const a = t < 0.1 ? t / 0.1 : t > 0.92 ? (1 - t) / 0.08 : 1;
    dot.style.opacity = String(0.75 * a);
    tail.style.opacity = String(0.45 * a);

    if (t < 1) requestAnimationFrame(tick);
    else {
      removeToPool(dot);
      removeToPool(tail);
    }
  }

  requestAnimationFrame(tick);
}

function packetLoop() {
  spawnPacket();
  const fastBoost = packetBias.alert * 180;
  const next = 240 + Math.random() * 520 - fastBoost;
  setTimeout(packetLoop, clamp(next, 90, 900));
}
packetLoop();

const PROFILES = [
  { c1: 0.22, c2: 0.6, bend: 0.7 },
  { c1: 0.18, c2: 0.55, bend: 0.85 },
  { c1: 0.26, c2: 0.68, bend: 0.62 },
];

const VARIANT_TYPES = [
  {
    name: "MINOR",
    cls: "variant-minor",
    scale: [0.9, 1.02],
    sparkRate: 0.3,
    wave: false,
  },
  {
    name: "MAJOR",
    cls: "variant-major",
    scale: [1.0, 1.18],
    sparkRate: 0.52,
    wave: true,
  },
  {
    name: "CRITICAL",
    cls: "variant-critical",
    scale: [1.12, 1.35],
    sparkRate: 0.72,
    wave: true,
  },
];

function pickVariantType(intensity) {
  const r = Math.random();
  const minorW = 0.7 - intensity * 0.25;
  const majorW = 0.25 + intensity * 0.18;
  if (r < minorW) return VARIANT_TYPES[0];
  if (r < minorW + majorW) return VARIANT_TYPES[1];
  return VARIANT_TYPES[2];
}

let cinematicIntensity = 0.35;
let cinematicTarget = 0.35;
function setIntensity(target) {
  cinematicTarget = clamp(target, 0.1, 0.95);
}

(function cinematicLoop() {
  const r = Math.random();
  if (r < 0.45) setIntensity(0.22 + Math.random() * 0.1);
  else if (r < 0.85) setIntensity(0.35 + Math.random() * 0.12);
  else setIntensity(0.7 + Math.random() * 0.18);

  const next = 30000 + Math.random() * 30000;
  setTimeout(cinematicLoop, next);
})();

(function intensityEaseLoop() {
  cinematicIntensity += (cinematicTarget - cinematicIntensity) * 0.02;
  requestAnimationFrame(intensityEaseLoop);
})();

const activeVariants = new Set();

function randomStartX() {
  const t = Math.random();
  const bias = (t + Math.random()) / 2;
  return 360 + bias * 1120;
}

function createVariant() {
  if (isCriticalLocked()) return;

  const type = pickVariantType(cinematicIntensity);

  if (type.name === "MAJOR") {
    addPacketBias("sync", 0.35, 12000);
  }

  if (type.name === "CRITICAL") {
    lockCriticalWindow(2600 + Math.random() * 1800);

    lockInFlash();
    addLog(type.name, "ALERT: VARIANCE SPIKE");

    addPacketBias("alert", 0.95, 20000);
    setIntensity(0.92);

    triggerAlarmMode(1400 + Math.random() * 900);
    setIncidentActive(10000 + Math.random() * 5000);
  }

  const startX = randomStartX();
  const startY = mainLineY;
  const dir = Math.random() > 0.5 ? -1 : 1;

  const profile = PROFILES[Math.floor(Math.random() * PROFILES.length)];
  const scale = type.scale[0] + Math.random() * (type.scale[1] - type.scale[0]);
  const length = (220 + Math.random() * 260) * scale;
  const lift = (75 + Math.random() * 160) * dir * scale;

  const endX = clamp(startX + length, 0, VIEW_W - 30);
  const endY = clamp(startY + lift, TOP_MARGIN, VIEW_H - BOTTOM_MARGIN);

  const c1x = startX + length * profile.c1;
  const c1y = startY;
  const c2x = startX + length * profile.c2;
  const c2y = startY + lift * profile.bend;

  const path = poolGet("path");
  path.setAttribute(
    "d",
    `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`,
  );
  path.setAttribute("class", `timeline-variant ${type.cls}`);

  const pruneMark = poolGet("line");
  const markLength = 24 * scale;

  const approxAngle = Math.atan2(endY - startY, endX - startX);
  const perp = approxAngle + Math.PI / 2;

  pruneMark.setAttribute("x1", endX + Math.cos(perp) * (markLength / 2));
  pruneMark.setAttribute("y1", endY + Math.sin(perp) * (markLength / 2));
  pruneMark.setAttribute("x2", endX - Math.cos(perp) * (markLength / 2));
  pruneMark.setAttribute("y2", endY - Math.sin(perp) * (markLength / 2));
  pruneMark.setAttribute("class", "prune-mark");

  variantsContainer.appendChild(path);
  variantsContainer.appendChild(pruneMark);

  activeVariants.add(path);

  const pathLength = path.getTotalLength();
  path.style.strokeDasharray = pathLength;
  path.style.strokeDashoffset = pathLength;

  addLog(
    type.name,
    `BRANCH DETECTED • ΔY=${Math.round(endY - startY)} • X=${Math.round(startX)}`,
  );

  animateVariant(path, pruneMark, pathLength, endX, endY, type);

  setTimeout(
    () => {
      activeVariants.delete(path);
      removeToPool(path);
      removeToPool(pruneMark);
    },
    3600 + Math.random() * 900,
  );
}

function animateVariant(path, pruneMark, pathLength, endX, endY, type) {
  let progress = 0;

  const drawDuration = 620 + Math.random() * 260;
  const holdDuration = 820 + Math.random() * 1200;
  const pruneDuration = 240 + Math.random() * 160;

  let drawComplete = false;

  const sparkTimer = setInterval(
    () => {
      if (Math.random() < type.sparkRate)
        emitSparkOnPath(path, 420 + Math.random() * 260);
    },
    240 + Math.random() * 120,
  );

  const drawInterval = setInterval(() => {
    progress += 16;
    const t = Math.min(progress / drawDuration, 1);

    path.style.strokeDashoffset = pathLength * (1 - t);
    path.style.opacity = String(t * 0.82);

    if (t >= 0.995 && !drawComplete) {
      drawComplete = true;
      pruneMark.style.opacity = "0.95";
      createExplosion(endX, endY);
    }

    if (progress >= drawDuration) {
      clearInterval(drawInterval);
      clearInterval(sparkTimer);

      setTimeout(() => {
        addLog(type.name, "PRUNE EXECUTED");
        if (type.wave) pruneWave(path, 420 + Math.random() * 180);
        pruneVariant(path, pruneMark, pruneDuration);
      }, holdDuration);
    }
  }, 16);
}

function pruneVariant(path, pruneMark, duration) {
  let progress = 0;
  const pruneInterval = setInterval(() => {
    progress += 16;
    const t = Math.min(progress / duration, 1);

    pruneMark.style.opacity = String(0.95 * (1 - t));
    path.style.opacity = String(0.82 * (1 - t));

    const r = 255;
    const g = Math.floor(120 * (1 - t));
    const b = Math.floor(60 * (1 - t));
    path.style.stroke = `rgb(${r}, ${g}, ${b})`;

    if (progress >= duration) clearInterval(pruneInterval);
  }, 16);
}

(function hudCollisionLoop() {
  let near = false;
  const cx = RULER_CENTER_X;
  const cy = mainLineY;

  for (const path of activeVariants) {
    const len = path.getTotalLength();
    const samplePoints = [0.08, 0.18, 0.3];
    for (const s of samplePoints) {
      const p = path.getPointAtLength(len * s);
      const dx = p.x - cx;
      const dy = p.y - cy;
      if (dx * dx + dy * dy < 170 * 170) {
        near = true;
        break;
      }
    }
    if (near) break;
  }

  setHudFade(near ? 0.65 : 1.0);
  requestAnimationFrame(hudCollisionLoop);
})();

function createVariantBurst() {
  if (isCriticalLocked()) return;

  const r = Math.random();
  const twoChance = 0.12 + cinematicIntensity * 0.16;
  const threeChance = 0.03 + cinematicIntensity * 0.08;

  let count = 1;
  if (r < threeChance) count = 3;
  else if (r < threeChance + twoChance) count = 2;

  for (let i = 0; i < count; i++) {
    setTimeout(() => createVariant(), i * (260 + Math.random() * 220));
  }
}

function scheduleNext() {
  createVariantBurst();

  const base = 4200 - cinematicIntensity * 1800;
  const incidentBoost = packetBias.alert * 900;
  const criticalBoost = isCriticalLocked() ? 1400 : 0;

  const jitter = 2800 + Math.random() * 3200;
  const next = clamp(base + jitter - incidentBoost + criticalBoost, 1400, 9000);

  setTimeout(scheduleNext, next);
}

window.addEventListener("load", () => setTimeout(scheduleNext, 1500));
