document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const FADE_DURATION = 1500;
  const CHANGE_INTERVAL = 5000;//240000; // 4 minutes
  
  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png"
  ];

  let isNavigating = false;
  window.addEventListener("beforeunload", () => { isNavigating = true; });

  backgrounds.forEach(src => new Image().src = src);

  // --- PERSISTENT TIMER LOGIC ---
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  let nextChangeTime = localStorage.getItem("bg_next_change");

  // If no timer exists or it's corrupted, set a new one
  if (!nextChangeTime || isNaN(nextChangeTime)) {
    nextChangeTime = Date.now() + CHANGE_INTERVAL;
    localStorage.setItem("bg_next_change", nextChangeTime);
  }

  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  fadeLayer.style.opacity = 0;

  // Start Worker with the persistent timestamp
  const worker = new Worker("bgWorker.js");
  worker.postMessage({ 
    current: currentBg, 
    backgrounds, 
    nextChangeTime: parseInt(nextChangeTime) 
  });

  worker.onmessage = (e) => {
    const nextBg = e.data;

    if (isNavigating || document.hidden || nextBg === currentBg) {
      if (nextBg !== currentBg) {
        localStorage.setItem("bg_current", nextBg);
        localStorage.setItem("bg_next_change", Date.now() + CHANGE_INTERVAL);
      }
      return;
    }

    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      if (isNavigating) return;

      fadeLayer.style.transition = 'none';
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      void fadeLayer.offsetWidth; // Force reflow

      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.opacity = 1;

      setTimeout(() => {
        if (isNavigating) return;

        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        
        setTimeout(() => {
          fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
          fadeLayer.style.opacity = 0;
          
          currentBg = nextBg;
          // Set next deadline 4 minutes from NOW
          const nextDeadline = Date.now() + CHANGE_INTERVAL;
          localStorage.setItem("bg_current", currentBg);
          localStorage.setItem("bg_next_change", nextDeadline);
        }, 50);
        
      }, FADE_DURATION);
    };
  };
});
