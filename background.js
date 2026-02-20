document.addEventListener("DOMContentLoaded", () => {
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!fadeLayer) return;

  const FADE_DURATION = 1500;
  const CHANGE_INTERVAL = 10000;//240000; //4 mins  //5000; Testing interval
  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png",
    "images/background7.jpg",
    "images/background8.jpg",
    "images/background9.jpg",
    "images/background10.jpg",
    "images/background11.png"
  ];

  let isNavigating = false;
  window.addEventListener("beforeunload", () => { isNavigating = true; });

  // 1. Get current stable background
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);

  // 2. Preload
  backgrounds.forEach(src => { const img = new Image(); img.src = src; });

  // 3. ONLY reset the timer if it doesn't exist or is in the past
  let savedNextChange = localStorage.getItem("bg_next_change");
  let nextChangeTime = parseInt(savedNextChange);

  if (!nextChangeTime || nextChangeTime < Date.now()) {
    nextChangeTime = Date.now() + CHANGE_INTERVAL;
    localStorage.setItem("bg_next_change", nextChangeTime);
  }

  const worker = new Worker("bgWorker.js");
  worker.postMessage({ 
    current: currentBg, 
    backgrounds, 
    nextChangeTime: nextChangeTime 
  });

  worker.onmessage = (e) => {
    const nextBg = e.data;
    
    // Safety: If the worker suggests the same image or we are leaving, ignore it.
    if (document.hidden || isNavigating || nextBg === currentBg) return;

    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      if (isNavigating) return;

      // Update storage IMMEDIATELY so navigation knows where we are
      localStorage.setItem("bg_current", nextBg);

      // Prepare Fade
      fadeLayer.style.transition = 'none';
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = '0';
      void fadeLayer.offsetWidth; 

      // Execute Fade
      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.opacity = '1';

      setTimeout(() => {
        if (isNavigating) return;

        // Commit to base
        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        
        setTimeout(() => {
          if (isNavigating) return;
          fadeLayer.style.opacity = '0';
          currentBg = nextBg;
          
          // ONLY NOW do we set the time for the NEXT change
          const newTime = Date.now() + CHANGE_INTERVAL;
          localStorage.setItem("bg_next_change", newTime);
          
          // Tell worker to start the new countdown
          worker.postMessage({ 
            current: currentBg, 
            backgrounds, 
            nextChangeTime: newTime 
          });
        }, 50);
      }, FADE_DURATION);
    };
  };
});
