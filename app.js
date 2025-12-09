// app.js
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  // elements
  const startBtn = document.getElementById('startBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const mainMenuBtn = document.getElementById('mainMenuBtn');
  const questionText = document.getElementById('questionText');
  const questionImage = document.getElementById('questionImage');
  const answersBox = document.getElementById('answers');
  const timeDisplay = document.getElementById('time');
  const game = document.getElementById('game');
  const endScreen = document.getElementById('end-screen');
  const finalScore = document.getElementById('finalScore');
  const scoreDisplay = document.getElementById('score');
  const userDisplay = document.getElementById('userDisplay');
  const startScreen = document.getElementById('start-screen');

  // basic sanity checks
  if (!startBtn || !answersBox || !game || !startScreen) {
    console.error('Missing essential DOM elements:', { startBtn, answersBox, game, startScreen });
    alert('Page did not load correctly — check console for details.');
    return;
  }

  // state
  let questions = [];
  let remainingQuestions = [];
  let currentQuestion = null;
  let score = 0;
  let timer = null;
  let timeLeft = 15;
  const totalQuestions = 10;
  let questionsAnswered = 0;
  let username = '';

  console.log('App initialized');

  // attach listeners
  startBtn.addEventListener('click', startGame);
  if (playAgainBtn) playAgainBtn.addEventListener('click', () => { resetGame(); startGame(); });
  if (mainMenuBtn) mainMenuBtn.addEventListener('click', () => { resetGame(); showStart(); });

  // helper to show start screen
  function showStart() {
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
  }

  // load user profile (if signed in)
  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { console.log('no user logged in'); return; }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      if (error) { console.warn('profile load failed', error); return; }
      username = profile?.username || '';
      userDisplay.textContent = username ? `Player: ${username}` : '';
    } catch (err) {
      console.error('loadCurrentUser error', err);
    }
  }

  loadCurrentUser();

  // reset game state
  function resetGame() {
    score = 0;
    questionsAnswered = 0;
    questions = [];
    remainingQuestions = [];
    currentQuestion = null;
    updateScore();
    clearInterval(timer);
    timer = null;
  }

  // start the game
  async function startGame() {
    try {
      resetGame();
      startScreen.classList.add('hidden');
      game.classList.remove('hidden');
      endScreen.classList.add('hidden');
      updateScore();

      console.log('Fetching questions from Supabase...');
      const { data, error } = await supabase.from('questions').select('*');
      if (error) {
        console.error('Supabase fetch error:', error);
        alert('Failed to load questions (check console).');
        showStart();
        return;
      }
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('No questions returned from the DB');
        alert('No questions available in the database.');
        showStart();
        return;
      }

      questions = data;
      remainingQuestions = [...questions];
      await loadQuestion();
    } catch (err) {
      console.error('startGame error', err);
      alert('An error occurred (see console).');
      showStart();
    }
  }

  // load a single question
  async function loadQuestion() {
    answersBox.innerHTML = '';
    if (!remainingQuestions.length || questionsAnswered >= totalQuestions) {
      return endGame();
    }

    const idx = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions.splice(idx, 1)[0];

    // defensive: ensure fields exist
    questionText.textContent = currentQuestion?.question ?? 'No question text';
    if (currentQuestion?.question_image) {
      questionImage.src = currentQuestion.question_image;
      questionImage.style.display = 'block';
    } else {
      questionImage.style.display = 'none';
    }

    const answers = [
      currentQuestion?.answer_a ?? '',
      currentQuestion?.answer_b ?? '',
      currentQuestion?.answer_c ?? '',
      currentQuestion?.answer_d ?? '',
    ];

    answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer-btn';
      btn.textContent = ans || '(empty)';
      btn.addEventListener('click', () => checkAnswer(i + 1, btn));
      answersBox.appendChild(btn);
    });

    // start timer
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    clearInterval(timer);
    timer = setInterval(() => {
      timeLeft--;
      timeDisplay.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);
        highlightCorrectAnswer();
        setTimeout(() => {
          questionsAnswered++;
          if (questionsAnswered >= totalQuestions) endGame(); else loadQuestion();
        }, 1000);
      }
    }, 1000);
  }

  // answer checking
  function checkAnswer(selected, clickedBtn) {
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    const correctIndex = Number(currentQuestion?.correct_answer) ?? null;
    if (correctIndex === null) {
      console.warn('No correct_answer field on currentQuestion', currentQuestion);
    }

    if (selected === correctIndex) {
      clickedBtn.classList.add('correct');
      score++;
    } else {
      clickedBtn.classList.add('wrong');
      highlightCorrectAnswer();
    }

    updateScore();

    // next question after short delay
    setTimeout(() => {
      questionsAnswered++;
      if (questionsAnswered >= totalQuestions) endGame();
      else loadQuestion();
    }, 1000);
  }

  function highlightCorrectAnswer() {
    const buttons = Array.from(document.querySelectorAll('.answer-btn'));
    buttons.forEach((btn, i) => {
      if ((i + 1) === Number(currentQuestion?.correct_answer)) btn.classList.add('correct');
    });
  }

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }

  async function endGame() {
    clearInterval(timer);
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;

    // attempt to submit score if logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (!username) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        username = profile?.username || 'Unknown';
      }
      await supabase.from('scores').insert({ user_id: user.id, username, score });
    } catch (err) {
      console.warn('submitScore failed', err);
    }
  }
});
