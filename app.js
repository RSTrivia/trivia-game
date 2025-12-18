import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------
  // DOM Elements
  // -------------------------
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
  const appDiv = document.getElementById('app');

  let username = '';
  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let timer;
  let timeLeft = 15;
  let correctBuffer, wrongBuffer;
  let muted = localStorage.getItem('muted') === 'true';
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // -------------------------
  // Show App Immediately
  // -------------------------
  appDiv.style.opacity = '1';

  // -------------------------
  // Audio & Mute
  // -------------------------
  const muteBtn = document.getElementById('muteBtn');
  const updateMuteIcon = () => muteBtn.textContent = muted ? '🔇' : '🔊';
  updateMuteIcon();

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    updateMuteIcon();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  });

  async function loadSounds() {
    correctBuffer = await loadAudio('./sounds/correct.mp3');
    wrongBuffer = await loadAudio('./sounds/wrong.mp3');
  }

  async function loadAudio(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
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
  // User/Auth
  // -------------------------
  async function loadCurrentUser() {
    const cachedName = localStorage.getItem('cachedUsername');
    userDisplay.textContent = cachedName ? `Player: ${cachedName}` : 'Player: Guest';
    const cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';
    authBtn.textContent = cachedLoggedIn ? 'Log Out' : 'Log In';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      username = '';
      userDisplay.textContent = 'Player: Guest';
      localStorage.setItem('cachedUsername', 'Guest');
      localStorage.setItem('cachedLoggedIn', 'false');
      authBtn.textContent = 'Log In';
      authBtn.onclick = () => window.location.href = 'login.html';
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    username = !error && profile ? profile.username : 'Unknown';
    userDisplay.textContent = `Player: ${username}`;
    localStorage.setItem('cachedUsername', username);
    localStorage.setItem('cachedLoggedIn', 'true');

    authBtn.textContent = 'Log Out';
    authBtn.onclick = async () => {
      await supabase.auth.signOut();
      username = '';
      localStorage.setItem('cachedUsername', 'Guest');
      localStorage.setItem('cachedLoggedIn', 'false');
      loadCurrentUser();
    };
  }

  // -------------------------
  // Leaderboard
  // -------------------------
  async function submitLeaderboardScore(username, score) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userId = user.id;
      const { data: existingScore, error: fetchError } = await supabase
        .from('scores')
        .select('score')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') return;

      if (!existingScore || score > existingScore.score) {
        await supabase
          .from('scores')
          .upsert({ user_id: userId, username, score }, { onConflict: 'user_id' });
      }
    } catch (err) {
      console.error('Error submitting score:', err);
    }
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

    const { data, error } = await supabase.from('questions').select('*');
    if (error || !data?.length) return alert('Could not load questions!');

    questions = data;
    remainingQuestions = [...questions];
    loadQuestion();
  }

  async function loadQuestion() {
    answersBox.innerHTML = '';
    if (!remainingQuestions.length) return await endGame();

    const index = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(index, 1)[0];

    questionText.textContent = currentQuestion.question || 'No question text';
    if (currentQuestion.question_image) {
      questionImage.src = currentQuestion.question_image;
      questionImage.style.display = 'block';
    } else questionImage.style.display = 'none';

    let answers = [
      { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
      { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
      { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
      { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
    ];

    // Shuffle
    answers = answers.sort(() => Math.random() - 0.5);

    answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.textContent = ans.text || '';
      btn.classList.add('answer-btn');
      btn.addEventListener('click', () => checkAnswer(i + 1, btn));
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

  function checkAnswer(selected, clickedBtn) {
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
      setTimeout(endGame, 1000);
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
  
  async function endGame() {
    if (endGame.running) return;
    endGame.running = true;
  
    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;
  
    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');
  
    if (score === questions.length && remainingQuestions.length === 0) {
      const gzMessages = ['Gz!', 'Go touch grass', 'See you in Lumbridge'];
      gzTitle.textContent = gzMessages[Math.floor(Math.random() * gzMessages.length)];
      gzTitle.classList.remove('hidden');
      gameOverTitle.classList.add('hidden');
    } else {
      gzTitle.classList.add('hidden');
      gameOverTitle.classList.remove('hidden');
    }
  
    if (username) await submitLeaderboardScore(username, score);
  }


  // -------------------------
  // Event Listeners
  // -------------------------
  startBtn.addEventListener('click', async () => {
    await loadCurrentUser();
    await loadSounds();

    score = 510; // pretend max score
    remainingQuestions = [];
    endGame(); // directly trigger the end screen
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('game').classList.add('hidden');
    const gzTitle = document.getElementById('gz-title');
    gzTitle.classList.remove('hidden');
    

    
    //startGame();
  });

  playAgainBtn.addEventListener('click', async () => {
    resetGame();
    await loadSounds();
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
  // Init
  // -------------------------
  loadCurrentUser();
});





