import { supabase } from './supabase.js';

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
  const muteBtn = document.getElementById('muteBtn');
  const muteIcon = document.getElementById('muteIcon');
  const usernameSpan = document.getElementById('usernameSpan');
  const authBtn = document.getElementById('authBtn');
  const authLabel = authBtn.querySelector('.btn-label');

  // State
  let cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
  let cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';
  let username = cachedLoggedIn ? cachedUsername : '';
  let muted = localStorage.getItem('muted') === 'true';
  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let timer;
  let timeLeft = 15;
  let correctBuffer, wrongBuffer;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Preload mute icon
  muteIcon.textContent = muted ? '🔇' : '🔊';

  // Toggle mute
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    muteIcon.textContent = muted ? '🔇' : '🔊';
    if (audioCtx.state === 'suspended') audioCtx.resume();
  });

  // -------------------------
  // Auth
  // -------------------------
  const preloadAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
      if (profile?.username) {
        username = profile.username;
        cachedUsername = username;
        cachedLoggedIn = true;
        localStorage.setItem('cachedUsername', username);
        localStorage.setItem('cachedLoggedIn', 'true');
        usernameSpan.textContent = ' ' + username;
        authLabel.textContent = 'Log Out';
      }
    }
  };
  await preloadAuth();

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      username = '';
      cachedUsername = 'Guest';
      cachedLoggedIn = false;
      localStorage.setItem('cachedUsername', 'Guest');
      localStorage.setItem('cachedLoggedIn', 'false');
      usernameSpan.textContent = ' Guest';
      authLabel.textContent = 'Log In';
    } else {
      preloadAuth();
    }
  });

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
  const loadAudio = async (url) => {
    const res = await fetch(url);
    return audioCtx.decodeAudioData(await res.arrayBuffer());
  };
  const loadSounds = async () => {
    correctBuffer = await loadAudio('./sounds/correct.mp3');
    wrongBuffer = await loadAudio('./sounds/wrong.mp3');
  };
  const playSound = (buffer) => {
    if (!buffer || muted) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.5;
    source.connect(gainNode).connect(audioCtx.destination);
    source.start();
  };

  // -------------------------
  // Game Logic
  // -------------------------
  const updateScore = () => scoreDisplay.textContent = `Score: ${score}`;

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
    endGame.running = false;
    resetGame();
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    updateScore();

    await loadSounds();

    const { data } = await supabase.from('questions').select('*');
    if (!data?.length) return alert('Could not load questions!');

    questions = data;
    remainingQuestions = [...questions];
    loadQuestion();
  }

  async function loadQuestion() {
    answersBox.innerHTML = '';
    if (!remainingQuestions.length) return endGame();

    const index = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(index, 1)[0];

    questionText.textContent = currentQuestion.question;
    questionImage.style.display = currentQuestion.question_image ? 'block' : 'none';
    if (currentQuestion.question_image) questionImage.src = currentQuestion.question_image;

    const answers = [
      { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
      { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
      { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
      { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
    ].sort(() => Math.random() - 0.5);

    answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.textContent = ans.text;
      btn.classList.add('answer-btn');
      btn.onclick = () => checkAnswer(i + 1, btn);
      answersBox.appendChild(btn);
    });

    currentQuestion.correct_answer_shuffled = answers.findIndex(a => a.correct) + 1;

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
        setTimeout(endGame, 1000);
      }
    }, 1000);
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

  async function endGame() {
    if (endGame.running) return;
    endGame.running = true;

    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;
  }

  // -------------------------
  // Buttons
  // -------------------------
  startBtn.onclick = startGame;
  playAgainBtn.onclick = startGame;
  mainMenuBtn.onclick = () => {
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    updateScore();
  };
});
