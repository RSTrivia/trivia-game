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

  // 1. Prevent overlapping transitions
  if (nextBg === currentBg || fadeLayer.style.opacity == 1) return;

  const img = new Image();
  img.src = nextBg;
  img.onload = () => {
    // 2. Set the image to the overlay layer first
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    
    // 3. Trigger the CSS Fade In
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      // 4. Once fully faded in, swap the bottom real background
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      
      // 5. Hide the overlay immediately (the real bg is now identical)
      fadeLayer.style.transition = 'none'; 
      fadeLayer.style.opacity = 0;
      
      currentBg = nextBg;
      localStorage.setItem("bg_current", currentBg);
    }, FADE_DURATION);
  };
};
});
