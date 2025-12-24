let currentBg;
let backgrounds;
const CHANGE_INTERVAL = 20000;//240000; 

onmessage = (e) => {
  currentBg = e.data.current;
  backgrounds = e.data.backgrounds;

  // This ensures the background won't change for at least 4 mins after a page load/refresh
  setInterval(() => {
    const choices = backgrounds.filter(b => b !== currentBg);
    const nextBg = choices[Math.floor(Math.random() * choices.length)];

    currentBg = nextBg;
    postMessage(nextBg);
  }, CHANGE_INTERVAL);
};
