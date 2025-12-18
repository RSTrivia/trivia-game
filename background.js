// background.js
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

const CHANGE_INTERVAL = 60000; // 10 minutes

// Preload all images
backgrounds.forEach(src => new Image().src = src);

// Elements
const bgDiv = document.getElementById('background') || (() => {
  const div = document.createElement('div');
  div.id = 'background';
  document.body.prepend(div);
  return div;
})();

let fadeLayer = document.getElementById('bg-fade-layer');
if (!fadeLayer) {
  fadeLayer = document.createElement('div');
  fadeLayer.id = 'bg-fade-layer';
  fadeLayer.style.position = 'fixed';
  fadeLayer.style.top = 0;
  fadeLayer.style.left = 0;
  fadeLayer.style.width = '100%';
  fadeLayer.style.height = '100%';
  fadeLayer.style.zIndex = -1;
  fadeLayer.style.transition = 'opacity 1.5s ease';
  fadeLayer.style.opacity = 0;
  document.body.appendChild(fadeLayer);
}

// Pick a random background excluding the current one
function pickRandomBackground(exclude) {
  const options = backgrounds.filter(bg => bg !== exclude);
  return options[Math.floor(Math.random() * options.length)];
}

// Crossfade background
function applyBackground(newBg) {
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  fadeLayer.addEventListener(
    'transitionend',
    function done() {
      bgDiv.style.backgroundImage = `url('${newBg}')`;
      fadeLayer.style.opacity = 0;
      fadeLayer.removeEventListener('transitionend', done);
    }
  );
}

// Update background if interval passed
function updateBackground(force = false) {
  const now = Date.now();
  const lastChange = Number(localStorage.getItem("bg_last_change")) || 0;
  const currentBg = localStorage.getItem("bg_current") || backgrounds[0];

  if (!force && now - lastChange < CHANGE_INTERVAL) return;

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

  updateBackground(true); // Force initial check
})();

// Update every 10 minutes
setInterval(updateBackground, CHANGE_INTERVAL);
