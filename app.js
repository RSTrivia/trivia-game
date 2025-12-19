import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {

  // ======================
  // DOM ELEMENTS
  // ======================
  const authBtn = document.getElementById('authBtn');
  const authLabel = authBtn?.querySelector('.btn-label');
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

  if (!authBtn || !startBtn) {
    console.error('Critical DOM elements missing');
    return;
  }

  // ======================
  // STATE
  // ======================
  let username = '';
  let muted = localStorage.getItem('muted') === 'true';

  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let timer;
  let timeLeft = 15;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let correctBuffer, wrongBuffer;

  // ======================
  // INITIAL UI
  // ======================
  muteIcon.textContent = muted ? '🔇' : '🔊';
  usernameSpan.textContent = ' Guest';
  authLabel.textContent = 'Log In';

  // ======================
  // AUTH STATE (SOURCE OF TRUTH)
  // ======================
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      username = '';
      usernameSpan.textContent = ' Guest';
      authLabel.textContent = 'Log In';
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    username = data?.username || 'Guest';
    usernameSpan.textContent = ' ' + username;
    authLabel.textContent = 'Log Out';
  });

  // ======================
  // AUTH BUTTON
  // ======================
  authBtn.addEventListener('click', async () => {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      await supabase.auth.signOut();
    } else {
      window.location.href = 'login.html';
    }
  });

  // ======================
  // MUTE
  // ======================
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    muteIcon.textContent = muted ? '🔇' : '🔊';
    if (audioCtx.state === 'suspended') audioCtx.resume();
  });

  // ======================
  // AUDIO
  // ======================
  async function loadSounds() {
    correctBuffer = await loadAudio('./sounds/correct.mp3');
    wrongBuffer = await loadAudio('./sounds/wrong.mp3');
  }

  async function loadAudio(url) {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return audioCtx.decodeAudioData(buf);
  }

  function playSound(buffer) {
    if (!buffer || muted) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtx.destination);
    src.start();
  }

  // ======================
  // GAME LOGIC
  // ======================
  function resetGame() {
    clearInterval(timer);
    score = 0;
    remainingQuestions = [];
    answersBox.innerHTML = '';
    questionText.textContent = '';
    questionImage.style.display = 'none';
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
  }

  async function startGame() {
    resetGame();

    game.classList.remove('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');

    await loadSounds();

    const { data, error } = await supabase.from('questions').select('*');
    if (error || !data.length) {
      alert('Failed to load questions');
      return;
    }

    questions = data;
    remainingQuestions = [...questions];
    loadQuestion();
  }

  function loadQuestion() {
    answersBox.innerHTML = '';

    if (!remainingQuestions.length) {
      return endGame();
    }

    const i = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(i, 1)[0];

    questionText.textContent = currentQuestion.question;

    const answers = [
      { t: currentQuestion.answer_a, c: 1 },
      { t: currentQuestion.answer_b, c: 2 },
      { t: currentQuestion.answer_c, c: 3 },
      { t: currentQuestion.answer_d, c: 4 }
    ].sort(() => Math.random() - 0.5);

    currentQuestion.correct_answer_shuffled =
      answers.findIndex(a => a.c === currentQuestion.correct_answer) + 1;

    answers.forEach((a, i) => {
      const btn = document.createElement('button');
      btn.textContent = a.t;
      btn.className = 'answer-btn';
      btn.onclick = () => checkAnswer(i + 1, btn);
      answersBox.appendChild(btn);
    });

    clearInterval(timer);
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;

    timer = setInterval(() => {
      timeLeft--;
      timeDisplay.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);
        playSound(wrongBuffer);
        endGame();
      }
    }, 1000);
  }

  function checkAnswer(selected, btn) {
    clearInterval(timer);

    if (selected === currentQuestion.correct_answer_shuffled) {
      playSound(correctBuffer);
      score++;
      updateScore();
      setTimeout(loadQuestion, 800);
    } else {
      playSound(wrongBuffer);
      setTimeout(endGame, 800);
    }
  }

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }

  function endGame() {
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;
  }

  // ======================
  // BUTTONS
  // ======================
  startBtn.addEventListener('click', startGame);
  playAgainBtn.addEventListener('click', startGame);
  mainMenuBtn.addEventListener('click', () => location.reload());
});
