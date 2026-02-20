let timerId = null;

onmessage = (e) => {
  // Clear any existing interval before starting a new one
  if (timerId) clearInterval(timerId);

  let { current, backgrounds, nextChangeTime } = e.data;

  timerId = setInterval(() => {
    const now = Date.now();
    
    if (now >= nextChangeTime) {
      const choices = backgrounds.filter(b => b !== current);
      if (choices.length === 0) return;

      const nextBg = choices[Math.floor(Math.random() * choices.length)];
      
      // Update local worker state so it doesn't fire again immediately
      current = nextBg;
      nextChangeTime = now + 240000; 
      
      postMessage(nextBg);
    }
  }, 1000);
};
