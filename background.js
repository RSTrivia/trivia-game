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

  // Ensure nextChangeTime is a valid number and not in the far future
  if (!nextChangeTime || isNaN(nextChangeTime) || parseInt(nextChangeTime) > Date.now() + 300000) {
    nextChangeTime = Date.now() + CHANGE_INTERVAL;
    localStorage.setItem("bg_next_change", nextChangeTime);
  }

  // Set initial background
  document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);

  // Start Worker
  const worker = new Worker("bgWorker.js");
  worker.postMessage({ 
    current: currentBg, 
    backgrounds, 
    nextChangeTime: parseInt(nextChangeTime) 
  });

  worker.onmessage = (e) => {
    const nextBg = e.data;
    console.log("WORKER MESSAGE RECEIVED: Switching to", nextBg);

    if (isNavigating || document.hidden) {
      localStorage.setItem("bg_current", nextBg);
      localStorage.setItem("bg_next_change", Date.now() + CHANGE_INTERVAL);
      return;
    }

    const img = new Image();
    img.src = nextBg;
    img.onload = () => {
      // 1. Prepare Fade Layer
      fadeLayer.style.transition = 'none';
      fadeLayer.style.backgroundImage = `url('${nextBg}')`;
      fadeLayer.style.opacity = '0';
      
      // Force Reflow
      void fadeLayer.offsetWidth;

      // 2. Fade In
      fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
      fadeLayer.style.opacity = '1';

      setTimeout(() => {
        if (isNavigating) return;

        // 3. Swap Base Image
        document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
        
        setTimeout(() => {
          // 4. Fade Out Layer
          fadeLayer.style.opacity = '0';
          
          currentBg = nextBg;
          localStorage.setItem("bg_current", currentBg);
          localStorage.setItem("bg_next_change", Date.now() + CHANGE_INTERVAL);
        }, 50);
        
      }, FADE_DURATION);
    };
  };
});

// This makes "Leaderboard" and "Login" links wait a split second 
// so the background script can "save" its state before the page dies.
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.href.includes('.html')) {
    e.preventDefault(); // Stop the instant "jump"
    
    const targetUrl = link.href;
    const targetBg = localStorage.getItem("bg_current");

    // Force the background to be solid and saved
    document.documentElement.style.setProperty("--bg-image", `url('${targetBg}')`);
    
    // Now leave the page after a tiny "breath"
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 50); 
  }
});
