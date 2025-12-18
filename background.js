// ================================
// BACKGROUND SYSTEM (STABLE + NO RELOAD CHANGE)
// ================================

const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

// 10 minutes (change if you want)
const CHANGE_INTERVAL = 600000;

const bgImg = document.getElementById("background-img");
const fadeLayer = document.getElementById("bg-fade-layer");
const warning = document.getElementById("darkreader-warning");

// Preload images
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

// Pick random background excluding current
function pickNext(current) {
  const list = backgrounds.filter(b => b !== current);
  return list[Math.floor(Math.random() * list.length)];
}

// Apply crossfade
function crossfadeTo(newBg) {
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = "1";

  setTimeout(() => {
    bgImg.src = newBg;
    fadeLayer.style.opacity = "0";

    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", Date.now());
  }, 1500);
}

// Rotation logic (NO reload change)
function updateBackground() {
  const now = Date.now();
  const last = Number(localStorage.getItem("bg_last_change")) || 0;
  const current = localStorage.getItem("bg_current") || backgrounds[0];

  if (now - last < CHANGE_INTERVAL) return;

  const next = pickNext(current);
  crossfadeTo(next);
}

// Init (runs once per load)
(function initBackground() {
  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];
  bgImg.src = savedBg;
  fadeLayer.style.backgroundImage = `url('${savedBg}')`;
  fadeLayer.style.opacity = "0";

  // DO NOT rotate on load — only after interval
})();

// Interval rotation
setInterval(updateBackground, CHANGE_INTERVAL);

// ================================
// DARK READER DETECTION
// ================================
setTimeout(() => {
  const drActive =
    document.documentElement.hasAttribute("data-darkreader-mode") ||
    document.documentElement.hasAttribute("data-darkreader-scheme");

  if (drActive) {
    warning.classList.remove("hidden");
  }
}, 500);
