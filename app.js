import { supabase } from './supabase.js';
window.supabase = supabase; 
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ====== UI & STATE ======
const cachedMuted = localStorage.getItem('muted') === 'true';
let dailySubscription = null; // Track this globally to prevent duplicates
let streak = 0;              // Tracking for normal game bonus
let dailyQuestionCount = 0;   // Tracking for daily bonus
let currentProfileXp = 0;    // Store the player's current XP locally
let syncChannel;
let username = 'Guest';
let gameEnding = false;
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
    "You've been defeated. Try again tomorrow!",
    "Sit.",
    "You've been slapped by the Sandwich Lady.",
    "Back to Tutorial Island for you.",
    "It can only go higher from here.",
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
    "Lumbridge is calling your name.",
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

let correctBuffer, wrongBuffer, tickBuffer, levelUpBuffer, bonusBuffer;
let activeTickSource = null; // To track the running sound
let muted = cachedMuted;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const todayStr = new Date().toISOString().split('T')[0];
let score = 0;
let masterQuestionPool = []; // This holds ALL 510 IDs from Supabase
let remainingQuestions = []; // This holds what's left for the CURRENT SESSION
let currentQuestion = null;
let currentQuestionIndex = 0;
let preloadQueue = []; 
let timer;
let timeLeft = 15;
let isDailyMode = false;

// ====== INITIAL UI SYNC ======
// Replace your existing refreshAuthUI with this:

async function syncDailyButton() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!dailyBtn) return;
  
    // Explicitly lock if no one is logged in
    if (!session) {
        lockDailyButton();
      // Add visual guest feedback
        dailyBtn.style.opacity = '0.5';
        dailyBtn.style.pointerEvents = 'none';
        return;
    }

    const played = await hasUserCompletedDaily(session);

    if (!played) {
        dailyBtn.classList.add('is-active');
        dailyBtn.classList.remove('disabled');
        dailyBtn.style.pointerEvents = 'auto'; // UNLOCK physically
        dailyBtn.style.opacity = '1';          // Ensure it looks clickable
    } else {
      lockDailyButton();
    }
}

let isRefreshing = false;

// ====== INITIALIZATION ======
async function init() {
 
    // 1. Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (session) {
        // User is logged in on this device!
        handleAuthChange('INITIAL_LOAD', session);
    } else {
        // No session on this device, user is a guest
        handleAuthChange('SIGNED_OUT', null);
    }

    // 2. Listen for changes (like logging out)
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            handleAuthChange('SIGNED_OUT', null);
        } else if (session) {
            handleAuthChange(event, session);
        }
    });
    
    // 2. Auth Button (Log In / Log Out)
    authBtn.onclick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Try to tell the server we are leaving
        const { error } = await supabase.auth.signOut();
        
        // REGARDLESS of error (like 403), we wipe the local device
        // This ensures the user can "Log In" again to get a fresh token
        localStorage.clear(); 
        window.location.reload(); 
    } else {
        window.location.href = '/login.html';
    }
};

    // 3. Game Buttons
    if (startBtn) {
        startBtn.onclick = async () => {
            isDailyMode = false;
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            await loadSounds();
            startGame();
        };
    }

    if (dailyBtn) {
        dailyBtn.onclick = async () => {
    // 1. Get session AND check for potential errors
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // 2. If there's an error or no session, the 'key' is broken
    if (error || !session) {
        console.error("Auth error:", error);
        alert("Your session has expired. Please log in again to save your score.");
        
        // Cleanup the bugged local state
        localStorage.removeItem('supabase.auth.token'); 
        window.location.href = '/login.html';
        return;
    }

    // 4. Proceed with game logic
    const played = await hasUserCompletedDaily(session);
    //if (played) return alert("You've already played today!");
          
    // 1. Send the signal to other tabs
    if (syncChannel) {
        syncChannel.send({
            type: 'broadcast',
            event: 'lock-daily',
            payload: { userId: session.user.id }
        });
    }
    // 2. Lock the button locally
    lockDailyButton();     
          
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    await loadSounds();
    isDailyMode = true;
    startDailyChallenge(); 
};
    }
        if (playAgainBtn) {
        playAgainBtn.onclick = async () => {
        isDailyMode = false;
        await startGame();
    };
}
  if (mainMenuBtn) {  
        mainMenuBtn.onclick = async () => {
        preloadQueue = []; // Clear the buffer only when going back to menu
        // Manual UI Reset instead:
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        document.body.classList.remove('game-active');
    };
  }
  if (muteBtn) {
    muteBtn.onclick = () => {
        muted = !muted;
        localStorage.setItem('muted', muted);
        muteBtn.querySelector('#muteIcon').textContent = muted ? '🔇' : '🔊';
        muteBtn.classList.toggle('is-muted', muted);
     
        // If we just muted, stop the ticking sound immediately
        if (muted) {
            stopTickSound();
        } 
        // If user unmutes, check if we ARE in the final 3 seconds
        // AND make sure it's not already playing
        if (timeLeft <= 5 && timeLeft > 0 && !activeTickSource) {
            activeTickSource = playSound(tickBuffer, true);
        }
    };
}
  
  // This will check if a user is logged in and lock the button if they aren't
  await syncDailyButton();
  // This will check if a user has played daily mode already and will unlock it if they did
  await updateShareButtonState();
}

