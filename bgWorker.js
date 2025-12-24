let currentBg;
let backgrounds;
let nextChangeTime;
const CHANGE_INTERVAL = 5000;//240000;

onmessage = (e) => {
  currentBg = e.data.current;
  backgrounds = e.data.backgrounds;
  nextChangeTime = e.data.nextChangeTime;

  // Check every 2 seconds if it's time to change
  setInterval(() => {
    const now = Date.now();
    if (now >= nextChangeTime) {
      const choices = backgrounds.filter(b => b !== currentBg);
      const nextBg = choices[Math.floor(Math.random() * choices.length)];

      currentBg = nextBg;
      // Tell the main script to change the background
      postMessage(nextBg);
      
      // Reset the deadline for 4 minutes from now
      nextChangeTime = now + CHANGE_INTERVAL; 
    }
  }, 2000);
};
