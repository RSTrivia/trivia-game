document.addEventListener("DOMContentLoaded", () => {
  const bgImg = document.getElementById("background-img");
  const fadeLayer = document.getElementById("bg-fade-layer");

  if (!bgImg || !fadeLayer) return;

  bgImg.src = 'images/background.jpg';  // your image path
  bgImg.style.display = 'block';
  bgImg.style.width = '100vw';
  bgImg.style.height = '100vh';
  bgImg.style.position = 'fixed';
  bgImg.style.zIndex = '-1';


  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png"
  ];

  const CHANGE_INTERVAL = 180000; // 3 minutes
  const FADE_DURATION = 1200;     // must match CSS transition

  // Load initial background
  let currentBg = localStorage.getItem("bg_current");
  if (!currentBg || !backgrounds.includes(currentBg)) {
    currentBg = backgrounds[0];
  }
  bgImg.src = currentBg;
  bgImg.style.opacity = "1";
  fadeLayer.style.opacity = "0";

  // Preload remaining images
  backgrounds.forEach(src => {
    if (src !== currentBg) {
      const img = new Image();
      img.src = src;
    }
  });

  function pickNext() {
    const choices = backgrounds.filter(b => b !== currentBg);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function crossfadeTo(nextBg) {
    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = "1";

      setTimeout(() => {
        bgImg.src = nextBg;
        fadeLayer.style.opacity = "0";
        currentBg = nextBg;
        localStorage.setItem("bg_current", nextBg);
      }, FADE_DURATION);
    };
  }

  setInterval(() => {
    crossfadeTo(pickNext());
  }, CHANGE_INTERVAL);
});
