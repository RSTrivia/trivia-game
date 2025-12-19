// app.js
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
      resetToMenu();
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
    if (cachedLoggedIn) {
      await supabase.auth.signOut();
      username = '';
      cachedUsername = 'Guest';
      cachedLoggedIn = false;
      localStorage.setItem('cachedUsername', 'Guest');
      localStorage.setItem('cachedLoggedIn', 'false');
      usernameSpan.textContent = ' Guest';
      authLabel.textContent = 'Log In';
      resetToMenu();
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
    score = 0;
    updateScore();
    loadQuestion();
  }

  function resetGame() {
    clearInterval(timer);
    score = 0;
    updateScore();
    answersBox.innerHTML = '';
    questionText.textContent = '';
    questionImage.style.display = 'none';
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
  }

  function resetToMenu() {
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
  }

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }

  async function loadSounds() {
    correctBuffer = await loadAudio('./sounds/correct.mp3');
    wrongBuffer = await loadAudio('./sounds/wrong.mp3');
  }

  async function loadAudio(url) {
    const res = await fetch(url);
    return audioCtx.decodeAudioData(await res.arrayBuffer());
  }

  function playSound(buffer) {
    if (!buffer || muted) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  }

  function loadQuestion() {
    if (!remainingQuestions.length) return endGame();

    clearInterval(timer);
    answersBox.innerHTML = '';
    currentQuestion = remainingQuestions.splice(
      Math.floor(Math.random() * remainingQuestions.length), 1
    )[0];

    questionText.textContent = currentQuestion.question;

    if (currentQuestion.question_image) {
      questionImage.src = currentQuestion.question_image;
      questionImage.style.display = 'block';
    } else {
      questionImage.style.display = 'none';
    }

    // Create answer buttons
    const answers = [
      { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
      { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
      { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
      { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
    ].sort(() => Math.random() - 0.5);

    answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.textContent = ans.text || 'No answer';
      btn.classList.add('answer-btn');
      btn.onclick = () => checkAnswer(i + 1, btn);
      answersBox.appendChild(btn);
    });

    currentQuestion.correct_answer_shuffled = answers.findIndex(a => a.correct) + 1;

    // Start timer
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timer = setInterval(() => {
      timeLeft--;
      timeDisplay.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);
        highlightCorrectAnswer();
        playSound(wrongBuffer);
        setTimeout(endGame, 1000);
      }
    }, 1000);
  }

  function checkAnswer(selected, btn) {
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    if (selected === currentQuestion.correct_answer_shuffled) {
      btn.classList.add('correct');
      score++;
      updateScore();
      playSound(correctBuffer);
      setTimeout(loadQuestion, 1000);
    } else {
      btn.classList.add('wrong');
      highlightCorrectAnswer();
      playSound(wrongBuffer);
      setTimeout(endGame, 1000);
    }
  }

  function highlightCorrectAnswer() {
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      if (i + 1 === currentQuestion.correct_answer_shuffled)
        btn.classList.add('correct');
    });
  }

  async function endGame() {
    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;
  }
});
