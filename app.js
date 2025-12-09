import { supabase } from './supabase.js';

const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const questionText = document.getElementById('questionText'); // NEW: text element
const questionImage = document.getElementById('questionImage'); // NEW: image element
const answersBox = document.getElementById('answers');
const timeDisplay = document.getElementById('time');
const game = document.getElementById('game');
const endScreen = document.getElementById('end-screen');
const finalScore = document.getElementById('finalScore');
const scoreDisplay = document.getElementById('score');
const userDisplay = document.getElementById('userDisplay');
const mainMenuBtn = document.getElementById('mainMenuBtn');

let questions = [];
let remainingQuestions = [];
let currentQuestion = null;
let score = 0;
let timer;
let timeLeft = 15;
let totalQuestions = 10;
let questionsAnswered = 0;
let username = '';

// Event listeners
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', () => {
  score = 0;
  questionsAnswered = 0;
  questions = [];
  remainingQuestions = [];
  currentQuestion = null;
  startGame();
});
mainMenuBtn.addEventListener('click', () => {
  clearInterval(timer);
  game.classList.add('hidden');
  endScreen.classList.add('hidden');
  startBtn.parentElement.classList.remove('hidden');
  score = 0;
  questionsAnswered = 0;
  questions = [];
  remainingQuestions = [];
  currentQuestion = null;
  updateScore();
});

// Load currently logged-in user
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
// Game functions
// -------------------------
async function startGame() {
  score = 0;
  questionsAnswered = 0;
  game.classList.remove('hidden');
  endScreen.classList.add('hidden');
  startBtn.parentElement.classList.add('hidden');
  updateScore();

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

async function loadQuestion() {
  answersBox.innerHTML = '';
  
  if (remainingQuestions.length === 0 || questionsAnswered >= totalQuestions) {
    return endGame();
  }

  const index = Math.floor(Math.random() * remainingQuestions.length);
  currentQuestion = remainingQuestions.splice(index, 1)[0];

  // ---- DISPLAY QUESTION TEXT AND IMAGE ----

  questionText.textContent = currentQuestion.question_text;

  if (currentQuestion.question_image) {
    questionImage.src = currentQuestion.question_image;
    questionImage.style.display = 'block';
  } else {
    questionImage.style.display = 'none';
  }

  // ---- CREATE ANSWER BUTTONS ----
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

  // ---- TIMER SETUP ----
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

// Load user on page load
loadCurrentUser();
