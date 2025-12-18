document.addEventListener("DOMContentLoaded", () => {
  const bgImg = document.getElementById("background-img");
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!bgImg || !fadeLayer) return;

  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg"
  ];

  // Preload all images for smoother fades
  backgrounds.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  // Start with the last background (or default)
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Show instantly (no fade)
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  bgImg.src = currentBg;
  fadeLayer.style.opacity = 0;

  const FADE_DURATION = 1200;
  const CHANGE_INTERVAL = 4000; // 4 seconds

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    // Use CSS transition for smooth fade
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease`;
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;

    // After fade completes, update main background
    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;

      currentBg = nextBg;
      localStorage.setItem("bg_current", nextBg);
    }, FADE_DURATION);
  }

  // Always keep the interval running in the background
  setInterval(() => {
    crossfadeTo(pickNext());
  }, CHANGE_INTERVAL);
});
