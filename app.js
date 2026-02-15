
import { supabase } from './supabase.js';
window.supabase = supabase; 
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ====== UI & STATE ======
const cachedMuted = localStorage.getItem('muted') === 'true';
let dailySubscription = null; // Track this globally to prevent duplicates
let streak = 0;              // Tracking for normal game bonus
let dailyQuestionCount = 0;   // Tracking for daily bonus
let currentDailyStreak = 0; 
let currentProfileXp = parseInt(localStorage.getItem('cached_xp')) || 0;    // Store the player's current XP locally
let username = 'Guest';
let gameEnding = false;
let isShowingNotification = false;
let notificationQueue = [];
let weeklySessionPool = [];
let firstQuestionSent = false; // Reset this when a match starts
let userId = null; 
let syncChannel;

const RELEASE_DATE = '2025-12-22';
const DAILY_LIMIT = 10;
const WEEKLY_LIMIT = 50; // Change to 50 when ready to go live
const LITE_LIMIT = 100; // Change to 100 when ready to go live
const number_of_questions = 640;

const shareBtn = document.getElementById('shareBtn');
const logBtn = document.getElementById('logBtn');
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
const weeklyBtn = document.getElementById('weeklyBtn');
const liteBtn = document.getElementById('liteBtn');

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

let correctBuffer, wrongBuffer, tickBuffer, levelUpBuffer, bonusBuffer, petBuffer, achieveBuffer;
let activeTickSource = null; // To track the running sound
let muted = cachedMuted;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const todayStr = new Date().toISOString().split('T')[0];
let score = 0;
let remainingQuestions = []; // This holds what's left for the CURRENT SESSION
let currentQuestion = null;
let currentQuestionIndex = 0;
let preloadQueue = []; 
let timer;
let timeLeft = 15;
let isDailyMode = false;
let isWeeklyMode = false;
let weeklyQuestionCount = 0;
let isLiteMode = false;
let liteQuestions = []; // To store the shuffled subset
let gameStartTime = 0;

// ====== INITIAL UI SYNC ======
// Replace your existing refreshAuthUI with this:
async function syncDailySystem() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        lockWeeklyButton();
        lockDailyButton();
        if (shareBtn) {
            shareBtn.classList.add('is-disabled');
            shareBtn.style.pointerEvents = 'none';
            shareBtn.style.opacity = '0.5';
        }
        return;
    }

    const { data: summary, error } = await supabase.rpc('get_daily_summary');

    if (error) {
        console.error("Error fetching daily summary:", error);
        return;
    }

    // 1. UI SYNC: Daily Play Button
    if (summary.has_played) {
        lockDailyButton();
    } else {
        dailyBtn.classList.add('is-active');
        dailyBtn.classList.remove('is-disabled');
        dailyBtn.style.pointerEvents = 'auto';
        dailyBtn.style.opacity = '1';
    }

    // 2. UI SYNC: Share Button
    if (summary.can_share) {
        shareBtn.classList.remove('is-disabled');
        shareBtn.classList.add('is-active');
        shareBtn.style.pointerEvents = "auto";
        shareBtn.style.opacity = "1";
        
        // Save only score and date for the share logic
        localStorage.setItem('lastDailyScore', summary.score);
        localStorage.setItem('dailyPlayedDate', todayStr);
    } else {
        shareBtn.classList.add('is-disabled');
        shareBtn.style.pointerEvents = "none";
        shareBtn.style.opacity = "0.5";
    }
}

let isRefreshing = false;

// ====== INITIALIZATION ======
async function init() {
    // Define all your UI elements first
    const victoryScreen = document.getElementById('victory-screen');
    // 1. Immediately sync the button based on CACHE only (Instant)
    // This stops the flicker because the button starts in the 'locked' state 
    // if they played, before any network request happens.
    lockDailyButton();
    
  
  // 1. Set up the listener FIRST
    supabase.auth.onAuthStateChange((event, session) => {
          if (['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
              handleAuthChange(event, session);
          }
      });
          
    // 1. Get the current session
    const { data: { session } } = await supabase.auth.getSession();
  
    // 2. Run the UI sync once
    if (session) {
           // We have a session, sync everything
            await handleAuthChange('INITIAL_LOAD', session);
        } else {
            // No session found. Check if we have cached data before giving up.
            const cachedUser = localStorage.getItem('cachedUsername');
            if (!cachedUser) {
                // Truly a new guest
                await handleAuthChange('SIGNED_OUT', null);
            }      
    }
     
    // 2. Auth Button (Log In / Log Out)
    authBtn.onclick = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          localStorage.setItem('manual_logout', 'true');
          await supabase.auth.signOut();
          
          // --- FIX STARTS HERE ---
          // Specifically remove the profile-related caches
          localStorage.removeItem('cached_xp');
          localStorage.removeItem('cachedUsername');
          localStorage.removeItem('lastDailyScore');
          localStorage.removeItem('dailyPlayedDate');
          localStorage.removeItem('lastDailyMessage');
          
          // Remove Supabase tokens
          Object.keys(localStorage).forEach(key => {
              if (key.includes('supabase.auth.token')) {
                  localStorage.removeItem(key);
              }
          });
          
          // Reset the global variable so the UI doesn't flicker before reload
          currentProfileXp = 0; 
          
          window.location.reload(); 
      } else {
          window.location.href = '/login.html';
      }
  };



  
    // 3. Game Buttons
    if (startBtn) {
        startBtn.onclick = async () => {
            isDailyMode = false;
            isWeeklyMode = false;
            isLiteMode = false;
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            loadSounds();
            startGame();
        };
    }
  
    if (liteBtn) {
    liteBtn.onclick = async () => {
        isDailyMode = false;
        isWeeklyMode = false;
        isLiteMode = true; // Set the Lite mode flag
        
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        loadSounds();
        startGame();
    };
}

    if (dailyBtn) {
    dailyBtn.onclick = async () => {
    // 1. Instant Audio & Session Check (Parallel)
    const [sessionRes, audioRes] = await Promise.all([
        supabase.auth.getSession(),
        audioCtx.state === 'suspended' ? audioCtx.resume() : Promise.resolve()
    ]);

    const { data: { session }, error } = sessionRes;

    if (error || !session) {
        alert("Session expired. Please log in.");
        window.location.href = '/login.html';
        return;
    }

      // 2. Play Status Check via get_daily_summary
        // Using the existing get_daily_summary RPC
        const { data: summary, error: rpcError } = await supabase.rpc('get_daily_summary');

        if (rpcError) {
            console.error("RPC Check failed:", rpcError);
            return; 
        }

        // 3. Stop them if they already played today
        if (summary.has_played) {
            alert(`You've already completed today's challenge! Your score: ${summary.score}`);
            lockDailyButton(); // Ensure the UI reflects they are done
            return;
        }

    // 3. Broadcast and Lock UI
    if (syncChannel) {
        syncChannel.send({
            type: 'broadcast',
            event: 'lock-daily',
            payload: { userId: session.user.id }
        });
    }
   
    loadSounds();
    preloadQueue = [];
    lockDailyButton();
      
    // 4. Start Challenge immediately
    await startDailyChallenge(session); 
 };
}

  if (weeklyBtn) {
    weeklyBtn.onclick = async () => {
        // 1. Audio setup
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        loadSounds();
        try {
            await startWeeklyChallenge();
        } catch (err) {
            console.error("Failed to start weekly mode:", err);
            // Fallback UI
            document.getElementById('start-screen').classList.add('hidden');
            game.classList.remove('hidden');
        }
    };
}

