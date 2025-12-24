// ====== CONFIGURATION ======
const API_BASE = 'https://supabase-bridge-zzqp.onrender.com';
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ====== UI & STATE ======
const cachedMuted = localStorage.getItem('muted') === 'true';
const cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
const cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';
const userId = localStorage.getItem('userId'); 

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

const dailyMessages = {
  0: ["Ouch. Zero XP gained today.", "Lumbridge is calling your name."],
  1: ["At least it's not a zero!", "One is better than none... barely."],
  2: ["Tomorrow will be better!", "The RNG was not in your favor."],
  3: ["A bronze-tier effort.", "You're still warming up, right?"],
  4: ["Getting there! Halfway to decent.", "Not bad, but not quite 'pro'."],
  5: ["A solid 50%. Perfectly balanced.", "Mid-level performance!"],
  6: ["You did great!", "Above average! Keep it up."],
  7: ["Nice! You really know your OSRS.", "Solid score! High-scores material."],
  8: ["Legendary! You're a walking wiki.", "Almost a perfect run!"],
  9: ["Incredible! So close to perfection!", "An elite achievement."],
  10: ["Perfect! A True Completionist!", "Absolute Master of Trivia!"]
};

let correctBuffer, wrongBuffer;
let muted = cachedMuted;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const todayStr = new Date().toISOString().split('T')[0];

let username = cachedLoggedIn ? cachedUsername : '';
let score = 0;
let remainingQuestions = [];
let currentQuestion = null;
let preloadQueue = []; 
let timer;
let timeLeft = 15;
let isDailyMode = false;

// ====== INITIAL UI SYNC ======
if (userDisplay) userDisplay.querySelector('#usernameSpan').textContent = ' ' + (username || 'Guest');
if (authBtn) {
    const label = authBtn.querySelector('.btn-label');
    if (label) label.textContent = cachedLoggedIn ? 'Log Out' : 'Log In';
}
if (muteBtn) {
    muteBtn.querySelector('#muteIcon').textContent = cachedMuted ? '🔇' : '🔊';
    if (cachedMuted) muteBtn.classList.add('is-muted');
}

function lockDailyButton() {
    if (dailyBtn) {
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');
        const label = dailyBtn.querySelector('.btn-label');
        dailyBtn.onclick = () => alert("You've already played today's challenge!");
    }
}

// ====== GAME ENGINE ======

function resetGame() {
    clearInterval(timer);
    score = 0;
    currentQuestion = null;
    questionText.textContent = '';
    answersBox.innerHTML = '';
    questionImage.style.display = 'none';
    questionImage.src = ''; 
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeWrap.classList.remove('red-timer');
    if (scoreDisplay) scoreDisplay.textContent = `Score: 0`;
}

async function preloadNextQuestions() {
    let attempts = 0;
    while (preloadQueue.length < 2 && remainingQuestions.length > 0 && attempts < 10) {
        attempts++;
        const index = Math.floor(Math.random() * remainingQuestions.length);
        const qId = remainingQuestions[index]; 
        
        if (preloadQueue.some(p => p.id === qId)) continue;

        remainingQuestions.splice(index, 1);
        
        try {
            // Using your Render server to get specific question data
            const resp = await fetch(`${API_BASE}/api/get-questions`);
            const allData = await resp.json();
            const specificQ = allData.find(q => q.id === qId);

            if (specificQ) {
                preloadQueue.push(specificQ);
                if (specificQ.question_image) {
                    const img = new Image();
                    img.src = specificQ.question_image;
                }
            }
        } catch (e) { console.error("Preload fail", e); }
    }
}

async function startGame() {
    document.body.classList.add('game-active'); 
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    
    resetGame();
    updateScore();
    loadSounds(); 

    if (!isDailyMode) {
        try {
            const response = await fetch(`${API_BASE}/api/get-question-ids`);
            const idList = await response.json();
            remainingQuestions = idList.sort(() => Math.random() - 0.5);
        } catch (e) { console.error("ID fetch fail", e); }
    }

    if (preloadQueue.length === 0) await preloadNextQuestions(); 
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
    preloadNextQuestions(); 

    questionText.textContent = currentQuestion.question;
    if (currentQuestion.question_image) {
        questionImage.style.display = 'none';
        questionImage.onload = () => { questionImage.style.display = 'block'; };
        questionImage.src = currentQuestion.question_image;
    }

    let answers = [
        { text: currentQuestion.answer_a, id: 1 },
        { text: currentQuestion.answer_b, id: 2 },
        { text: currentQuestion.answer_c, id: 3 },
        { text: currentQuestion.answer_d, id: 4 }
    ].filter(a => a.text).sort(() => Math.random() - 0.5);
    
    answers.forEach((ans) => {
        const btn = document.createElement('button');
        btn.textContent = ans.text;
        btn.classList.add('answer-btn');
        btn.dataset.answerId = ans.id; 
        btn.onclick = () => checkAnswer(ans.id, btn);
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
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    playSound(wrongBuffer);
    await highlightCorrectAnswer();
    setTimeout(isDailyMode ? loadQuestion : endGame, 1500);
}

async function checkAnswer(choiceId, btn) {
    if (timeLeft <= 0) return;
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    try {
        const resp = await fetch(`${API_BASE}/api/check-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionId: currentQuestion.id, choice: choiceId })
        });
        const { isCorrect } = await resp.json();

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
            setTimeout(isDailyMode ? loadQuestion : endGame, 1500);
        }
    } catch (e) { console.error("Check Answer failed", e); }
}

async function highlightCorrectAnswer() {
    try {
        const resp = await fetch(`${API_BASE}/api/check-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionId: currentQuestion.id, choice: 0 }) // choice 0 forces server to return correctId
        });
        const { correctId } = await resp.json();
        document.querySelectorAll('.answer-btn').forEach(btn => {
            if (parseInt(btn.dataset.answerId) === correctId) btn.classList.add('correct');
        });
    } catch (e) { console.error("Highlight failed", e); }
}

