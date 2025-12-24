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

  // 1. Get the current "Stable" background
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  
  // Apply it immediately to the base
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);

  // 2. Preload
  backgrounds.forEach(src => { const img = new Image(); img.src = src; });

  // 3. Worker Setup
  let nextChangeTime = localStorage.getItem("bg_next_change");
  if (!nextChangeTime || isNaN(nextChangeTime)) {
    nextChangeTime = Date.now() + CHANGE_INTERVAL;
    localStorage.setItem("bg_next_change", nextChangeTime);
  }

  const worker = new Worker("bgWorker.js");
  worker.postMessage({ current: currentBg, backgrounds, nextChangeTime: parseInt(nextChangeTime) });

  worker.onmessage = (e) => {
    const nextBg = e.data;
    if (document.hidden || isNavigating || nextBg === currentBg) return;

    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      if (isNavigating) return;

      // --- THE SMOOTH SWAP ---
      // We put the NEXT image on the fade layer (invisible)
      fadeLayer.style.transition = 'none';
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = '0';
      void fadeLayer.offsetWidth; 

      // Fade the NEW image IN
      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.opacity = '1';

      // Halfway through or at the end, we update storage
      // so if the user clicks now, the next page loads the NEW image
      localStorage.setItem("bg_current", nextBg);

      setTimeout(() => {
        if (isNavigating) return;

        // Make the NEW image the base
        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        
        // Hide the fade layer (it's now identical to the base)
        setTimeout(() => {
          if (isNavigating) return;
          fadeLayer.style.opacity = '0';
          currentBg = nextBg;
          localStorage.setItem("bg_next_change", Date.now() + CHANGE_INTERVAL);
        }, 50);
      }, FADE_DURATION);
    };
  };
});
