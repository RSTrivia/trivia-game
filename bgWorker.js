let currentBg;
let backgrounds;
let nextChangeTime;

onmessage = (e) => {
  currentBg = e.data.current;
  backgrounds = e.data.backgrounds;
  nextChangeTime = e.data.nextChangeTime;

  // Check every 1 second for fast testing
  setInterval(() => {
    const now = Date.now();
    
    if (now >= nextChangeTime) {
      const choices = backgrounds.filter(b => b !== currentBg);
      if (choices.length === 0) return;

      const nextBg = choices[Math.floor(Math.random() * choices.length)];
      currentBg = nextBg;
      
      // Update the deadline immediately so we don't spam the main thread
      nextChangeTime = now + 240000; // 4 mins for
      
      postMessage(nextBg);
    }
  }, 1000);
};
