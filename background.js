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

// Preload images
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

// Pick next background (excluding current)
function pickNext(current) {
  const list = backgrounds.filter(b => b !== current);
  return list[Math.floor(Math.random() * list.length)];
}

// Crossfade function
function crossfadeTo(newBg) {
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  // Wait for fade then swap main image
  setTimeout(() => {
    bgImg.src = newBg;
    fadeLayer.style.opacity = 0;
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", Date.now());
  }, 1600);
}

// Initialize background on page load
function initBackground() {
  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Set main image and wait for it to load before hiding fade layer
  bgImg.onload = () => {
    fadeLayer.style.opacity = 0;
  };
  bgImg.src = savedBg;

  // Apply initial fade layer
  fadeLayer.style.backgroundImage = `url('${savedBg}')`;
  fadeLayer.style.opacity = 0;

  // Enable fade transition after initial paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fadeLayer.style.transition = "opacity 1.5s ease";
    });
  });

  // Optional: automatic rotation every CHANGE_INTERVAL
  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
}

// Wait for DOM
document.addEventListener("DOMContentLoaded", initBackground);
