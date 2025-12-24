document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const FADE_DURATION = 1500;
  const CHANGE_INTERVAL = 5000; // 5 Seconds for testing
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

  // Preload
  backgrounds.forEach(src => { const img = new Image(); img.src = src; });

  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  let nextChangeTime = localStorage.getItem("bg_next_change");

  if (!nextChangeTime || isNaN(nextChangeTime) || parseInt(nextChangeTime) > Date.now() + 300000) {
    nextChangeTime = Date.now() + CHANGE_INTERVAL;
    localStorage.setItem("bg_next_change", nextChangeTime);
  }

  // Set initial background
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);

  const worker = new Worker("bgWorker.js");
  worker.postMessage({ 
    current: currentBg, 
    backgrounds, 
    nextChangeTime: parseInt(nextChangeTime) 
  });

  worker.onmessage = (e) => {
    const nextBg = e.data;

    if (document.hidden || isNavigating) {
      localStorage.setItem("bg_current", nextBg);
      localStorage.setItem("bg_next_change", Date.now() + CHANGE_INTERVAL);
      return;
    }

    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      if (isNavigating) return;

      // 1. SAVE IMMEDIATELY: Next page will now know to use the new BG
      localStorage.setItem("bg_current", nextBg);

      // 2. Prepare Fade Layer
      fadeLayer.style.transition = 'none';
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = '0';
      void fadeLayer.offsetWidth; 

      // 3. Fade In
      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.opacity = '1';

      setTimeout(() => {
        if (isNavigating) return;

        // 4. Swap Base Image
        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        
        setTimeout(() => {
          if (isNavigating) return;
          // 5. Reset Fade Layer
          fadeLayer.style.opacity = '0';
          currentBg = nextBg;
          localStorage.setItem("bg_next_change", Date.now() + CHANGE_INTERVAL);
        }, 50);
        
      }, FADE_DURATION);
    };
  };
});
