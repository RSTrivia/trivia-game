import { supabase } from './supabase.js';

// -------------------------
// DOM Elements
// -------------------------
const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('start-screen');
const playAgainBtn = document.getElementById('playAgainBtn');
const questionText = document.getElementById('questionText');
const questionImage = document.getElementById('questionImage');
const answersBox = document.getElementById('answers');
const timeDisplay = document.getElementById('time');
const game = document.getElementById('game');
const endScreen = document.getElementById('end-screen');
const finalScore = document.getElementById('finalScore');
const scoreDisplay = document.getElementById('score');
const userDisplay = document.getElementById('userDisplay');
const mainMenuBtn = document.getElementById('mainMenuBtn');

// -------------------------
// Game Variables
// -------------------------
let questions = [];
let remainingQuestions = [];
let currentQuestion = null;
let score = 0;
let timer;
let timeLeft = 15;
let totalQuestions = 10;
let questionsAnswered = 0;
let username = '';

// -------------------------
// Event Listeners
// -------------------------
startBtn.addEventListener('click', startGame);

playAgainBtn.addEventListener('click', () => {
  resetGame();
  startGame();
});

mainMenuBtn.addEventListener('click', () => {
  resetGame();
  game.classList.add('hidden');
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden'); // show main menu
});

// -------------------------
// Load currently logged-in user
// -------------------------
async function loadCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (error) { console.error('Failed to get username:', error); return; }

  username = profile.username;
  if (userDisplay) userDisplay.textContent = `Player: ${username}`;
}

// -------------------------
// Game Functions
// -------------------------
async function startGame() {
  resetGame();

  startScreen.classList.add('hidden');
  game.classList.remove('hidden');
  endScreen.classList.add('hidden');

  updateScore();

  // Fetch questions
  const { data, error } = await supabase.from('questions').select('*');
  if (error || !data || data.length === 0) {
    console.error('Error fetching questions:', error);
    alert('Could not load questions!');
    return;
  }

  questions = data;
  remainingQuestions = [...questions];

  await loadQuestion();
}

function resetGame() {
  clearInterval(timer);
  score = 0;
  questionsAnswered = 0;
  questions = [];
  remainingQuestions = [];
  currentQuestion = null;
  answersBox.innerHTML = '';
  timeDisplay.textContent = '15';
  updateScore();
}

async function loadQuestion() {
  answersBox.innerHTML = '';

  if (remainingQuestions.length === 0 || questionsAnswered >= totalQuestions) {
    return endGame();
  }

  const index = Math.floor(Math.random() * remainingQuestions.length);
  currentQuestion = remainingQuestions.splice(index, 1)[0];

  // Display text
  questionText.textContent = currentQuestion.question_text || currentQuestion.question;

  // Display image if exists
  if (currentQuestion.question_image) {
    questionImage.src = currentQuestion.question_image;
    questionImage.style.display = 'block';
  } else {
    questionImage.style.display = 'none';
  }

  // Create answer buttons
  const answers = [
    currentQuestion.answer_a,
    currentQuestion.answer_b,
    currentQuestion.answer_c,
    currentQuestion.answer_d,
  ];

  answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.textContent = ans;
    btn.classList.add('answer-btn');
    btn.addEventListener('click', () => checkAnswer(i + 1, btn));
    answersBox.appendChild(btn);
  });

  // Timer setup
  timeLeft = 15;
  timeDisplay.textContent = timeLeft;
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timeDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      highlightCorrectAnswer();
      nextQuestionDelay();
    }
  }, 1000);
}

function checkAnswer(selected, clickedBtn) {
  clearInterval(timer);
  document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);

  if (selected === currentQuestion.correct_answer) {
    clickedBtn.classList.add('correct');
    score++;
  } else {
    clickedBtn.classList.add('wrong');
    highlightCorrectAnswer();
  }

  updateScore();
  nextQuestionDelay();
}

function highlightCorrectAnswer() {
  document.querySelectorAll('.answer-btn').forEach((btn, i) => {
    if (i + 1 === currentQuestion.correct_answer) btn.classList.add('correct');
  });
}

function nextQuestionDelay() {
  questionsAnswered++;
  setTimeout(() => {
    if (questionsAnswered >= totalQuestions) endGame();
    else loadQuestion();
  }, 2000);
}

function updateScore() {
  scoreDisplay.textContent = `Score: ${score}`;
}

async function endGame() {
  game.classList.add('hidden');
  endScreen.classList.remove('hidden');
  finalScore.textContent = score;
  await submitScore();
}

async function submitScore() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!username) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    username = profile?.username || 'Unknown';
  }

  await supabase.from('scores').insert({
    user_id: user.id,
    username,
    score
  });
}

// -------------------------
// Initialize
// -------------------------
loadCurrentUser();
