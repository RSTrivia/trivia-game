document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg"
  ];

  // Preload all images
  backgrounds.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  // Start with last used background or default
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Set initial background instantly
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  const FADE_DURATION = 1200;
  const CHANGE_INTERVAL = 4000; // 4 seconds

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    // Fade layer on top of current background
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease`;
    fadeLayer.style.opacity = 1;

    // After fade completes, update main background
    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.transition = `none`; // reset transition for next fade
      fadeLayer.style.opacity = 0;

      currentBg = nextBg;
      localStorage.setItem("bg_current", nextBg);
    }, FADE_DURATION);
  }

  // Start interval for crossfades
  setInterval(() => {
    crossfadeTo(pickNext());
  }, CHANGE_INTERVAL);
});
