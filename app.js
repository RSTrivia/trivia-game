import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  // ===== DOM ELEMENTS =====
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
  const userDisplay = document.getElementById('userDisplay');
  const authBtn = document.getElementById('authBtn');
  const authLabel = authBtn?.querySelector('.btn-label');

  // ===== STATE =====
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

  // ===== MUTE ICON =====
  const updateMuteIcon = () => { if(muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊'; };
  updateMuteIcon();

  muteBtn?.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    updateMuteIcon();
    if(audioCtx.state === 'suspended') audioCtx.resume();
  });

  // ===== LOAD PROFILE & PREVENT FLICKER =====
  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if(profile?.username && profile.username !== username) {
      username = profile.username;
      localStorage.setItem('cachedUsername', username);
      localStorage.setItem('cachedLoggedIn', 'true');

      // smooth fade update
      const span = userDisplay?.querySelector('#usernameSpan');
      if(span) {
        span.style.opacity = 0;
        span.textContent = ' ' + username;
        span.style.transition = 'opacity 0.3s';
        requestAnimationFrame(() => { span.style.opacity = 1; });
      }

      if(authLabel) authLabel.textContent = 'Log Out';
    }
  }
  await fetchProfile();

  // ===== AUTH STATE CHANGE =====
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if(!session?.user) {
      username = '';
      localStorage.setItem('cachedLoggedIn', 'false');
      localStorage.setItem('cachedUsername', 'Guest');

      if(userDisplay?.querySelector('#usernameSpan')) userDisplay.querySelector('#usernameSpan').textContent = ' Guest';
      if(authLabel) authLabel.textContent = 'Log In';
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if(profile?.username) {
      username = profile.username;
      localStorage.setItem('cachedUsername', username);
      localStorage.setItem('cachedLoggedIn', 'true');

      const span = userDisplay?.querySelector('#usernameSpan');
      if(span) span.textContent = ' ' + username;
      if(authLabel) authLabel.textContent = 'Log Out';
    }
  });

  // ===== AUTH BUTTON =====
  authBtn?.addEventListener('click', async () => {
    if(authLabel?.textContent === 'Log Out') {
      await supabase.auth.signOut();
    } else {
      window.location.href = 'login.html';
    }
  });

  // ===== AUDIO =====
  async function loadAudioFile(url) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    return audioCtx.decodeAudioData(buffer);
  }

  async function loadSounds() {
    correctBuffer = await loadAudioFile('./sounds/correct.mp3');
    wrongBuffer = await loadAudioFile('./sounds/wrong.mp3');
  }

  function playSound(buffer) {
    if(!buffer || muted) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain).connect(audioCtx.destination);
    source.start();
  }

  // ===== LEADERBOARD =====
  async function submitLeaderboardScore(username, score) {
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) return;
    const { data: existing } = await supabase.from('scores').select('score').eq('user_id', user.id).single();
    if(!existing || score > existing.score) {
      await supabase.from('scores').upsert({ user_id: user.id, username, score }, { onConflict: 'user_id' });
    }
  }

  // ===== GAME LOGIC =====
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
    scoreDisplay.textContent = `Score: 0`;
  }

  async function startGame() {
    resetGame();
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');

    await loadSounds();

    const { data } = await supabase.from('questions').select('*');
    if(!data?.length) return alert('Could not load questions!');
    questions = data;
    remainingQuestions = [...questions];
    loadQuestion();
  }

  function loadQuestion() {
    answersBox.innerHTML = '';
    if(!remainingQuestions.length) return endGame();

    const index = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(index, 1)[0];

    questionText.textContent = currentQuestion.question;
    questionImage.style.display = currentQuestion.question_image ? 'block' : 'none';
    if(currentQuestion.question_image) questionImage.src = currentQuestion.question_image;

    const answers = [
      { text: currentQuestion.answer_a, correct: currentQuestion.correct_answer === 1 },
      { text: currentQuestion.answer_b, correct: currentQuestion.correct_answer === 2 },
      { text: currentQuestion.answer_c, correct: currentQuestion.correct_answer === 3 },
      { text: currentQuestion.answer_d, correct: currentQuestion.correct_answer === 4 }
    ].sort(() => Math.random() - 0.5);

    answers.forEach((ans,i)=>{
      const btn = document.createElement('button');
      btn.textContent = ans.text;
      btn.classList.add('answer-btn');
      btn.onclick = () => checkAnswer(i+1, btn);
      answersBox.appendChild(btn);
    });

    currentQuestion.correct_answer_shuffled = answers.findIndex(a => a.correct)+1;

    clearInterval(timer);
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeDisplay.classList.remove('red-timer');

    timer = setInterval(()=>{
      timeLeft--;
      timeDisplay.textContent = timeLeft;
      timeDisplay.classList.toggle('red-timer', timeLeft<=5);
      if(timeLeft<=0){
        clearInterval(timer);
        playSound(wrongBuffer);
        highlightCorrectAnswer();
        setTimeout(endGame,1000);
      }
    },1000);
  }

  function checkAnswer(selected, btn){
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b=>b.disabled=true);

    if(selected===currentQuestion.correct_answer_shuffled){
      playSound(correctBuffer);
      btn.classList.add('correct');
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
      setTimeout(loadQuestion,1000);
    }else{
      playSound(wrongBuffer);
      btn.classList.add('wrong');
      highlightCorrectAnswer();
      setTimeout(endGame,1000);
    }
  }

  function highlightCorrectAnswer(){
    document.querySelectorAll('.answer-btn').forEach((btn,i)=>{
      if(i+1===currentQuestion.correct_answer_shuffled) btn.classList.add('correct');
    });
  }

  async function endGame(){
    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;
    if(username) await submitLeaderboardScore(username, score);
  }

  // ===== BUTTONS =====
  startBtn?.addEventListener('click', startGame);
  playAgainBtn?.addEventListener('click', startGame);
  mainMenuBtn?.addEventListener('click', () => {
    resetGame();
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
  });
});
