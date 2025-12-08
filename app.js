// HTML element references
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const questionBox = document.getElementById('question');
const answersBox = document.getElementById('answers');
const timeDisplay = document.getElementById('time');
const game = document.getElementById('game');
const endScreen = document.getElementById('end-screen');
const finalScore = document.getElementById('finalScore');

// Add score display dynamically if not in HTML
const scoreDisplay = document.createElement('div');
scoreDisplay.id = 'score';
game.prepend(scoreDisplay);


let questions = [];           // all questions fetched once
let remainingQuestions = [];  // questions left to ask
let currentQuestion = null;
let score = 0;
let timer;
let timeLeft = 15;
let totalQuestions = 10; // questions per game
let questionsAnswered = 0;

startBtn.onclick = startGame;

async function startGame() {
  score = 0;
  questionsAnswered = 0;
  document.getElementById('start-screen').classList.add('hidden');
  game.classList.remove('hidden');
  document.getElementById('end-screen').classList.add('hidden');
  updateScore();

  // Fetch all questions at once
  const { data, error } = await supabase.from('questions').select('*');
  if (error || !data || data.length === 0) {
    console.error('Error fetching questions:', error);
    return;
  }

  questions = data;
  remainingQuestions = [...questions]; // copy all questions
  await loadQuestion();
}

async function loadQuestion() {
  nextBtn?.classList.add('hidden');
  answersBox.innerHTML = '';

  if (remainingQuestions.length === 0 || questionsAnswered >= totalQuestions) {
    return endGame();
  }

  // Pick a random question from remaining
  const index = Math.floor(Math.random() * remainingQuestions.length);
  currentQuestion = remainingQuestions.splice(index, 1)[0]; // remove from remaining

  // Show question
  questionBox.textContent = currentQuestion.question;

  const answers = [
    currentQuestion.answer_a,
    currentQuestion.answer_b,
    currentQuestion.answer_c,
    currentQuestion.answer_d,
  ];

  // Create answer buttons
  answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.textContent = ans;
    btn.classList.add('answer-btn');
    btn.onclick = () => checkAnswer(i + 1, btn);
    answersBox.appendChild(btn);
  });

  // Start timer
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
  const buttons = document.querySelectorAll('.answer-btn');
  buttons.forEach(btn => btn.disabled = true);

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
  const buttons = document.querySelectorAll('.answer-btn');
  buttons.forEach((btn, i) => {
    if (i + 1 === currentQuestion.correct_answer) {
      btn.classList.add('correct');
    }
  });
}

function nextQuestionDelay() {
  questionsAnswered++;
  setTimeout(() => {
    if (questionsAnswered >= totalQuestions) {
      endGame();
    } else {
      loadQuestion();
    }
  }, 2000);
}

function updateScore() {
  scoreDisplay.textContent = `Score: ${score}`;
}

async function endGame() {
  game.classList.add('hidden');
  document.getElementById('end-screen').classList.remove('hidden');
  document.getElementById('finalScore').textContent = score;
  await submitScore();
}

async function submitScore() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  await supabase.from('scores').insert({
    user_id: user.id,
    score,
  });
}