// Replace your existing handleAuthChange with this:
async function handleAuthChange(event, session) {
    const span = document.querySelector('#usernameSpan');
    const label = authBtn?.querySelector('.btn-label');

    // 1. Logged Out State
    if (!session) {
        username = 'Guest';
        currentProfileXp = 0; // Reset this for guests!
        if (span) span.textContent = ' Guest';
        if (label) label.textContent = 'Log In';

        // Clear all session-specific UI and storage
        localStorage.removeItem('lastDailyScore');
        localStorage.removeItem('dailyPlayedDate');
        
        [dailyBtn, shareBtn].forEach(btn => {
            if (btn) {
                btn.classList.add('is-disabled');
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            }
        });
      
        updateLevelUI()
        return; // Stop here for guests
    }

    // 2. Logged In State
    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, xp')
        .eq('id', session.user.id)
        .single();

    username = profile?.username || 'Player';
    currentProfileXp = profile?.xp || 0; // Set the global variable
    if (span) span.textContent = ' ' + username;
    if (label) label.textContent = 'Log Out';
    
    // Sync their daily status
    await fetchDailyStatus(session.user.id);
    // Establish the live sync
    syncChannel = setupRealtimeSync(session.user.id);
    updateLevelUI();
}

async function hasUserCompletedDaily(session) {
    if (!session) return false;

    const { data } = await supabase
        .from('daily_attempts')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('attempt_date', todayStr)
        .maybeSingle();

    return !!data;
}


async function updateShareButtonState() {
    if (!shareBtn) return;

    const { data: { session } } = await supabase.auth.getSession();
  
    // Guest = Always disabled
    if (!session) {
        shareBtn.classList.add('is-disabled');
        shareBtn.classList.remove('is-active');
        shareBtn.style.opacity = "0.5";
        shareBtn.style.pointerEvents = "none";
        return;
    }

  
    // Check localStorage (just finished playing) OR DB (played earlier)
    const localScore = localStorage.getItem('lastDailyScore');
    const savedDate = localStorage.getItem('dailyPlayedDate');
    const hasPlayedToday = await hasUserCompletedDaily(session);
    const isScoreFromToday = (localScore !== null && savedDate === todayStr);
  
    if (isScoreFromToday || hasPlayedToday) {
        shareBtn.classList.remove('is-disabled');
        shareBtn.classList.add('is-active'); 
        shareBtn.style.opacity = "1";
        shareBtn.style.pointerEvents = "auto";
    } else {
        shareBtn.classList.add('is-disabled');
        shareBtn.classList.remove('is-active');
        shareBtn.style.opacity = "0.5";
        shareBtn.style.pointerEvents = "none";
    }
}


