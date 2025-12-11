// === PERSISTENT BACKGROUND ROTATION WITH FADE & NO REPEATS ===

// Add your backgrounds here
const backgrounds = [
  "images/background.png",
  "images/background2.jpg",
  "images/background3.png"
];

const CHANGE_INTERVAL = 60000; // 1 minute

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
  fadeLayer.style.zIndex = "-1"; 
  document.body.appendChild(fadeLayer);
}

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
  const currentBg = localStorage.getItem("bg_current");

  // If no background yet → pick one immediately
  if (!currentBg) {
    const initial = pickRandomBackground(null);
    localStorage.setItem("bg_current", initial);
    localStorage.setItem("bg_last_change", now);
    document.body.style.backgroundImage = `url('${initial}')`;
    return;
  }

  // Apply the current background immediately (no jump)
  document.body.style.backgroundImage = `url('${currentBg}')`;

  // If 10 minutes elapsed → change with fade
  if (!lastChange || now - lastChange >= CHANGE_INTERVAL) {
    const newBg = pickRandomBackground(currentBg);
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", now);
    applyBackground(newBg);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  createFadeLayer();
  updateBackground();
});

// Check every 10 seconds if time elapsed
setInterval(updateBackground, 10000);
