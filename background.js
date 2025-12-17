// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// List of backgrounds
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

// Interval: 10 minutes
const CHANGE_INTERVAL = 600000;

// Preload images
backgrounds.forEach(src => new Image().src = src);

// Grab the #background div
const backgroundDiv = document.getElementById('background');

// Immediately apply saved or default background to avoid flash
const savedBg = localStorage.getItem("bg_current") || backgrounds[0];
backgroundDiv.style.backgroundImage = `url('${savedBg}')`;
window.bgAlreadySet = true; // mark initial background as set

// Fade layer on top of #background (for smooth transition)
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
      zIndex: "-2" // behind #background
    });
    document.body.appendChild(fadeLayer);
  }
}

// Pick a random background excluding the current one
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply background with fade
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  // Set fadeLayer background
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  // After fade duration, apply to main div and hide fade layer
  setTimeout(() => {
    backgroundDiv.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Update background based on interval
function updateBackground() {
  const now = Date.now();
  const lastChange = parseInt(localStorage.getItem("bg_last_change") || "0", 10);
  const currentBg = localStorage.getItem("bg_current") || savedBg;

  // If interval not passed, do nothing
  if (now - lastChange < CHANGE_INTERVAL) return;

  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", now);

  createFadeLayer();
  applyBackground(nextBg);
}

// Initial setup
createFadeLayer();
// Do NOT force a new background on load; use saved one
setInterval(updateBackground, CHANGE_INTERVAL);