// ====== NEW: FETCH SCORE FROM DATABASE ======
// Ensure fetchDailyStatus calls the button update at the end
async function fetchDailyStatus(userId) {
    const { data, error } = await supabase
        .from('daily_attempts')
        .select('score, message')
        .eq('user_id', userId)
        .eq('attempt_date', todayStr)
        .maybeSingle();

    if (data) {
       // ALWAYS save to storage (for the share button)
        localStorage.setItem('lastDailyMessage', data.message || "Daily Challenge");
        localStorage.setItem('lastDailyScore', data.score ?? "0");
        localStorage.setItem('dailyPlayedDate', todayStr);
        
        // ONLY update UI if we are NOT in a game AND NOT looking at an end-screen
        const isEndScreenHidden = endScreen.classList.contains('hidden');
        const isStartScreenVisible = !document.getElementById('start-screen').classList.contains('hidden');
        
        if (isStartScreenVisible && isEndScreenHidden) {
            if (finalScore) finalScore.textContent = data.score ?? "0";
            const gameOverTitle = document.getElementById('game-over-title');
            if (gameOverTitle) {
                gameOverTitle.textContent = data.message || "Daily Challenge";
                //gameOverTitle.classList.remove('hidden');
            }
        }
    }
    // Always sync button states after checking DB
    await syncDailyButton();
    await updateShareButtonState();
}


function lockDailyButton() {
    if (!dailyBtn) return;
    dailyBtn.classList.add('disabled');
    dailyBtn.classList.remove('is-active');
    dailyBtn.style.opacity = '0.5';
    dailyBtn.style.pointerEvents = 'none'; // Makes it ignore all clicks/touches
    //dailyBtn.onclick = () => alert("You've already played today!");
}


// ====== GAME ENGINE ======

function resetGame() {
    // 1. Stop any active logic
    clearInterval(timer);
    stopTickSound(); 
    // Wipe any existing firework particles that didn't get removed
    document.querySelectorAll('.firework-particle').forEach(p => p.remove());
  
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

    while (
        preloadQueue.length < 3 &&
        remainingQuestions.length > 0 &&
        attempts < 10
    ) {
        attempts++;

        const index = Math.floor(Math.random() * remainingQuestions.length);
        const qId = remainingQuestions[index];

        remainingQuestions.splice(index, 1);

        if (
            (currentQuestion && qId === currentQuestion.id) ||
            preloadQueue.some(q => q.id === qId)
        ) {
            continue;
        }

        const { data, error } = await supabase.rpc(
            'get_question_by_id',
            { input_id: qId }
        );

        if (error || !data || !data[0]) {
            console.warn("Failed to preload question:", qId, error);
            continue;
        }

        const question = data[0];

        // --- ENHANCED IMAGE WARMING ---
        if (question.question_image) {
            try {
                const img = new Image();
                img.src = question.question_image;
                
                // We AWAIT the decode here in the background.
                // This forces the CPU to decompress the image now, 
                // so it's ready to paint the millisecond we set the src later.
                await img.decode(); 
                
                // Optional: Store the pre-decoded object to keep it in memory
                //question._cachedImg = img; 
            } catch (e) {
                console.warn("Image warming failed for:", question.id, e);
                // If the image fails to load, we still allow the question 
                // but it might have a tiny flicker later.
            }
        }

        // Only push to the queue AFTER the image is decoded
        preloadQueue.push(question);
    }
}


