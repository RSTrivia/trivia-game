document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const FADE_DURATION = 1200; // ms

  // Get last background or default
  let currentBg = localStorage.getItem("bg_current") || "images/background.jpg";
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  // Preload all backgrounds
  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg"
  ];
  backgrounds.forEach(src => new Image().src = src);

  // Start the worker
  const worker = new Worker("bgWorker.js");

  worker.onmessage = (e) => {
    const nextBg = e.data;

    // fade overlay
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease`;
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;

    // after fade, update main background
    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;
      currentBg = nextBg;
      localStorage.setItem("bg_current", nextBg);
    }, FADE_DURATION);
  };
});
