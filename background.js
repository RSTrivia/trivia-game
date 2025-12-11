// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// Add your backgrounds here
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg"
];

const CHANGE_INTERVAL = 60000; // 1 minute

// Immediately apply last background before DOM paints
(function setInitialBackground() {
  const currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  document.body.style.backgroundImage = `url('${currentBg}')`;
})();

// Create fade layer after DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
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

  // Start background updater
  updateBackground();
  setInterval(updateBackground, 10000);
});

function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    document.body.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

function updateBackground() {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Apply current background immediately (prevents jump on DOMContentLoaded)
  document.body.style.backgroundImage = `url('${currentBg}')`;

  if (!lastChange || now - lastChange >= CHANGE_INTERVAL) {
    const newBg = pickRandomBackground(currentBg);
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", now);
    applyBackground(newBg);
  }
}
