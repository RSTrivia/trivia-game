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
  if (nextBg === currentBg) return;

  const img = new Image();
  img.src = nextBg;
  img.onload = () => {
    // 1. Prepare the Fade Layer
    fadeLayer.style.transition = 'none'; // Reset any old transitions
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    
    // 2. Fade IN the Overlay (Now the user sees the new image)
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
    fadeLayer.style.opacity = 1;

    // 3. Wait for the fade to COMPLETE before swapping the base variable
    setTimeout(() => {
      // Update the base variable behind the opaque overlay
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      
      // IMPORTANT: Add a tiny delay (50ms) to ensure the CSS variable has painted
      setTimeout(() => {
        fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
        fadeLayer.style.opacity = 0; // Fade the overlay OUT to reveal the identical base
        
        currentBg = nextBg;
        localStorage.setItem("bg_current", currentBg);
      }, 50);
      
    }, FADE_DURATION);
  };
};
});
