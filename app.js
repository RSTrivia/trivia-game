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

  const gameOverTitle = document.getElementById('game-over-title');
  const gzTitle = document.getElementById('gz-title');

  finalScore.textContent = score;

  // Show "gz" only if player answered ALL questions correctly
  if (score === questions.length && remainingQuestions.length === 0) {
    gzTitle.classList.remove('hidden');       // show gz
    gameOverTitle.classList.add('hidden');    // hide normal Game Over
  } else {
    gzTitle.classList.add('hidden');          // hide gz
    gameOverTitle.classList.remove('hidden'); // show normal Game Over
  }

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

function showEndScreen(score, totalQuestions) {
  const endScreen = document.getElementById('end-screen');
  const endTitle = document.getElementById('end-title');
  const finalScoreEl = document.getElementById('finalScore');

  finalScoreEl.textContent = score;

  // Reset class
  endTitle.className = '';

  if (score === totalQuestions) {
    endTitle.textContent = 'gz';
    endTitle.classList.add('osrs-title'); // apply gold gradient style
  } else {
    endTitle.textContent = 'Game Over!';
    endTitle.classList.remove('osrs-title');
  }

  endScreen.classList.remove('hidden');
}


// -------------------------
// Init
// -------------------------
loadCurrentUser();















