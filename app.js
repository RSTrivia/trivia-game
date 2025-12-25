import { supabase } from './supabase.js';
window.supabase = supabase; 
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ====== UI & STATE ======
const cachedMuted = localStorage.getItem('muted') === 'true';
const cachedUsername = localStorage.getItem('cachedUsername') || 'Guest';
const cachedLoggedIn = localStorage.getItem('cachedLoggedIn') === 'true';

const shareBtn = document.getElementById('shareBtn');
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
  0: [
    "Ouch. Zero XP gained today.",
    "Lumbridge is calling your name.",
    "Sit.",
    "You've been slapped by the Sandwich Lady.",
    "Back to Tutorial Island for you.",
    "You've been defeated. Try again tomorrow!",
    "Buying brain for 10k?",
    "Your hitpoints reached 0. Oh dear.",
    "You're splashing on a seagull in Port Sarim.",
    "This score is lower than the chances of a 3rd Age Pickaxe."
  ],
  1: [
    "At least it's not a zero!",
    "A 1 is infinitely better than a 0.",
    "You hit a 1! Better than a splat.",
    "Thumbs down log out.",
    "It's a start!",
    "It can only go higher from here.",
    "Well, you didn't go home empty-handed!",
    "The RNG gods are laughing at you.",
    "Logging out in shame.",
    "A true noob has appeared."
  ],
  2: [
    "Tomorrow will be better!",
    "The RNG was not in your favor.",
    "You're getting there!",
    "Still stuck in the Al-Kharid gate.",
    "Try again tomorrow.",
    "A bronze-tier effort.",
    "It's progress!",
    "A couple of lucky guesses?",
    "Tomorrow is a new day.",
    "Better than a disconnect, I guess."
  ],
  3: [
    "The grind continues.",
    "You're still warming up, right?",
    "Leveling up slowly!",
    "Three is the number of heads on a KBD.",
    "Better every day.",
    "Practice makes perfect.",
    "Nice try, adventurer.",
    "Keep your prayer up!",
    "Keep grinding, you'll get there.",
    "An iron-tier effort."
  ],
  4: [
    "Getting there!",
    "Almost halfway!",
    "A solid effort.",
    "Not a noob anymore.",
    "Still in the F2P zone, aren't we?",
    "Getting the hang of it!",
    "A silver-tier effort.",
    "Keep clicking!",
    "You wouldn't survive the Wilderness like this.",
    "Consistent gains. Keep at it!"
  ],
  5: [
    "A solid 50%. Perfectly balanced.",
    "Mid-level performance!",
    "You've reached the mid-game grind.",
    "Halfway to 99! (Except not really).",
    "The big 50!",
    "A steel-tier effort.",
    "Halfway to legendary.",
    "The Wise Old Man thinks you're 'okay'.",
    "Keep the grind alive!",
    "Not bad, adventurer."
  ],
  6: [
    "Decent, but not great.",
    "Above average! Keep it up.",
    "You know your stuff.",
    "You're starting to smell like a member.",
    "More right than wrong!",
    "A gold-tier effort.",
    "The Varrock Museum wants your brain.",
    "A respectable showing, adventurer.",
    "You're gaining some serious XP now.",
    "Not quite elite."
  ],
  7: [
    "Nice! You really know your OSRS.",
    "Solid score! High-scores material.",
    "Beast of a score.",
    "A mithril-tier effort.",
    "Slaying the questions.",
    "A very smart drop!",
    "You're efficient, I'll give you that.",
    "Almost impressive.",
    "Almost at the top of the ladder.",
    "You clearly don't bankstand all day."
  ],
  8: [
    "Legendary! You're a walking wiki.",
    "Almost perfect.",
    "You've got the fire cape of trivia.",
    "Absolute unit.",
    "You're clicking with precision.",
    "Incredible score!",
    "An adamant-tier effort.",
    "Purple chest vibes!",
    "Ready for the Inferno.",
    "High-tier gains."
  ],
  9: [
    "Incredible! So close to perfection!",
    "An elite achievement.",
    "A rune-tier effort.",
    "You're a trivia beast.",
    "Only one question stood in your way.",
    "One hit from greatness.",
    "You've reached the final boss.",
    "Basically a genius.",
    "So close, you can smell the Max Score.",
    "Your brain is worth 2,147,483,647 gp."
  ],
  10: [
    "Perfect! A True Completionist!",
    "Absolute Master of Trivia!",
    "Zezima is shaking right now.",
    "Absolute 10/10.",
    "You are the OSRS Wiki.",
    "A literal god.",
    "A flawless Victory. Gz!",
    "PERFECT SCORE!",
    "A true Grandmaster.",
    "Buying your brain for 2147m.",
    "Total domination.",
  ]
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

