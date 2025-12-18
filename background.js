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
  backgrounds.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  // Start with the last background
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  bgImg.src = currentBg;
  fadeLayer.style.opacity = 0;

  const FADE_DURATION = 1200;
  const CHANGE_INTERVAL = 180000;

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = 1;

      setTimeout(() => {
        bgImg.src = nextBg;
        fadeLayer.style.opacity = 0;
        currentBg = nextBg;
        localStorage.setItem("bg_current", nextBg);
      }, FADE_DURATION);
    };
  }

  setInterval(() => crossfadeTo(pickNext()), CHANGE_INTERVAL);
});
