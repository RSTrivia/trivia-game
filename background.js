// ================================
// BACKGROUND ROTATION (STABLE)
// ================================

const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

const CHANGE_INTERVAL = 600000; // 10 minutes
const bgDiv = document.getElementById('background');

// preload
backgrounds.forEach(src => new Image().src = src);

// get saved state
const savedBg = localStorage.getItem('bg_current') || backgrounds[0];
const lastChange = Number(localStorage.getItem('bg_last_change')) || 0;

// apply immediately (NO fade, NO flash)
bgDiv.style.backgroundImage = `url('${savedBg}')`;

// fade layer (created once)
let fadeLayer = document.getElementById('bg-fade-layer');
if (!fadeLayer) {
  fadeLayer = document.createElement('div');
  fadeLayer.id = 'bg-fade-layer';
  Object.assign(fadeLayer.style, {
    position: 'fixed',
    inset: 0,
    zIndex: '-2',
    pointerEvents: 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0,
    transition: 'opacity 1.5s ease'
  });
  document.body.appendChild(fadeLayer);
}

// pick next bg
function pickNext(current) {
  const list = backgrounds.filter(b => b !== current);
  return list[Math.floor(Math.random() * list.length)];
}

// rotate background
function rotateBackground(force = false) {
  const now = Date.now();
  if (!force && now - lastChange < CHANGE_INTERVAL) return;

  const current = localStorage.getItem('bg_current') || savedBg;
  const next = pickNext(current);

  fadeLayer.style.backgroundImage = `url('${next}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    bgDiv.style.backgroundImage = `url('${next}')`;
    fadeLayer.style.opacity = 0;

    localStorage.setItem('bg_current', next);
    localStorage.setItem('bg_last_change', Date.now());
  }, 1500);
}

// interval only (NO forced rotate on load)
setInterval(rotateBackground, CHANGE_INTERVAL);
