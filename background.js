// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO JUMP ===

// Add your backgrounds here
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

// Change interval in milliseconds (10 minutes)
const CHANGE_INTERVAL = 600000;

// Preload images for smoother transitions
backgrounds.forEach(src => new Image().src = src);

// Get or create the #background div
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
    transition: "opacity 1.5s ease",
    opacity: "1"
  });
  document.body.prepend(backgroundDiv);
}

// Fade layer for smooth transition
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

// Pick a random background excluding the current one
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply a background (fade effect)
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  if (window.bgAlreadySet) {
    // Instant first load
    backgroundDiv.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
    return;
  }

  // Normal fade for later rotations
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    backgroundDiv.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Update background (force or interval)
function updateBackground(force = false) {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // First load: pick a background if none exists
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    if (!window.bgAlreadySet) {
      backgroundDiv.style.backgroundImage = `url('${initial}')`;
    }
    return;
  }

  // Skip if interval not passed and not forced
  if (!force && lastChange && now - lastChange < CHANGE_INTERVAL) return;

  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", now);

  createFadeLayer();
  applyBackground(nextBg);
}

// === INITIAL SETUP ===
createFadeLayer();

// Apply last background immediately (prevents first-load jump)
const savedBg = localStorage.getItem("bg_current");
if (savedBg) {
  backgroundDiv.style.backgroundImage = `url('${savedBg}')`;
  window.bgAlreadySet = true;
} else {
  updateBackground(true); // pick initial background
}

// Start interval rotation
setInterval(() => updateBackground(), CHANGE_INTERVAL);
