// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// List your backgrounds here
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg"
];

// Rotation interval in milliseconds (10 minutes)
const CHANGE_INTERVAL = 600000;

// Preload all images for smooth transitions
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

// Pick a random background, excluding the current one
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Create fade layer on top of body (only for later rotations)
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
    document.body.appendChild(fadeLayer);
  }
}

// Apply a new background with fade (skip fade if first load)
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  if (window.bgAlreadySet) {
    // Apply instantly, no fade
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
    return;
  }

  // Normal fade for future rotations
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Main background update function
function updateBackground(force = false) {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // First load: pick one if none exists
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    if (!window.bgAlreadySet) {
      document.body.style.backgroundImage = `url('${initial}')`;
    }
    return;
  }

  // Skip if interval hasn't passed
  if (!force && lastChange && now - lastChange < CHANGE_INTERVAL) return;

  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", now);

  applyBackground(nextBg);
}

// ==========================
// INITIAL SETUP
// ==========================

// Immediately apply last background (before fade layer exists)
const currentBgImmediate = localStorage.getItem("bg_current");
if (currentBgImmediate) {
  document.body.style.backgroundImage = `url('${currentBgImmediate}')`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  window.bgAlreadySet = true; // prevent fade on first load
}

// Now create the fade layer for future rotations
createFadeLayer();

// Delay first update slightly to ensure first paint is stable
setTimeout(() => {
  updateBackground();
  setInterval(() => updateBackground(), CHANGE_INTERVAL);
}, 500); // 0.5s delay is enough
