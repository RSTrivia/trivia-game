document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return; // only need fadeLayer to run

  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg"
  ];

  // Preload images for smoother transitions
  backgrounds.forEach(src => new Image().src = src);

  // Start with the last background or default
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];

  // 🔥 Set initial background via CSS variable immediately (no flicker)
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  const FADE_DURATION = 1200;
  const CHANGE_INTERVAL = 4000; // 4 seconds for testing

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    // Fade in overlay immediately, image already preloaded
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      // Update main background
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;

      currentBg = nextBg;
      localStorage.setItem("bg_current", nextBg);
    }, FADE_DURATION);
  }

  // Start interval to change background
  setInterval(() => crossfadeTo(pickNext()), CHANGE_INTERVAL);
});
