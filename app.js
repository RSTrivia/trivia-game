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

// ====== AUTH & REALTIME SYNC ======
async function initializeAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Start listening for changes on other devices immediately
        subscribeToDailyChanges(session.user.id);
        
        // Double check database truth (in case localStorage is cleared)
        const { data: existing } = await supabase
            .from('daily_attempts')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('attempt_date', todayStr)
            .maybeSingle();
            
        if (existing) {
            localStorage.setItem('dailyPlayedDate', todayStr);
            lockDailyButton();
        }
    }

    // Listen for login/logout events
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            subscribeToDailyChanges(session.user.id);
        }
    });
}
initializeAuth();

function lockDailyButton() {
    if (dailyBtn) {
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');
        dailyBtn.onclick = () => alert("You've already played today's challenge!");
    }
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

        if ((currentQuestion && qId === currentQuestion.id) || preloadQueue.some(p => p.id === qId)) {
            continue;
        }

        remainingQuestions.splice(index, 1);
        const { data, error } = await supabase.rpc('get_question_by_id', { input_id: qId });

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
    document.body.classList.add('game-active'); 
    endGame.running = false;
    resetGame();

    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    updateScore();
    await loadSounds(); 

    const { data: idList, error } = await supabase.rpc('get_all_question_ids');
    if (error) return console.error("RPC Error:", error.message);

    remainingQuestions = idList.map(item => item.id).sort(() => Math.random() - 0.5);
    
    await preloadNextQuestions(); 
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
    } else {
        questionImage.style.display = 'none';
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
    
    if (isDailyMode) {
        setTimeout(loadQuestion, 1500);
    } else {
        setTimeout(endGame, 1000);
    }
}

async function checkAnswer(choiceId, btn) {
    if (timeLeft <= 0) return;
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    const { data: isCorrect, error } = await supabase.rpc('check_my_answer', {
        input_id: currentQuestion.id,
        choice: choiceId
    });

    if (error) return console.error("RPC Error:", error);

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
        if (isDailyMode) {
            setTimeout(loadQuestion, 1500);
        } else {
            setTimeout(endGame, 1000);
        }
    }
}

async function highlightCorrectAnswer() {
    const { data: correctId } = await supabase.rpc('reveal_correct_answer', { 
        input_id: currentQuestion.id 
    });
    document.querySelectorAll('.answer-btn').forEach(btn => {
        if (parseInt(btn.dataset.answerId) === correctId) {
            btn.classList.add('correct');
        }
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

    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');

    if (isDailyMode) {
        // Daily Mode: No "Play Again", show a specific flavor message
        playAgainBtn.classList.add('hidden');
        
        const options = dailyMessages[score] || ["Game Over!"];
        const randomMsg = options[Math.floor(Math.random() * options.length)];
        
        if (gameOverTitle) {
            gameOverTitle.textContent = randomMsg;
            gameOverTitle.classList.remove('hidden');
        }
        if (gzTitle) gzTitle.classList.add('hidden');

        if (username && username !== 'Guest') {
            // Update the existing daily_attempts row with the final score
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('daily_attempts')
                    .update({ score: score })
                    .eq('user_id', session.user.id)
                    .eq('attempt_date', todayStr);
            }
        }
        isDailyMode = false; 
    } else {
        // Standard Mode: Show "Play Again" and "Gz" if they won
        playAgainBtn.classList.remove('hidden');
        
        // Assuming 10 questions is a "perfect" run for standard mode or check against remaining
        if (score > 0 && remainingQuestions.length === 0 && preloadQueue.length === 0) {
            const gzMessages = ['Gz!', 'Go touch grass', 'See you in Lumbridge'];
            if (gzTitle) {
                gzTitle.textContent = gzMessages[Math.floor(Math.random() * gzMessages.length)];
                gzTitle.classList.remove('hidden');
            }
            if (gameOverTitle) gameOverTitle.classList.add('hidden');
        } else {
            if (gameOverTitle) {
                gameOverTitle.textContent = "Game Over!";
                gameOverTitle.classList.remove('hidden');
            }
            if (gzTitle) gzTitle.classList.add('hidden');
        }

        if (username && username !== 'Guest') {
            await submitLeaderboardScore(username, score);
        }
    }
    endGame.running = false;
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
    
    // 🔥 On mobile, we must resume inside the play call too 
    // just in case the context auto-suspended
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain).connect(audioCtx.destination);
    source.start(0); // Add the 0 for older mobile browser compatibility
}
function updateScore() { scoreDisplay.textContent = `Score: ${score}`; }

async function submitLeaderboardScore(user, val) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: record } = await supabase.from('scores').select('score').eq('user_id', session.user.id).single();
    if (!record || val > record.score) {
        await supabase.from('scores').upsert({ user_id: session.user.id, username: user, score: val }, { onConflict: 'user_id' });
    }
}

async function startDailyChallenge() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Log in to play Daily Mode!");

    const { error: burnError } = await supabase
        .from('daily_attempts')
        .insert({ user_id: session.user.id, attempt_date: todayStr });

    if (burnError) return alert("You've already played today!");
    
    localStorage.setItem('dailyPlayedDate', todayStr);
    lockDailyButton(); // Gray out immediately on this device

    const { data: allQuestions } = await supabase.from('questions').select('id').order('id', { ascending: true });
    if (!allQuestions || allQuestions.length < 10) return alert("Error loading questions.");

    const startDate = new Date('2025-12-22'); 
    const diffTime = Math.abs(new Date() - startDate);
    const dayCounter = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const questionsPerDay = 10;
    const daysPerCycle = Math.floor(allQuestions.length / questionsPerDay); 
    const cycleNumber = Math.floor(dayCounter / daysPerCycle); 
    const dayInCycle = dayCounter % daysPerCycle;

    const shuffledList = shuffleWithSeed(allQuestions, cycleNumber);
    const dailyIds = shuffledList.slice(dayInCycle * questionsPerDay, (dayInCycle * questionsPerDay) + questionsPerDay).map(q => q.id);

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
startBtn.onclick = () => {
    isDailyMode = false;
    startGame();
};
playAgainBtn.onclick = () => startGame();
mainMenuBtn.onclick = () => window.location.reload();

muteBtn.onclick = () => {
    muted = !muted;
    localStorage.setItem('muted', muted);
    muteBtn.querySelector('#muteIcon').textContent = muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('is-muted', muted);
};

if (dailyBtn) {
    const hasPlayed = localStorage.getItem('dailyPlayedDate') === todayStr;
    if (cachedLoggedIn && !hasPlayed) {
        dailyBtn.classList.add('is-active');
        dailyBtn.classList.remove('disabled');
    } else {
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');
    }

    dailyBtn.onclick = async () => {
        // 🔥 1. IMMEDIATE AUDIO UNLOCK
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        // Start loading sounds immediately so the buffers are ready
        loadSounds(); 

        if (!cachedLoggedIn) return alert("Please log in to play!");
        if (localStorage.getItem('dailyPlayedDate') === todayStr) return alert("Already played today!");
        
        isDailyMode = true;
        // Start the actual challenge logic
        startDailyChallenge();
    };
}

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

function subscribeToDailyChanges(userId) {
    supabase
        .channel('daily-updates')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'daily_attempts',
            filter: `user_id=eq.${userId}`
        }, (payload) => {
            console.log('Daily challenge sync: locking button.');
            localStorage.setItem('dailyPlayedDate', todayStr);
            lockDailyButton();
        })
        .subscribe();
}


