document.addEventListener("DOMContentLoaded", () => {
  const bgImg = document.getElementById("background-img");
  const fadeLayer = document.getElementById("bg-fade-layer");

  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png"
  ];

  const CHANGE_INTERVAL = 180000; // 3 minutes

  // Preload all backgrounds
  backgrounds.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  function pickNext(current) {
    const list = backgrounds.filter(b => b !== current);
    return list[Math.floor(Math.random() * list.length)];
  }

  function crossfadeTo(newBg) {
    fadeLayer.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 1;

    const img = new Image();
    img.src = newBg;
    img.onload = () => {
      bgImg.src = newBg;
      fadeLayer.style.opacity = 0;
      localStorage.setItem("bg_current", newBg);
    };
  }

  // Initialize
  let savedBg = localStorage.getItem("bg_current");
  if (!backgrounds.includes(savedBg)) savedBg = backgrounds[0];

  const preload = new Image();
  preload.src = savedBg;
  preload.onload = () => {
  bgImg.src = savedBg;
  bgImg.style.visibility = "visible";
  bgImg.style.opacity = "1"; // fade in
  fadeLayer.style.backgroundImage = `url('${savedBg}')`;
  fadeLayer.style.opacity = 0;
};


  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
});
