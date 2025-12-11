// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// Add your backgrounds here
const backgrounds = [
  "images/background.jpg",
  "images/background2.jpg",
  "images/background3.jpg",
  "images/background4.jpg"
];

// Time between background changes (10 minutes)
const CHANGE_INTERVAL = 600000;

// Create a fade overlay layer
function createFadeLayer() {
  const fadeLayer = document.createElement("div");
  fadeLayer.id = "bg-fade-layer";
  fadeLayer.style.position = "fixed";
  fadeLayer.style.top = 0;
  fadeLayer.style.left = 0;
  fadeLayer.style.width = "100%";
  fadeLayer.style.height = "100%";
  fadeLayer.style.pointerEvents = "none";
  fadeLayer.style.backgroundSize = "cover";
  fadeLayer.style.backgroundPosition = "center";
  fadeLayer.style.opacity = 0;
  fadeLayer.style.transition = "opacity 1.5s ease";
  fadeLayer.style.zIndex = "-1"; // behind everything
  document.body.appendChild(fadeLayer);
}

function pickRandomBackground(exclude) {
  let filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");

  // Put new image on fade layer
  fadeLayer.style.backgroundImage = `url('${newBg}')`;

  // Fade in
  fadeLayer.style.opacity = 1;

  // After fade finishes, swap to body background
  setTimeout(() => {
    document.body.style.backgroundImage = `url('${newBg}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";

    // Fade out the overlay
    fadeLayer.style.opacity = 0;
  }, 1500);
}

function updateBackground() {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // No background yet → choose one
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    document.body.style.backgroundImage = `url('${initial}')`;
    return;
  }

  // Within allowed time → keep current
  if (lastChange && now - lastChange < CHANGE_INTERVAL) {
    document.body.style.backgroundImage = `url('${currentBg}')`;
    return;
  }

  // Time to change → pick a new bg that is not the same as before
  const newBg = pickRandomBackground(currentBg);
  localStorage.setItem("bg_current", newBg);
  localStorage.setItem("bg_last_change", now);

  applyBackground(newBg);
}

document.addEventListener("DOMContentLoaded", () => {
  createFadeLayer();
  updateBackground();
});

// Check every 10 seconds if time expired
setInterval(updateBackground, 10000);