async function startGame() {
    try {
        document.body.classList.add('game-active');
        gameEnding = false;
        game.classList.remove('hidden');
        document.getElementById('start-screen').classList.add('hidden');
        endScreen.classList.add('hidden');

        // --- THE POOL FIX ---
        
        // Step A: If we've NEVER fetched questions (first load), get all 510 IDs
        if (masterQuestionPool.length === 0) {
            const { data: idList, error } = await supabase.from('questions').select('id');
            if (error) throw error;
            masterQuestionPool = idList.map(q => q.id);
        }

        // Step B: Every time a NEW GAME starts, we refill remainingQuestions from the pool
        // This ensures Game 2 starts with a full deck of 510 again.
        remainingQuestions = [...masterQuestionPool].sort(() => Math.random() - 0.5);

        // Step C: If we have leftovers in the preloadQueue from a previous game,
        // remove those specific IDs from our new remainingQuestions list 
        // so they don't appear twice in the same game.
        const bufferedIds = preloadQueue.map(q => q.id);
        remainingQuestions = remainingQuestions.filter(id => !bufferedIds.includes(id));

        // Standard Reset
        clearInterval(timer);
        score = 0;
        streak = 0;              // Reset streak
        dailyQuestionCount = 0;  // Reset daily count
        currentQuestion = null;
        updateScore();
        
        // UI Clean
        questionText.textContent = '';
        answersBox.innerHTML = '';
        questionImage.style.display = 'none';
        questionImage.src = '';

        // Start preloading (if buffer is < 3)
        await preloadNextQuestions();
        loadQuestion();

    } catch (err) {
        console.error("startGame error:", err);
    }
}

async function loadQuestion() {
    // A. IMMEDIATE CLEANUP
    questionImage.style.display = 'none';
    questionImage.style.opacity = '0';
    questionImage.src = '';
    questionText.textContent = '';
    answersBox.innerHTML = '';

    // B, C, D. LOGIC & BUFFER CHECKS (Same as yours)
    if (preloadQueue.length === 0 && remainingQuestions.length === 0 && currentQuestion !== null) {
        await endGame();
        return;
    }
    if (preloadQueue.length === 0) await preloadNextQuestions();
    if (preloadQueue.length === 0) {
        await endGame();
        return;
    }

    // E. PULL QUESTION & F. BACKGROUND PRELOAD
    currentQuestion = preloadQueue.shift();
    preloadNextQuestions();

    // --- MINIMAL CHANGE START: Define the display logic ---
   
    // G. SET QUESTION TEXT
    questionText.textContent = currentQuestion.question;

    // I. RENDER ANSWERS
    const answers = [
            { text: currentQuestion.answer_a, id: 1 },
            { text: currentQuestion.answer_b, id: 2 },
            { text: currentQuestion.answer_c, id: 3 },
            { text: currentQuestion.answer_d, id: 4 }
      ].filter(a => a.text).sort(() => Math.random() - 0.5);

    answers.forEach(ans => {
            const btn = document.createElement('button');
            btn.textContent = ans.text;
            btn.classList.add('answer-btn');
            btn.dataset.answerId = ans.id;
            btn.onclick = () => checkAnswer(ans.id, btn);
            answersBox.appendChild(btn);
        });
 // H. IMAGE (Now controls WHEN the UI shows)
   if (currentQuestion.question_image) {
      questionImage.src = currentQuestion.question_image;
      questionImage.style.display = 'block';
      questionImage.style.opacity = '1';
    } else {
        questionImage.style.display = 'none';
        questionImage.src = '';
    }
  
    // START THE TIMER 
    startTimer();
    };
   

   


function startTimer() {
    clearInterval(timer);
    if (activeTickSource) { activeTickSource.stop(); activeTickSource = null; } // Cleanup
  
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeWrap.classList.remove('red-timer');
  
    timer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = timeLeft;
        // When the UI shows 3, start the loop
        if (timeLeft === 5 && !activeTickSource) {
            activeTickSource = playSound(tickBuffer, true); 
        }
        if (timeLeft <= 5) timeWrap.classList.add('red-timer');
        if (timeLeft <= 0) {
            clearInterval(timer);
            stopTickSound(); // Stop sound when time hits zero
            handleTimeout();
        }
    }, 1000);
}

