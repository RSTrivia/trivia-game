document.addEventListener("DOMContentLoaded", () => {
  const bgImg = document.getElementById("background-img");
  const fadeLayer = document.getElementById("bg-fade-layer");
  if (!bgImg || !fadeLayer) return;

  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg"
  ];

  // Preload all images
  backgrounds.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  const FADE_DURATION = 1200;      // fade animation time
  const CHANGE_INTERVAL = 4000;    // time between background changes

  // Get last background info from localStorage
  let lastBg = localStorage.getItem("bg_current") || backgrounds[0];
  let lastTimestamp = parseInt(localStorage.getItem("bg_timestamp")) || Date.now();

  // Show current background immediately
  document.documentElement.style.setProperty("--bg-image", `url('${lastBg}')`);
  bgImg.src = lastBg;
  fadeLayer.style.opacity = 0;

  // Pick a new background different from current
  function pickNext(current) {
    const choices = backgrounds.filter(b => b !== current);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // Fade to next background
  function crossfadeTo(nextBg) {
    fadeLayer.style.transition = `opacity ${FADE_DURATION}ms ease`;
    fadeLayer.style.backgroundImage = `url('${nextBg}')`;
    fadeLayer.style.opacity = 1;

    setTimeout(() => {
      document.documentElement.style.setProperty("--bg-image", `url('${nextBg}')`);
      fadeLayer.style.opacity = 0;

      lastBg = nextBg;
      lastTimestamp = Date.now();
      localStorage.setItem("bg_current", lastBg);
      localStorage.setItem("bg_timestamp", lastTimestamp);
    }, FADE_DURATION);
  }

  // Compute how much time passed since last change
  function startInterval() {
    const now = Date.now();
    let elapsed = now - lastTimestamp;

    // If elapsed >= interval, fade immediately
    if (elapsed >= CHANGE_INTERVAL) {
      crossfadeTo(pickNext(lastBg));
      elapsed = 0;
    }

    // Set timeout for next fade based on remaining time
    setTimeout(function run() {
      crossfadeTo(pickNext(lastBg));
      setTimeout(run, CHANGE_INTERVAL);
    }, CHANGE_INTERVAL - elapsed);
  }

  startInterval();
});