if (playAgainBtn) {
    playAgainBtn.onclick = async () => {    
    // 3. Start the correct game engine 
    if (isWeeklyMode) {
          // Re-run the weekly setup to get the same 50 IDs
          await startWeeklyChallenge(); 
    } else if (isDailyMode) {
           preloadQueue = [];
           // Usually Daily is locked after 1 play, but for safety:
           await startDailyChallenge();
    } else if (isLiteMode) {
           isLiteMode = true;
           await startGame();  
    } else {
          // Normal Mode - Reset flags just in case
          await startGame();
    }      
  };
}
  if (mainMenuBtn) {  
        mainMenuBtn.onclick = async () => {
        preloadQueue = []; // Clear the buffer only when going back to menu
        resetGame();
        // Manual UI Reset instead:
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        document.body.classList.remove('game-active');
    };
  }
 
  if (muteBtn) {
    // --- ADD THESE TWO LINES TO SYNC ON REFRESH ---
    muteBtn.querySelector('#muteIcon').textContent = muted ? '🔇' : '🔊';
    muteBtn.classList.toggle('is-muted', muted);
    
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

  // This will check if a user has played daily mode already and will unlock it if they did
  await syncDailySystem();
}

// Replace your existing handleAuthChange with this:
async function handleAuthChange(event, session) {
    const span = document.querySelector('#usernameSpan');
    const label = authBtn?.querySelector('.btn-label');
    
    // Ensure the auth button is ALWAYS active so guests can actually click "Log In"
    if (authBtn) {
        authBtn.style.opacity = '1';
        authBtn.style.pointerEvents = 'auto';
        authBtn.classList.remove('is-disabled');
    }
  
    // 1. Logged Out State
    if (!session) {
        // ONLY wipe if the user actually clicked Log Out
        const wasManual = localStorage.getItem('manual_logout');
        userId = null;
        // IMPORTANT: Only wipe if we are CERTAIN this is an intentional logout
        // and not just a slow connection.
        if (event === 'SIGNED_OUT' && wasManual === 'true') {
            localStorage.removeItem('manual_logout');
            username = 'Guest';
            currentProfileXp = 0;
            if (span) span.textContent = ' Guest';
            if (label) label.textContent = 'Log In';
            // Clear all session-specific UI and storage
            localStorage.removeItem('lastDailyScore');
            localStorage.removeItem('dailyPlayedDate');
            localStorage.removeItem('cached_xp');
            localStorage.removeItem('cachedUsername');
            localStorage.removeItem('lastDailyMessage'); 
            
            lockDailyButton();
             [shareBtn, logBtn].forEach(btn => {
                      if (btn) {
                    btn.classList.add('is-disabled');
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                }
            });
        } else {
            // This handles the "waiting" state - show cache if it exists
            username = localStorage.getItem('cachedUsername') || 'Guest';
            currentProfileXp = parseInt(localStorage.getItem('cached_xp')) || 0;
        }
        if (span) span.textContent = 'Guest';
        if (label) label.textContent = 'Log In';
        //syncDailyButton();
        updateLevelUI()
        lockDailyButton();
        return; // Stop here for guests
    }
    // 3. Handle LOGGED IN State
    userId = session.user.id;
    // 1. Immediately sync with local cache so we don't overwrite the HTML script's work
    username = localStorage.getItem('cachedUsername') || 'Player';
    currentProfileXp = parseInt(localStorage.getItem('cached_xp')) || 0;
 
    // 2. Update the UI with the cached values right now
    if (span) span.textContent = ' ' + username;
    if (label) label.textContent = 'Log Out';
    updateLevelUI();
  
    // 2. Logged In State
    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, xp, achievements')
        .eq('id', userId)
        .single();

    if (profile) {
        username = profile.username || 'Player';
        currentProfileXp = profile.xp || 0;
        // Access the daily_streak inside the achievements JSONB
        currentDailyStreak = profile.achievements?.daily_streak || 0;
      
        // Save to cache
        localStorage.setItem('cachedUsername', username);
        localStorage.setItem('cached_xp', currentProfileXp);
        localStorage.setItem('cached_daily_streak', currentDailyStreak); // Also cache it
      
        // UI Update
        if (span) span.textContent = ' ' + username;
        
    }
   
  // ENABLE the Log Button for users
    if (logBtn) {
      logBtn.addEventListener('click', () => {
      // Add the class to trigger the CSS "Shine"
        logBtn.classList.add('tapped');
        
        // Remove it after a short delay to create the "linger" effect
        setTimeout(() => {
            logBtn.classList.remove('tapped');
        }, 300); // 300ms matches the visual feel of OSRS interface clicks
    });
        logBtn.classList.remove('is-disabled');
        logBtn.style.opacity = '1';
        logBtn.style.pointerEvents = 'auto';
        logBtn.removeAttribute('tabindex');
    }
  
    updateLevelUI();
    await syncDailySystem();
}

function lockDailyButton() {
    if (!dailyBtn) return;
    // Add visual classes
    dailyBtn.classList.add('is-disabled');
    dailyBtn.classList.remove('is-active');
    
    // Physical locking
    dailyBtn.style.opacity = '0.5';
    dailyBtn.style.pointerEvents = 'none'; // Prevents double-clicks or clicking while game loads
}

function lockWeeklyButton() {
    if (!weeklyBtn) return;
    weeklyBtn.classList.add('is-disabled'); // fix ??
    weeklyBtn.classList.remove('is-active');
    //weeklyBtn.style.opacity = '0.5';
    //weeklyBtn.style.pointerEvents = 'none'; // Makes it ignore all clicks/touches
    
}

