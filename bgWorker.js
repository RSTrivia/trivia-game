let currentBg;
let backgrounds;
const CHANGE_INTERVAL = 5000;//240000; // 4 minutes

onmessage = (e) => {
  currentBg = e.data.current;
  backgrounds = e.data.backgrounds;

  setInterval(() => {
    // pick a new background different from current
    const choices = backgrounds.filter(b => b !== currentBg);
    const nextBg = choices[Math.floor(Math.random() * choices.length)];

    currentBg = nextBg;
    postMessage(nextBg);
  }, CHANGE_INTERVAL);
};