function stopTickSound() {
    if (activeTickSource) {
        try {
            activeTickSource.stop();
        } catch (e) {
            // Handle cases where it already stopped
        }
        activeTickSource = null;
    }
}

async function handleTimeout() {
    stopTickSound(); // <--- ADD THIS FIRST
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
    stopTickSound(); // CUT THE SOUND IMMEDIATELY
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
        // 1. Get the session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) { 
            let gained = isDailyMode ? 50 : 5;
            let isBonusEarned = false; // Track for sound
            if (isDailyMode) {
                    dailyQuestionCount++; // Only track daily count in daily mode
                    if (dailyQuestionCount === 10) {
                      gained += 100;
                      isBonusEarned = true; // Daily bonus!
                    }
                } else {
                    streak++; // Only track streak in normal mode
                    if (streak === 10) {
                        gained += 30;
                        streak = 0; 
                        isBonusEarned = true; // Normal bonus!
                    }
            }

            // --- PLAY BONUS SOUND ---
            if (isBonusEarned) {
                playSound(bonusBuffer);
            }
            const oldLevel = getLevel(currentProfileXp);
            currentProfileXp += gained; // Add the XP to local state
            const newLevel = getLevel(currentProfileXp);

            if (newLevel > oldLevel) {
                triggerFireworks(); 
                // Play level up sound after the correct sound
                setTimeout(() => playSound(levelUpBuffer), 100);
            }

            updateLevelUI(); // Refresh the Player/Level row
            triggerXpDrop(gained);
            
            // Update Supabase
            await supabase.from('profiles')
            .update({ xp: currentProfileXp })
            .eq('id', session.user.id);
        }
        // Update Local State & UI
        score++;
        updateScore();
        setTimeout(loadQuestion, 1000);
    } else {
        playSound(wrongBuffer);
        streak = 0; // Reset streak on wrong answer in normal mode
        btn.classList.add('wrong');
        await highlightCorrectAnswer();
        if (isDailyMode) {
            setTimeout(loadQuestion, 1500);
        } else {
            setTimeout(endGame, 1000);
        }
    }
}

function updateLevelUI() {
    const lvlNum = document.getElementById('levelNumber');
    const xpBracket = document.getElementById('xpBracket');
    
    if (lvlNum && xpBracket) {
        const currentLvl = getLevel(currentProfileXp);
        lvlNum.textContent = currentLvl;
        xpBracket.textContent = `(${currentProfileXp.toLocaleString()} XP)`;
    }
}

function getLevel(xp) {
    if (!xp || xp <= 0) return 1;
    if (xp >= 100000) return 99;

    // This formula is tuned so that Level 92 hits at exactly 50,000 XP
    // and Level 99 hits at 100,000 XP.
    // We use a power function: Level = constant * XP^(1/power)
    
    // Reverse check for the table:
    for (let L = 1; L <= 99; L++) {
        let threshold = Math.floor(Math.pow((L - 1) / 98, 3.1) * 100000);
        if (xp < threshold) return L - 1;
    }
    return 99;
}


function checkLevelUp(gainedXp) {
    const oldLevel = getLevel(currentProfileXp);
    currentProfileXp += gainedXp;
    const newLevel = getLevel(currentProfileXp);

    if (newLevel > oldLevel) {
        triggerFireworks(); // Visual celebration
    }
    
    updateLevelUI(); // Update the labels and XP brackets
}

function triggerFireworks() {
    const container = document.getElementById('game');
    const colors = ['#ffde00', '#ffffff', '#00ff00', '#d4af37'];
    
    // Spawn 30 particles on the left and 30 on the right
    for (let i = 0; i < 30; i++) {
        createParticle(container, 10, colors);  // 10% from left
        createParticle(container, 90, colors);  // 90% from left (right side)
    }
}

