import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------
  // DOM Elements
  // -------------------------
  const startBtn = document.getElementById('startBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const mainMenuBtn = document.getElementById('mainMenuBtn');
  const authBtn = document.getElementById('authBtn');
  const userDisplay = document.getElementById('userDisplay');
  const game = document.getElementById('game');
  const endScreen = document.getElementById('end-screen');
  const finalScore = document.getElementById('finalScore');
  const scoreDisplay = document.getElementById('score');
  const questionText = document.getElementById('questionText');
  const questionImage = document.getElementById('questionImage');
  const answersBox = document.getElementById('answers');
  const timeDisplay = document.getElementById('time');
  const backgroundDiv = document.getElementById('background');

  let username = '';
  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let timer;
  let timeLeft = 15;

  // -------------------------
  // Persistent Mute
  // -------------------------
  let muted = localStorage.getItem('muted') === 'true';
  const muteBtn = document.getElementById('muteBtn');
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });

  // -------------------------
  // Sounds
  // -------------------------
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let correctBuffer, wrongBuffer;

  async function loadSounds() {
    correctBuffer = await loadAudio('./sounds/correct.mp3');
    wrongBuffer = await loadAudio('./sounds/wrong.mp3');
  }

  async function loadAudio(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  }

  function playSound(buffer) {
    if (!buffer || muted) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.5;
    source.connect(gainNode).connect(audioCtx.destination);
    source.start();
  }

  // -------------------------
  // Background
  // -------------------------
  const backgrounds = [
    "images/background.jpg",
    "images/background2.png",
    "images/background3.jpg",
    "images/background4.jpg",
    "images/background5.jpg",
    "images/background6.png"
  ];
  const CHANGE_INTERVAL = 600000;

  backgrounds.forEach(src => new Image().src = src);

  Object.assign(backgroundDiv.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: '-1'
  });

  function createFadeLayer() {
    if (!document.getElementById("bg-fade-layer")) {
      const fadeLayer = document.createElement("div");
      fadeLayer.id = "bg-fade-layer";
      Object.assign(fadeLayer.style, {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0,
        transition: "opacity 1.5s ease",
        zIndex: "-2"
      });
      document.body.appendChild(fadeLayer);
    }
  }

  function pickRandomBackground(exclude) {
    const filtered = backgrounds.filter(bg => bg !== exclude);
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  function applyBackground(newBg) {
    const fadeLayer = document.getElementById("bg-fade-layer");
    fadeLayer.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 1;
    setTimeout(() => {
      backgroundDiv.style.backgroundImage = `url('${newBg}')`;
      fadeLayer.style.opacity = 0;
    }, 1500);
  }

  function updateBackground(force = false) {
    const now = Date.now();
    const lastChange = localStorage.getItem("bg_last_change");
    const currentBg = localStorage.getItem("bg_current") || backgrounds[0];
    if (!force && lastChange && now - lastChange < CHANGE_INTERVAL) return;
    const nextBg = pickRandomBackground(currentBg);
    localStorage.setItem("bg_current", nextBg);
    localStorage.setItem("bg_last_change", now);
    createFadeLayer();
    applyBackground(nextBg);
  }

  const savedBg = localStorage.getItem("bg_current") || backgrounds[0];
  backgroundDiv.style.backgroundImage = `url('${savedBg}')`;
  createFadeLayer();
  updateBackground(false);
  setInterval(() => updateBackground(false), CHANGE_INTERVAL);

  // -------------------------
  // User/Auth
  // -------------------------
  async function loadCurrentUser() {
    const usernameSpan = userDisplay;
    const cachedName = localStorage.getItem('cachedUsername');
    usernameSpan.textContent = cachedName ? `Player: ${cachedName}` : 'Player: Guest';

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      username = '';
      usernameSpan.textContent = 'Player: Guest';
      localStorage.setItem('cachedUsername', 'Guest');
      authBtn.textContent = 'Log In';
      authBtn.onclick = () => { window.location.href = 'login.html'; };
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    username = !error && profile ? profile.username : 'Unknown';
    usernameSpan.textContent = `Player: ${username}`;
    localStorage.setItem('cachedUsername', username);

    authBtn.textContent = 'Log Out';
    authBtn.onclick = async () => {
      await supabase.auth.signOut();
      username = '';
      localStorage.setItem('cachedUsername', 'Guest');
      loadCurrentUser();
    };
  }
  
  async function submitLeaderboardScore(username, score) {
    try {
      // Get the current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('No authenticated user:', userError);
        return;
      }
  
      const userId = user.id;
  
      // Fetch existing score for this user
      const { data: existingScore, error: fetchError } = await supabase
        .from('scores')
        .select('score')
        .eq('user_id', userId)
        .single();
  
      if (fetchError && fetchError.code !== 'PGRST116') { // ignore "no rows" error
        console.error('Error fetching existing score:', fetchError);
        return;
      }
  
      // Only insert/update if higher than existing
      if (!existingScore || score > existingScore.score) {
        const { data, error: upsertError } = await supabase
          .from('scores')
          .upsert({ user_id: userId, username, score }, { onConflict: 'user_id' });
  
        if (upsertError) {
          console.error('Error updating leaderboard:', upsertError);
        }
      }
  
    } catch (err) {
      console.error('Unexpected error submitting leaderboard score:', err);
    }
  }


  // -------------------------
  // Game Functions
  // -------------------------
  function resetGame() {
    clearInterval(timer);
    score = 0;
    questions = [];
    remainingQuestions = [];
    currentQuestion = null;
    questionText.textContent = '';
    answersBox.innerHTML = '';
    questionImage.style.display = 'none';
    timeDisplay.textContent = '15';
    timeDisplay.classList.remove('red-timer');
  }

  async function startGame() {
    resetGame();
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    updateScore();

    const { data, error } = await supabase.from('questions').select('*');
    if (error || !data?.length) {
      console.error('Error fetching questions:', error);
      alert('Could not load questions!');
      return;
    }

    questions = data;
    remainingQuestions = [...questions];
    loadQuestion();
  }

  async function loadQuestion() {
    answersBox.innerHTML = '';
    if (!remainingQuestions.length) return await endGame();

    const index = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(index, 1)[0];

    questionText.textContent = currentQuestion.question || 'No question text';
    if (currentQuestion.question_image) {
      questionImage.src = currentQuestion.question_image;
      questionImage.style.display = 'block';
    } else questionImage.style.display = 'none';

    let answers = [
      { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
      { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
      { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
      { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
    ];

    answers = answers
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(a => a.value);

    answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.textContent = ans.text || '';
      btn.classList.add('answer-btn');
      btn.addEventListener('click', () => checkAnswer(i + 1, btn));
      answersBox.appendChild(btn);
    });

    currentQuestion.correct_answer_shuffled =
      answers.findIndex(a => a.correct) + 1;

    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    clearInterval(timer);

    timer = setInterval(() => {
      timeLeft--;
      timeDisplay.textContent = timeLeft;
      if (timeLeft <= 5) timeDisplay.classList.add('red-timer');
      else timeDisplay.classList.remove('red-timer');
    
      if (timeLeft <= 0) {
        clearInterval(timer);
        playSound(wrongBuffer);
        highlightCorrectAnswer();
        setTimeout(() => {
          endGame();
        }, 1000);
      }
    }, 1000);
  }

function checkAnswer(selected, clickedBtn) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  clearInterval(timer);
  document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);

  if (selected === currentQuestion.correct_answer_shuffled) {
    playSound(correctBuffer);
    clickedBtn.classList.add('correct');
    score++;
    updateScore();
    setTimeout(loadQuestion, 1000);
  } else {
    playSound(wrongBuffer);
    clickedBtn.classList.add('wrong');
    highlightCorrectAnswer();
    updateScore();
    // End the game instead of loading the next question
    setTimeout(() => {
      endGame(); // no async/await needed here
    }, 1000);
  }
}

  function highlightCorrectAnswer() {
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      if (i + 1 === currentQuestion.correct_answer_shuffled) btn.classList.add('correct');
    });
  }

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }

