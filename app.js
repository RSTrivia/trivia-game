import { supabase } from './supabase.js';

// ===== DOM Elements =====
const authBtn = document.getElementById('authBtn');
const muteBtn = document.getElementById('muteBtn');
const usernameSpan = document.getElementById('usernameSpan');
const muteIcon = document.getElementById('muteIcon');
const authLabel = document.querySelector('#authBtn .btn-label');

// ===== STATE =====
let cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
let cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';
let username = cachedLoggedIn ? cachedUsername : '';
let muted = localStorage.getItem('muted') === 'true';

// ===== INITIAL UI (instant, no flicker) =====
if (usernameSpan) usernameSpan.textContent = ' ' + cachedUsername;
if (authLabel) authLabel.textContent = cachedLoggedIn ? 'Log Out' : 'Log In';
if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';


supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session?.user) {
    // Logged out / Guest
    cachedUsername = 'Guest';
    cachedLoggedIn = false;
    username = '';

    localStorage.setItem('cachedUsername', 'Guest');
    localStorage.setItem('cachedLoggedIn', 'false');

    if (usernameSpan) usernameSpan.textContent = ' Guest';
    if (authLabel) authLabel.textContent = 'Log In';
    return;
  }

  // Logged in
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Profile fetch failed:', error);
    return;
  }

  cachedUsername = profile?.username || 'Guest';
  cachedLoggedIn = true;
  username = cachedUsername;

  localStorage.setItem('cachedUsername', cachedUsername);
  localStorage.setItem('cachedLoggedIn', 'true');

  if (usernameSpan) usernameSpan.textContent = ' ' + cachedUsername;
  if (authLabel) authLabel.textContent = 'Log Out';
});




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
  
  // Main state
  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let timer;
  let timeLeft = 15;
  let correctBuffer, wrongBuffer;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  const updateMuteIcon = () => {
    if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';
  };
  updateMuteIcon();

  // Mute button click handler
  muteBtn.addEventListener('click', () => {
    muted = !muted; // update global state
    localStorage.setItem('muted', muted); // persist state
    if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊'; // update only the icon
    if (audioCtx.state === 'suspended') audioCtx.resume(); // resume audio if needed
  });

  
   // -------------------------
  // Preload Auth: Correct Username & Button
  // -------------------------
 
  
  // -------------------------
  // Auth Button
  // -------------------------
authBtn.onclick = async () => {
  if (authLabel.textContent === 'Log Out') {
    await supabase.auth.signOut();
  } else {
    window.location.href = 'login.html';
  }
};


  // -------------------------
  // Audio
  // -------------------------

  async function loadSounds() {
    correctBuffer = await loadAudio('./sounds/correct.mp3');
    wrongBuffer = await loadAudio('./sounds/wrong.mp3');
  }

  async function loadAudio(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuffer);
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
  // Leaderboard
  // -------------------------
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
  
  // -------------------------
  // Game Logic (UNCHANGED)
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
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeDisplay.classList.remove('red-timer');
  }

  async function startGame() {
  if (startGame.running) return;
  startGame.running = true;

  try {
    console.log('startGame called');

    endGame.running = false;
    resetGame();
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    updateScore();

    await loadSounds();

    console.log('Querying questions table...');
    const { data, error } = await supabase.from('questions').select('*');
    console.log('Query result:', data, error);

    if (error) throw error;
    if (!data?.length) throw new Error('No questions available');

    questions = data;
    remainingQuestions = [...questions];

    await loadQuestion();
  } catch (err) {
    console.error('startGame failed:', err);
    alert('Failed to start game. Check console.');
  } finally {
    startGame.running = false;
  }
}



async function loadQuestion() {
  try {
    console.log('loadQuestion called, remainingQuestions:', remainingQuestions.length);

    // Clear previous answers
    answersBox.innerHTML = '';

    // No questions left
    if (!remainingQuestions.length) {
      console.log('No remaining questions, ending game');
      return await endGame();
    }

    // Pick a random question
    const index = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(index, 1)[0];
    console.log('Current question:', currentQuestion);

    // Update question text and image
    questionText.textContent = currentQuestion.question || 'No question text';
    if (currentQuestion.question_image) {
      questionImage.src = currentQuestion.question_image;
      questionImage.style.display = 'block';
    } else {
      questionImage.style.display = 'none';
    }

    // Shuffle answers
    const answers = [
      { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
      { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
      { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
      { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
    ].sort(() => Math.random() - 0.5);

    // Create buttons
    answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.textContent = ans.text || 'No answer';
      btn.classList.add('answer-btn');
      btn.onclick = () => checkAnswer(i + 1, btn);
      answersBox.appendChild(btn);
    });

    // Track correct answer after shuffle
    currentQuestion.correct_answer_shuffled = answers.findIndex(a => a.correct) + 1;
    console.log('Correct answer is button #', currentQuestion.correct_answer_shuffled);

    // Reset timer
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
        setTimeout(() => endGame(), 1000);
      }
    }, 1000);

  } catch (err) {
    console.error('loadQuestion failed:', err);
    alert('Failed to load question. Check console.');
  }
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

  // -------------------------
  // Buttons
  // -------------------------
  startBtn.onclick = async () => {
    console.log('Start clicked');
    try {
      await startGame();
      console.log('startGame finished');
    } catch (err) {
      console.error('startGame error:', err);
    }
  };

  playAgainBtn.onclick = startGame;

  mainMenuBtn.onclick = () => {
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    updateScore();
  };
});













































