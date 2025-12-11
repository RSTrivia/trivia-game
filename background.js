// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// Add your backgrounds here
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg"
];

// Change interval in milliseconds (1 minute for testing)
const CHANGE_INTERVAL = 60000;

// Preload images for smoother transitions
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

// Create fade layer on top of body
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

// Pick a random background, excluding the current one
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply new background with fade
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Main function to update background
function updateBackground() {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // First load: if no background, pick one
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    document.body.style.backgroundImage = `url('${initial}')`;
    return;
  }

  // Ensure current background is applied immediately
  document.body.style.backgroundImage = `url('${currentBg}')`;

  // Change only if interval elapsed
  if (!lastChange || now - lastChange >= CHANGE_INTERVAL) {
    const newBg = pickRandomBackground(currentBg);
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", now);
    applyBackground(newBg);
  }
}

// Immediately apply last background before DOM loads to prevent flash
const currentBgImmediate = localStorage.getItem("bg_current");
if (currentBgImmediate) {
  document.body.style.backgroundImage = `url('${currentBgImmediate}')`;
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  createFadeLayer();
  updateBackground();
});

// Periodically check every 10 seconds if it's time to change
setInterval(updateBackground, 10000);
