document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const FADE_DURATION = 1500; // ms
  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png"
  ];

  // Preload all images
  backgrounds.forEach(src => new Image().src = src);

  // Get last background from localStorage
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  // Start the worker
  const worker = new Worker("bgWorker.js");

  // Send the current background to the worker so it starts counting from there
  worker.postMessage({ current: currentBg, backgrounds });

  worker.onmessage = (e) => {
const nextBg = e.data;

  // Only fade if the background is actually different
  if (nextBg === currentBg) return;

  // Preload the next image
  const img = new Image();
  img.src = nextBg;
  img.onload = () => {
    // Fade overlay once image is loaded
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;
    fadeLayer.style.transform = 'translateZ(0)';

    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;
      currentBg = nextBg;
      localStorage.setItem("bg_current", currentBg);
    }, FADE_DURATION);
  };
};
});