// ====== GAME ENGINE ======
function resetGame() {
    // 2. Stop any active logic
    clearInterval(timer);
    stopTickSound(); 
    document.querySelectorAll('.firework-particle').forEach(p => p.remove());
  
    // 3. Reset numerical state
    score = 0;
    currentQuestion = null;
    streak = 0;
    weeklyQuestionCount = 0;
    dailyQuestionCount = 0; // Don't forget this!
    // 4. WIPE UI IMMEDIATELY
    //questionText.textContent = '';
    //answersBox.innerHTML = '';

    // 5. Reset Timer Visuals
    timeLeft = 15;
    if (timeDisplay) timeDisplay.textContent = timeLeft;
    if (timeWrap) timeWrap.classList.remove('red-timer');
    
    // 6. Reset Score Visual
    if (scoreDisplay) scoreDisplay.textContent = `Score: 0`;
    // 7. Image cleanup
    // Don't set a Base64 src here, just hide it and clear the src.
   
    // 7. Image cleanup
  
    // 8. Title cleanup
    //const gameOverTitle = document.getElementById('game-over-title');
    //const gzTitle = document.getElementById('gz-title');
    //if (gameOverTitle && !isWeeklyMode) {
        //gameOverTitle.classList.add('hidden');
        //gameOverTitle.textContent = ""; // Clear text too
    //}
    //if (gzTitle) {
        //gzTitle.classList.add('hidden');
       // gzTitle.textContent = "";
    //}
    
    //if (weeklyTimeContainer && !isWeeklyMode) weeklyTimeContainer.style.display = 'none';
}


async function preloadNextQuestions(targetCount = 6) {
    // 1. Calculate how many we actually need
    const needed = targetCount - preloadQueue.length;
    if (needed <= 0) return;

    // Safety for Lite Mode
    if (isLiteMode && (score + preloadQueue.length >= LITE_LIMIT)) return;

    // 2. Prepare an array of "fetch tasks"
    const tasks = [];

    // 2. Fire individual fetch tasks
    // We don't 'await' the loop itself, allowing them to run in parallel
    for (let i = 0; i < needed; i++) {
        // This helper handles the fetch, the image warming, and the queue push
        fetchAndBufferQuestion();
    }
}
async function fetchAndBufferQuestion() {
    let questionData = null;

    try {
        if (isDailyMode || isWeeklyMode) {
            if (remainingQuestions.length > 0) {
                const qId = remainingQuestions.shift();
                questionData = await fetchDeterministicQuestion(qId);
            }
        } else {
            questionData = await fetchRandomQuestion();
        }

        if (questionData) {
            // 1. Warm up the image cache immediately
            if (questionData.question_image) {
                const img = new Image();
                img.src = questionData.question_image;
                // decode() is great, but we don't await it here so the 
                // question data becomes available for the text part immediately.
                img.decode().catch(() => {/* Silent catch */});
                // Attach the image object to the data so loadQuestion can reuse it
                questionData._preloadedImg = img;
            }

            // 2. Push to queue as soon as this SPECIFIC request is done
            preloadQueue.push(questionData);
        }
    } catch (err) {
        console.error("Fetch worker failed:", err);
    }
}
// Helper: Fetch a specific ID (Deterministic)
async function fetchDeterministicQuestion(qId) {
    const { data, error } = await supabase.rpc('get_question_by_id', { input_id: qId });
    return (!error && data?.[0]) ? data[0] : null;
}

// Helper: Fetch a random ID (Normal/Lite)
async function fetchRandomQuestion() {
    // Exclude IDs already in the queue AND the one currently being answered
    const excludeIds = preloadQueue.map(q => q.id);
    if (currentQuestion) excludeIds.push(currentQuestion.id);

    const { data, error } = await supabase.rpc('get_random_question', {
        excluded_ids: excludeIds
    });
    return (!error && data?.[0]) ? data[0] : null;
}

async function startGame() {
gameEnding = false;
isDailyMode = false;
isWeeklyMode = false;
// 1. CLEAR & PREFETCH #1 (Wait for this!)
remainingQuestions = [];
// 2. INTERNAL STATE RESET
  clearInterval(timer);
  score = 0;
  streak = 0;
  // Tell the DB: "This is a new game, start my streak at 0"
  supabase.rpc('reset_my_streak');
  dailyQuestionCount = 0;
  currentQuestion = null;
  updateScore();
  resetGame();
// 1. CONDITIONAL CLEAR
    // Only clear if we have nothing. If we have items, the game starts INSTANTLY.
    if (preloadQueue.length === 0) {
        await preloadNextQuestions(1); 
    }
  
await loadQuestion(true);
 
  // 4. WAIT FOR IMAGE TO BE READY FOR DISPLAY
    if (currentQuestion && currentQuestion.question_image) {
        try {
            const img = currentQuestion._preloadedImg || new Image();
            if (!img.src) img.src = currentQuestion.question_image;
            await img.decode();
        } catch (e) { console.warn(e); }
    }
  requestAnimationFrame(() => {
    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');
    if (gameOverTitle) { gameOverTitle.classList.add('hidden'); gameOverTitle.textContent = ""; }
    if (gzTitle) { gzTitle.classList.add('hidden'); gzTitle.textContent = ""; }
    // 3. NOW update the visuals that shouldn't look "stale"
    if (timeDisplay) timeDisplay.textContent = 15; 
    if (scoreDisplay) scoreDisplay.textContent = `Score: 0`;

  // 4. THE BIG SWAP (User finally sees the game)
    document.body.classList.add('game-active');
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
    
    gameStartTime = Date.now();
    startTimer(); // Fire the clock
    // Start immediately for Solo
    // 6. FILL THE REST IN THE BACKGROUND
    // We don't 'await' this; it runs while the user is looking at question 1
    preloadNextQuestions(8);
    });
}

async function loadQuestion(isFirst = false) {
    if (gameEnding) return;

    // 1. End Game Checks
    if (isWeeklyMode && weeklyQuestionCount >= WEEKLY_LIMIT) { await endGame(); return; }
    if (isLiteMode && score >= LITE_LIMIT) { await endGame(); return; }
    if (isDailyMode && dailyQuestionCount >= DAILY_LIMIT) { await endGame(); return; }   

    // A. CONDITIONAL CLEANUP
    if (!isFirst) {
        document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
        questionImage.style.opacity = '0';
    }

    // B. REFILL THE BUFFER
    const needsRefill = (isDailyMode || isWeeklyMode) ? remainingQuestions.length > 0 : true;
    if (!isFirst && preloadQueue.length <= 4 && needsRefill) {
        preloadNextQuestions(8); 
    }

    // C. THE "NO-UNDEFINED" GATE
    // If the queue is empty, we wait for a single fetch to finish completely.
    if (preloadQueue.length === 0) {
        if (needsRefill) {
            // We await the WORKER directly here to ensure the queue actually gets a value
            await fetchAndBufferQuestion(); 
        } else {
            await endGame();
            return;
        }
    }

    // D. POPULATE DATA (Now guaranteed to have data)
    currentQuestion = preloadQueue.shift();
    
    // Safety check just in case DB returned null
    if (!currentQuestion) {
        //console.error("Failed to retrieve question from queue.");
        return; 
    }

    //answersBox.innerHTML = '';
    questionText.textContent = currentQuestion.question;

    // E. RENDER ANSWERS
    const answers = [
        { text: currentQuestion.answer_a, id: 1 },
        { text: currentQuestion.answer_b, id: 2 },
        { text: currentQuestion.answer_c, id: 3 },
        { text: currentQuestion.answer_d, id: 4 }
    ].filter(a => a.text).sort(() => Math.random() - 0.5);

    const fragment = document.createDocumentFragment();
    answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.textContent = ans.text;
        btn.classList.add('answer-btn');
        btn.dataset.answerId = ans.id;
        btn.onclick = () => checkAnswer(ans.id, btn);
        fragment.appendChild(btn);
    });

    answersBox.innerHTML = ''; 
    answersBox.appendChild(fragment);

        // F. IMAGE HANDLING
    if (currentQuestion.question_image) {
        const imgToUse = currentQuestion._preloadedImg || new Image();
        if (!imgToUse.src) imgToUse.src = currentQuestion.question_image;
    
        imgToUse.decode().then(() => {
            // Double check we are still on the same question
            if (currentQuestion.question_image === imgToUse.src) {
                questionImage.src = imgToUse.src;
                questionImage.style.display = 'block';
                questionImage.style.opacity = '1'; 
            }
        }).catch(() => {
            questionImage.src = currentQuestion.question_image;
            questionImage.style.display = 'block';
            questionImage.style.opacity = '1';
        });
    } else {
        // If NO image, hide it IMMEDIATELY. 
        // Since this runs during the 'await' in startGame, 
        // the layout shifts while the endScreen is still covering it.
        questionImage.style.display = 'none';
        questionImage.style.opacity = '0';
        questionImage.src = ''; 
    }
    // G. TIMER
    if (!isFirst) startTimer();   
}


