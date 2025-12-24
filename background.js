document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const FADE_DURATION = 1500;
  const CHANGE_INTERVAL = 5000; 
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

  // --- 1. THE HANDOFF (FINISH FADE FROM PREVIOUS PAGE) ---
  const lastBg = localStorage.getItem("bg_previous"); 
  const currentBgFromStore = localStorage.getItem("bg_current") || backgrounds[0];

  if (lastBg && lastBg !== currentBgFromStore) {
    // We arrived mid-transition! 
    // Show the OLD background on top of the NEW one
    fadeLayer.style.transition = 'none';
    fadeLayer.style.backgroundImage = `url('${lastBg}')`;
    fadeLayer.style.opacity = '1';
    void fadeLayer.offsetWidth; // Force render

    // Fade it OUT to reveal the new base background
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
    fadeLayer.style.opacity = '0';
    
    // Reset handoff so it doesn't trigger again on refresh
    localStorage.setItem("bg_previous", currentBgFromStore);
  }

  // Set initial base background
  document.documentElement.style.setProperty("--bg-image", `url('${currentBgFromStore}')`);

  // Preload
  backgrounds.forEach(src => { const img = new Image(); img.src = src; });

  let nextChangeTime = localStorage.getItem("bg_next_change");
  if (!nextChangeTime || isNaN(nextChangeTime)) {
    nextChangeTime = Date.now() + CHANGE_INTERVAL;
    localStorage.setItem("bg_next_change", nextChangeTime);
  }

  const worker = new Worker("bgWorker.js");
  worker.postMessage({ 
    current: currentBgFromStore, 
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

      // --- 2. START TRANSITION & SAVE STATE ---
      // We save the 'current' as 'previous' so the next page can hand-off
      localStorage.setItem("bg_previous", localStorage.getItem("bg_current"));
      localStorage.setItem("bg_current", nextBg);

      // Prepare Fade Layer (this shows the NEW image on top)
      fadeLayer.style.transition = 'none';
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = '0';
      void fadeLayer.offsetWidth; 

      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.opacity = '1';

      setTimeout(() => {
        if (isNavigating) return;

        // Swap Base Image
        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        
        setTimeout(() => {
          if (isNavigating) return;
          fadeLayer.style.opacity = '0';
          localStorage.setItem("bg_next_change", Date.now() + CHANGE_INTERVAL);
          // Sync previous once finished
          localStorage.setItem("bg_previous", nextBg);
        }, 50);
        
      }, FADE_DURATION);
    };
  };
});
