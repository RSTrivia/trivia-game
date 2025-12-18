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
backgrounds.forEach(src => new Image().src = src);

function pickNext(current) {
  const list = backgrounds.filter(b => b !== current);
  return list[Math.floor(Math.random() * list.length)];
}

function crossfadeTo(newBg) {
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    bgImg.src = newBg;
    fadeLayer.style.opacity = 0;
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", Date.now());
  }, 1600);
}

function initBackground() {
  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];
  bgImg.src = savedBg;
  fadeLayer.style.backgroundImage = `url('${savedBg}')`;
  fadeLayer.style.opacity = 0;

  // Enable transition after initial paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fadeLayer.style.transition = "opacity 1.5s ease";
    });
  });
}

document.addEventListener("DOMContentLoaded", initBackground);