function startTimer() {
    clearInterval(timer);
    if (activeTickSource) { activeTickSource.stop(); activeTickSource = null; } 
  
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeWrap.classList.remove('red-timer');
  
    timer = setInterval( () => {
        timeLeft--;
        timeDisplay.textContent = timeLeft;

        if (timeLeft <= 5 && timeLeft > 0 && !activeTickSource) {
            activeTickSource = playSound(tickBuffer, true); 
        }
        if (timeLeft <= 5) timeWrap.classList.add('red-timer');

    // --- ROUND END LOGIC ---
    if (timeLeft <= 0) {
      clearInterval(timer);
      // SOLO / DAILY / WEEKLY
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
    stopTickSound();
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    playSound(wrongBuffer);
    await highlightCorrectAnswer();
  
   if (isWeeklyMode) weeklyQuestionCount++; 
   if (isDailyMode) dailyQuestionCount++;
      
   // 2. Corrected Logic & Syntax (Fixed the missing closing parenthesis)
    if ((isDailyMode && dailyQuestionCount < DAILY_LIMIT) || (isWeeklyMode && weeklyQuestionCount < WEEKLY_LIMIT)) {
        setTimeout(loadQuestion, 1300);
    } else {
        // If it's Normal mode OR we reached the limit for Daily/Weekly
        setTimeout(endGame, 1000);
    }
}

async function checkAnswer(choiceId, btn) {
    stopTickSound(); 
    if (timeLeft <= 0) return;
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    if (isWeeklyMode) weeklyQuestionCount++;
    if (isDailyMode) dailyQuestionCount++;

    // THE ONE CALL TO RULE THEM ALL
    const { data: res, error: rpcErr } = await supabase.rpc('process_answer', {
        input_id: Number(currentQuestion.id), // Ensure it's an integer
        choice: Number(choiceId),             // Ensure it's an integer
        is_daily: Boolean(isDailyMode),       // Ensure it's a boolean
        current_count: isDailyMode ? dailyQuestionCount : 0,
        daily_limit: DAILY_LIMIT
    });

    if (rpcErr) return console.error("RPC Error:", rpcErr);

    if (res.correct) {
        playSound(correctBuffer);
        btn.classList.add('correct');
        score++;
        updateScore();
        
        // Sync local streak with DB Truth
        streak = res.new_streak;

        const xpData = res.xp_info;
        // Check if xpData exists AND it's not null (Guest check)
        if (xpData && xpData.new_xp !== undefined) { 
            // Update local state with truth from DB
            currentProfileXp = xpData.new_xp;
            localStorage.setItem('cached_xp', currentProfileXp);
            
            updateLevelUI(); 
            triggerXpDrop(res.xp_gained);

            if (res.bonus_earned) {
                showNotification("BONUS XP!", bonusBuffer, "#a335ee");
            }

            // Level Up logic
            if (xpData.leveled_up) {
                triggerFireworks();
                showNotification(`LEVEL UP!`, levelUpBuffer, "#ffde00"); // (${xpData.new_level})

                // Milestone notifications
                if (xpData.new_level >= 10 && xpData.old_level < 10) showAchievementNotification("Reach Level 10");
                if (xpData.new_level >= 50 && xpData.old_level < 50) showAchievementNotification("Reach Level 50");
                if (xpData.new_level >= 99 && xpData.old_level < 99) showAchievementNotification("Reach Max Level");
            }
        }
        // 2. NEW: Score Milestone Logic
        // This only fires for Normal Mode
        if (res.milestone) {
            showAchievementNotification(res.milestone);
        }
      
        // --- 2. INTEGRATED PET LOGIC ---
        const petData = res.pet_info;
        if (petData && petData.unlocked) {
            
            // Achievement: Unlock 1 Pet
            if (petData.total_unlocked === 1) {
                showAchievementNotification("Unlock 1 Pet");
            }

            // Achievement: Unlock all Pets
            if (petData.is_all_pets) {
                showAchievementNotification("Unlock all Pets");
            }

            // Update LocalStorage Cache
            let currentCached = JSON.parse(localStorage.getItem('cached_pets') || "[]");
            if (!currentCached.includes(petData.pet_id)) {
                currentCached.push(petData.pet_id);
                localStorage.setItem('cached_pets', JSON.stringify(currentCached));
            }

            // UI Feedback
            showCollectionLogNotification(petData.pet_name);
        }

        // 4. Other UI-based Achievements (Keep these local as they are harmless)
        if (timeLeft >= 14) saveAchievement('fastest_guess', true);
        if (timeLeft <= 1 && timeLeft > 0) saveAchievement('just_in_time', true);
        if (isLiteMode && score === 50) saveAchievement('lite_50', true);
        if (isWeeklyMode && score === 25) saveAchievement('weekly_25', true);

        
      
        setTimeout(loadQuestion, 1000);
    } else {
        // Wrong answer logic
        playSound(wrongBuffer);
        streak = 0; // Visual reset
        if (btn) btn.classList.add('wrong');
        await highlightCorrectAnswer();

        if (isDailyMode || isWeeklyMode) {
            setTimeout(loadQuestion, 1300);
        } else {
            setTimeout(endGame, 1000);
        }
    }
}

function updateLevelUI() {
    const lvlNum = document.getElementById('levelNumber');
    const xpBracket = document.getElementById('xpBracket');
    
    if (lvlNum && xpBracket) {
        const safeXp = currentProfileXp || 0;
        const currentLvl = getLevel(safeXp);
        lvlNum.textContent = currentLvl;
        xpBracket.textContent = `(${safeXp.toLocaleString()} XP)`;
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


function triggerFireworks() {
    const container = document.getElementById('game');
    const colors = ['#ffde00', '#ffffff', '#00ff00', '#d4af37'];
    
    // Spawn 30 particles on the left and 30 on the right
    for (let i = 0; i < 30; i++) {
        createParticle(container, 10, colors);  // 10% from left
        createParticle(container, 90, colors);  // 90% from left (right side)
    }
}

// Call this function for Level Ups, Bonuses, or Achievements
function showNotification(message, soundToPlay = null, color = "#ffde00") {
    notificationQueue.push({ 
        text: message, 
        sound: soundToPlay, // Will be null if not provided
        color: color 
    });
    processQueue();
}
// Add this right after your function definition in your JS file
window.showNotification = showNotification;

function processQueue() {
    if (isShowingNotification || notificationQueue.length === 0) return;

    isShowingNotification = true;
    const container = document.getElementById('game-notifications');
    const item = notificationQueue.shift();

    // Only play if sound exists AND it's a valid audio buffer
    if (item.sound && typeof item.sound === 'object') {
        try {
            playSound(item.sound); 
        } catch (e) {
            console.warn("Notification sound failed to play:", e);
        }
    }

    const notif = document.createElement('div');
    notif.className = 'notif-text';
    notif.innerText = item.text;
    notif.style.color = item.color;
    notif.style.textShadow = `2px 2px 0px #000, 0 0 8px ${item.color}`;

    container.appendChild(notif);

    // --- DYNAMIC TIMING ---
    // If more notifications are waiting, go fast (600ms).
    // If it's the last one, stay longer (2000ms) so the player can actually read it.
    const displayTime = notificationQueue.length > 0 ? 600 : 1600;

    setTimeout(() => {
        notif.classList.add('fade-out'); 
        
        setTimeout(() => {
            notif.remove();
            isShowingNotification = false;
            processQueue(); 
        }, 300); // 300ms for the fade-out animation to finish
    }, displayTime); 
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
    stopTickSound();

    // 1. Calculate time for the CURRENT segment (Solo)
    const endTime = Date.now();
     
    // This covers all modes
    const totalMs = endTime - gameStartTime;
    const totalSeconds = totalMs / 1000;
  
    // 1. PREPARE DATA FIRST (Quietly in background)
    const { data: { session } } = await supabase.auth.getSession();
    const scoreKey = Math.min(Math.max(score, 0), 10);
    const options = dailyMessages[scoreKey] || ["Game Over!"];
    const randomMsg = options[Math.floor(Math.random() * options.length)];
    const streakContainer = document.getElementById('dailyStreakContainer');
    const streakCount = document.getElementById('streakCount');

    // RESET WEEKLY UI (Crucial Fix)
    // We hide this immediately so it doesn't leak into Normal/Daily modes
    if (weeklyTimeContainer) weeklyTimeContainer.style.display = 'none';
  
    // 3. POPULATE END SCREEN BEFORE SHOWING IT
    if (finalScore) {
        if (isLiteMode) {
            // This shows the 3/100 format ONLY on the end screen
            finalScore.textContent = `${score}/${LITE_LIMIT}`;
        } else if (isWeeklyMode) {
            finalScore.textContent = `${score}/${WEEKLY_LIMIT}`;
        } else {
            // Normal display for other modes
            finalScore.textContent = score;
        }
    }

    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');

    // Reset visibility of titles
    if (gameOverTitle) gameOverTitle.classList.add('hidden');
    if (gzTitle) gzTitle.classList.add('hidden');

    if (isWeeklyMode) {

        // UI Visibility resets
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        if (dailyStreakContainer) dailyStreakContainer.style.display = 'none';
    
        // --- ACHIEVEMENTS CHECK ---
        if (session && score >= 50) {
            saveAchievement('weekly_50', true);
            if (totalSeconds <= 120) await saveAchievement('weekly_sub_2', true);
            if (totalSeconds <= 180) await saveAchievement('weekly_sub_3', true);
        }
    
      displayFinalTime(totalMs);
      
    // Save Score and Check for PB
      let isWeeklyPB = session ? await saveScore(session, 'weekly', score, totalMs, username) : false;
      // Update Titles
      if (gameOverTitle) {
          gameOverTitle.textContent = isWeeklyPB ? "New PB achieved!" : "Weekly Mode Completed!";
          gameOverTitle.classList.remove('hidden');
      }
    } else if (isDailyMode) {
        if (playAgainBtn) playAgainBtn.classList.add('hidden');
        // Saves the score for the leaderboard
        let isDailyPB = await saveScore(session, 'daily', score, totalMs, username, randomMsg);
        displayFinalTime(totalMs);
      
        if (gameOverTitle) {
          if (isDailyPB) {
            gameOverTitle.textContent = `${randomMsg}\nNew PB achieved!`;
          } else {
            gameOverTitle.textContent = randomMsg;
          }
          gameOverTitle.classList.remove('hidden');
        }
  
        // This one function now handles: Streak, Total Count, and Perfect 10/10
        // Pass the actual 'score' variable here
        localStorage.setItem('lastDailyScoreDate', new Date().toISOString().split('T')[0]);
      
        localStorage.setItem('lastDailyScore', score); 
        localStorage.setItem('dailyPlayedDate', todayStr); 
        localStorage.setItem('lastDailyMessage', randomMsg);

        // Show the streak container
        if (streakContainer && streakCount) {
            streakContainer.style.display = 'block';
            streakCount.textContent = currentDailyStreak;
        }
      const shareBtn = document.getElementById('shareBtn');
      if (shareBtn) {
          shareBtn.classList.remove('is-disabled');
          shareBtn.style.filter = "sepia(1) saturate(2.2) hue-rotate(-18deg) brightness(0.85)";
          shareBtn.style.opacity = "1";
          shareBtn.style.pointerEvents = "auto";
      }
       
    } else { 
        // --- NORMAL OR LITE MODE ---
        if (streakContainer) streakContainer.style.display = 'none';
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        displayFinalTime(totalMs);
      
      // 1. Lite Mode Specific Logic
        if (isLiteMode) {
            
          // --- ACHIEVEMENTS CHECK ---
            if (session && score >= 100) { //change to 100 score
                await saveAchievement('lite_100', true);
                if (totalSeconds <= 360) await saveAchievement('lite_sub_6', true);
                if (totalSeconds <= 480) await saveAchievement('lite_sub_8', true);
            }
          
            let isLitePB = session ? await saveScore(session, 'lite', score, totalMs, username) : false;
        
           // 2. Update UI IMMEDIATELY 
            if (gameOverTitle) {
                if (isLitePB) {
                    // Prioritize the PB message
                    gameOverTitle.textContent = "New PB achieved!";
                } else if (score === LITE_LIMIT) {
                    // If it's not a PB, but they still finished
                    gameOverTitle.textContent = "Lite Mode Completed!";
                } else {
                        // Standard fail
                        gameOverTitle.textContent = "Game Over!";
                    }
                gameOverTitle.classList.remove('hidden');
            }
        } else {
        // end of Lite Mode
        // --- ACTUAL NORMAL MODE ---
        let isNormalPB = false;
        // Trigger the high-score save
        if (session && score > 0) {
            // We pass the current username, and the score achieved
            isNormalPB = await saveScore(session, 'normal', score, totalMs, username);
        }
      // We check if the preloader actually FAILED to find content.
      const isPoolExhausted = preloadQueue.length === 0;
      // 2. Check for Gz! (Completion) first
        if (score > 0 && isPoolExhausted && !isLiteMode) {
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
            // 3. Otherwise, show standard Game Over, or PB achieved if its PB.
        } else if (gameOverTitle) {
            //if (gzTitle) gzTitle.classList.add('hidden'); // Hide Gz if it was there from before
            gameOverTitle.textContent = isNormalPB ? "New PB achieved!" : "Game Over!";
            gameOverTitle.classList.remove('hidden');
        }
      }
    }
    // 4. THE BIG SWAP (Final step)
    // Use a tiny timeout or requestAnimationFrame to ensure DOM updates are ready
    requestAnimationFrame(() => {
    document.body.classList.remove('game-active'); 
    game.classList.add('hidden');
    endScreen.classList.remove('hidden');

    gameEnding = false;
    syncDailySystem();
  });
}

function displayFinalTime(ms) {
    const totalSeconds = ms / 1000;
    let formattedTime;

    if (totalSeconds < 60) {
        formattedTime = totalSeconds.toFixed(2) + "s";
    } else {
        const mins = Math.floor(totalSeconds / 60);
        const secs = (totalSeconds % 60).toFixed(2);
        formattedTime = `${mins}:${secs.toString().padStart(5, '0')}`; 
    }

    const finalTimeEl = document.getElementById('finalTime');
    const weeklyTimeContainer = document.getElementById('weeklyTimeContainer');
    
    if (finalTimeEl) finalTimeEl.textContent = formattedTime;
    if (weeklyTimeContainer) weeklyTimeContainer.style.display = 'block';

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
    }, 1300);
}

function getWeeklySliceIndex(totalQuestions, WEEKLY_LIMIT) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    // This calculates which "chunk" of 50 we are on. 
    // The % ensures it loops back to the start if we exceed the total questions.
    const maxChunks = Math.floor(totalQuestions / WEEKLY_LIMIT);
    // Safety: If database is smaller than the limit, always return the first chunk
    if (maxChunks <= 0) return 0;
    return (weekNumber % maxChunks); 
}

async function saveScore(session, mode, currentScore, timeMs, username = "", msg = "") {
    // 1. Safety check: ensure session exists
    if (!session || !session.user) {
        console.warn(`No session provided for ${mode} score save.`);
        return false;
    }

    try {
        const { data, error } = await supabase.rpc('submit_game_score', {
            p_mode: mode,
            p_score: currentScore,
            p_time_ms: Math.floor(timeMs),
            p_username: username,
            p_message: msg
        });

        if (error) throw error;

        // 2. Specific post-save logic for Daily Mode
        if (mode === 'daily') {
            // We pass the session here too if updateDailyStreak needs it
            await updateDailyStreak(currentScore);
            syncDailySystem();
        }

        return data.is_pb; // Returns true/false
    } catch (err) {
        console.error(`Error saving ${mode} score:`, err);
        return false;
    }
}



if (shareBtn) {
    shareBtn.onclick = async () => {
        // 1. UI Feedback
        shareBtn.classList.add('tapped');
        setTimeout(() => shareBtn.classList.remove('tapped'), 300);

        // 2. Auth Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Please log in to share your score!");
            return;
        }

        // 3. Get Data
        const currentScore = parseInt(localStorage.getItem('lastDailyScore') || "0");
        
        // Pull the streak we just saved in handleAuthChange
        const currentStreak = localStorage.getItem('cached_daily_streak') || "0";
      
        // Calculate edition on the fly
        const dailyNum = getDailyEditionNumber();
      
        const dateStr = new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });

        // 4. Build the Grid
        const totalQs = 10;
        const grid = "🟩".repeat(currentScore) + "🟥".repeat(totalQs - currentScore);

        const shareText = `OSRS Trivia ${dailyNum}  ${currentScore}/${totalQs} ⚔️\n` +
                          `${grid}\n` +
                          `Streak: ${currentStreak} 🔥\n`;
                          //`https://osrstrivia.pages.dev/`;
   
        // 5. Desktop Tooltip Logic
        if (window.matchMedia("(hover: hover)").matches) {
            const tooltip = document.createElement('div');
            tooltip.className = 'copy-tooltip';
            tooltip.innerText = 'Copied!';
            
            // Get the button's exact position on the screen
            const rect = shareBtn.getBoundingClientRect();
            
            // Place it relative to the viewport, not the button
            tooltip.style.position = 'fixed';
            tooltip.style.top = (rect.top - 30) + 'px'; // 30px above the button
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            
            document.body.appendChild(tooltip); // Attach to body, NOT shareBtn
            
            setTimeout(() => tooltip.remove(), 500);
        }

        // 6. Execution
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            try {
                await navigator.share({
                    title: 'OSRS Trivia',
                    text: shareText
                });
            } catch (err) { 
              //console.log("Share cancelled"); 
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
            } catch (clipErr) {
                console.error("Clipboard failed:", clipErr);
            }
        }
    };
}

