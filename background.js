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

// Preload images for smoother transitions
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

// Create fade layer on top of body
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

// Pick a random background, excluding the current one
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply new background with fade
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  // If first load (bgAlreadySet), apply instantly without fade
  if (window.bgAlreadySet) {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
    return;
  }

  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Main function to update background
function updateBackground(force = false) {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // First load: if no background, pick one
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    if (!window.bgAlreadySet) {
      document.body.style.backgroundImage = `url('${initial}')`;
    }
    return;
  }

  // Check if interval passed
  if (!force && lastChange && now - lastChange < CHANGE_INTERVAL) return;

  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", now);

  createFadeLayer();
  applyBackground(nextBg);
}

// Setup fade layer
createFadeLayer();

// Run update once immediately
updateBackground();

// Set interval for automatic rotation
setInterval(() => updateBackground(), CHANGE_INTERVAL);
