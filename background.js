// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// Add your backgrounds here
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg"
];

// Rotation interval (10 minutes)
const CHANGE_INTERVAL = 600000;

// Preload images
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

// Create fade layer for smooth transitions later
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
createFadeLayer();

// Pick a random background excluding current
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply background instantly or with fade
function applyBackground(newBg, instant = false) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  if (instant) {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  } else {
    fadeLayer.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 1;
    setTimeout(() => {
      document.body.style.backgroundImage = `url('${newBg}')`;
      fadeLayer.style.opacity = 0;
    }, 1500);
  }
}

// Initialize background
function initBackground() {
  const storedBg = localStorage.getItem("bg_current");
  const initialBg = storedBg || pickRandomBackground(null);

  localStorage.setItem("bg_current", initialBg);
  localStorage.setItem("bg_last_change", Date.now());

  // Only apply instantly if we haven’t applied yet on this page load
  if (!window.bgAlreadySet) {
    applyBackground(initialBg, true);
    window.bgAlreadySet = true; // Prevents flashing when switching pages
  }
}

// Rotate background after interval
function rotateBackground() {
  const currentBg = localStorage.getItem("bg_current");
  const nextBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", nextBg);
  localStorage.setItem("bg_last_change", Date.now());

  // Fade only for automatic rotations
  applyBackground(nextBg);
}

// Run initialization immediately
initBackground();

// Set interval for automatic rotation
setInterval(rotateBackground, CHANGE_INTERVAL);