function createParticle(parent, xPosPercent, colors) {
    const p = document.createElement('div');
    p.className = 'firework-particle';
    
    // Get viewport coordinates
    const rect = parent.getBoundingClientRect();
    
    // REMOVED window.scrollX/Y because CSS is 'position: fixed'
    const startX = rect.left + (xPosPercent / 100) * rect.width;
    const startY = rect.top + (rect.height / 2);

    const destX = (Math.random() - 0.5) * 200; 
    const destY = (Math.random() - 0.5) * 200;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    p.style.setProperty('--p-color', color);
    p.style.setProperty('--startX', `${startX}px`);
    p.style.setProperty('--startY', `${startY}px`);
    p.style.setProperty('--x', `${destX}px`);
    p.style.setProperty('--y', `${destY}px`);

    document.body.appendChild(p);
    
    p.onanimationend = () => p.remove();
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
    if (gameEnding) return;
    gameEnding = true;
    clearInterval(timer);

    // 1. PREPARE DATA FIRST (Quietly in background)
    const { data: { session } } = await supabase.auth.getSession();
    const scoreKey = Math.min(Math.max(score, 0), 10);
    const options = dailyMessages[scoreKey] || ["Game Over!"];
    const randomMsg = options[Math.floor(Math.random() * options.length)];
    
    // 2. WIPE GAME UI IMMEDIATELY 
    // This prevents seeing old questions/answers behind the transition
    questionText.textContent = ''; 
    answersBox.innerHTML = '';
    questionImage.style.display = 'none';
    questionImage.src = ''; 

    // 3. POPULATE END SCREEN BEFORE SHOWING IT
    if (finalScore) finalScore.textContent = score;
    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');

    // Reset visibility of titles
    if (gameOverTitle) gameOverTitle.classList.add('hidden');
    if (gzTitle) gzTitle.classList.add('hidden');

    if (isDailyMode) {
        if (playAgainBtn) playAgainBtn.classList.add('hidden');
        if (gameOverTitle) {
            gameOverTitle.textContent = randomMsg;
            gameOverTitle.classList.remove('hidden');
        }
        
        // Save logic (Non-blocking)
        saveDailyScore(session, randomMsg); 
    } else {
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        // Trigger the high-score save
        if (session && score > 0) {
            // We pass the current username, and the score achieved
            saveNormalScore(username, score);
        }
      // 2. Check for Gz! (Completion) first
        if (score > 0 && remainingQuestions.length === 0 && preloadQueue.length === 0) {
            if (gzTitle) {
              const gzMessages = ['Gz!', 'Go touch grass', 'See you in Lumbridge'];
              const randomMessage = gzMessages[Math.floor(Math.random() * gzMessages.length)];
               gzTitle.textContent = randomMessage;
               gzTitle.classList.remove('hidden');
            }
            // Hide the game over title entirely for a Gz
            if (gameOverTitle) {
              gameOverTitle.classList.add('hidden');
              gameOverTitle.textContent = "";
            }
            // 3. Otherwise, show standard Game Over
        } else if (gameOverTitle) {
            //if (gzTitle) gzTitle.classList.add('hidden'); // Hide Gz if it was there from before
            gameOverTitle.textContent = "Game Over!";
            gameOverTitle.classList.remove('hidden');
        }
      }
    // 4. THE BIG SWAP (Final step)
    // Use a tiny timeout or requestAnimationFrame to ensure DOM updates are ready
    requestAnimationFrame(() => {
        document.body.classList.remove('game-active'); 
        game.classList.add('hidden');
        endScreen.classList.remove('hidden');
        updateShareButtonState();
        gameEnding = false;
    });
}

