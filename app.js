import { supabase } from './supabase.js';

// ====== IMMEDIATE CACHED UI (pre-paint) ======
const cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
const cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';
const mutedCached = localStorage.getItem('muted') === 'true';

const appDiv = document.getElementById('app');
const userDisplay = document.getElementById('userDisplay');
const authBtn = document.getElementById('authBtn');
let authLabel = null;
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');

if (userDisplay) {
  const span = userDisplay.querySelector('#usernameSpan');
  if (span) span.textContent = ' ' + cachedUsername;
}

if (authBtn) authLabel = authBtn.querySelector('.btn-label');
if (authLabel) authLabel.textContent = cachedLoggedIn ? 'Log Out' : 'Log In';

if (muteIcon) muteIcon.textContent = mutedCached ? '🔇' : '🔊';
if (appDiv) appDiv.style.opacity = '1';

// ====== DOMContentLoaded & GAME LOGIC ======
document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
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

  // ===== STATE =====
  let username = cachedLoggedIn ? cachedUsername : '';
  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let timer;
  let timeLeft = 15;
  let muted = mutedCached;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let correctBuffer, wrongBuffer;

  // ===== Mute Icon =====
  const updateMuteIcon = () => {
    if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';
  };
  updateMuteIcon();

  muteBtn?.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    updateMuteIcon();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  });

  // ===== Preload Auth (async) =====
  async function preloadAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if (!profile?.username) return;
    if (profile.username !== username) {
      username = profile.username;
      localStorage.setItem('cachedUsername', profile.username);
      localStorage.setItem('cachedLoggedIn', 'true');
      const span = userDisplay.querySelector('#usernameSpan');
      if (span) span.textContent = ' ' + profile.username;
      if (authLabel) authLabel.textContent = 'Log Out';
    }
  }
  await preloadAuth(); // run immediately to prevent flicker

  // ===== Supabase Auth State Listener =====
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      localStorage.setItem('cachedLoggedIn', 'false');
      localStorage.setItem('cachedUsername', 'Guest');
      username = '';
      if (userDisplay) userDisplay.querySelector('#usernameSpan').textContent = ' Guest';
      if (authLabel) authLabel.textContent = 'Log In';
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if (profile?.username) {
      username = profile.username;
      localStorage.setItem('cachedLoggedIn', 'true');
      localStorage.setItem('cachedUsername', profile.username);
      if (userDisplay) userDisplay.querySelector('#usernameSpan').textContent = ' ' + profile.username;
      if (authLabel) authLabel.textContent = 'Log Out';
    }
  });

  // ===== Auth Button =====
  authBtn?.addEventListener('click', async () => {
    if (!authLabel) return;
    if (authLabel.textContent === 'Log Out') {
      await supabase.auth.signOut();
    } else {
      window.location.href = 'login.html';
    }
  });

  // ===== Audio =====
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
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.5;
    source.connect(gainNode).connect(audioCtx.destination);
    source.start();
  }

  // ===== Leaderboard =====
  async function submitLeaderboardScore(username, score) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingScore } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', user.id)
      .single();

    if (!existingScore || score > existingScore.score) {
      await supabase
        .from('scores')
        .upsert({ user_id: user.id, username, score }, { onConflict: 'user_id' });
    }
  }

  // ===== GAME LOGIC =====
  function resetGame() {
    clearInterval(timer);
    score = 0;
    questions = [];
    remainingQuestions = [];
    currentQuestion = null;
    questionText.textContent = '';
    answersBox.innerHTML = '';
    questionImage.style.display = 'none';
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeDisplay.classList.remove('red-timer');
  }

  async function startGame() {
    resetGame();
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    updateScore();

    await loadSounds();

    const { data } = await supabase.from('questions').select('*');
    if (!data?.length) return alert('Could not load questions!');

    questions = data;
    remainingQuestions = [...questions];
    loadQuestion();
  }

  async function loadQuestion() {
    answersBox.innerHTML = '';
    if (!remainingQuestions.length) return endGame();

    const index = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(index, 1)[0];

    questionText.textContent = currentQuestion.question;
    questionImage.style.display = currentQuestion.question_image ? 'block' : 'none';
    if (currentQuestion.question_image) questionImage.src = currentQuestion.question_image;

    let answers = [
      { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
      { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
      { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
      { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
    ].sort(() => Math.random() - 0.5);

    answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.textContent = ans.text;
      btn.classList.add('answer-btn');
      btn.onclick = () => checkAnswer(i + 1, btn);
      answersBox.appendChild(btn);
    });

    currentQuestion.correct_answer_shuffled = answers.findIndex(a => a.correct) + 1;

    clearInterval(timer);
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeDisplay.classList.remove('red-timer');

    timer = setInterval(() => {
      timeLeft--;
      timeDisplay.textContent = timeLeft;
      timeDisplay.classList.toggle('red-timer', timeLeft <= 5);

      if (timeLeft <= 0) {
        clearInterval(timer);
        playSound(wrongBuffer);
        highlightCorrectAnswer();
        setTimeout(endGame, 1000);
      }
    }, 1000);
  }

  function checkAnswer(selected, btn) {
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    if (selected === currentQuestion.correct_answer_shuffled) {
      playSound(correctBuffer);
      btn.classList.add('correct');
      score++;
      updateScore();
      setTimeout(loadQuestion, 1000);
    } else {
      playSound(wrongBuffer);
      btn.classList.add('wrong');
      highlightCorrectAnswer();
      setTimeout(endGame, 1000);
    }
  }

  function highlightCorrectAnswer() {
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      if (i + 1 === currentQuestion.correct_answer_shuffled)
        btn.classList.add('correct');
    });
  }

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }

  async function endGame() {
    if (endGame.running) return;
    endGame.running = true;

    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;

    if (username) await submitLeaderboardScore(username, score);
  }

  // ===== Button Handlers =====
  startBtn?.addEventListener('click', startGame);
  playAgainBtn?.addEventListener('click', startGame);
  mainMenuBtn?.addEventListener('click', () => {
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    updateScore();
  });
});
