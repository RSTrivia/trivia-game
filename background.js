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

const CHANGE_INTERVAL = 180000; // 3 minutes

// Preload all backgrounds immediately
backgrounds.forEach(src => {
  const img = new Image();
  img.src = src;
});

function pickNext(current) {
  const list = backgrounds.filter(b => b !== current);
  return list[Math.floor(Math.random() * list.length)];
}

function crossfadeTo(newBg) {
  // Set fadeLayer to next image and fade in
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  const img = new Image();
  img.src = newBg;
  img.onload = () => {
    // Swap main image
    bgImg.src = newBg;

    // Fade out layer after main image is loaded
    fadeLayer.style.opacity = 0;

    // Save current background
    localStorage.setItem("bg_current", newBg);
  };
}

function initBackground() {
  // Use saved background or first one
  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Preload first background
  const preload = new Image();
  preload.src = savedBg;
  preload.onload = () => {
    // Disable transitions for instant load
    bgImg.style.transition = "none";
    fadeLayer.style.transition = "none";

    // Show main background instantly
    bgImg.src = savedBg;
    bgImg.style.visibility = "visible";
    bgImg.style.opacity = 1;

    // Prepare fade layer
    fadeLayer.style.backgroundImage = `url('${savedBg}')`;
    fadeLayer.style.opacity = 0;

    // Enable transitions for future crossfades
    requestAnimationFrame(() => {
      bgImg.style.transition = "opacity 0.3s ease";
      fadeLayer.style.transition = "opacity 1.5s ease";
    });
  };

  // Rotate background periodically
  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", initBackground);
