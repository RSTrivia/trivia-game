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

  // Preload images
  backgrounds.forEach(src => { const img = new Image(); img.src = src; });

  const FADE_DURATION = 1200;
  const CHANGE_INTERVAL = 4000;

  // Get current background and last change timestamp
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  let lastChange = parseInt(localStorage.getItem("bg_lastChange")) || Date.now();

  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.transition = 'none';
      fadeLayer.style.opacity = 0;

      currentBg = nextBg;
      lastChange = Date.now();
      localStorage.setItem("bg_current", nextBg);
      localStorage.setItem("bg_lastChange", lastChange);
    }, FADE_DURATION);
  }

  function updateBackground() {
    const now = Date.now();
    if (now - lastChange >= CHANGE_INTERVAL) {
      crossfadeTo(pickNext());
    }
    requestAnimationFrame(updateBackground);
  }

  // Start the loop
  updateBackground();
});