async function updateShareButtonState() {
    // 1. Get the live session status from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const isLoggedIn = !!session;

    // 2. Check if they have played today
    const hasPlayed = localStorage.getItem('dailyPlayedDate') === todayStr;

    if (shareBtn) {
      // Show the button always, but only ENABLE if Logged In AND Played
        shareBtn.style.display = "flex";
     // ONLY unlock if they are Logged In AND have finished the daily
        if (isLoggedIn && hasPlayed) {
            shareBtn.classList.remove('is-disabled');
            shareBtn.style.opacity = "1";
            shareBtn.style.pointerEvents = "auto";
        } 
       // If they are a Guest OR haven't played, keep it locked
        else {
           shareBtn.classList.add('is-disabled');
            shareBtn.style.opacity = "0.5";
            shareBtn.style.pointerEvents = "none";
        
        }
    }
}


async function initializeAuth() {
    // 1. Check current session immediately
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        subscribeToDailyChanges(session.user.id);
        await fetchDailyStatus(session.user.id);
    } else {
        updateShareButtonState();
    }

    // 2. Listen for future login/logout events (ONLY ONE LISTENER NEEDED)
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            subscribeToDailyChanges(session.user.id);
            await fetchDailyStatus(session.user.id);
        } else if (event === 'SIGNED_OUT') {
              // 1. Clear Storage
            localStorage.removeItem('dailyPlayedDate');
            localStorage.removeItem('lastDailyScore');
            localStorage.removeItem('lastDailyMessage'); // Add this line
            localStorage.removeItem('cachedLoggedIn');
            localStorage.removeItem('cachedUsername');
          // 2. Reset Script Variables
            username = 'Guest';
            score = 0;
          // 3. Reset UI Text (Prevent the share button from "seeing" old text)
            if (finalScore) finalScore.textContent = "0";
            const msgTitle = document.getElementById('game-over-title');
            if (msgTitle) msgTitle.textContent = "";
          
          // 4. Update the actual Button UI (Gray it out)
            updateShareButtonState();
        }
    });
}

