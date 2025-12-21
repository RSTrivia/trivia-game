import { supabase } from './supabase.js';

// ====== IMMEDIATE CACHED UI (runs before paint) ======
const cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
const cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';

const appDiv = document.getElementById('app');
const userDisplay = document.getElementById('userDisplay');
const authBtn = document.getElementById('authBtn');
let authLabel;
if (authBtn) {
  authLabel = authBtn.querySelector('.btn-label');
}

if (userDisplay) {
  const span = userDisplay.querySelector('#usernameSpan');
  if (span) span.textContent = ' ' + cachedUsername;
}

if (authBtn) {
  authLabel.textContent = cachedLoggedIn ? 'Log Out' : 'Log In';
}

if (appDiv) {
  appDiv.style.opacity = '1';
}

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
  const timeWrap = document.getElementById('time-wrap');

  // Main state
  let username = cachedLoggedIn ? cachedUsername : '';
  let score = 0;
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let preloadQueue = []; // holds up to 2 questions 
  let timer;
  let timeLeft = 15;
  let correctBuffer, wrongBuffer;
  let muted = localStorage.getItem('muted') === 'true';
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Set initial icon
  const updateMuteIcon = () => muteBtn.textContent = muted ? '🔇' : '🔊';
  updateMuteIcon();

  // Add click listener to toggle mute
  muteBtn.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('muted', muted);
  updateMuteIcon();
  if (audioCtx.state === 'suspended') audioCtx.resume();
});

   // -------------------------
  // Preload Auth: Correct Username & Button
  // -------------------------
  async function preloadAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // nothing to do
  
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();
  
    if (!profile?.username) return;
  
    if (profile.username !== username) {
      localStorage.setItem('cachedUsername', profile.username);
      localStorage.setItem('cachedLoggedIn', 'true');
      username = profile.username;
      let span;
      if (userDisplay) {
        span = userDisplay.querySelector('#usernameSpan');
      }
      if (span && span.textContent !== ' ' + profile.username) {
        span.textContent = ' ' + profile.username;
      }

      
     if (authLabel) authLabel.textContent = 'Log Out';

    }
  }

    // Call this immediately to prevent flicker
  await preloadAuth();

 
  // -------------------------
  // Supabase auth listener (updates UI if session changes)
  // -------------------------
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      localStorage.setItem('cachedLoggedIn', 'false');
      localStorage.setItem('cachedUsername', 'Guest');
      username = '';
      
      if (userDisplay) {
        userDisplay.querySelector('#usernameSpan').textContent = ' Guest';
      }
      
      if (authLabel) { 
        authLabel.textContent = 'Log In';
        authBtn.classList.remove('tapped'); 
        authBtn.blur();
      } 
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if (profile?.username) {
      localStorage.setItem('cachedLoggedIn', 'true');
      localStorage.setItem('cachedUsername', profile.username);
      username = profile.username;
      if (userDisplay) {
        userDisplay.querySelector('#usernameSpan').textContent = ' ' + profile.username;
      }
      if (authLabel) authLabel.textContent = 'Log Out';
    }
  });

  // -------------------------
  // Auth Button
  // -------------------------
  authBtn.onclick = async () => {
    // 1. Force the button to lose focus/hover state immediately
    authBtn.blur();
    if (authLabel) {
      if (authLabel.textContent === 'Log Out') {
        await supabase.auth.signOut();
      } else {
        window.location.href = 'login.html';
      }
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

  function preloadImage(url) {
  const img = new Image();
  img.src = url;
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
    timeWrap.classList.remove('red-timer');
  }

async function startGame() {
  document.body.classList.add('game-active'); 
  endGame.running = false;
  resetGame();

  // Show the game container immediately
  game.classList.remove('hidden');
  document.getElementById('start-screen').classList.add('hidden');
  endScreen.classList.add('hidden');
  updateScore();

  // Load sounds in background
  loadSounds(); 

  // Load questions
  const { data } = await supabase.from('questions').select('*');
  if (!data?.length) return alert('Could not load questions!');
questions = data;
remainingQuestions = [...questions];

// ✅ If we have a carried-over preloaded question
if (preloadQueue.length) {
  currentQuestion = preloadQueue.shift();

  const idx = remainingQuestions.findIndex(
    q => q.id === currentQuestion.id
  );
  if (idx > -1) remainingQuestions.splice(idx, 1);

  loadQuestion();
  return;
}

// Otherwise random start
loadQuestion();

}

function preloadNextQuestions() {
  let attempts = 0;

  while (
    preloadQueue.length < 2 &&
    remainingQuestions.length &&
    attempts < 10
  ) {
    attempts++;

    const index = Math.floor(Math.random() * remainingQuestions.length);
    const q = remainingQuestions[index];

    if (
      q === currentQuestion ||
      preloadQueue.some(p => p.id === q.id)
    ) continue;

    preloadQueue.push(q);
    if (q.question_image) preloadImage(q.question_image);
  }
}



  async function loadQuestion() {
    answersBox.innerHTML = '';
    if (!remainingQuestions.length) return endGame();

    if (preloadQueue.length) {
      currentQuestion = preloadQueue.shift();
    
      const idx = remainingQuestions.findIndex(
        q => q.id === currentQuestion.id
      );
      if (idx > -1) remainingQuestions.splice(idx, 1);
    } else {
      const index = Math.floor(Math.random() * remainingQuestions.length);
      currentQuestion = remainingQuestions.splice(index, 1)[0];
    }


    questionText.textContent = currentQuestion.question;
    if (currentQuestion.question_image) {
        questionImage.style.display = 'none';      // hide until loaded
        questionImage.onload = () => {
            questionImage.style.display = 'block'; // show once loaded
        };
        questionImage.src = currentQuestion.question_image;
    } else {
        questionImage.style.display = 'none';      // hide if no image
    }
    
    preloadNextQuestions(); // start preloading the next question in background
    
    let answers = [
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
    
    currentQuestion.correct_answer_shuffled =
      answers.findIndex(a => a.correct) + 1;

    clearInterval(timer);
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeDisplay.classList.remove('red-timer');
    timeWrap.classList.remove('red-timer');

    timer = setInterval(() => {
      timeLeft--;
      timeDisplay.textContent = timeLeft;
    
      timeWrap.classList.toggle('red-timer', timeLeft <= 5);
    
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

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }

   async function endGame() {
    // Prevent multiple calls
    if (endGame.running) return;
    endGame.running = true;
     
    document.body.classList.remove('game-active'); 
     
    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;

    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');

    if (score === questions.length && remainingQuestions.length === 0) {
      const gzMessages = ['Gz!', 'Go touch grass', 'See you in Lumbridge'];
      const randomMessage = gzMessages[Math.floor(Math.random() * gzMessages.length)];
      gzTitle.textContent = randomMessage;
      gzTitle.classList.remove('hidden');
      gameOverTitle.classList.add('hidden');
    } else {
      gzTitle.classList.add('hidden');
      gameOverTitle.classList.remove('hidden');
    }
  
    if (username) await submitLeaderboardScore(username, score);
  }
  
  // Initialize the running flag **after the function exists**
  endGame.running = false;

  // -------------------------
  // Buttons
  // -------------------------
startBtn.onclick = async () => {
  // 1. Show the gold flash immediately
  startBtn.classList.add('tapped');

  // 2. Prepare the game logic
  // If questions aren't loaded yet, fetch them
  if (questions.length === 0) {
    const { data } = await supabase.from('questions').select('*');
    if (!data?.length) {
      startBtn.classList.remove('tapped');
      return alert('Could not load questions!');
    }
    questions = data;
  }
  
  // 3. Wait for the flash to finish (150ms), then start the actual game
  setTimeout(() => {
    startBtn.classList.remove('tapped');
    
    // This calls your existing function that sets up the game UI
    startGame(); 
  }, 150);
};

  //test for GZ message !!! replace endgame.onclick
  /*startBtn.addEventListener('click', async () => {
    ;
    await loadSounds();

    questions = new Array(510);
    score = 510; // pretend max score
    remainingQuestions = [];

    document.getElementById('start-screen').classList.add('hidden');
    await endGame();
  });*/

  playAgainBtn.onclick = startGame;

  mainMenuBtn.onclick = () => {
    document.body.classList.remove('game-active');
    
    preloadQueue = []; // full reset only here
    
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    updateScore();
  };

  // Handle page restore from back/forward cache (mobile back button)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      resetGame();
      document.getElementById('start-screen').classList.remove('hidden');
      game.classList.add('hidden');
      endScreen.classList.add('hidden');
      updateScore();
    }
  });
  
  // Optional safeguard if game is visible but questions empty
  if (!questions.length && !game.classList.contains('hidden')) {
    resetGame();
    document.getElementById('start-screen').classList.remove('hidden');
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    updateScore();
  }
});

// Function to create that "Nice" flash on mobile
function mobileFlash(el) {
  el.classList.add('tapped');
  setTimeout(() => {
    el.classList.remove('tapped');
    el.blur();
  }, 150); // This duration is the "Leaderboard" feeling you liked
}

// Apply this to your Auth Button
authBtn.addEventListener('click', () => {
  mobileFlash(authBtn);
  // Your existing logout/login logic...
});

// Apply this to the Leaderboard Link (and any other menu links)
document.querySelectorAll('a.btn-small').forEach(link => {
  link.addEventListener('click', () => mobileFlash(link));
});






































