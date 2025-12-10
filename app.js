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
    return await ();
  }

  // Pick a random question
  const index = Math.floor(Math.random() * remainingQuestions.length);
  currentQuestion = remainingQuestions.splice(index, 1)[0];

  // Display question text
  questionText.textContent = currentQuestion.question || 'No question text';

  // Display image (if exists)
  if (currentQuestion.question_image) {
    questionImage.src = currentQuestion.question_image;
    questionImage.style.display = 'block';
  } else {
    questionImage.style.display = 'none';
  }

  // ORIGINAL ANSWERS ARRAY with their original index
  let answers = [
    { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
    { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
    { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
    { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
  ];

  // 🔀 SHUFFLE the answers
  answers = answers
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value);

  // Create buttons + track new correct answer index
  answers.forEach((ans, index) => {
    const btn = document.createElement('button');
    btn.textContent = ans.text || '';
    btn.classList.add('answer-btn');
    btn.addEventListener('click', () => checkAnswer(index + 1, btn));
    answersBox.appendChild(btn);
  });

  // Save the **new correct answer index** (1–4)
  currentQuestion.correct_answer_shuffled =
    answers.findIndex(a => a.correct) + 1;

  // Restart timer
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
  
 if (selected === currentQuestion.correct_answer_shuffled) {
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
  clearInterval(timer);
  game.classList.add('hidden');
  endScreen.classList.remove('hidden');

  const gameOverTitle = document.getElementById('game-over-title');
  const gzTitle = document.getElementById('gz-title');

  finalScore.textContent = score;

  if (score === questions.length && remainingQuestions.length === 0) {
    // Player got all questions correct → show random gz message
    const gzMessages = ['gz', 'go touch grass', 'see you in lumbridge'];
    const randomMessage = gzMessages[Math.floor(Math.random() * gzMessages.length)];

    gzTitle.textContent = randomMessage;
    gzTitle.classList.remove('hidden');
    gameOverTitle.classList.add('hidden');
  } else {
    // Player missed some → show normal Game Over
    gzTitle.classList.add('hidden');
    gameOverTitle.classList.remove('hidden');
  }

  await submitScore();
}




async function submitScore() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // guests do not save scores

  // ensure username is available
  if (!username) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    username = profile?.username || `Player-${user.id.slice(0,5)}`;
  }

  try {
    // 1️⃣ Get the user's existing best score
    const { data: existing, error: existingErr } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', user.id)
      .single();

    if (existingErr && existingErr.code !== 'PGRST116') {
      console.error('Error checking existing score:', existingErr);
      return;
    }

    // 2️⃣ If they already have a better score, DO NOT update
    if (existing && existing.score >= score) {
      console.log('Score not updated (existing score is higher):', existing.score);
      return;
    }

    // 3️⃣ Otherwise update to the new best score
    const { data, error } = await supabase
      .from('scores')
      .upsert(
        { user_id: user.id, username, score },
        { onConflict: 'user_id' }
      )
      .select();

    if (error) console.error('Error saving score:', error);
    else console.log('Score updated to new best:', data);

  } catch (err) {
    console.error('Unexpected error submitting score:', err);
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



















