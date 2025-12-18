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
  backgrounds.forEach(src => new Image().src = src);

  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  const FADE_DURATION = 1200; // ms

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease`;
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;

      currentBg = nextBg;
      localStorage.setItem("bg_current", nextBg);
    }, FADE_DURATION);
  }

  // Start Web Worker
  if (window.Worker) {
    const worker = new Worker('bgWorker.js');
    worker.onmessage = () => {
      const nextBg = pickNext();
      crossfadeTo(nextBg);
    };
  } else {
    // fallback if workers are not supported
    setInterval(() => crossfadeTo(pickNext()), 4000);
  }
});
