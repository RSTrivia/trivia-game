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

const CHANGE_INTERVAL = 180000;

// Preload all backgrounds
backgrounds.forEach(src => new Image().src = src);

function pickNext(current) {
  const list = backgrounds.filter(b => b !== current);
  return list[Math.floor(Math.random() * list.length)];
}

function crossfadeTo(newBg) {
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  const img = new Image();
  img.src = newBg;
  img.onload = () => {
    bgImg.src = newBg;
    fadeLayer.style.opacity = 0;
    localStorage.setItem("bg_current", newBg);
  };
}

function initBackground() {
  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Immediately set bgImg to savedBg to avoid black flash
  bgImg.src = savedBg;
  bgImg.style.visibility = "visible";
  bgImg.style.opacity = 1;

  // Preload fadeLayer with the same image (ready for crossfade)
  const preload = new Image();
  preload.src = savedBg;
  preload.onload = () => {
    fadeLayer.style.backgroundImage = `url('${savedBg}')`;
    fadeLayer.style.opacity = 0;

    // Enable transitions for future crossfade
    requestAnimationFrame(() => {
      bgImg.style.transition = "opacity 0.3s ease";
      fadeLayer.style.transition = "opacity 1.5s ease";
    });
  };

  // Rotate background every CHANGE_INTERVAL
  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
}

document.addEventListener("DOMContentLoaded", initBackground);
