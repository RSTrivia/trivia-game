// === BACKGROUND ROTATION ===

// List your backgrounds
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg"
];

// Change every 10 minutes
const CHANGE_INTERVAL = 600000; // 10 min in ms

function pickRandomBackground() {
  return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

function applyBackground(url) {
  document.body.style.backgroundImage = `url('${url}')`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
}

function updateBackground() {
  const now = Date.now();
  const lastChange = localStorage.getItem("bg_last_change");
  const currentBg = localStorage.getItem("bg_current");

  // If no background chosen yet → pick; OR if 10 minutes passed → pick new
  if (!currentBg || !lastChange || now - lastChange > CHANGE_INTERVAL) {
    const newBg = pickRandomBackground();
    localStorage.setItem("bg_current", newBg);
    localStorage.setItem("bg_last_change", now);
    applyBackground(newBg);
  } else {
    applyBackground(currentBg);
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", updateBackground);

// Also check periodically (in case the user keeps one page open)
setInterval(updateBackground, 10000); // check every 10 sec
