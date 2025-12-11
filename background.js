// === BACKGROUND ROTATION ===

// List your backgrounds
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg"
];

// Change every 10 minutes (600000 ms)
const CHANGE_INTERVAL = 600000;

function changeBackground() {
  const random = Math.floor(Math.random() * backgrounds.length);
  document.body.style.backgroundImage = `url('${backgrounds[random]}')`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
}

// First background on page load
document.addEventListener("DOMContentLoaded", changeBackground);

// Rotate every X minutes
setInterval(changeBackground, CHANGE_INTERVAL);
