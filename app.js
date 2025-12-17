import { supabase } from './supabase.js';

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
// Background & Rotation
// -------------------------
const backgrounds = [
  "images/background.jpg",
  "images/background2.png",
  "images/background3.jpg",
  "images/background4.jpg",
  "images/background5.jpg",
  "images/background6.png"
];
const CHANGE_INTERVAL = 600000; // 10 minutes

// Preload images
backgrounds.forEach(src => new Image().src = src);

// Setup background div
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

// Fade layer
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

// Pick a random background excluding current
function pickRandomBackground(exclude) {
  const filtered = backgrounds.filter(bg => bg !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Apply background with fade
function applyBackground(newBg) {
  const fadeLayer = document.getElementById("bg-fade-layer");
  fadeLayer.style.backgroundImage = `url('${newBg}')`;
  fadeLayer.style.opacity = 1;

  setTimeout(() => {
    backgroundDiv.style.backgroundImage = `url('${newBg}')`;
    fadeLayer.style.opacity = 0;
  }, 1500);
}

// Update background based on interval
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

// Initialize background
const savedBg = localStorage.getItem("bg_current") || backgrounds[0];
backgroundDiv.style.backgroundImage = `url('${savedBg}')`; // no jump
createFadeLayer();
setInterval(() => updateBackground(), CHANGE_INTERVAL);

// -------------------------
// User/Auth
// -------------------------
async function loadCurrentUser() {
  const usernameSpan = userDisplay;
  usernameSpan.textContent = 'Player: ...'; // temporary placeholder

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    username = '';
    usernameSpan.textContent = 'Player: Guest';
    authBtn.textContent = 'Log In';
    authBtn.onclick = () => { window.location.href = 'login.html'; };
  } else {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    username = !error && profile ? profile.username : 'Unknown';
    usernameSpan.textContent = `Player: ${username}`;

    authBtn.textContent = 'Log Out';
    authBtn.onclick = async () => {
      await supabase.auth.signOut();
      username = '';
      loadCurrentUser();
    };
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

  answers.forEach((ans, index) => {
    const btn = document.createElement('button');
    btn.textContent = ans.text || '';
    btn.classList.add('answer-btn');
    btn.addEventListener('click', () => checkAnswer(index + 1, btn));
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
      setTimeout(async () => { await endGame(); }, 1000);
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
    setTimeout(async () => { await endGame(); }, 1000);
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

// -------------------------
// End Game & Submit Score
// -------------------------
async function endGame() {
  if (endGame.running) return;
  endGame.running = true;

  clearInterval(timer);
  game.classList.add('hidden');
  endScreen.classList.remove('hidden');

  const gameOverTitle = document.getElementById('game-over-title');
  const gzTitle = document.getElementById('gz-title');

  finalScore.textContent = score;

  if (score === questions.length && remainingQuestions.length === 0) {
    const gzMessages = ['gz', 'go touch grass', 'see you in lumbridge'];
    const randomMessage = gzMessages[Math.floor(Math.random() * gzMessages.length)];
    gzTitle.textContent = randomMessage;
    gzTitle.classList.remove('hidden');
    gameOverTitle.classList.add('hidden');
  } else {
    gzTitle.classList.add('hidden');
    gameOverTitle.classList.remove('hidden');
  }

  await submitScore();
  endGame.running = false;
}

// -------------------------
// Score Submission
// -------------------------
async function submitScore() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!username) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    username = profile?.username || `Player-${user.id.slice(0,5)}`;
  }

  try {
    const { data: existing, error: existingErr } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', user.id)
      .single();

    if (existingErr && existingErr.code !== 'PGRST116') return;
    if (existing && existing.score >= score) return;

    const { data: dataUpsert, error: errorUpsert } = await supabase
      .from('scores')
      .upsert({ user_id: user.id, username, score }, { onConflict: 'user_id' })
      .select();

    if (errorUpsert) console.error('Error saving score:', errorUpsert);
  } catch (err) {
    console.error('Unexpected error submitting score:', err);
  }
}

// -------------------------
// Init
// -------------------------
loadCurrentUser();


