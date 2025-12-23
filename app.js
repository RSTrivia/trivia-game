import { supabase } from './supabase.js';
window.supabase = supabase; 
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ====== UI & STATE ======
const cachedMuted = localStorage.getItem('muted') === 'true';
const cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
const cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';

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
const timeWrap = document.getElementById('time-wrap');
const userDisplay = document.getElementById('userDisplay');
const authBtn = document.getElementById('authBtn');
const muteBtn = document.getElementById('muteBtn');
const dailyBtn = document.getElementById('dailyBtn');

let correctBuffer, wrongBuffer;
let muted = cachedMuted;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const todayStr = new Date().toISOString().split('T')[0];

let username = cachedLoggedIn ? cachedUsername : '';
let score = 0;
let questionsCount = 0; 
let remainingQuestions = [];
let currentQuestion = null;
let preloadQueue = []; 
let timer;
let timeLeft = 15;
let isDailyMode = false;
let authLabel = authBtn?.querySelector('.btn-label');

// ====== INITIAL UI SYNC ======
if (userDisplay) userDisplay.querySelector('#usernameSpan').textContent = ' ' + (username || 'Guest');
if (authLabel) authLabel.textContent = cachedLoggedIn ? 'Log Out' : 'Log In';
if (muteBtn) {
    muteBtn.querySelector('#muteIcon').textContent = cachedMuted ? '🔇' : '🔊';
    if (cachedMuted) muteBtn.classList.add('is-muted');
}

// ====== GAME ENGINE ======

function resetGame() {
    clearInterval(timer);
    score = 0;
    preloadQueue = [];
    currentQuestion = null;
    answersBox.innerHTML = '';
    questionImage.style.display = 'none';
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeWrap.classList.remove('red-timer');
}

async function preloadNextQuestions() {
    let attempts = 0;
    while (preloadQueue.length < 2 && remainingQuestions.length > 0 && attempts < 10) {
        attempts++;
        const index = Math.floor(Math.random() * remainingQuestions.length);
        const qId = remainingQuestions[index];

        if ((currentQuestion && qId === currentQuestion.id) || preloadQueue.some(p => p.id === qId)) continue;

        remainingQuestions.splice(index, 1);
        const { data, error } = await supabase.rpc('get_question_by_id', { q_id: qId });

        if (!error && data && data[0]) {
            preloadQueue.push(data[0]);
            if (data[0].question_image) {
                const img = new Image();
                img.src = data[0].question_image;
            }
        }
    }
}

async function startGame() {
    const { data: sessionData } = await supabase.auth.getSession();
    document.body.classList.add('game-active'); 
    endGame.running = false;
    resetGame();

    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    updateScore();
    await loadSounds(); 

    const { data: idList, error } = await supabase.rpc('get_all_question_ids');
    if (error) {
    console.error("RPC Error:", error.message); // This will tell us EXACTLY why it's 400
    return;
}

    remainingQuestions = idList.map(item => item.id).sort(() => Math.random() - 0.5);
    questionsCount = remainingQuestions.length;
    
    await preloadNextQuestions(); // Wait for first question
    loadQuestion();
}

async function loadQuestion() {
    answersBox.innerHTML = '';
    
    if (preloadQueue.length === 0 && remainingQuestions.length === 0) {
        await endGame();
        return;
    }

    if (preloadQueue.length === 0) await preloadNextQuestions();

    currentQuestion = preloadQueue.shift();
    preloadNextQuestions(); // Background refill

    questionText.textContent = currentQuestion.question;
    if (currentQuestion.question_image) {
        questionImage.style.display = 'none';
        questionImage.onload = () => { questionImage.style.display = 'block'; };
        questionImage.src = currentQuestion.question_image;
    } else {
        questionImage.style.display = 'none';
    }

    let answers = [
        currentQuestion.answer_a, currentQuestion.answer_b, 
        currentQuestion.answer_c, currentQuestion.answer_d
    ].filter(Boolean).sort(() => Math.random() - 0.5);

    answers.forEach((ansText) => {
        const btn = document.createElement('button');
        btn.textContent = ansText;
        btn.classList.add('answer-btn');
        btn.onclick = () => checkAnswer(ansText, btn);
        answersBox.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeWrap.classList.remove('red-timer');

    timer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = timeLeft;
        if (timeLeft <= 5) timeWrap.classList.add('red-timer');
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeout();
        }
    }, 1000);
}

async function handleTimeout() {
    playSound(wrongBuffer);
    await highlightCorrectAnswer();
    setTimeout(endGame, 1000);
}

async function checkAnswer(selected, btn) {
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    const { data: isCorrect } = await supabase.rpc('check_my_answer', {
        q_id: currentQuestion.id, 
        choice: selected
    });

    if (isCorrect) {
        playSound(correctBuffer);
        btn.classList.add('correct');
        score++;
        updateScore();
        setTimeout(loadQuestion, 1000);
    } else {
        playSound(wrongBuffer);
        btn.classList.add('wrong');
        await highlightCorrectAnswer();
        setTimeout(endGame, 1000);
    }
}

async function highlightCorrectAnswer() {
    const { data: correctText } = await supabase.rpc('reveal_correct_answer', { q_id: currentQuestion.id });
    document.querySelectorAll('.answer-btn').forEach(btn => {
        if (btn.innerText.trim() === correctText) btn.classList.add('correct');
    });
}

async function endGame() {
    if (endGame.running) return;
    endGame.running = true;
    clearInterval(timer);
    document.body.classList.remove('game-active'); 
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = score;

    if (username && username !== 'Guest') {
        await submitLeaderboardScore(username, score);
    }
}
endGame.running = false;

// ====== HELPERS & AUDIO ======
async function loadSounds() {
    if (!correctBuffer) correctBuffer = await loadAudio('./sounds/correct.mp3');
    if (!wrongBuffer) wrongBuffer = await loadAudio('./sounds/wrong.mp3');
}

async function loadAudio(url) {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    return audioCtx.decodeAudioData(buf);
}

function playSound(buffer) {
    if (!buffer || muted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain).connect(audioCtx.destination);
    source.start();
}

function updateScore() { scoreDisplay.textContent = `Score: ${score}`; }

async function submitLeaderboardScore(user, val) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('scores').upsert({ user_id: session.user.id, username: user, score: val }, { onConflict: 'user_id' });
}

// ====== EVENT LISTENERS ======
startBtn.onclick = () => startGame();
playAgainBtn.onclick = () => startGame();
mainMenuBtn.onclick = () => window.location.reload();

muteBtn.onclick = () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    muteBtn.querySelector('#muteIcon').textContent = muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('is-muted', muted);
};

