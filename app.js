import { supabase } from './supabase.js';

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

let questions = [];
let remainingQuestions = [];
let currentQuestion = null;
let score = 0;
let timer;
let timeLeft = 15;
let username = '';

// -------------------------
// Sounds (mobile-safe)
// -------------------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let correctBuffer, wrongBuffer;

// Load sounds as buffers
async function loadSounds() {
  correctBuffer = await loadAudio('./sounds/correct.mp3');
  wrongBuffer = await loadAudio('./sounds/wrong.mp3');
}

let muted = false;
const volume = 0.5;
const muteBtn = document.getElementById('muteBtn');

muteBtn.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
});

function playSound(buffer) {
  if (!buffer || muted) return; // mute check

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = volume; // set volume to 0.5
  source.connect(gainNode).connect(audioCtx.destination);

  source.start();
}

// Fetch + decode a sound file
async function loadAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

// Unlock audio on first user interaction
function unlockAudio() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// -------------------------
// Event Listeners
// -------------------------
startBtn.addEventListener('click', async () => {
  await loadCurrentUser();
  await loadSounds(); // load sounds before game starts
  startGame();
});

playAgainBtn.addEventListener('click', async () => {
  resetGame();
  await loadSounds(); // reload sounds
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
// User/Auth
// -------------------------
async function loadCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    username = '';
    userDisplay.textContent = 'Player: Guest';
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
  userDisplay.textContent = `Player: ${username}`;

  authBtn.textContent = 'Log Out';
  authBtn.onclick = async () => {
    await supabase.auth.signOut();
    username = '';
    loadCurrentUser();
  };
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

  if (!remainingQuestions.length) {
    return await endGame();
  }

  const index = Math.floor(Math.random() * remainingQuestions.length);
  currentQuestion = remainingQuestions.splice(index, 1)[0];

  questionText.textContent = currentQuestion.question || 'No question text';

  if (currentQuestion.question_image) {
    questionImage.src = currentQuestion.question_image;
    questionImage.style.display = 'block';
  } else {
    questionImage.style.display = 'none';
  }

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
  
    // Add red color when 5 seconds or less
    if (timeLeft <= 5) {
      timeDisplay.classList.add('red-timer');
    } else {
      timeDisplay.classList.remove('red-timer');
    }
  
    if (timeLeft <= 0) {
      clearInterval(timer);
      playSound(wrongBuffer); // mobile-safe wrong sound
      highlightCorrectAnswer();
      setTimeout(async () => { await endGame(); }, 1000);
    }
  }, 1000);
}

function checkAnswer(selected, clickedBtn) {
  // Resume audio context if suspended (mobile fix)
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

    const { data, error } = await supabase
      .from('scores')
      .upsert({ user_id: user.id, username, score }, { onConflict: 'user_id' })
      .select();

    if (error) console.error('Error saving score:', error);
  } catch (err) {
    console.error('Unexpected error submitting score:', err);
  }
}

// -------------------------
// Init
// -------------------------
loadCurrentUser();



