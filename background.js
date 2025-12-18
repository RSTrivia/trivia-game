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

  // Preload images
  backgrounds.forEach(src => new Image().src = src);

  const FADE_DURATION = 1200;
  const CHANGE_INTERVAL = 4000;

  // Last background & timestamp
  let lastBg = localStorage.getItem("bg_current") || backgrounds[0];
  let lastTimestamp = parseInt(localStorage.getItem("bg_timestamp")) || Date.now();

  // Show last background instantly
  document.documentElement.style.setProperty("--bg-image", `url('${lastBg}')`);
  bgImg.src = lastBg;
  fadeLayer.style.opacity = 0;

  function pickNext(current) {
    const choices = backgrounds.filter(b => b !== current);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease`;
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;

      lastBg = nextBg;
      lastTimestamp = Date.now();
      localStorage.setItem("bg_current", lastBg);
      localStorage.setItem("bg_timestamp", lastTimestamp);
    }, FADE_DURATION);
  }

  // Single interval, calculated from last timestamp
  function startBackgroundLoop() {
    function tick() {
      const now = Date.now();
      const elapsed = now - lastTimestamp;

      if (elapsed >= CHANGE_INTERVAL) {
        crossfadeTo(pickNext(lastBg));
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  startBackgroundLoop();
});
