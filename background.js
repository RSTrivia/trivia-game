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
  backgrounds.forEach(src => new Image().src = src);

  const CHANGE_INTERVAL = 4000; // 4s
  const FADE_DURATION = 1200;   // ms
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];

  // Show initial background
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  // Use a "logical" timer based on last time
  let startTime = Date.now();

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;
      currentBg = nextBg;
      localStorage.setItem("bg_current", nextBg);
    }, FADE_DURATION);
  }

  function loop() {
    const now = Date.now();
    const elapsed = now - startTime;

    if (elapsed >= CHANGE_INTERVAL) {
      const steps = Math.floor(elapsed / CHANGE_INTERVAL); // how many backgrounds we “skipped”
      const nextBg = pickNext();
      crossfadeTo(nextBg);

      startTime = now; // reset start
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