async function endGame() {
  if (endGame.running) return;
  endGame.running = true;

  // Stop timer and hide game screen
  clearInterval(timer);
  game.classList.add('hidden');
  endScreen.classList.remove('hidden');

  // Show final score
  finalScore.textContent = score;

  const gameOverTitle = document.getElementById('game-over-title');
  const gzTitle = document.getElementById('gz-title');

  // Show special message if perfect score
  if (score === questions.length && remainingQuestions.length === 0) {
    const gzMessages = ['Gz!', 'Go touch grass', 'See you in Lumbridge'];
    const randomMessage = gzMessages[Math.floor(Math.random() * gzMessages.length)];
    gzTitle.textContent = randomMessage;
    gzTitle.classList.remove('hidden');
    gameOverTitle.classList.add('hidden');
  } else {
    gzTitle.classList.add('hidden');
    gameOverTitle.classList.remove('hidden');
  }

  // Submit score to Supabase leaderboard
  if (username) {
    try {
      // Only updates if new score is higher
      await submitLeaderboardScore(username, score);
    } catch (err) {
      console.error('Failed to submit leaderboard score:', err);
    }
  }

  endGame.running = false;
}


  
  // -------------------------
  // Event Listeners
  // -------------------------
  startBtn.addEventListener('click', async () => {
    await loadCurrentUser();
    await loadSounds();
    startGame();
  });

  playAgainBtn.addEventListener('click', async () => {
    resetGame();
    await loadSounds();
    startGame();
  });

  mainMenuBtn.addEventListener('click', () => {
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    updateScore();
  });

  // -------------------------
  // Init
  // -------------------------
  loadCurrentUser();
});









