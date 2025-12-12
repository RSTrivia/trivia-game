// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// Backgrounds
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg"
];

const CHANGE_INTERVAL = 600000; // 10 minutes

// Preload images for smooth fade
backgrounds.forEach(src => new Image().src = src);

// Create fade layer (behind all content)
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

// Pick a random background excluding current
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply background (faded if not first load)
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  // First load → no fade
  if (window.bgAlreadySet) {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
    return;
  }

  // Fade transition
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Update background (forced or interval)
function updateBackground(force = false) {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    if (!window.bgAlreadySet) {
      document.body.style.backgroundImage = `url('${initial}')`;
    }
    return;
  }

  if (!force && lastChange && now - lastChange < CHANGE_INTERVAL) return;

  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", now);

  createFadeLayer();
  applyBackground(nextBg);
}

// Setup
createFadeLayer();
if (!window.bgAlreadySet) updateBackground();
setInterval(() => updateBackground(), CHANGE_INTERVAL);
