// bgWorker.js

const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg"
];

const CHANGE_INTERVAL = 4000; // ms
let currentIndex = 0;

// Send initial background
postMessage(backgrounds[currentIndex]);

setInterval(() => {
  // pick next index
  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * backgrounds.length);
  } while (nextIndex === currentIndex);

  currentIndex = nextIndex;

  // send to main thread
  postMessage(backgrounds[currentIndex]);
}, CHANGE_INTERVAL);
