let currentBg;
let backgrounds;
const CHANGE_INTERVAL = 20000;//240000; 

onmessage = (e) => {
    currentBg = e.data.current;
    backgrounds = e.data.backgrounds;

    // By using setInterval without an immediate call, 
    // nothing happens for the first 4 minutes.
    setInterval(() => {
        const choices = backgrounds.filter(b => b !== currentBg);
        const nextBg = choices[Math.floor(Math.random() * choices.length)];

        currentBg = nextBg;
        postMessage(nextBg);
    }, CHANGE_INTERVAL);
};
