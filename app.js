import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  // =========================
  // DOM ELEMENTS
  // =========================
  const authBtn = document.getElementById('authBtn');
  const authLabel = document.querySelector('#authBtn .btn-label');
  const usernameSpan = document.getElementById('usernameSpan');
  const muteBtn = document.getElementById('muteBtn');
  const muteIcon = document.getElementById('muteIcon');

  const startBtn = document.getElementById('startBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const mainMenuBtn = document.getElementById('mainMenuBtn');

  const game = document.getElementById('game');
  const endScreen = document.getElementById('end-screen');
  const finalScore = document.getElementById('finalScore');
  const scoreDisplay = document.getElementById('score');
  const questionText = document.getElementById('questionText');
  const questionImage = document.getElementById('questionImage');
  const answersBox = document.getElementById('answers');
  const timeDisplay = document.getElementById('time');

  if (!startBtn || !authBtn) {
    console.error('Critical buttons missing from DOM');
    return;
  }

  // =========================
  // STATE
  // =========================
  let muted = localStorage.getItem('muted') === 'true';
  let cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
  let cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';
  let username = cachedLoggedIn ? cachedUsername : '';

  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let timer;
  let timeLeft = 15;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let correctBuffer, wrongBuffer;

  // =========================
  // INITIAL UI
  // =========================
  usernameSpan.textContent = ' ' + cachedUsername;
  authLabel.textContent = cachedLoggedIn ? 'Log Out' : 'Log In';
  muteIcon.textContent = muted ? '🔇' : '🔊';

  // =========================
  // AUTH STATE
  // =========================
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      username = '';
      cachedUsername = 'Guest';
      cachedLoggedIn = false;

      localStorage.setItem('cachedUsername', 'Guest');
      localStorage.setItem('cachedLoggedIn', 'false');

      usernameSpan.textContent = ' Guest';
      authLabel.textContent = 'Log In';
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    username = data?.username || 'Guest';
    cachedUsername = username;
    cachedLoggedIn = true;

    localStorage.setItem('cachedUsername', username);
    localStorage.setItem('cachedLoggedIn', 'true');

    usernameSpan.textContent = ' ' + username;
    authLabel.textContent = 'Log Out';
  });

  // =========================
  // BUTTONS
  // =========================
  authBtn.addEventListener('click', async () => {
    const loggedIn = localStorage.getItem('cachedLoggedIn') === 'true';
    if (loggedIn) {
      await supabase.auth.signOut();
    } else {
      window.location.href = 'login.html';
    }
  });

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    muteIcon.textContent = muted ? '🔇' : '🔊';
    if (audioCtx.state === 'suspended') audioCtx.resume();
  });

  startBtn.addEventListener('click', startGame);
  playAgainBtn.addEventListener('click', startGame);
  mainMenuBtn.addEventListener('click', resetToMenu);

  // =========================
  // GAME LOGIC
  // =========================
  async function startGame() {
    console.log('Start clicked');

    resetGame();
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');

    await loadSounds();

    const { data, error } = await supabase.from('questions').select('*');
    if (error || !data?.length) {
      alert('Failed to load questions');
      return;
    }

    questions = data;
    remainingQuestions = [...questions];
    loadQuestion();
  }

  function resetGame() {
    clearInterval(timer);
    score = 0;
    scoreDisplay.textContent = 'Score: 0';
    answersBox.innerHTML = '';
    questionImage.style.display = 'none';
  }

  function resetToMenu() {
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
  }

  function loadQuestion() {
    if (!remainingQuestions.length) return endGame();

    answersBox.innerHTML = '';
    currentQuestion = remainingQuestions.splice(
      Math.floor(Math.random() * remainingQuestions.length), 1
    )[0];

    questionText.textContent = currentQuestion.question;
  }

  async function endGame() {
    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;
  }

  async function loadSounds() {
    correctBuffer = await loadAudio('./sounds/correct.mp3');
    wrongBuffer = await loadAudio('./sounds/wrong.mp3');
  }

  async function loadAudio(url) {
    const res = await fetch(url);
    return audioCtx.decodeAudioData(await res.arrayBuffer());
  }
});
