// background.js
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

const CHANGE_INTERVAL = 600000; // 10 min

// Preload all images
backgrounds.forEach(src => new Image().src = src);

// Background elements
const bgDiv = document.getElementById('background');
let fadeLayer = document.getElementById('bg-fade-layer');
if (!fadeLayer) {
  fadeLayer = document.createElement('div');
  fadeLayer.id = 'bg-fade-layer';
  document.body.appendChild(fadeLayer);
}

// Pick random background (exclude current)
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Crossfade new background
function applyBackground(newBg) {
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    bgDiv.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Update background if interval passed
function updateBackground() {
  const now = Date.now();
  const lastChange = Number(localStorage.getItem("bg_last_change")) || 0;
  const currentBg = localStorage.getItem("bg_current") || backgrounds[0];

  if (now - lastChange < CHANGE_INTERVAL) return;

  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", now);

  applyBackground(nextBg);
}

// Initialize background immediately
(function initBackground() {
  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];
  bgDiv.style.backgroundImage = `url('${savedBg}')`;
  fadeLayer.style.backgroundImage = `url('${savedBg}')`;
  fadeLayer.style.opacity = 0;

  const lastChange = Number(localStorage.getItem("bg_last_change")) || 0;
  const now = Date.now();
  if (now - lastChange >= CHANGE_INTERVAL) updateBackground();
})();

// Update every 10 minutes
setInterval(updateBackground, CHANGE_INTERVAL);
