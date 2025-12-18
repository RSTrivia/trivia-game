document.addEventListener("DOMContentLoaded", () => {
  const bgImg = document.getElementById("background-img");
  const fadeLayer = document.getElementById("bg-fade-layer");

  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png"
  ];

  const CHANGE_INTERVAL = 180000; // 3 minutes

  // Load last used background (optional)
  let savedBg = localStorage.getItem("bg_current") || backgrounds[0];
  bgImg.src = savedBg;

  // Preload all other backgrounds
  backgrounds.forEach(src => {
    if (src !== savedBg) new Image().src = src;
  });

  function pickNext(current) {
    const list = backgrounds.filter(b => b !== current);
    return list[Math.floor(Math.random() * list.length)];
  }

  function crossfadeTo(newBg) {
    const img = new Image();
    img.src = newBg;
    img.onload = () => {
      fadeLayer.style.backgroundImage = `url('${newBg}')`;
      fadeLayer.style.opacity = 1;

      // Wait for CSS transition
      setTimeout(() => {
        bgImg.src = newBg;
        fadeLayer.style.opacity = 0;
        localStorage.setItem("bg_current", newBg);
      }, 1200);
    };
  }

  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
});


  // ----------------------
  // 5️⃣ Rotate backgrounds automatically
  // ----------------------
  setInterval(() => {
    const current = localStorage.getItem("bg_current") || savedBg;
    const next = pickNext(current);
    crossfadeTo(next);
  }, CHANGE_INTERVAL);
});
