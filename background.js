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

  // 1. Navigation Guard: Prevents background swaps during page transitions
  let isNavigating = false;
  window.addEventListener("beforeunload", () => {
    isNavigating = true;
  });

  backgrounds.forEach(src => new Image().src = src);

  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  const worker = new Worker("bgWorker.js");
  worker.postMessage({ current: currentBg, backgrounds });

  worker.onmessage = (e) => {
    const nextBg = e.data;

    // 2. Safety Checks: 
    // Don't start a transition if the page is closing or hidden
    if (isNavigating || document.hidden || nextBg === currentBg) {
      if (nextBg !== currentBg) {
        localStorage.setItem("bg_current", nextBg);
      }
      return;
    }

    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      // Final check before starting the 3-second animation
      if (isNavigating) return;

      fadeLayer.style.transition = 'none';
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      
      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.opacity = 1;

      setTimeout(() => {
        if (isNavigating) return;

        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        
        setTimeout(() => {
          fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
          fadeLayer.style.opacity = 0;
          
          currentBg = nextBg;
          localStorage.setItem("bg_current", currentBg);
        }, 50);
        
      }, FADE_DURATION);
    };
  };
});
