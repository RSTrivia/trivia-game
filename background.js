document.addEventListener("DOMContentLoaded", () => {
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

  // -----------------------------
  // Get saved background from localStorage or default
  // -----------------------------
  let savedBg = localStorage.getItem("bg_current");
  if (!backgrounds.includes(savedBg)) savedBg = backgrounds[0];

  // -----------------------------
  // Immediately set src to avoid alt text showing
  // -----------------------------
  bgImg.src = savedBg;
  bgImg.style.visibility = "visible";
  bgImg.style.opacity = 1;

  // -----------------------------
  // Preload all backgrounds (so crossfade is instant)
  // -----------------------------
  backgrounds.forEach(src => {
    if (src !== savedBg) {
      const img = new Image();
      img.src = src;
    }
  });

  // -----------------------------
  // Pick next background
  // -----------------------------
  function pickNext(current) {
    const list = backgrounds.filter(b => b !== current);
    return list[Math.floor(Math.random() * list.length)];
  }

  // -----------------------------
  // Crossfade to next background
  // -----------------------------
  function crossfadeTo(newBg) {
    // Set fade layer image
    fadeLayer.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 1;

    // Preload the new image
    const img = new Image();
    img.src = newBg;
    img.onload = () => {
      // Switch main image once loaded
      bgImg.src = newBg;

      // Fade out the layer smoothly
      fadeLayer.style.opacity = 0;

      // Save current background
      localStorage.setItem("bg_current", newBg);
    };
  }

  // -----------------------------
  // Rotate backgrounds every interval
  // -----------------------------
  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
});