async function updateDailyStreak(currentScore) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;
    // 1. Get the current Streak from the DATABASE instead of local JS
    const { data: actualStreak, error } = await supabase.rpc('get_daily_streak', { 
        target_user_id: userId 
    });

    // 2. Get existing achievements from Profile
    const { data: profile } = await supabase.from('profiles')
        .select('achievements')
        .eq('id', userId)
        .maybeSingle();
    
    let oldAchieve = profile?.achievements || {};

    // 3. Current stats before updating
    const oldTotal = oldAchieve.daily_total || 0;
    const newTotal = oldTotal + 1; // Increment total
    
    // --- MILESTONE LOGIC ---

    // Milestone 1: Complete Daily Mode (Once)
    if (newTotal === 1 && !oldAchieve.daily_total) {
        showAchievementNotification("First Daily Mode");
    }

    // Milestone 2: 10 Day Streak (Exactly 10)
    // We check if their new streak is 10 AND their previous max was less than 10
    if (actualStreak === 10 && (oldAchieve.max_streak || 0) < 10) {
        showAchievementNotification("10 Day Streak");
    }

    // Milestone 3: 20 Total Games
    if (newTotal === 20 && oldTotal < 20) {
        showAchievementNotification("20 Daily Games");
    }

    // Milestone 4: 100 Total Games
    if (newTotal === 100 && oldTotal < 100) {
        showAchievementNotification("100 Daily Games");
    }

    // Milestone 5: Perfect 10/10 (One-time unlock)
    if (currentScore === 10 && !oldAchieve.daily_perfect) {
        showAchievementNotification("Perfect 10/10");
    }

    // 4. Construct and Save updated object
    const updatedAchieve = {
        ...oldAchieve, 
        daily_streak: actualStreak,
        max_streak: Math.max(actualStreak, (oldAchieve.max_streak || 0)),
        daily_total: newTotal,
        daily_perfect: currentScore === 10 ? true : (oldAchieve.daily_perfect || false)
    };

    await supabase
        .from('profiles')
        .update({ achievements: updatedAchieve })
        .eq('id', userId);

    // 5. Sync LocalStorage for UI
    localStorage.setItem('cached_daily_streak', updatedAchieve.daily_streak);
    localStorage.setItem('stat_max_streak', updatedAchieve.max_streak);
    localStorage.setItem('cached_daily_total', updatedAchieve.daily_total);
    localStorage.setItem('stat_daily_perfect', updatedAchieve.daily_perfect.toString());
    currentDailyStreak = updatedAchieve.daily_streak || 0;
}

