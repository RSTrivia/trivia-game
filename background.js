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

  // Preload images for smooth fades
  backgrounds.forEach(src => new Image().src = src);

  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);

  const CHANGE_INTERVAL = 4000; // 4 seconds
  const FADE_DURATION = 1200;   // ms

  let lastChangeTime = performance.now();

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
      lastChangeTime = performance.now(); // reset timer
    }, FADE_DURATION);
  }

  function loop(now) {
    if (now - lastChangeTime >= CHANGE_INTERVAL) {
      crossfadeTo(pickNext());
      lastChangeTime = now; // ensure consistent timing
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop); // start loop
});
