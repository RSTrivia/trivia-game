document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const FADE_DURATION = 1500; 
  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png"
  ];

  // Preload all to browser cache
  backgrounds.forEach(src => { const img = new Image(); img.src = src; });

  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  
  // Set initial state from localStorage
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  const worker = new Worker("bgWorker.js");
  worker.postMessage({ current: currentBg, backgrounds });

  worker.onmessage = (e) => {
    const nextBg = e.data;
    if (nextBg === currentBg) return;

    // Smooth Fade Logic
    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = 1;

      setTimeout(() => {
        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        fadeLayer.style.opacity = 0;
        currentBg = nextBg;
        localStorage.setItem("bg_current", currentBg);
      }, FADE_DURATION);
    };
  };
});