async function saveAchievement(key, value) {
    // 1. Get session from the current state rather than a slow network call if possible
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 2. Fetch existing achievements
    const { data, error } = await supabase
        .from('profiles')
        .select('achievements')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error("Error fetching achievements:", error);
        return;
    }

    let achievements = data?.achievements || {};
    let isNewAchievement = false;
    let notificationText = "";

    // 3. Logic Checks (Structure kept exactly as you requested)
    if (key === 'fastest_guess' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Lucky Guess";
    } 
    else if (key === 'just_in_time' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Just in Time";
    }
    // --- Weekly Boolean Achievements ---
    else if (key === 'weekly_25' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Halfway 25/50";
    }
    else if (key === 'weekly_50' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Perfect 50/50";
    }
    else if (key === 'weekly_sub_3' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Speedrunner 50/50 sub 3m";
    }
    else if (key === 'weekly_sub_2' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "GM speedrunner 50/50 sub 2m";
    }
  // --- Lite Mode Boolean Achievements ---
    else if (key === 'lite_50' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Halfway 50/100";
    }
    else if (key === 'lite_100' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Perfect 100/100";
    }
    else if (key === 'lite_sub_6' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Speedrunner 100/100 sub 6m";
    }
    else if (key === 'lite_sub_8' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "GM speedrunner 100/100 sub 8m";
    }
  
    // 4. EXECUTE SAVING
    if (isNewAchievement) {
        if (typeof showAchievementNotification === "function") {
            showAchievementNotification(notificationText);
        }

        // Update the object
        achievements[key] = value;
        
        // Push to Supabase
        await supabase
            .from('profiles')
            .update({ achievements: achievements })
            .eq('id', session.user.id);

        // 5. Update local storage for immediate UI sync
        let storageKey;
        if (key === 'fastest_guess') {
            storageKey = 'stat_fastest';
        } else if (key === 'just_in_time') {
            storageKey = 'stat_just_in_time';
        } else {
            // Consistent naming for new weekly and level achievements
            storageKey = `ach_stat_${key}`;
        }
        
        localStorage.setItem(storageKey, value.toString());
    }
}

