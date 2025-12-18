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
  const FADE_DURATION = 1500; // ms, should match CSS transition

  // ----------------------
  // 1️⃣ Load last used background immediately
  // ----------------------
  let savedBg = localStorage.getItem("bg_current") || backgrounds[0];
  bgImg.src = savedBg;

  if (bgImg.complete) {
    bgImg.style.opacity = 1;
  } else {
    bgImg.onload = () => {
      bgImg.style.opacity = 1;
    };
  }

  fadeLayer.style.opacity = 0;

  // ----------------------
  // 2️⃣ Preload all backgrounds (except current)
  // ----------------------
  backgrounds.forEach(src => {
    if (src !== savedBg) {
      const img = new Image();
      img.src = src;
    }
  });

  // ----------------------
  // 3️⃣ Pick next background
  // ----------------------
  function pickNext(current) {
    const list = backgrounds.filter(b => b !== current);
    return list[Math.floor(Math.random() * list.length)];
  }

  // ----------------------
  // 4️⃣ Crossfade to next background
  // ----------------------
  function crossfadeTo(newBg) {
    // Set fadeLayer immediately
    fadeLayer.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 1;

    // After fade duration, swap main bg and hide fadeLayer
    setTimeout(() => {
      bgImg.src = newBg;
      fadeLayer.style.opacity = 0;
      localStorage.setItem("bg_current", newBg);
    }, FADE_DURATION);
  }

  // ----------------------
  // 5️⃣ Rotate backgrounds automatically
  // ----------------------
  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
});