async function submitLeaderboardScore(user, val) {
    const userId = localStorage.getItem('userId'); 
    try {
        const response = await fetch(`${API_BASE}/api/submit-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, score: Number(val), userId: userId })
        });
        const result = await response.json();
        console.log("Score result:", result.message);
    } catch (err) { console.error("Failed to submit score:", err); }
}

async function endGame() {
    clearInterval(timer);
    document.body.classList.remove('game-active'); 
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    if (finalScore) finalScore.textContent = score;

    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');
    if (gameOverTitle) gameOverTitle.classList.add('hidden');
    if (gzTitle) gzTitle.classList.add('hidden');

    if (isDailyMode) {
        if (playAgainBtn) playAgainBtn.classList.add('hidden');
        const scoreKey = Math.min(Math.max(score, 0), 10);
        const options = dailyMessages[scoreKey] || ["Game Over!"];
        if (gameOverTitle) {
            gameOverTitle.textContent = options[Math.floor(Math.random() * options.length)];
            gameOverTitle.classList.remove('hidden');
        }
        // Daily scores are handled by your server during login/signup logic or a separate endpoint
    } else {
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        if (gameOverTitle) {
            gameOverTitle.textContent = "Game Over!";
            gameOverTitle.classList.remove('hidden');
        }
        if (cachedLoggedIn && username !== 'Guest') {
            await submitLeaderboardScore(username, score);
        }
    }
    isDailyMode = false;
}

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
    source.connect(audioCtx.destination);
    source.start(0);
}

function updateScore() { if (scoreDisplay) scoreDisplay.textContent = `Score: ${score}`; }

// ====== DAILY CHALLENGE SEED LOGIC ======
function shuffleWithSeed(array, seed) {
    let arr = [...array];
    let m = arr.length, t, i;
    while (m) {
        i = Math.floor(seededRandom(seed++) * m--);
        t = arr[m]; arr[m] = arr[i]; arr[i] = t;
    }
    return arr;
}
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

async function startDailyChallenge() {
    if (!cachedLoggedIn) return alert("Log in to play Daily Mode!");
    
    // Check with server if already played
    const response = await fetch(`${API_BASE}/api/get-question-ids`);
    const allQuestions = await response.json();

    const startDate = new Date('2025-12-22'); 
    const diffTime = Math.abs(new Date() - startDate);
    const dayCounter = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const questionsPerDay = 10;
    const cycleNumber = Math.floor((dayCounter * questionsPerDay) / allQuestions.length);
    const chunkIndex = (dayCounter * questionsPerDay) % allQuestions.length;

    const shuffledList = shuffleWithSeed(allQuestions, cycleNumber);
    const dailyIds = shuffledList.slice(chunkIndex, chunkIndex + 10);

    isDailyMode = true;
    resetGame();
    remainingQuestions = dailyIds; 
    
    document.body.classList.add('game-active'); 
    document.getElementById('start-screen').classList.add('hidden');
    game.classList.remove('hidden');
    
    await preloadNextQuestions();
    loadQuestion();
}

// ====== EVENT LISTENERS ======
startBtn.onclick = () => { isDailyMode = false; startGame(); };
playAgainBtn.onclick = () => startGame();
mainMenuBtn.onclick = () => location.reload(); 

muteBtn.onclick = () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    muteBtn.querySelector('#muteIcon').textContent = muted ? '🔇' : '🔊';
};

if (dailyBtn) {
    const hasPlayedToday = localStorage.getItem('dailyPlayedDate') === todayStr;
    if (cachedLoggedIn && !hasPlayedToday) {
        dailyBtn.classList.add('is-active');
        dailyBtn.onclick = () => startDailyChallenge();
    } else {
        lockDailyButton();
    }
}