// 1. Create a variable outside the function to track the timer
let petNotificationTimeout = null;

function showCollectionLogNotification(petName) {
    let modal = document.getElementById('pet-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pet-modal';
        document.body.appendChild(modal);
    }

  // 2. Clear any existing timer so they don't overlap
    if (petNotificationTimeout) {
        clearTimeout(petNotificationTimeout);
    }
    // 3. Reset the state immediately to restart animation
    modal.classList.remove('active');
  
    // 4. Play sound
    if (typeof playSound === "function" && petBuffer) {
        playSound(petBuffer);
    }

    const fileNameMap = {
        'Baby Mole': 'mole.png',
        'Pet Kraken': 'kraken.png',
        'Chompy Chick': 'chompy.png',
        'Pet Zilyana': 'zilyana.png',
        'Vorki': 'vorki.png',
        'Pet Snakeling': 'snakeling.png',
        'Yami': 'yami.png',
        'Bloodhound': 'bloodhound.png', 
        'Rocky': 'rocky.png',
        'Pet Zilyana': 'zilyana.png',
        'Olmlet': 'olmlet.png',
        'TzRek-Jad': 'jad.png',
        'Corporeal Beast': 'corporeal_beast.png',
        'Tumeken\'s guardian': 'tumekens_guardian.png',
        'Lil\' Zik': 'lil_zik.png',
        'TzRek-Zuk': 'zuk.png'
    };

    const fileName = fileNameMap[petName] || 'mole.png';

    modal.innerHTML = `
        <span class="pet-modal-close" onclick="this.parentElement.classList.remove('active')">&times;</span>
        <div class="pet-unlock-title">PET UNLOCKED</div>
        <img src="pets/${fileName}" class="pet-unlock-icon">
        <div class="pet-unlock-name">${petName}</div>
        <div class="pet-unlock-msg">You have a funny feeling like you're being followed...</div>
    `;

    setTimeout(() => {
        modal.classList.add('active');
    }, 100);

    // Trigger fireworks
    if (typeof triggerFireworks === "function") triggerFireworks();

    // 2. Dynamic Display Time (Mobile: 2s, PC: 6s)
    const isMobile = window.innerWidth <= 480;
    const displayTime = isMobile ? 2000 : 6000;

    petNotificationTimeout = setTimeout(() => {
        modal.classList.remove('active');
        petNotificationTimeout = null;
    }, displayTime); 
}

let achievementNotificationTimeout = null;

function showAchievementNotification(achievementName) {
    let modal = document.getElementById('achievement-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'achievement-modal';
        document.body.appendChild(modal);
    }

    if (achievementNotificationTimeout) clearTimeout(achievementNotificationTimeout);
    modal.classList.remove('active');
  
    // Play sound if available
    if (typeof playSound === "function" && typeof achieveBuffer !== 'undefined' && achieveBuffer) {
        playSound(achieveBuffer);
    }

    modal.innerHTML = `
        <span class="achieve-modal-close" onclick="this.parentElement.classList.remove('active')" style="position:absolute; top:4px; right:8px; color:#cd7f32; cursor:pointer;">&times;</span>
        <div class="achieve-unlock-title">Achievement Unlocked!</div>
        <div class="achieve-unlock-name">${achievementName}</div>
    `;

    setTimeout(() => {
        modal.classList.add('active');
    }, 100);

    if (typeof triggerFireworks === "function") triggerFireworks();

    const isMobile = window.innerWidth <= 480;
    const displayTime = isMobile ? 3000 : 5000;

    achievementNotificationTimeout = setTimeout(() => {
        modal.classList.remove('active');
        achievementNotificationTimeout = null;
    }, displayTime); 
}