// new for xp drops 
function triggerXpDrop(amount) {
    const gameContainer = document.getElementById('game'); 
    if (!gameContainer) return;

    const xpDrop = document.createElement('div');
    xpDrop.className = 'xp-drop';
    // We add a specific style here to ensure Flexbox ignores it
    xpDrop.style.position = 'absolute'; 
    xpDrop.innerHTML = `<span>+</span><span class="xp-number">${amount}</span>`;
    
    gameContainer.appendChild(xpDrop);

    // This ensures that as soon as the 1.2s animation is done, it is GONE from the DOM
    xpDrop.onanimationend = () => {
        xpDrop.remove();
    };

    // Fallback cleanup
    setTimeout(() => {
        if (xpDrop.parentNode) xpDrop.remove();
    }, 1500);
}

function setupRealtimeSync(userId) {
    // Unique channel per user means only YOUR devices talk to each other
    const channel = supabase.channel(`user-sync-${userId}`, {
        config: {
            broadcast: { self: false } // Don't trigger the lock on the device that sent it
        }
    });

    channel
        .on('broadcast', { event: 'lock-daily' }, (payload) => {
            console.log("Broadcast received! Locking daily button.");
            lockDailyButton();
            // Also sync the score/message data so the "Share" button appears
            fetchDailyStatus(userId);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("Realtime connection established.");
            }
        });

    return channel;
}

async function saveNormalScore(currentUsername, finalScore) {
    // 1. Get the session to get the UUID (The "Key" to bypass 403)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;

    // 2. Check for existing score using user_id (the most stable way)
    const { data: record } = await supabase
        .from('scores')
        .select('score')
        .eq('user_id', userId)
        .maybeSingle();

    // 3. Save only if it's a new High Score
    if (!record || finalScore > record.score) {
        const { error } = await supabase
            .from('scores')
            .upsert({ 
                user_id: userId,        // Required for RLS / 403 fix
                username: currentUsername, 
                score: finalScore 
            }, { onConflict: 'user_id' }); // Prevents duplicate rows for one user

        if (error) {
            console.error("Leaderboard Save Error:", error.message);
        } else {
            console.log("Personal best updated on leaderboard!");
        }
    }
}


// Helper to keep endGame clean
async function saveDailyScore(session, msg) {
    localStorage.setItem('lastDailyScore', score); 
    localStorage.setItem('dailyPlayedDate', todayStr); 
    localStorage.setItem('lastDailyMessage', msg);

    if (session) {
        await supabase.from('daily_attempts').update({
            score: score,
            message: msg
        }).eq('user_id', session.user.id).eq('attempt_date', todayStr);
    }
    updateShareButtonState();
}
gameEnding = false;

if (shareBtn) {
    shareBtn.onclick = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to share your score!");
        updateShareButtonState(); // Force it to stay grey
        return;
    }
      // 1. CAPTURE CURRENT STATE (To restore later)
      const originalScore = finalScore.textContent;
      const originalMsg = document.getElementById('game-over-title').textContent;

      // 2. INJECT DAILY DATA (Just for the photo)
      const dailyScore = localStorage.getItem('lastDailyScore') || "0";
      const dailyMsg = localStorage.getItem('lastDailyMessage') || "Daily Challenge";
      
        if (shareBtn.classList.contains('is-disabled')) return;
        // FORCE the daily values regardless of what is on screen
        const currentScore = localStorage.getItem('lastDailyScore') || "0";
        const currentMessage = localStorage.getItem('lastDailyMessage') || "Daily Challenge";
       // get the saved score from our fetchDailyStatus sync
        //let currentScore = localStorage.getItem('lastDailyScore') || "0";
      // If the screen is empty (e.g. user refreshed), fall back to storage

        try {
            const target = document.querySelector('.container');
            const muteBtn = document.getElementById('muteBtn');
            shareBtn.style.opacity = '0';
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
                  // --- NEW: SCREEN VISIBILITY FIX ---
                  const gameScreen = clonedDoc.getElementById('game');
                  //const startScreenRef = clonedDoc.getElementById('start-screen');
                  
                  // 1. Force the Game and Start screens to HIDE in the picture
                  if (gameScreen) gameScreen.style.display = 'none';
                  //if (startScreenRef) startScreenRef.style.display = 'none';
                  
                  // 2. Force the End Screen to SHOW in the picture
                  // ----------------------------------
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
        } finally {
        // 3. RESTORE ORIGINAL STATE 
        // So the user doesn't see their score change on the actual screen
        finalScore.textContent = originalScore;
        document.getElementById('game-over-title').textContent = originalMsg;
        
        shareBtn.style.opacity = '1';
        if (muteBtn) muteBtn.style.opacity = '1';
    }
      
    };
}  

