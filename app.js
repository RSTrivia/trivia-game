import { supabase } from './supabase.js';

// -------------------------
// DOM Elements
// -------------------------
const startBtn = document.getElementById('startBtn');
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
const authBtn = document.getElementById('authBtn');
const leaderboardEl = document.getElementById('leaderboard');

let questions = [];
let remainingQuestions = [];
let currentQuestion = null;
let score = 0;
let timer;
let timeLeft = 15;
let totalQuestions = 10;
let username = '';
let sessionUser = null;

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
  startBtn.parentElement.classList.remove('hidden');
  updateScore();
});

// -------------------------
// User / Auth
// -------------------------
async function loadCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  sessionUser = session?.user || null;

  if (!sessionUser) {
    username = 'Guest';
    userDisplay.textContent = `Player: ${username}`;
    authBtn.textContent = 'Log In';
    authBtn.onclick = () => { window.location.href = 'login.html'; };
    return;
  }

  // Fetch username from profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', sessionUser.id)
    .single();

  username = !error && profile ? profile.username : 'Unknown';
  userDisplay.textContent = `Player: ${username}`;

  authBtn.textContent = 'Log Out';
  authBtn.onclick = async () => {
    await supabase.auth.signOut();
    username = 'Guest';
    sessionUser = null;
    loadCurrentUser();
  };
}

// -------------------------
// Game Functions
// -------------------------
function resetGame() {
  clearInterval(timer);
  score = 0;
  questionsAnswered = 0;
  questions = [];
  remainingQuestions = [];
  currentQuestion = null;
  updateScore();
}

async function startGame() {
  resetGame();
  game.classList.remove('hidden');
  endScreen.classList.add('hidden');
  startBtn.parentElement.classList.add('hidden');

  const { data, error } = await supabase.from('questions').select('*');
  if (error || !data?.length) {
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

  if (!remainingQuestions.length) {
    console.log('gz');
    return endGame();
  }

  const index = Math.floor(Math.random() * remainingQuestions.length);
  currentQuestion = remainingQuestions.splice(index, 1)[0];

  questionText.textContent = currentQuestion.question;

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
    btn.textContent = ans;
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
      setTimeout(endGame, 1000);
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
    setTimeout(endGame, 1000);
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
  game.classList.add('hidden');
  endScreen.classList.remove('hidden');

  const endTitle = endScreen.querySelector('h2');
  endTitle.classList.remove('gz-title');

  if (!remainingQuestions.length && score === questions.length) {
    endTitle.textContent = 'gz';
    endTitle.classList.add('gz-title');
  } else {
    endTitle.textContent = 'Game Over!';
  }

  finalScore.textContent = score;

  await submitScore();
  await loadLeaderboard(); // refresh leaderboard automatically
}

async function submitScore() {
  if (!sessionUser) return;

  try {
    // Check existing score
    const { data: existing, error: fetchError } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', sessionUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing score:', fetchError);
      return;
    }

    // Upsert only if higher or new
    if (!existing || score > existing.score) {
      const { data: upsertData, error: upsertError } = await supabase
        .from('scores')
        .upsert(
          { user_id: sessionUser.id, username, score },
          { onConflict: 'user_id' }
        )
        .select();

      if (upsertError) console.error('Error saving score:', upsertError);
      else console.log('Score saved/updated:', upsertData);
    } else {
      console.log('Existing score is higher or equal, not updating.');
    }
  } catch (err) {
    console.error('Error submitting score:', err);
  }
}

// -------------------------
// Leaderboard
// -------------------------
async function loadLeaderboard() {
  const { data, error } = await supabase
    .from('scores')
    .select('score, username')
    .order('score', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  const leaderboardData = data ? [...data] : [];

  // Fill to 10 rows
  while (leaderboardData.length < 10) {
    leaderboardData.push({ username: '', score: '' });
  }

  leaderboardEl.innerHTML = '';

  leaderboardData.forEach((entry, i) => {
    const li = document.createElement('li');
    const left = document.createElement('span');
    const right = document.createElement('span');
    const isReal = entry.username?.trim() !== '';

    if (i === 0) { left.classList.add('top-1'); left.textContent = isReal ? `🥇 ${entry.username}` : '🥇'; }
    else if (i === 1) { left.classList.add('top-2'); left.textContent = isReal ? `🥈 ${entry.username}` : '🥈'; }
    else if (i === 2) { left.classList.add('top-3'); left.textContent = isReal ? `🥉 ${entry.username}` : '🥉'; }
    else { left.textContent = isReal ? `${i + 1}. ${entry.username}` : `${i + 1}.`; }

    right.textContent = isReal ? entry.score : '';
    li.appendChild(left);
    li.appendChild(right);
    leaderboardEl.appendChild(li);
  });
}

// -------------------------
// Auth State Listener
// -------------------------
supabase.auth.onAuthStateChange((event, session) => {
  sessionUser = session?.user || null;
  loadCurrentUser();
});

// -------------------------
// Initialize
// -------------------------
loadCurrentUser().then(() => {
  startBtn.disabled = false; // enable start button only after user is loaded
  loadLeaderboard();
});