// ====== HELPERS & AUDIO ======
async function loadSounds() {
    if (!correctBuffer) correctBuffer = await loadAudio('./sounds/correct.mp3');
    if (!wrongBuffer) wrongBuffer = await loadAudio('./sounds/wrong.mp3');
    if (!tickBuffer) tickBuffer = await loadAudio('./sounds/tick.mp3');
    if (!levelUpBuffer) levelUpBuffer = await loadAudio('./sounds/level.mp3');
    if (!bonusBuffer) bonusBuffer = await loadAudio('./sounds/bonus.mp3');
    if (!petBuffer) petBuffer = await loadAudio('./sounds/pet.mp3');
    if (!achieveBuffer) achieveBuffer = await loadAudio('./sounds/achievement.mp3');
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

function updateScore() {
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${score}`;
    }
}

async function startWeeklyChallenge() {
    preloadQueue = [];
    gameEnding = false;
    isWeeklyMode = true;
    isDailyMode = false;
    isLiteMode = false;
    // RESET THESE HERE
    weeklyQuestionCount = 0; 
    score = 0;
    streak = 0; 
    // Tell the DB: "This is a new game, start my streak at 0"
    supabase.rpc('reset_my_streak');
  
    if (weeklySessionPool.length === 0) {
          // 1. Parallelize the slow stuff
        const [sessionRes, questionsRes] = await Promise.all([
            supabase.auth.getSession(),
            supabase.from('questions').select('id').order('id', { ascending: true })
        ]);
    
        const session = sessionRes.data.session;
        if (!session) return alert("Log in to play Weekly Mode!");
    
        const allQuestions = questionsRes.data;
        if (!allQuestions || allQuestions.length < 50) return alert("Error loading questions.");
    
        // Deterministic Weekly Selection
        const now = new Date();
        const startDate = new Date(RELEASE_DATE); // Keep this same as Daily for consistency
        const diffTime = Math.abs(now - startDate);
        const dayCounter = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Convert current day into a Week Index
        const weekCounter = Math.floor(dayCounter / 7); 
        
        const weeksPerCycle = Math.floor(allQuestions.length / WEEKLY_LIMIT);
        const cycleNumber = Math.floor(weekCounter / weeksPerCycle);
        const weekInCycle = weekCounter % weeksPerCycle;
    
        // Use the same shuffle logic
        const shuffledList = shuffleWithSeed(allQuestions, cycleNumber);
        weeklySessionPool = shuffledList.slice(
            weekInCycle * WEEKLY_LIMIT, 
            (weekInCycle * WEEKLY_LIMIT) + WEEKLY_LIMIT
        ).map(q => q.id);
    }
    // Prepare the session-specific random order
    preloadQueue = [];
    // Randomize the order for THIS specific play-through
    remainingQuestions = [...weeklySessionPool].sort(() => Math.random() - 0.5); // Set the 50 Weekly IDs
  
    // ------------------
    // 3. THE BARRIER (Add this exactly like Normal Mode)
    // This stops the function here until Question 1 is 100% ready
    if (preloadQueue.length === 0) {
        await preloadNextQuestions(1); 
    }
  
    // THE UI SWAP (Triggered only when we HAVE the data)
    resetGame();
    await loadQuestion(true);

    requestAnimationFrame(() => {
    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');
    if (gameOverTitle) { gameOverTitle.classList.add('hidden'); gameOverTitle.textContent = ""; }
    if (gzTitle) { gzTitle.classList.add('hidden'); gzTitle.textContent = ""; }
      
    document.body.classList.add('game-active');
    game.classList.remove('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    endScreen.classList.add('hidden');
  
    gameStartTime = Date.now(); // total weekly run time
    startTimer();
  
    // 3. NOW fill the rest while the user is reading
    if (remainingQuestions.length > 0) {
        preloadNextQuestions(3);
    }
  });
}

function getDailyEditionNumber() {
    const startDate = new Date(RELEASE_DATE); 
    const diffTime = Math.abs(new Date() - startDate);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function startDailyChallenge(session) {
    // 1. & 2. BURN ATTEMPT + LOAD IDS (Happening at the same time)
    // This uses your exact table and column names.
    const [burnRes, questionsRes] = await Promise.all([
        supabase.from('daily_attempts').insert({ 
            user_id: session.user.id, 
            attempt_date: todayStr 
        }),
        supabase.from('questions').select('id').order('id', { ascending: true })
    ]);

    // Your exact error check
    if (burnRes.error) return alert("You've already played today!");

    const allQuestions = questionsRes.data;
    if (!allQuestions || allQuestions.length < DAILY_LIMIT) return alert("Error loading questions.");

    // 3. Deterministic Selection
    const startDate = new Date(RELEASE_DATE); 
    const diffTime = Math.abs(new Date() - startDate);
    const dayCounter = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const questionsPerDay = DAILY_LIMIT;
    const daysPerCycle = Math.floor(allQuestions.length / questionsPerDay); 
    const cycleNumber = Math.floor(dayCounter / daysPerCycle); 
    const dayInCycle = dayCounter % daysPerCycle;

    const shuffledList = shuffleWithSeed(allQuestions, cycleNumber);
    const dailyIds = shuffledList.slice(dayInCycle * questionsPerDay, (dayInCycle * questionsPerDay) + questionsPerDay).map(q => q.id);

    // 4. PREPARE THE DATA (Background)
    isDailyMode = true;
    isWeeklyMode = false;
    preloadQueue = []; 
   // Tell the DB: "This is a new game, start my streak at 0"
    supabase.rpc('reset_my_streak');
    streak = 0;
    remainingQuestions = dailyIds.sort(() => Math.random() - 0.5);   
  
    // 5. Start the engine
    //await preloadNextQuestions();
    // FETCH ONLY THE FIRST QUESTION IMMEDIATELY
    // If queue is empty, get one right now so we can start
    await preloadNextQuestions(1); // Modified to accept a 'count'
    
    // 6. UI TRANSITION (Only happens once data is ready)
    resetGame();
  
    await loadQuestion(true);
  
    requestAnimationFrame(() => {
        const gameOverTitle = document.getElementById('game-over-title');
        const gzTitle = document.getElementById('gz-title');
        if (gameOverTitle) { gameOverTitle.classList.add('hidden'); gameOverTitle.textContent = ""; }
        if (gzTitle) { gzTitle.classList.add('hidden'); gzTitle.textContent = ""; }
      
        document.body.classList.add('game-active'); 
        document.getElementById('start-screen').classList.add('hidden');
        game.classList.remove('hidden');

        gameStartTime = Date.now();
        startTimer();
        // FILL THE REST IN THE BACKGROUND
        // We don't 'await' this; it runs while the user is looking at question 1
        preloadNextQuestions(5);
    });
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
})(); // closes the async function AND invokes it
});   // closes DOMContentLoaded listener



// 6. EVENT LISTENERS (The code you asked about)

















































































































































































































