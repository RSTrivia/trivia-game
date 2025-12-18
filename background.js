// ================================
// BACKGROUND SYSTEM (STABLE + NO RELOAD CHANGE)
// ================================
const bgImg = document.getElementById("background-img");
const fadeLayer = document.getElementById("bg-fade-layer");

const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];

// 3 minutes
const CHANGE_INTERVAL = 180000;

// Preload all backgrounds (for smooth transitions)
backgrounds.forEach(src => new Image().src = src);

// Pick a random next background excluding the current one
function pickNext(current) {
  const list = backgrounds.filter(b => b !== current);
  return list[Math.floor(Math.random() * list.length)];
}

// Crossfade to a new background
function crossfadeTo(newBg) {
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    bgImg.src = newBg;
    fadeLayer.style.opacity = 0;
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", Date.now());
  }, 1600); // slightly longer than transition
}

// Initialize background
function initBackground() {
  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Preload the saved image to prevent flicker
  const preload = new Image();
  preload.src = savedBg;
  preload.onload = () => {
    // Set the actual background image after it's fully loaded
    bgImg.src = savedBg;
    fadeLayer.style.backgroundImage = `url('${savedBg}')`;
    fadeLayer.style.opacity = 0;

    // Enable fade transition after initial paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fadeLayer.style.transition = "opacity 1.5s ease";
      });
    });
  };

  // Rotate background every CHANGE_INTERVAL
  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
}

// Start everything after DOM is ready
document.addEventListener("DOMContentLoaded", initBackground);
