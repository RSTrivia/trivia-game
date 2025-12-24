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
  let currentBg = localStorage.getItem("bg_current") || backgrounds[0];
  // 1. Just set the existing background. Do NOT trigger a fade yet.
    document.documentElement.style.setProperty("--bg-image", `url('${currentBg}')`);
  
  // Preload all images
  backgrounds.forEach(src => new Image().src = src);

  //fadeLayer.style.opacity = 0;

  // Start the worker
  const worker = new Worker("bgWorker.js");

  // Send the current background to the worker so it starts counting from there
 // 2. Tell the worker what the current background is
    worker.postMessage({ current: currentBg, backgrounds });

    worker.onmessage = (e) => {
        const nextBg = e.data;
        if (nextBg === currentBg) return;
      
  // Preload the next image
  const img = new Image();
  img.src = nextBg;
  img.onload = () => {
// 3. This part ONLY runs when the worker says time is up (after 4 mins)
        const img = new Image();
        img.src = nextBg;
        img.onload = () => {
            fadeLayer.style.backgroundImage = `url('${nextBg}')`;
            fadeLayer.style.opacity = 1;

            setTimeout(() => {
                document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
                fadeLayer.style.opacity = 0;
                currentBg = nextBg;
                localStorage.setItem("bg_current", currentBg);
            }, 1500); // Fade duration
        };
};
});
