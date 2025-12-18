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

  // Start with last background or default
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  const CHANGE_INTERVAL = 4000;

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // Change overlay background every interval
  setInterval(() => {
    const nextBg = pickNext();
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    currentBg = nextBg;
    localStorage.setItem("bg_current", nextBg);
  }, CHANGE_INTERVAL);
});