// ====== NEW: FETCH SCORE FROM DATABASE ======
async function fetchDailyStatus(userId) {
    const { data, error } = await supabase
        .from('daily_attempts')
        .select('score, message') //message
        .eq('user_id', userId)
        .eq('attempt_date', todayStr)
        .maybeSingle();

    if (data) {
        localStorage.setItem('dailyPlayedDate', todayStr);
        localStorage.setItem('lastDailyScore', data.score ?? "0");
        // SYNC THE MESSAGE FROM DATABASE
        if (data.message) {
            localStorage.setItem('lastDailyMessage', data.message);
        }
        if (finalScore) finalScore.textContent = data.score ?? "0";
        
        lockDailyButton();         
        updateShareButtonState();  // <--- THIS TRIGGERS THE GOLD COLOR
    } else {
        updateShareButtonState();  // <--- THIS TRIGGERS THE GREY COLOR
    }
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
    // 1. Stop any active logic
    clearInterval(timer);
    
    // 2. Reset numerical state
    score = 0;
    currentQuestion = null;
    // NOTE: We do NOT reset preloadQueue here. 
    // This allows "Play Again" to use the 2 questions already buffered.

    // 3. WIPE UI IMMEDIATELY (Prevents the flicker)
    questionText.textContent = '';
    answersBox.innerHTML = '';
    
    // 4. Handle Images
    questionImage.style.display = 'none';
    questionImage.style.opacity = '0';
    questionImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // 5. Reset Timer Visuals
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeWrap.classList.remove('red-timer');
    
    // 6. Reset Score Visual
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: 0`;
    }
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
    // A. Immediate UI setup
    document.body.classList.add('game-active'); 
    endGame.running = false;
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    
    // B. Clear score and timers, but NOT the preloaded questions
    resetGame();
    updateScore();

    // C. LOAD SOUNDS (Start this, but don't let it block the UI if possible)
    loadSounds(); 

    // D. INSTANT START: If we have preloaded questions from the last game, start NOW
    if (preloadQueue.length > 0) {
        console.log("Instant start using preloaded questions...");
        loadQuestion(); 
    }

    // E. BACKGROUND SYNC: Refresh the deck of IDs from Supabase
    const { data: idList, error } = await supabase.rpc('get_all_question_ids');
    if (error) {
        console.error("RPC Error:", error.message);
    } else {
        // Filter out IDs that are currently sitting in the preloadQueue 
        // so we don't ask the same question twice.
        const preloadedIds = preloadQueue.map(q => q.id);
        remainingQuestions = idList
            .map(item => item.id)
            .filter(id => !preloadedIds.includes(id)) 
            .sort(() => Math.random() - 0.5);
    }

    // F. FALLBACK: If preload was empty (first game ever), load now
    if (!currentQuestion && preloadQueue.length === 0) {
        await preloadNextQuestions(); 
        loadQuestion();
    }
}
async function loadQuestion() {
    // A. IMMEDIATE CLEANUP: Hide and clear before doing anything else
    questionImage.style.display = 'none';
    questionImage.style.opacity = '0'; // Extra safety
    questionImage.src = ''; 
  
    questionText.textContent = '';
    answersBox.innerHTML = '';

    if (preloadQueue.length === 0 && remainingQuestions.length === 0) {
        await endGame();
        return;
    }
    
    if (preloadQueue.length === 0) await preloadNextQuestions();

    currentQuestion = preloadQueue.shift();
    preloadNextQuestions(); 

    // B. SET TEXT
    questionText.textContent = currentQuestion.question;

   // 2. DETACHED LOADING: Load the image in a background object
    if (currentQuestion.question_image) {
        const tempImg = new Image();
        tempImg.onload = () => {
            // ONLY execute this when the image is 100% ready in the cache
            questionImage.src = currentQuestion.question_image;
            questionImage.style.display = 'block';
            questionImage.style.opacity = '1';
        };
        // Trigger the background load
        tempImg.src = currentQuestion.question_image;
    }

    // D. RENDER ANSWERS
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
  
    // --- clean up the game -------------
    questionText.textContent = ''; 
    answersBox.innerHTML = '';
    questionImage.style.display = 'none';
    questionImage.src = ''; 
    // -----------------------------------
  
    // UI Transitions
    document.body.classList.remove('game-active'); 
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');
    
    // Set final score number
    if (finalScore) finalScore.textContent = score;

    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');

    // Reset titles to be safe
    if (gameOverTitle) gameOverTitle.classList.add('hidden');
    if (gzTitle) gzTitle.classList.add('hidden');

    if (isDailyMode) {
        // 1. Daily Mode UI
        if (playAgainBtn) playAgainBtn.classList.add('hidden');
        
        // 2. Select Message (Cap score at 10)
        const scoreKey = Math.min(Math.max(score, 0), 10);
        const options = dailyMessages[scoreKey] || ["Game Over!"];
        const randomMsg = options[Math.floor(Math.random() * options.length)];
        
        // 3. Update GameOver Title with flavor text
        if (gameOverTitle) {
            gameOverTitle.textContent = randomMsg;
            gameOverTitle.classList.remove('hidden');
        }

        // 4. Save Score to Database
        if (username && username !== 'Guest') {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('daily_attempts')
                    .update({ score: score })
                    .eq('user_id', session.user.id)
                    .eq('attempt_date', todayStr);
            }
        }
        // 1. SAVE the score to localStorage so the share button can find it
        localStorage.setItem('lastDailyScore', score); 
        localStorage.setItem('lastDailyMessage', randomMsg); // save random message
      
        // 3. Save Score to Database
        if (username && username !== 'Guest') {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
            await supabase.from('daily_attempts')
                .update({ 
                score: score,
                message: randomMsg 
            })
                .eq('user_id', session.user.id)
                .eq('attempt_date', todayStr);
        }
    }
        // Refresh the button state to unlock it
        await updateShareButtonState();
        isDailyMode = false; // Reset for next non-daily game
    } else {
        // Standard Mode UI
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        
        // Show "Gz" if they finished all questions, otherwise "Game Over"
        if (score > 0 && remainingQuestions.length === 0 && preloadQueue.length === 0) {
            const gzMessages = ['Gz!', 'Go touch grass', 'See you in Lumbridge'];
            if (gzTitle) {
                gzTitle.textContent = gzMessages[Math.floor(Math.random() * gzMessages.length)];
                gzTitle.classList.remove('hidden');
            }
        } else {
          // Standard Mode: Explicitly ensure it stays disabled/hidden
        if (shareBtn) {
            shareBtn.classList.add('is-disabled');
            shareBtn.style.opacity = "0.5";
            shareBtn.style.pointerEvents = "none";
        }
            if (gameOverTitle) {
                gameOverTitle.textContent = "Game Over!";
                gameOverTitle.classList.remove('hidden');
            }
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
mainMenuBtn.onclick = () => {
    preloadQueue = []; // Clear the buffer only when going back to menu
    // Manual UI Reset instead:
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    document.body.classList.remove('game-active');
  // Run the sync to ensure shareBtn stays active on the start screen
    updateShareButtonState();
};

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


// ====== MOBILE TAP FEEDBACK (THE FLASH) ======
document.addEventListener('DOMContentLoaded', () => {
    // This function applies the flash to any button we give it
    const applyFlash = (el) => {
        el.addEventListener('touchstart', () => {
            el.classList.add('tapped');
        }, { passive: true });

        el.addEventListener('touchend', () => {
            setTimeout(() => {
                el.classList.remove('tapped');
            }, 100); // Fast 80ms flash
        });

        el.addEventListener('touchcancel', () => {
            el.classList.remove('tapped');
        });
    };

    // 1. Apply to all buttons currently on the screen
    const staticButtons = document.querySelectorAll('.btn, .btn-small, #authBtn, #muteBtn');
    staticButtons.forEach(applyFlash);


  //const shareBtn = document.getElementById('shareBtn');

// Initial check on page load
//updateShareButtonState();

if (shareBtn) {
    shareBtn.onclick = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to share your score!");
        updateShareButtonState(); // Force it to stay grey
        return;
    }
        if (shareBtn.classList.contains('is-disabled')) return;

        // 1. IMPROVED CAPTURE: Check screen first, then localStorage
        let currentScore = document.getElementById('finalScore')?.textContent;
       // If screen says 0, try to get the saved score from our fetchDailyStatus sync
        if (!currentScore || currentScore === "0") {
            currentScore = localStorage.getItem('lastDailyScore') || "0";
        }
      
        // We get the message currently visible on the screen
        const currentMessage = localStorage.getItem('lastDailyMessage') || "Daily Challenge";
        // If the screen is empty (e.g. user refreshed), fall back to storage
        if (!currentMessage || currentMessage === "" || currentMessage === "Game Over!") {
            currentMessage = localStorage.getItem('lastDailyMessage') || "Daily Challenge";
        }
         

        try {
            const target = document.querySelector('.container');
            const savedMsg = localStorage.getItem('lastDailyMessage') || "Daily Challenge";
          
            shareBtn.style.opacity = '0';
            const muteBtn = document.getElementById('muteBtn');
            if (muteBtn) muteBtn.style.opacity = '0';

            const canvas = await html2canvas(target, {
                backgroundColor: '#0a0a0a', 
                scale: 2, 
                useCORS: true,
                onclone: (clonedDoc) => {
                    // --- A. FORCE DIMENSIONS (Prevents Mobile Shrinking) ---
                    const clonedContainer = clonedDoc.querySelector('.container');
                    // 1. FORCE THE VIEWPORT (The "Magic" fix for mobile)
                    const clonedBody = clonedDoc.body;
                    clonedBody.style.width = '450px';
                    clonedBody.style.height = '600px';
                    //clonedBody.style.overflow = 'hidden';

                    if (clonedContainer) {
                        // Reset all container styles to be a fixed "card"
                        Object.assign(clonedContainer.style, {
                            width: '450px',
                            height: '600px', 
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '40px',
                            margin: '0',
                            border: 'none',   // Ensure no border is adding width
                            position: 'relative',
                            transform: 'none', // Remove mobile scaling
                            boxSizing: 'border-box'
                        });
                    }

                    const startScreen = clonedDoc.getElementById('start-screen');
                    const endScreen = clonedDoc.getElementById('end-screen');
                    const playAgain = clonedDoc.getElementById('playAgainBtn');
                    const mainMenu = clonedDoc.getElementById('mainMenuBtn');
                    const title = clonedDoc.getElementById('main-title');
                    if (endScreen) {
                        endScreen.classList.remove('hidden');
                        Object.assign(endScreen.style, {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100%',
                            gap: '20px' // Even spacing between score and message
                        });
                      // --- B. VISIBILITY & LAYOUT ---
                       if (startScreen) startScreen.style.display = 'none'; // Use display none
                        if (playAgain) playAgain.style.display = 'none';
                        if (mainMenu) mainMenu.style.display = 'none';
                      
                        // Forced Text Sizes for high-res output
                        const finalScoreElem = clonedDoc.getElementById('finalScore');
                        const msgTitleElem = clonedDoc.getElementById('game-over-title');
                        // 1. Get the message: First from the actual screen, then fallback to storage
                        let messageToDisplay = document.getElementById('game-over-title')?.textContent;
                        if (!messageToDisplay || messageToDisplay === "Game Over!") {
                            messageToDisplay = localStorage.getItem('lastDailyMessage') || "Daily Challenge Completed!";
                        }
                                              
                        if (finalScoreElem) {
                            finalScoreElem.textContent = currentScore;
                            //finalScoreElem.style.fontSize = '80px'; 
                        }

                        if (msgTitleElem) {
                          // 2. Force the content and remove any hiding classes
                            msgTitleElem.textContent = currentMessage;
                            msgTitleElem.classList.remove('hidden');
                            msgTitleElem.style.fontSize = '24px';
                            msgTitleElem.style.textAlign = 'center';
                            // 3. Force absolute visibility for the canvas renderer
                              Object.assign(msgTitleElem.style, {
                                  display: 'block', 
                                  visibility: 'visible',
                                  opacity: '1',
                                  fontSize: '24px',
                                  textAlign: 'center',
                                  color: '#ffffff',
                                  marginTop: '10px',
                                  marginBottom: '10px',
                                  width: '100%'
                              });
                        }
                        // Date
                        const dateTag = clonedDoc.createElement('div');
                        dateTag.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                        Object.assign(dateTag.style, {
                            marginTop: '30px', fontSize: '18px', color: '#a77b0a',
                            fontFamily: "'Cinzel', serif", textAlign: 'center',
                            opacity: '0.8', letterSpacing: '2px', textTransform: 'uppercase'
                        });
                        endScreen.appendChild(dateTag);
                    }
                  // --- D. TITLE FIX (Locked Pixel Size) ---
                    if (title) {
                        Object.assign(title.style, {
                            background: 'none',
                            backgroundImage: 'none',
                            webkitBackgroundClip: 'initial',
                            color: '#000000',
                            webkitTextFillColor: '#000000',
                            fontFamily: "'Cinzel', serif",
                            fontWeight: "700",
                            fontSize: "48px",
                            textAlign: "center",
                            textShadow: `
                                0 0 4px rgba(0,0,0,0.8),
                                1px 1px 0 #000,
                                2px 2px 2px rgba(0,0,0,0.6),
                                0 0 12px rgba(212, 175, 55, 0.95),
                                0 0 30px rgba(212, 175, 55, 0.75),
                                0 0 55px rgba(212, 175, 55, 0.45)`
                        });
                    }
                }
            });

            shareBtn.style.opacity = '1';
            if (muteBtn) muteBtn.style.opacity = '1';

           canvas.toBlob(async (blob) => {
                if (!blob) return;
                
                // 1. Detect if the user is on a mobile device
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const file = new File([blob], "OSRS_Daily_Score.png", { type: "image/png" });

                // 2. Mobile Logic: Use the native Share Menu
                if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({ 
                            files: [file], 
                            title: 'OSRS Trivia', 
                            text: `I scored ${currentScore}/10 on today's OSRS Trivia! ⚔️`
                        });
                    } catch (err) {
                        console.log("Share cancelled");
                    }
                } 
                // 3. PC Logic: Copy to clipboard directly, NO share menu
               else {
                    try {
                        const data = [new ClipboardItem({ [blob.type]: blob })];
                        await navigator.clipboard.write(data);
                        //alert("Daily Score Card copied to clipboard! ⚔️");
                    } catch (clipErr) {
                        console.error("Clipboard failed:", clipErr);
                        //alert("Sharing not supported. Please long-press the image to save.");
                    }
                }
            }, 'image/png');
        } catch (err) {
            console.error("Canvas error:", err);
            shareBtn.style.opacity = '1';
            const muteBtn = document.getElementById('muteBtn');
            if (muteBtn) muteBtn.style.opacity = '1';
        }
    };
}  
});












