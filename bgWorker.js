let currentBg;
let backgrounds;
const CHANGE_INTERVAL = 240000; // 4 Minutes (Match your game speed)

onmessage = (e) => {
  currentBg = e.data.current;
  backgrounds = e.data.backgrounds;

  // IMPORTANT: Use setInterval only. 
  // This ensures the FIRST change happens AFTER the interval has passed.
  setInterval(() => {
    const choices = backgrounds.filter(b => b !== currentBg);
    const nextBg = choices[Math.floor(Math.random() * choices.length)];

    currentBg = nextBg;
    postMessage(nextBg);
  }, CHANGE_INTERVAL);
};
