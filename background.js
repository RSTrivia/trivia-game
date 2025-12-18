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

  const FADE_DURATION = 1200; // ms
  const CHANGE_INTERVAL = 4000; // ms

  // Last background
  let lastBg = localStorage.getItem("bg_current") || backgrounds[0];

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
      // Update main background
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;

      lastBg = nextBg;
      localStorage.setItem("bg_current", lastBg);
    }, FADE_DURATION);
  }

  // Start interval loop
  setInterval(() => {
    const nextBg = pickNext(lastBg);
    crossfadeTo(nextBg);
  }, CHANGE_INTERVAL);
});