// ====== HELPERS & AUDIO ======
async function loadSounds() {
    if (!correctBuffer) correctBuffer = await loadAudio('./sounds/correct.mp3');
    if (!wrongBuffer) wrongBuffer = await loadAudio('./sounds/wrong.mp3');
    if (!tickBuffer) tickBuffer = await loadAudio('./sounds/tick.mp3');
    if (!levelUpBuffer) levelUpBuffer = await loadAudio('./sounds/level.mp3');
    if (!bonusBuffer)   bonusBuffer = await loadAudio('./sounds/bonus.mp3');
}

async function loadAudio(url) {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    return audioCtx.decodeAudioData(buf);
}

function playSound(buffer, loop = false) {
    if (!buffer || muted) return;
    
    // 🔥 On mobile, we must resume inside the play call too 
    // just in case the context auto-suspended
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop; // Enable looping for the 3-second alarm
  
    const gain = audioCtx.createGain();
    gain.gain.value = 0.6;
  
    source.connect(gain).connect(audioCtx.destination);
    source.start(0); // Add the 0 for older mobile browser compatibility
    return source; // Return this so we can call .stop()
}
function updateScore() { scoreDisplay.textContent = `Score: ${score}`; }


async function startDailyChallenge() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Log in to play Daily Mode!");

    // 1. Burn the attempt
    const { error: burnError } = await supabase
        .from('daily_attempts')
        .insert({ user_id: session.user.id, attempt_date: todayStr });

    if (burnError) return alert("You've already played today!");
    
    lockDailyButton(); 

    // 2. Load Questions
    const { data: allQuestions } = await supabase.from('questions').select('id').order('id', { ascending: true });
    if (!allQuestions || allQuestions.length < 10) return alert("Error loading questions.");

    // 3. Deterministic Selection
    const startDate = new Date('2025-12-22'); 
    const diffTime = Math.abs(new Date() - startDate);
    const dayCounter = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const questionsPerDay = 10;
    const daysPerCycle = Math.floor(allQuestions.length / questionsPerDay); 
    const cycleNumber = Math.floor(dayCounter / daysPerCycle); 
    const dayInCycle = dayCounter % daysPerCycle;

    const shuffledList = shuffleWithSeed(allQuestions, cycleNumber);
    const dailyIds = shuffledList.slice(dayInCycle * questionsPerDay, (dayInCycle * questionsPerDay) + questionsPerDay).map(q => q.id);

    // 4. UI Transition
    isDailyMode = true;
    preloadQueue = []; // Clear the "Standard" questions out
    resetGame();
    remainingQuestions = dailyIds; // Assign the specific 10 IDs
    
    document.body.classList.add('game-active'); 
    document.getElementById('start-screen').classList.add('hidden');
    game.classList.remove('hidden');
    
    // 5. Start the engine
    await preloadNextQuestions();
    loadQuestion();
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
    const channel = supabase
        .channel('daily-updates')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'daily_attempts',
            filter: `user_id=eq.${userId}`
        }, () => {
            console.log('Daily challenge sync: locking button.');
            lockDailyButton();
        })
        .subscribe();

    return channel;
}



// ====== MOBILE TAP FEEDBACK (THE FLASH) ======
document.addEventListener('DOMContentLoaded', () => {
  (async () => {
    //syncUsername();
    await init();
    
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
})(); // closes the async function AND invokes it
});   // closes DOMContentLoaded listener























































































































































