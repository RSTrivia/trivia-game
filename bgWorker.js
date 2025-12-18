// bgWorker.js
const CHANGE_INTERVAL = 4000; // ms

function startTimer() {
  let lastTime = Date.now();

  setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastTime;

    if (elapsed >= CHANGE_INTERVAL) {
      // send message to main thread
      postMessage('change');
      lastTime = now;
    }
  }, 100); // check every 100ms
}

startTimer();
