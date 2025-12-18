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
  const CHANGE_INTERVAL = 4000; // 4 seconds

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
      fadeLayer.style.opacity = 0;
      currentBg = nextBg;
      localStorage.setItem("bg_current", nextBg);
    }, FADE_DURATION);
  }

  // ✅ Only start one interval for the lifetime of the page
  if (!window.bgIntervalStarted) {
    window.bgIntervalStarted = true; // prevent multiple intervals if script runs again
    setInterval(() => crossfadeTo(pickNext()), CHANGE_INTERVAL);
  }
});
