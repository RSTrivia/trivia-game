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
// Event Listeners
// -------------------------
startBtn.addEventListener('click', async () => {
  await loadCurrentUser(); // ensures user info is loaded
  startGame();
});

playAgainBtn.addEventListener('click', () => {
  resetGame();
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

  const answers = [
    currentQuestion.answer_a,
    currentQuestion.answer_b,
    currentQuestion.answer_c,
    currentQuestion.answer_d
  ];

  answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.textContent = ans || '';
    btn.classList.add('answer-btn');
    btn.addEventListener('click', () => checkAnswer(i + 1, btn));
    answersBox.appendChild(btn);
  });

  timeLeft = 15;
  timeDisplay.textContent = timeLeft;
  clearInterval(timer);

  timer = setInterval(() => {
    timeLeft--;
    timeDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      highlightCorrectAnswer();
      setTimeout(async () => {
        await endGame();
      }, 1000);
    }
  }, 1000);
}

function checkAnswer(selected, clickedBtn) {
  clearInterval(timer);
  document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
  
  if (selected === currentQuestion.correct_answer) {
    clickedBtn.classList.add('correct');
    score++;
    updateScore();
    setTimeout(loadQuestion, 1000);
  } else {
    clickedBtn.classList.add('wrong');
    highlightCorrectAnswer();
    updateScore();
    setTimeout(async () => { await endGame(); }, 1000);
  }
}

function highlightCorrectAnswer() {
  document.querySelectorAll('.answer-btn').forEach((btn, i) => {
    if (i + 1 === currentQuestion.correct_answer) btn.classList.add('correct');
  });
}

function updateScore() {
  scoreDisplay.textContent = `Score: ${score}`;
}

// -------------------------
// End Game & Submit Score
// -------------------------
async function endGame() {
  clearInterval(timer);
  game.classList.add('hidden');
  endScreen.classList.remove('hidden');

  const endTitle = endScreen.querySelector('h2');
  endTitle.classList.remove('gz-title');
  endTitle.textContent = remainingQuestions.length === 0 && score === questions.length
    ? 'gz' : 'Game Over!';

  finalScore.textContent = score;

  await submitScore();
}

async function submitScore() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // skip guests

  if (!username) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    username = profile?.username || `Player-${user.id.slice(0,5)}`;
  }

  try {
    const { data, error } = await supabase
      .from('scores')
      .upsert(
        { user_id: user.id, username, score },
        { onConflict: 'user_id' } // must be UNIQUE
      )
      .select();

    if (error) console.error('Error saving score:', error);
    else console.log('Score saved:', data);
  } catch (err) {
    console.error('Error submitting score:', err);
  }
}

function showEndScreen(score, allCorrect = false) {
  const startScreen = document.getElementById('start-screen');
  const gameScreen = document.getElementById('game');
  const endScreen = document.getElementById('end-screen');

  // Hide other screens
  startScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');

  // Update final score
  document.getElementById('finalScore').textContent = score;

  const titleEl = endScreen.querySelector('h2');

  if (allCorrect) {
    // Replace "Game Over!" with "gz" styled like main menu
    titleEl.textContent = 'gz';
    titleEl.style.fontFamily = "'Cinzel', serif";
    titleEl.style.fontSize = '3.2rem';
    titleEl.style.textAlign = 'center';
    titleEl.style.letterSpacing = '2px';
    titleEl.style.background = 'linear-gradient(145deg, #fff8dc 0%, #ffdd44 25%, #f2b705 50%, #c28f0c 75%, #a77b0a 100%)';
    titleEl.style.webkitBackgroundClip = 'text';
    titleEl.style.webkitTextFillColor = 'transparent';
    titleEl.style.textShadow = `0 0 4px rgba(0,0,0,0.8),
                                1px 1px 0 #000,
                                2px 2px 2px rgba(0,0,0,0.6),
                                0 0 8px rgba(255, 223, 0, 0.8),
                                0 -1px 2px rgba(255, 255, 255, 0.4)`;
    titleEl.style.filter = 'drop-shadow(0 0 10px rgba(255, 223, 0, 0.7))';
  } else {
    // Normal Game Over
    titleEl.textContent = 'Game Over!';
    titleEl.style = ''; // reset styles
  }
}

// Usage examples:
// Normal end:
showEndScreen(finalScore);

// All correct:
showEndScreen(finalScore, true);


// -------------------------
// Init
// -------------------------
loadCurrentUser();



