// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO JUMP ===

const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

const CHANGE_INTERVAL = 600000; // 10 minutes

// Preload images
backgrounds.forEach(src => new Image().src = src);

// Get/create background div
let backgroundDiv = document.getElementById('background');
if (!backgroundDiv) {
  backgroundDiv = document.createElement('div');
  backgroundDiv.id = 'background';
  Object.assign(backgroundDiv.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    zIndex: "-1",
    opacity: "1",
    transition: "opacity 1.5s ease"
  });
  document.body.prepend(backgroundDiv);
}

// Fade layer
function createFadeLayer() {
  if (!document.getElementById("bg-fade-layer")) {
    const fadeLayer = document.createElement("div");
    fadeLayer.id = "bg-fade-layer";
    Object.assign(fadeLayer.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: 0,
      transition: "opacity 1.5s ease",
      zIndex: "-1"
    });
    document.body.prepend(fadeLayer);
  }
}

// Pick random background not equal to exclude
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply background with fade
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  // Fade layer shows new bg
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  // After fade, update #background and hide fadeLayer
  setTimeout(() => {
    backgroundDiv.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Update background
function updateBackground(force = false) {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // First load
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    backgroundDiv.style.backgroundImage = `url('${initial}')`;
    return;
  }

  if (!force && lastChange && now - lastChange < CHANGE_INTERVAL) return;

  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", now);

  createFadeLayer();
  applyBackground(nextBg);
}

// INITIAL SETUP
createFadeLayer();

// Set initial background immediately to avoid jump
const savedBg = localStorage.getItem("bg_current") || pickRandomBackground(null);
backgroundDiv.style.backgroundImage = `url('${savedBg}')`;
localStorage.setItem("bg_current", savedBg);

// Start interval rotation
setInterval(() => updateBackground(), CHANGE_INTERVAL);
