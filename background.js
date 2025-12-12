// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// Add your backgrounds here
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg"
];

// Change interval in milliseconds (10 minutes)
const CHANGE_INTERVAL = 600000;

// Preload images for instant swaps (prevents flashing)
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

// --- NEW: ensure body has instant fallback background (CSS covers flash) ---
document.body.style.backgroundImage =
  document.body.style.backgroundImage ||
  "url('images/background.jpg')";

// Create fade layer
function createFadeLayer() {
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
  document.body.appendChild(fadeLayer);
}

function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply new background with fade — ONLY after it is loaded (no flicker)
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  const img = new Image();
  img.onload = () => {
    fadeLayer.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      document.body.style.backgroundImage = `url('${newBg}')`;
      fadeLayer.style.opacity = 0;
    }, 1500);
  };
  img.src = newBg;
}

// --- NEW: Make sure initial background loads WITHOUT flicker ---
function applyInitialBackground(bg) {
  const img = new Image();
  img.onload = () => {
    document.body.style.backgroundImage = `url('${bg}')`;
  };
  img.src = bg;
}

// Main update function
function updateBackground() {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // First load
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    applyInitialBackground(initial);
    return;
  }

  // Apply instantly (but using pre-loaded logic)
  applyInitialBackground(currentBg);

  // Change only if interval passed
  if (!lastChange || now - lastChange >= CHANGE_INTERVAL) {
    const newBg = pickRandomBackground(currentBg);
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", now);
    applyBackground(newBg);
  }
}

// Ensure last saved background applies instantly (prevents white flash)
const currentBgImmediate = localStorage.getItem("bg_current");
if (currentBgImmediate) {
  document.body.style.backgroundImage = `url('${currentBgImmediate}')`;
}

document.addEventListener("DOMContentLoaded", () => {
  createFadeLayer();
  updateBackground();
});

// Re-check every 10 seconds
setInterval(updateBackground, 10000);
