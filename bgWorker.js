let currentBg;
let backgrounds;
const CHANGE_INTERVAL = 4000;//240000; // 4 minutes

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
