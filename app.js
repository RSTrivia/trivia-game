
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
let syncChannel;
let username = 'Guest';
let gameEnding = false;
let isShowingNotification = false;
let notificationQueue = [];
let masterQuestionPool = [];
let firstQuestionSent = false; // Reset this when a match starts

//live mode
let currentLobby = null;
let lobbyChannel = null;
let lobbyTimerInterval = null;
let userId = null; // Add this globally
let gameChannel = null;
let nextRoundTimeout = null;
let refereeTimeout = null;
let initialLobbySize = 0; // Default for 1v1
let matchStartingCount = 0;
let survivors = 0;
let isLiveMode = false;
let isStarting = false;
let hasDiedLocally = false;
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chat-messages');
let roundId = 0;
let roundOpen = false;
let accumulatedTime = 0; // Global scope
// referee-only
let roundResults = {};

const RELEASE_DATE = '2025-12-22';
const WEEKLY_LIMIT = 50; // Change to 50 when ready to go live
const LITE_LIMIT = 100; // Change to 100 when ready to go live
const number_of_questions = 610;

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
const lobbyBtn = document.getElementById('lobbyBtn');
const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
const soloBtn = document.getElementById('soloBtn');
const rejoinLobbyBtn = document.getElementById('rejoinLobbyBtn');
const victoryMainMenuBtn = document.getElementById('victoryMainMenuBtn');

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
//let masterQuestionPool = []; // This holds ALL 510 IDs from Supabase
let remainingQuestions = []; // This holds what's left for the CURRENT SESSION
let currentQuestion = null;
let currentQuestionIndex = 0;
let preloadQueue = []; 
let timer;
let timeLeft = 15;
let isDailyMode = false;
let weeklyStartTime = 0;
let isWeeklyMode = false;
let weeklyQuestionCount = 0;
let isLiteMode = false;
let liteQuestions = []; // To store the shuffled subset
let gameStartTime = 0;

// ====== INITIAL UI SYNC ======
// Replace your existing refreshAuthUI with this:

async function syncDailyButton() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!dailyBtn) return;
  
    // Explicitly lock if no one is logged in
    if (!session) {
        lockDailyButton();
        lockWeeklyButton();
        lockLobbyButton();
      // Add visual guest feedback
        dailyBtn.style.opacity = '0.5';
        dailyBtn.style.pointerEvents = 'none';
        return;
    }

    const played = await hasUserCompletedDaily(session);

    if (!played) {
        dailyBtn.classList.add('is-active');
        dailyBtn.classList.remove('is-disabled');
        dailyBtn.style.pointerEvents = 'auto'; // UNLOCK physically
        dailyBtn.style.opacity = '1';          // Ensure it looks clickable
    } else {
      lockDailyButton();
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
            startGame(false);
        };
    }

lobbyBtn.onclick = async () => {
    // 1. Show the Lobby UI (Hide the start screen)
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    loadSounds();
    // 2. Initialize the search for a match
    await joinMatchmaking();
};
  
    if (liteBtn) {
    liteBtn.onclick = async () => {
        isDailyMode = false;
        isWeeklyMode = false;
        isLiteMode = true; // Set the Lite mode flag
        
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        loadSounds();
        startGame(false);
    };
}

    if (dailyBtn) {
    dailyBtn.onclick = async () => {
        // 1. Get session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            console.error("Auth error:", error);
            alert("Your session has expired. Please log in again.");
            localStorage.removeItem('supabase.auth.token'); 
            window.location.href = '/login.html';
            return;
        }

        // 2. Double-check "Played" status
        const played = await hasUserCompletedDaily(session);
        if (played) return; 
              
        // 3. Sync with other tabs
        if (syncChannel) {
            syncChannel.send({
                type: 'broadcast',
                event: 'lock-daily',
                payload: { userId: session.user.id }
            }).then(resp => {
              if (resp !== 'ok') console.error("Broadcast failed:", resp);
          });
        }

        // 4. Lock button locally 
        lockDailyButton();     
          
        // 5. Setup Audio & Mode
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        loadSounds();
        
        isDailyMode = true;
        isWeeklyMode = false; 
        preloadQueue = []; // Clear old stuff

        try {
            // We await the setup of IDs and the first batch of preloads
            await startDailyChallenge(); 
        } catch (err) {
            console.error("Daily start failed:", err);
            dailyBtn.classList.remove('loading');
        }
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
    // 1. Reset numerical state
    score = 0;
    weeklyQuestionCount = 0;
    streak = 0;
    dailyQuestionCount = 0; // Don't forget this!
      
    if (isLiveMode) {
            preloadQueue = []; // Clear old match questions
            remainingQuestions = [];
            isWeeklyMode = false;
            isDailyMode = false;
            isLiteMode = false;
            resetGame();
            await joinmatchmaking();
        }  
    // 2. wipe old text/images, but DO NOT show the game screen yet
    resetGame(); 
   
    // 3. Start the correct game engine 
    if (isWeeklyMode) {
           // Re-run the weekly setup to get the same 50 IDs
          await startWeeklyChallenge(); 
    } else if (isDailyMode) {
           // Usually Daily is locked after 1 play, but for safety:
           await startDailyChallenge();
    } else if (isLiteMode) {
           isLiteMode = true;
           await startGame(false);
    } else {
          // Normal Mode - Reset flags just in case
          isWeeklyMode = false;
          isDailyMode = false;
          isLiteMode = false;
          isLiveMode = false;
          await startGame(false);
    }
   // 3. show game screen
    document.getElementById('end-screen').classList.add('hidden'); // Hide End
    document.getElementById('game').classList.remove('hidden');    // Show Game
    document.body.classList.add('game-active');                   // Add background class   
      
  };
}
  if (mainMenuBtn) {  
        mainMenuBtn.onclick = async () => {
        preloadQueue = []; // Clear the buffer only when going back to menu
        // Manual UI Reset instead:
        await resetLiveModeState();
        document.getElementById('victory-screen').classList.add('hidden');
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        document.body.classList.remove('game-active');
    };
  }
  if (leaveLobbyBtn) {  
        leaveLobbyBtn.onclick = async () => {
        // Manual UI Reset instead:
        await resetLiveModeState();
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        document.body.classList.remove('game-active');
    };
  }
  if (rejoinLobbyBtn) {  
        rejoinLobbyBtn.onclick = async () => {
        // 1. Hide victory immediately so it doesn't flicker
        document.getElementById('victory-screen').classList.add('hidden');
        window.isTransitioning = false; // Reset the gatekeeper
        // 2. Immediately trigger matchmaking again
        await joinMatchmaking();
    };
  }
  // Logic for "Main Menu" in victory screen
    if (victoryMainMenuBtn) {
        victoryMainMenuBtn.onclick = async () => {
            // 1. Full reset of network/UI
            await resetLiveModeState();
            // 2. Ensure we are back at the start screen
            document.getElementById('victory-screen').classList.add('hidden');
            document.getElementById('game').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
            document.body.classList.remove('game-active');
        };
    }
  // --- 5. HANDLE "CONTINUE" ---
if (soloBtn) {
    // Using addEventListener is more reliable than .onclick
    soloBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevents parent containers from stealing the click
        
        console.log("Solo button clicked! Starting transition...");

        // 1. Reset the logic flags
        window.isTransitioning = false; 
        window.pendingVictory = false; 
        isLiveMode = false; 
        hasDiedLocally = false;
        
        // Use a safer way to hide the victory screen
        if (victoryScreen) victoryScreen.classList.add('hidden');
        
        document.body.classList.remove('lobby-active');
        document.body.classList.add('game-active');

        // 2. Adjust Clock
        gameStartTime = Date.now() - (accumulatedTime || 0);

        // 3. Kick off the solo loop
        if (preloadQueue.length === 0 && remainingQuestions.length === 0) {
            await endGame();
        } else {
            loadQuestion(); 
        }
    });
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
  
  // This will check if a user is logged in and lock the button if they aren't
  await syncDailyButton();
  // This will check if a user has played daily mode already and will unlock it if they did
  await updateShareButtonState();
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
        userId = null;
        // IMPORTANT: Only wipe if we are CERTAIN this is an intentional logout
        // and not just a slow connection.
        if (event === 'SIGNED_OUT') {
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
  
    // Sync their daily status
    await fetchDailyStatus(session.user.id);
    // Establish the live sync
   if (!syncChannel) {
        syncChannel = setupRealtimeSync(session.user.id);
    }
    updateLevelUI();
    await syncDailyButton();
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
  
    // 1. Guest = Always disabled
    if (!session) {
        shareBtn.classList.add('is-disabled');
        shareBtn.classList.remove('is-active');
        shareBtn.style.opacity = "0.5";
        shareBtn.style.pointerEvents = "none";
        return;
    }

    // 2. Check both Local Storage and Database
    const savedDate = localStorage.getItem('dailyPlayedDate');
    const localScore = localStorage.getItem('lastDailyScore');
    
    // Check DB for the source of truth
    const hasPlayedToday = await hasUserCompletedDaily(session);
    
    // The button should be active ONLY if the DB says they played 
    // AND we actually have a score to share from today.
    const isScoreValid = (localScore !== null && savedDate === todayStr);
  
    if (hasPlayedToday && isScoreValid) {
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
    //await syncDailyButton();
    await updateShareButtonState();
}


function lockDailyButton() {
    if (!dailyBtn) return;
    dailyBtn.classList.add('is-disabled');
    dailyBtn.classList.remove('is-active');
    //dailyBtn.style.opacity = '0.5';
    //dailyBtn.style.pointerEvents = 'none'; // Makes it ignore all clicks/touches
    //dailyBtn.onclick = () => alert("You've already played today!");
}

function lockWeeklyButton() {
    if (!weeklyBtn) return;
    weeklyBtn.classList.add('is-disabled'); // fix ??
    weeklyBtn.classList.remove('is-active');
    //weeklyBtn.style.opacity = '0.5';
    //weeklyBtn.style.pointerEvents = 'none'; // Makes it ignore all clicks/touches
    
}
function lockLobbyButton() {
    if (!lobbyBtn) return;
    lobbyBtn.classList.add('is-disabled');
    lobbyBtn.classList.remove('is-active');
    //lobbyBtn.style.opacity = '0.5';
    //lobbyBtn.style.pointerEvents = 'none'; // Makes it ignore all clicks/touches   
}
// ====== GAME ENGINE ======

function resetGame() {
    // 1. CRITICAL: Reset logical gates
    gameEnding = false;        // Required so the NEXT game can save data
    hasDiedLocally = false;    // Required so you can click answers in the next live match
    window.isTransitioning = false;
    window.pendingVictory = false;

    // 2. Stop any active logic
    clearInterval(timer);
    stopTickSound(); 
    document.querySelectorAll('.firework-particle').forEach(p => p.remove());
  
    // 3. Reset numerical state
    score = 0;
    currentQuestion = null;

    // 4. WIPE UI IMMEDIATELY
    questionText.textContent = '';
    answersBox.innerHTML = '';
    
    // 5. Reset Timer Visuals
    timeLeft = 15;
    if (timeDisplay) timeDisplay.textContent = timeLeft;
    if (timeWrap) timeWrap.classList.remove('red-timer');
    
    // 6. Reset Score Visual
    if (scoreDisplay) scoreDisplay.textContent = `Score: 0`;
      
    // 7. Image cleanup
    questionImage.style.display = 'none';
    questionImage.style.opacity = '0';
    questionImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  
    // 8. Title cleanup
    const gameOverTitle = document.getElementById('game-over-title');
    const gzTitle = document.getElementById('gz-title');
    if (gameOverTitle) {
        gameOverTitle.classList.add('hidden');
        gameOverTitle.textContent = ""; // Clear text too
    }
    if (gzTitle) {
        gzTitle.classList.add('hidden');
        gzTitle.textContent = "";
    }

    if (weeklyTimeContainer) weeklyTimeContainer.style.display = 'none';
}


async function preloadNextQuestions(targetCount = 3) {
    let attempts = 0;

    while (
        preloadQueue.length < targetCount &&
        remainingQuestions.length > 0 &&
        attempts < 10
    ) {
        attempts++;
        let index;
        if (isLiveMode) {
              // In , always take the NEXT one in the pre-shuffled list
              index = 0; 
          } else {
              // Solo modes can stay random
              index = Math.floor(Math.random() * remainingQuestions.length);
          }
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
                if (preloadQueue.length > 0) {
                  await img.decode();
                } 
                
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


async function startGame(isLive = false) {
    try {
        isLiveMode = isLive; // Set our global flag
        roundOpen = true; 
        // Inside startGame(isLive = false)
        if (!isLiveMode) {
          // Ensure no leftover timeouts from  are running
          if (typeof refereeTimeout !== 'undefined') clearTimeout(refereeTimeout);
          // 1. DATA PREP (Background - User still sees Start Screen)
          if (masterQuestionPool.length === 0) {
              const { data: idList, error } = await supabase.from('questions').select('id');
              if (error) throw error;
              masterQuestionPool = idList.map(q => q.id);
          }
  
          remainingQuestions = [...masterQuestionPool].sort(() => Math.random() - 0.5);
          if (isLiteMode) {
              // Take only the first 100 questions from the shuffled pool
              remainingQuestions = remainingQuestions.slice(0, LITE_LIMIT);
          }
        
          const bufferedIds = preloadQueue.map(q => q.id);
          remainingQuestions = remainingQuestions.filter(id => !bufferedIds.includes(id));
          // 5. FETCH ONLY THE FIRST QUESTION IMMEDIATELY
          // If queue is empty, get one right now so we can start
          if (preloadQueue.length === 0) {
              await preloadNextQuestions(1); // Modified to accept a 'count'
          }
      }

        // 3. INTERNAL STATE RESET
        clearInterval(timer);
        score = 0;
        streak = 0;
        dailyQuestionCount = 0;
        currentQuestion = null;
        gameEnding = false;

        // 4. UI PREP
        // Use resetGame() or manual wipe here
        questionText.textContent = '';
        answersBox.innerHTML = '';
        questionImage.style.display = 'none';
        questionImage.src = '';
        updateScore();
       
        // This ensures the "Live" game and the "Clock" start at the exact same millisecond
        gameStartTime = Date.now();

        // 5. THE BIG SWAP (User finally sees the game)
        document.body.classList.add('game-active');
        game.classList.remove('hidden');
        document.getElementById('start-screen').classList.add('hidden');
        endScreen.classList.add('hidden');
        updateSurvivorCountUI();

        // 4. STARTING THE ENGINE
        if (isLiveMode) {
            // DO NOT call loadQuestion() yet. 
            // Wait for the Supabase Broadcast to tell us which question is #1.
            showWaitingForPlayersOverlay(); 
        } else {
            loadQuestion(); // Start immediately for Solo
            // 6. FILL THE REST IN THE BACKGROUND
            // We don't 'await' this; it runs while the user is looking at question 1
            preloadNextQuestions(3);
        }
    } catch (err) {
        console.error("startGame error:", err);
    }
}

async function preloadSpecificQuestions(idsToFetch) {
    if (idsToFetch.length === 0) return;

    const { data, error } = await supabase.rpc('get_questions_by_ids', { input_ids: idsToFetch });
    
    if (data) {
        // MAP the data back to the order of the idsToFetch array
        const ordered = idsToFetch.map(id => data.find(q => q.id === id)).filter(Boolean);
        
        preloadQueue.push(...ordered);
        
        // Remove these specific IDs from remainingQuestions so we don't fetch them again
        remainingQuestions = remainingQuestions.filter(id => !idsToFetch.includes(id));
    }
}

async function loadQuestion(broadcastedId = null, startTime = null) {
  // Prevent loading if we are dead or waiting for victory screen
    if (hasDiedLocally || window.pendingVictory) {
        console.log("loadQuestion blocked: Player is dead or match is ending.");
        return;
    }
   // 1. End Game Checks
    if (isWeeklyMode && weeklyQuestionCount >= WEEKLY_LIMIT) { await endGame(); return; }
    if (isLiteMode && score >= LITE_LIMIT) { await endGame(); return; }
        
    // Normal Mode "Out of questions" check
    //if (!isLiveMode && preloadQueue.length === 0 && remainingQuestions.length === 0 && currentQuestion !== null) {
        //await endGame();
        //return;
   // }
    if (!isLiveMode && !window.isTransitioning && preloadQueue.length === 0 && remainingQuestions.length === 0) {
      if (currentQuestion !== null) {
          await endGame();
          return;
      }
  }
    // A. IMMEDIATE CLEANUP
  const allBtns = document.querySelectorAll('.answer-btn');
    allBtns.forEach(btn => {
        btn.removeAttribute('data-answered-correctly');
        btn.classList.remove('correct', 'wrong');
        btn.disabled = false;
    });
    questionImage.style.display = 'none';
    questionImage.style.opacity = '0';
    questionImage.src = '';
    questionText.textContent = '';
    answersBox.innerHTML = '';
  
    // B. THE STALL GUARD
    // Fill buffer if low
    if (preloadQueue.length <= 2 && remainingQuestions.length > 0) {
        preloadNextQuestions(5); 
    }

    // STALL: Wait if literally empty
    if (preloadQueue.length === 0 && remainingQuestions.length > 0) {
        console.log("Stall Guard triggered: Waiting for questions...");
        await preloadNextQuestions();
    }

    // C. FINAL SAFETY CHECK
    if (preloadQueue.length === 0) {
        console.error("No questions available.");
        // Only trigger endGame if we aren't in a Live Match, 
        // or if the Live Match is truly over.
        if (!isLiveMode) await endGame();
        return;
    }
  
    currentQuestion = preloadQueue.shift();
  
  
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
  
  // IMPORTANT: Unlock the round so buttons actually work!
  roundOpen = true;
  startTimer();   
};
   


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
       // --- ROUND END LOGIC ---
    if (timeLeft <= 0) {
      clearInterval(timer);
      stopTickSound();

      // LIVE MODE: report timeout once
      if (isLiveMode) {
        if (roundOpen) {
          roundOpen = false;

          gameChannel.send({
            type: 'broadcast',
            event: 'round-result',
            payload: {
              userId,
              roundId,
              result: 'timeout'
            }
          });

          questionText.textContent = "Waiting for other players...";
          // Image cleanup
          if (questionImage) questionImage.style.display = 'none';
        }
        return; // ⛔ never fall through in live mode
      }

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
    stopTickSound(); // <--- ADD THIS FIRST
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    playSound(wrongBuffer);
    await highlightCorrectAnswer();
    if (isWeeklyMode) weeklyQuestionCount++; // Count the "skip/fail" towards the 50
  
    if (isDailyMode || isWeeklyMode) {
        // Continue the game
        setTimeout(loadQuestion, 1500);
    } else {
        // End the game
        setTimeout(endGame, 1000);
    }
}

async function checkAnswer(choiceId, btn) {
    if (!roundOpen) return;
    stopTickSound(); // CUT THE SOUND IMMEDIATELY
    // If timeLeft is 0, we treat it as a 'wrong' answer automatically
    let isCorrect = false; 
    
    // --- 1. HANDLE INPUT (Only if time remains) ---
    if (timeLeft > 0) {
        document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
        
        // Check answer
        const { data: correct, error } = await supabase.rpc('check_my_answer', {
            input_id: currentQuestion.id,
            choice: choiceId
        });

        if (error) return console.error("RPC Error:", error);
        isCorrect = correct;

        if (isCorrect) {
          playSound(correctBuffer);
          if (btn) btn.dataset.answeredCorrectly = "true"; // Mark this for the Hub
          if (btn) btn.classList.add('correct');
          // Update Local State & UI
          score++;
          updateScore();
          const currentUsername = localStorage.getItem('cachedUsername') || 'Player';
         
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
                    // NORMAL & WEEKLY both use the 10-streak logic
                    streak++; // Only track streak in normal mode
                    if (streak === 10) { // change this back to 10
                        gained += 30;
                        streak = 0; 
                        isBonusEarned = true; // Normal bonus!
                    }
            }
            // 4. TRIGGER BONUS SECOND (This goes behind Level Up in the queue)
            if (isBonusEarned) {
                showNotification("BONUS XP!", bonusBuffer, "#a335ee"); //purple
            }
          
            // A. Check for Level Up / Milestones BEFORE updating the global XP
            checkLevelUp(gained);

            // 2. Lucky Guess Check (< 1 second)
            if (timeLeft >= 14) {
                saveAchievement('fastest_guess', true); // This triggers the "Lucky Guess"
            }
            if (timeLeft <= 1 && timeLeft > 0) {
                saveAchievement('just_in_time', true); // 2. Just in Time
            }

            // halfway 50/100 lite mode score
            if (isLiteMode && score === 50) {
                saveAchievement('lite_50', true); // Sync to Supabase
            }
          
            // halfway 25/50 weekly mode score
            if (isWeeklyMode && score === 25) {
                saveAchievement('weekly_25', true); // Sync to Supabase
            }

            // normal mode scores - achievements
            checkNormalScoreAchievements(currentUsername, score);
          
            // 5. UPDATE DATA
            currentProfileXp += gained; // Add the XP to local state
            localStorage.setItem('cached_xp', currentProfileXp);
            updateLevelUI(); // Refresh the Player/Level row
            triggerXpDrop(gained);
            
            await supabase.from('profiles')
            .update({ xp: currentProfileXp })
            .eq('id', session.user.id);
        }
      
        // This is where the pet roll happens
        rollForPet();
        
      } else {
      // wrong answer
        playSound(wrongBuffer);
        streak = 0; // Reset streak on wrong answer in both Normal and Weekly modes
        if (btn) btn.classList.add('wrong');
        await highlightCorrectAnswer();
      
    }
  }
    // --- 2. LIVE MODE BROADCAST (Must run even if timeLeft <= 0) ---
    if (isLiveMode) {

        roundOpen = false;
        const resultStatus = isCorrect ? 'correct' : 'wrong';

        gameChannel.send({
            type: 'broadcast',
            event: 'round-result',
            payload: { 
                userId, 
                roundId, 
                result: resultStatus 
            }
        });

        if (questionText) {
            questionText.textContent = isCorrect 
                ? "Correct! Waiting for survivors..." 
                : "Time up / Wrong! Waiting for match results...";
        }
         // 1. VISUAL FEEDBACK: Hide the question assets immediately
        if (questionImage) {
            questionImage.style.display = 'none';
            questionImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
      
        if (answersBox) answersBox.innerHTML = '<div class="loading-spinner"></div>';
        return; 
    }

    // --- 3. NON-LIVE MODE CONTINUATION ---
    if (!isLiveMode) {
       if (isCorrect || isDailyMode || isWeeklyMode) {
            // Challenges keep going until the limit is reached
            setTimeout(loadQuestion, 1500);
        } else {
            // Only Normal and Lite modes end on a wrong answer
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


// 1. Updated checkLevelUp function
function checkLevelUp(gainedXp) {
    const oldLevel = getLevel(currentProfileXp);
    const newLevel = getLevel(currentProfileXp + gainedXp);

    if (newLevel > oldLevel) {
        triggerFireworks(); 
        // Trigger the generic Level Up notification
        showNotification("LEVEL UP!", levelUpBuffer, "#ffde00"); 

        // --- MILESTONE CHECKS ---
        if (newLevel === 10) {
            //saveAchievement('reach_level_10', true); // Save to Supabase
            showAchievementNotification("Reach Level 10");
        } else if (newLevel === 50) {
            //saveAchievement('reach_level_50', true);
            showAchievementNotification("Reach Level 50");
        } else if (newLevel === 99) {
            //saveAchievement('reach_max_level', true);
            showAchievementNotification("Reach Max Level");
        }
    }
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
function showNotification(message, soundToPlay, color = "#ffde00") {
    notificationQueue.push({ 
        text: message, 
        sound: soundToPlay,
        color: color // Default is Gold if no color is provided
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

    if (item.sound) {
        playSound(item.sound); 
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

async function endGame(isSilent = false) {
    if (gameEnding) return;
    gameEnding = true;
    clearInterval(timer);
    stopTickSound();

    // --- ADD THIS BLOCK HERE ---
    // If we are in a live match, leave the channel immediately.
    // This prevents the Referee from thinking we are still an "active" survivor.
    if (isLiveMode && gameChannel) {
        console.log("Leaving Live Match channel...");
        isLiveMode = false; // Kill the flag immediately
        supabase.removeChannel(gameChannel);
        gameChannel = null;
    }
    // ---------------------------
  
   // 1. Calculate time IMMEDIATELY for all modes
    const endTime = Date.now();
    // Determine which start time to use
    let startValue;
    if (isWeeklyMode) {
        startValue = weeklyStartTime;
    } else {
        // This covers Normal, Lite, and now Live Mode
        startValue = gameStartTime; 
    }
    const totalMs = endTime - startValue;
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
            await saveAchievement('weekly_50', true);
            if (totalSeconds <= 120) await saveAchievement('weekly_sub_2', true);
            if (totalSeconds <= 180) await saveAchievement('weekly_sub_3', true);
        }
    
      displayFinalTime(totalMs);
      
    // Save Score and Check for PB
      let isNewPB = session ? await saveWeeklyScore(session.user.id, username, score, totalMs) : false;
      // Update Titles
      if (gameOverTitle) {
          gameOverTitle.textContent = isNewPB ? "New PB achieved!" : "Weekly Mode Completed!";
          gameOverTitle.classList.remove('hidden');
      }
    } else if (isDailyMode) {
        if (playAgainBtn) playAgainBtn.classList.add('hidden');
        if (gameOverTitle) {
            gameOverTitle.textContent = randomMsg;
            gameOverTitle.classList.remove('hidden');
        }
  
        // Saves the score for the leaderboard
        await saveDailyScore(session, randomMsg); 
        // This one function now handles: Streak, Total Count, and Perfect 10/10
        // Pass the actual 'score' variable here
        localStorage.setItem('lastDailyScore',  score);
        localStorage.setItem('lastDailyScoreDate', new Date().toISOString().split('T')[0]);
        await updateDailyStreak(score);
        // Show the streak container
        if (streakContainer && streakCount) {
            streakContainer.style.display = 'block';
            streakCount.textContent = currentDailyStreak;
        }
      const shareBtn = document.getElementById('shareBtn');
      if (shareBtn && isDailyMode) {
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
                if (totalSeconds <= 240) await saveAchievement('lite_sub_4', true);
                if (totalSeconds <= 360) await saveAchievement('lite_sub_6', true);
            }
          
            let isLitePB = session ? await saveLiteScore(session.user.id, username, score, totalMs) : false;
        
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
        let isNewPB = false;
        // Trigger the high-score save
        if (session && score > 0) {
            // We pass the current username, and the score achieved
            isNewPB = await saveNormalScore(username, score, totalMs);
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
            // 3. Otherwise, show standard Game Over, or PB achieved if its PB.
        } else if (gameOverTitle) {
            //if (gzTitle) gzTitle.classList.add('hidden'); // Hide Gz if it was there from before
            gameOverTitle.textContent = isNewPB ? "New PB achieved!" : "Game Over!";
            gameOverTitle.classList.remove('hidden');
        }
      }
    }
    // 4. THE BIG SWAP (Final step)
    // Use a tiny timeout or requestAnimationFrame to ensure DOM updates are ready
    // Only switch to the standard End Screen if isSilent is false
    // At the very end of your endGame function:
    if (!isSilent) {
        requestAnimationFrame(() => {
        document.body.classList.remove('game-active'); 
        game.classList.add('hidden');
        endScreen.classList.remove('hidden');

        // 2. WIPE GAME UI IMMEDIATELY 
        // This prevents seeing old questions/answers behind the transition
        questionText.textContent = ''; 
        answersBox.innerHTML = '';
        questionImage.style.display = 'none';
        questionImage.src = ''; 
      
        updateShareButtonState();
        gameEnding = false;
    });
    } else {
        // --- LIVE MODE / SILENT PATH ---
        console.log("EndGame (Silent) processing background tasks...");
        
        // Don't touch the victory-screen titles here anymore! 
        // showLiveResults has already handled it.
        
        // Just do the cleanup
        await resetLiveModeState(true); 
        gameEnding = false;
    }
}



async function showLiveResults(isWinner) {
    console.log("Processing Live Results. Winner:", isWinner);
    const victoryScreen = document.getElementById('victory-screen');
    const gameContainer = document.getElementById('game');

    // 1. Swap UI Containers
    if (gameContainer) gameContainer.classList.add('hidden');
    if (victoryScreen) {
        victoryScreen.classList.remove('hidden');
        victoryScreen.style.display = 'flex'; // Force bypass any CSS 'hidden'
    }

    // 2. Update Content
    const statusText = document.getElementById('victory-status-text');
    const statsText = document.getElementById('victory-stats');
    const soloBtn = document.getElementById('soloBtn');
    const emojis = victoryScreen.querySelectorAll('.emoji');

    if (isWinner) {
        statusText.textContent = "VICTORY";
        statsText.textContent = "You are the last Survivor!";
        if (soloBtn) soloBtn.classList.remove('hidden');
        emojis.forEach(e => e.textContent = "🏆");
    } else {
        statusText.textContent = "ELIMINATED";
        statsText.textContent = "Better luck next time!";
        if (soloBtn) soloBtn.classList.add('hidden'); // Losers can't continue
        emojis.forEach(e => e.textContent = "💀");
    }

    // 3. Save Data Silently
    try {
        // Passing 'true' tells the reset function to keep the victory screen visible
        await endGame(true); 
        
        // RE-ASSERT VISIBILITY: In case endGame()'s internal reset logic 
        // accidentally toggled the 'hidden' class back on.
        if (victoryScreen && victoryScreen.classList.contains('hidden')) {
            console.log("Forcing victory screen back to visible after reset.");
            victoryScreen.classList.remove('hidden');
            victoryScreen.style.display = 'flex';
        }
    } catch (err) {
        console.error("End-game processing failed:", err);
    }
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

async function saveLiteScore(userId, username, currentScore, timeInMs) {
    // 1. Fetch the existing Lite data
    const { data, error: fetchError } = await supabase
        .from('scores')
        .select('lite_data')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError) {
        console.error("Fetch Lite error:", fetchError);
        return false; 
    }

    // 2. Set defaults if no record exists
    const bestLite = data?.lite_data || { score: -1, time: 9999999 };
    
    // 3. Comparison Logic: Higher score is better. 
    // If scores are tied, a faster time (lower ms) is better.
    const isHigherScore = currentScore > bestLite.score;
    const isFasterTime = (currentScore === bestLite.score && timeInMs < bestLite.time);

    if (isHigherScore || isFasterTime) {
        const { error: upsertError } = await supabase
            .from('scores')
            .upsert({ 
                user_id: userId,
                username: username,
                lite_data: { 
                    score: currentScore, 
                    time: timeInMs 
                } 
            }, { onConflict: 'user_id' }); 

        if (upsertError) {
            console.error("Upsert Lite error:", upsertError);
            return false;
        }
        
        return true; // Is a new PB
    } 

    return false; // Not a new record
}
 
async function saveWeeklyScore(userId, username, currentScore, timeInMs) {
    const { data, error: fetchError } = await supabase
        .from('scores')
        .select('weekly_data')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError) {
        console.error("Fetch error:", fetchError);
        return false; // Return false so UI doesn't show "PB" on error
    }

    // Default values if no record exists
    const bestWeekly = data?.weekly_data || { score: -1, time: 999999999 };
    
    const isHigherScore = currentScore > bestWeekly.score;
    const isFasterTime = (currentScore === bestWeekly.score && timeInMs < bestWeekly.time);

    if (isHigherScore || isFasterTime) {
        const { error: upsertError } = await supabase
            .from('scores')
            .upsert({ 
                user_id: userId,
                username: username,
                weekly_data: { 
                    score: currentScore, 
                    time: timeInMs 
                } 
            }, { onConflict: 'user_id' });

        if (upsertError) {
            console.error("Upsert error:", upsertError);
            return false;
        }
        
        return true; // SUCCESS: This tells endGame to show "New PB achieved!"
    } 

    return false; // Not a new record
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
    const channel = supabase.channel(`user-sync-${userId}`, {
        config: {
            broadcast: { self: false } 
        }
    });

    // Track connection state internally
    let isReady = false;
    const queue = [];

    channel
        .on('broadcast', { event: 'lock-daily' }, (payload) => {
            lockDailyButton();
            fetchDailyStatus(userId);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                isReady = true;
                // Flush any messages sent while we were connecting
                while (queue.length > 0) {
                    const next = queue.shift();
                    channel.send(next);
                }
            }
        });

    // Wrap the send method to be "connection-aware"
    const originalSend = channel.send.bind(channel);
    channel.send = (payload) => {
        if (isReady) {
            return originalSend(payload);
        } else {
            queue.push(payload);
        }
    };

    return channel;
}


async function saveNormalScore(currentUsername, finalScore, finalTime) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const userId = session.user.id;

    // 1. Fetch both the Leaderboard record AND the Profile data
    // This fixes the "profile is not defined" error
    const [recordResponse, profileResponse] = await Promise.all([
        supabase.from('scores').select('score, time_ms').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('achievements').eq('id', userId).maybeSingle()
    ]);

    const record = recordResponse.data;
    const profile = profileResponse.data;

    const oldBest = record?.score || 0;
    const oldTime = record?.time_ms || 9999999;
    
    // Safely grab existing achievements or start fresh
    let achievements = profile?.achievements || {};

    // --- 3. PB LOGIC ---
    const isHigherScore = finalScore > oldBest;
    const isFasterTime = (finalScore === oldBest && finalTime < oldTime);

    if (isHigherScore || isFasterTime) {
        const { error: scoreError } = await supabase
            .from('scores')
            .upsert({ 
                user_id: userId, 
                username: currentUsername, 
                score: finalScore,
                time_ms: finalTime 
            }, { onConflict: 'user_id' });

        if (!scoreError) {
            // Update the local object
            achievements.best_score = finalScore;
            achievements.best_time = finalTime;
          
            // Save updated achievements back to profile
            await supabase
                .from('profiles')
                .update({ achievements })
                .eq('id', userId);

            return true; // PB achieved!
        } else {
            console.error("Leaderboard Save Error:", scoreError.message);
        }
    }
    
    return false; // Not a PB
}


// 1. Updated checkNormalScoreAchievements function
async function checkNormalScoreAchievements(currentUsername, finalScore) {
  const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      const userId = session.user.id;
  
      // 1. Fetch only the normal mode score
      const { data: record, error } = await supabase
          .from('scores')
          .select('score')
          .eq('user_id', userId)
          .maybeSingle();
      
      if (error) {
          console.error("Error fetching score:", error.message);
          return false;
      }
      
      // 2. Now you can use record.score 
      const oldBest = record?.score || 0;
  
      // --- 2. ACHIEVEMENT MILESTONES ---
      if (finalScore == 10 && oldBest < 10) showAchievementNotification("Reach 10 Score");
      if (finalScore == 50 && oldBest < 50) showAchievementNotification("Reach 50 Score");
      if (finalScore == 100 && oldBest < 100) showAchievementNotification("Reach 100 Score");
      if (finalScore == number_of_questions && oldBest < number_of_questions) showAchievementNotification("Reach Max Score");
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

window.getWeeklySliceIndex = getWeeklySliceIndex; // delete after testing

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

async function calculateStreakFromHistory(userId) {
    const { data, error } = await supabase
        .from('daily_attempts')
        .select('attempt_date') // Use the column you manually save to
        .eq('user_id', userId)
        .order('attempt_date', { ascending: false });

    if (error || !data || data.length === 0) return 0;

    // 1. Get unique strings (they are already YYYY-MM-DD from your saveDailyScore)
    const uniqueDates = [...new Set(data.map(d => d.attempt_date))];

    // todayStr is UTC (from the top of your script)
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // 2. Initial check: Is the latest game from Today or Yesterday?
    const latestGame = uniqueDates[0];
    if (latestGame !== todayStr && latestGame !== yesterdayStr) {
        return 0;
    }

    // 3. Count backward through the strings
    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
        // Force UTC by adding T00:00:00Z
        const current = new Date(uniqueDates[i] + 'T00:00:00Z');
        const next = new Date(uniqueDates[i + 1] + 'T00:00:00Z');
        
        const diffTime = Math.abs(current - next);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
        } else if (diffDays > 1) {
            break; // Found a gap larger than 1 day
        }
    }

    return streak;
}


async function updateDailyStreak(currentScore) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // 1. Get the current Streak from History
    const actualStreak = await calculateStreakFromHistory(userId);

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
    else if (key === 'lite_sub_4' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "Speedrunner 100/100 sub 4m";
    }
    else if (key === 'lite_sub_6' && !achievements[key]) {
        isNewAchievement = true;
        notificationText = "GM speedrunner 100/100 sub 6m";
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

async function rollForPet() {
  // 1. Check if the user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session exists (Guest), exit the function immediately
    if (!session) {
        //console.log("Guest player: Skipping pet roll.");
        return; 
    }

    // 1. Fetch user's current collection
    const { data: profile } = await supabase
        .from('profiles')
        .select('collection_log')
        .eq('id', session.user.id)
        .single();

    let currentLog = profile?.collection_log || [];

    // 2. Define the Pools
    const allPets = {
        legendary: [
            { id: 'pet_olmlet', name: 'Olmlet' },
            { id: 'pet_jad', name: 'TzRek-Jad' }
        ],
        rare: [
            { id: 'pet_yami', name: 'Yami' },
            { id: 'pet_zilyana', name: 'Pet Zilyana' }
        ],
        uncommon: [
            { id: 'pet_vorki', name: 'Vorki' },
            { id: 'pet_snakeling', name: 'Pet Snakeling' }
        ],
        common: [
            { id: 'pet_mole', name: 'Baby Mole' },
            { id: 'pet_kraken', name: 'Pet Kraken' }
        ]
    };

    // --- NEW: Calculate Total Possible Pets ---
    const flatAllPets = Object.values(allPets).flat();
    const totalPetCount = flatAllPets.length;
  
    // 3. Filter pools to ONLY include missing pets
    const missingLegendary = allPets.legendary.filter(p => !currentLog.includes(p.id));
    const missingRare = allPets.rare.filter(p => !currentLog.includes(p.id));
    const missingUncommon = allPets.uncommon.filter(p => !currentLog.includes(p.id));
    const missingCommon = allPets.common.filter(p => !currentLog.includes(p.id));

    const roll = Math.random();
    let reward = null;

    // 4. Roll the dice (Only if missing pets exist in that tier)
   // 1/1000 = 0.001
  // 1/500  = 0.002
  // 1/200  = 0.005
  // 1/50   = 0.02

    if (roll <= 0.001 && missingLegendary.length > 0) {
        // Exact 1/1000 chance
        reward = missingLegendary[Math.floor(Math.random() * missingLegendary.length)];
    } 
    else if (roll <= (0.001 + 0.002) && missingRare.length > 0) {
        // Exact 1/500 chance (0.003 threshold)
        reward = missingRare[Math.floor(Math.random() * missingRare.length)];
    } 
    else if (roll <= (0.001 + 0.002 + 0.005) && missingUncommon.length > 0) {
        // Exact 1/200 chance (0.008 threshold)
        reward = missingUncommon[Math.floor(Math.random() * missingUncommon.length)];
    } 
    else if (roll <= (0.001 + 0.002 + 0.005 + 0.02) && missingCommon.length > 0) {
        // Exact 1/50 chance (0.028 threshold)
        reward = missingCommon[Math.floor(Math.random() * missingCommon.length)];
    }
  
    // 5. If they won a pet they didn't have
    if (reward) {
      // 1. First Pet Notification
        if (currentLog.length === 0) {
            showAchievementNotification("Unlock 1 Pet");
        }
        currentLog.push(reward.id);
        // 2. All Pets Notification (Check if new length matches total)
        if (currentLog.length === totalPetCount) {
            showAchievementNotification("Unlock all Pets");
        }

        await supabase
            .from('profiles')
            .update({ collection_log: currentLog })
            .eq('id', session.user.id);
      
      // Update LocalStorage so the Collection Log page updates instantly
      localStorage.setItem('cached_pets', JSON.stringify(currentLog));
      
      showCollectionLogNotification(reward.name);
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
        'Vorki': 'vorki.png',
        'Pet Snakeling': 'snakeling.png',
        'Yami': 'yami.png',
        'Pet Zilyana': 'zilyana.png',
        'Olmlet': 'olmlet.png',
        'TzRek-Jad': 'jad.png'
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
window.showCollectionLogNotification = showCollectionLogNotification;




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

window.showAchievementNotification = showAchievementNotification;


//live mode..
async function joinMatchmaking() {
   await resetLiveModeState();
  // 1. AUTH CHECK: This prevents the "Cannot read properties of null (reading 'id')" error
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        showNotification("Please log in to join Live Matches!", null, "#ff4444");
        return; // Stop the function here
    }
  // 3. UI SWAP: Total reset of visibility
  document.body.classList.remove('game-active'); // Remove game state
  document.body.classList.add('lobby-active');    // Add lobby state
  // Hide EVERY other screen
  document.getElementById('start-screen')?.classList.add('hidden');
  document.getElementById('victory-screen')?.classList.add('hidden'); // CRITICAL
  document.getElementById('game')?.classList.add('hidden');
  
  // Show the Lobby
  document.getElementById('lobby-screen')?.classList.remove('hidden'); // Ensure this isn't hidden!
  
  window.finalStartSent = false;
  window.pendingVictory = false; // Add this reset
  window.lobbyDeleted = false; // Reset the deletion flag for the new session
  window.matchStarted = false;  // Reset!
  hasDiedLocally = false;

  isLiveMode = false; // Ensure this is false until the match actually starts
  preloadQueue = [];  // Clear questions from previous rounds
  remainingQuestions = [];
  
  // 1. CLEANUP: If there is an old channel, remove it first
    if (lobbyChannel) {
        console.log("Cleaning up old lobby channel...");
        await supabase.removeChannel(lobbyChannel);
        lobbyChannel = null;
    }
    // UI: Hide the title for mobile lobby view
    document.body.classList.add('lobby-active');
  
    // 1. Find an open lobby or create one
    let { data: lobby } = await supabase
        .from('live_lobbies')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // 3. CREATE LOBBY (This is where the 403 Forbidden happened)
      // Inside joinMatchmaking()
      if (!lobby) {
          const startTimestamp = new Date();
          startTimestamp.setMinutes(startTimestamp.getMinutes() + 1);
      
          // 1. Get all IDs in a STABLE order (ascending)
          const { data: idList } = await supabase
              .from('questions')
              .select('id')
              .order('id', { ascending: true }); // Always start with the same base list
              
          // 2. TRUE Fisher-Yates Shuffle
          const shuffledIds = idList.map(q => q.id);
          for (let i = shuffledIds.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
          }
      
          // 3. Save this array into the lobby row
          const { data: newLobby } = await supabase
              .from('live_lobbies')
              .insert([{ 
                  starts_at: startTimestamp.toISOString(),
                  question_ids: shuffledIds // You'll need a JSONB column named question_ids
              }])
              .select().single();
          lobby = newLobby;
    }
    currentLobby = lobby;
    setupLobbyRealtime(lobby);
}

function setupLobbyRealtime(lobby) {
    if (!lobby.id || !userId) return;

    lobbyChannel = supabase.channel(`lobby-${lobby.id}`, {
        config: { 
            presence: { key: userId },
            broadcast: { self: true } 
        }
    });

    lobbyChannel
    .on('presence', { event: 'sync' }, () => {
        const state = lobbyChannel.presenceState();
        const players = Object.values(state).flat();
        const count = players.length;
        
        updateLobbyUI(count, lobby.starts_at);

        // --- NEW READY CHECK LOGIC ---
        const readyCount = players.filter(p => p.status === 'ready_to_start').length;
        console.log(`Sync: ${readyCount}/${count} players ready.`);

        if (count >= 2 && isHost(lobbyChannel)) {
            // If NO ONE is ready yet, send the "Prepare" command
            if (readyCount === 0 && !isStarting) {
                console.log("Host: Sending Prepare Command...");
                triggerGamePrepare(lobby.id); 
            } 
            // If EVERYONE is ready, send the final "Start" command
            else if (readyCount === count && count >= 2) {
                console.log("Host: Everyone ready! Sending Start Signal...");
                sendFinalStartSignal(count);
            }
        }
    })
    .on('broadcast', { event: 'chat' }, ({ payload }) => {
        appendMessage(payload.username, payload.message);
    })
.on('broadcast', { event: 'prepare-game' }, async ({ payload }) => {
    // 1. Fetch data with both data and error defined
    let { data: lobbyData, error } = await supabase
        .from('live_lobbies')
        .select('question_ids')
        .eq('id', currentLobby.id)
        .single();

    // 2. Tiny retry logic: if DB is slow, wait 200ms and try one more time
    if (!lobbyData?.question_ids) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const retry = await supabase
            .from('live_lobbies')
            .select('question_ids')
            .eq('id', currentLobby.id)
            .single();
        lobbyData = retry.data;
        error = retry.error;
    }
  
    if (error || !lobbyData?.question_ids) {
        console.error("Failed to sync questions:", error);
        if (questionText) questionText.innerHTML = "Sync Error. Please rejoin.";
        return; 
    }
  
    // No need to shuffle! It's already shuffled in the DB.
    remainingQuestions = lobbyData.question_ids;

    // 2. Clear old data
    preloadQueue = []; 
    
    // 4. Preload the first few questions from the newly shuffled deck
    isLiveMode = true; // Set this so preloader knows to pull from the top of the deck
    await preloadNextQuestions(3);

    // 5. Tell Host you are ready
    await lobbyChannel.track({
        online_at: new Date().toISOString(),
        status: 'ready_to_start' 
    });
    
    if (questionText) questionText.innerHTML = "Syncing with players...";
})
        .on('broadcast', { event: 'start-game' }, async ({ payload }) => {
        console.log("Start signal received!");
        if (audioCtx.state === 'suspended') audioCtx.resume();
          
        // SAVE THE COUNT HERE
        matchStartingCount = payload.survivorCount || 2;  
          
        // 1. UI Swap - Do this immediately for responsiveness
        document.getElementById('lobby-screen')?.classList.add('hidden');
        document.getElementById('start-screen')?.classList.add('hidden');
        document.body.classList.add('game-active');
        if (game) game.classList.remove('hidden');
    
        // 2. Start the game logic
        beginLiveMatch(payload.survivorCount, payload.startTime);
    
        // 3. Delayed Cleanup
        setTimeout(async () => {
            if (lobbyChannel) {
                await supabase.removeChannel(lobbyChannel);
                lobbyChannel = null;
            }
            if (lobbyTimerInterval) clearInterval(lobbyTimerInterval);
        }, 1000);
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await lobbyChannel.track({ online_at: new Date().toISOString() });
            if (chatInput) {
                chatInput.disabled = false;
                chatInput.placeholder = "Type a message...";
            }
        }

        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !isStarting) {
            console.log("Connection lost. Retrying...");
            setTimeout(() => joinMatchmaking(), 3000);
        }
    });
}


async function beginLiveMatch(countFromLobby, syncedStartTime) {
    isLiveMode = true;
    hasDiedLocally = false;
    survivors = countFromLobby || 2; 
    updateSurvivorCountUI(survivors);
    window.pendingVictory = false;
    window.matchStarted = false;

    // Ensure we are using a unique ID for this specific match instance
    const matchId = currentLobby.id;
    gameChannel = supabase.channel(`game-${matchId}`, {
        config: { 
        presence: { key: userId },
        broadcast: { self: true } // CRITICAL for the Host to hear their own answer
    }
    });
gameChannel.on('broadcast', { event: 'round-ended' }, ({ payload }) => {
    const { outcome, winnerIds, dead, correct } = payload;

    // --- 1. PRIORITY CHECK: AM I A WINNER? ---
    // We check this first because even if you answered "wrong", 
    // if it's a "tie" or you're the sole survivor, you win.
    if (outcome === 'win' || outcome === 'tie') {
        if (winnerIds.includes(userId)) {
            console.log("Referee declared me a winner/co-winner!");
            
            // Mark as victory immediately to stop any auto-start logic
            window.pendingVictory = true; 
            isLiveMode = false;
            // NEW: Pass whether this specific user was in the 'correct' list
            const userWasCorrect = correct.includes(userId);
            transitionToSoloMode(outcome === 'win', userWasCorrect);
            return;
        }
    }

    // --- 2. ELIMINATION CHECK (The Critical Fix) ---
    // If I'm in the 'dead' list, OR if someone else won and I'm not them
    if (dead.includes(userId) || (outcome === 'win' && !winnerIds.includes(userId))) {
        console.log("I am eliminated. Closing game.");
        // 1. STATE LOCK: Stop everything immediately
        isLiveMode = false;
        hasDiedLocally = true;
        window.matchStarted = false; // Prevent auto-starting new rounds
        if (timer) clearInterval(timer);
      
        // --- NEW: LOBBY CLEANUP LOGIC ---
        const amIHost = isHost(); // Check host status before we disconnect
        const lobbyIdToDelete = currentLobby?.id;
        // If I'm the host and I just lost, I must kill the lobby records
        if (amIHost && lobbyIdToDelete) {
            console.log("Host eliminated: Cleaning up lobby records...");
            deleteCurrentLobby(lobbyIdToDelete);
        }
        // Clear the screen so they don't see the next question
        if (questionText) questionText.innerHTML = "";
        if (answersBox) answersBox.innerHTML = "";
        if (questionImage) questionImage.style.display = 'none';
      
        // 4. THE FIX: Hide Game Container and Show Results Screen
        // We do this immediately or with a very short delay (100ms)
        setTimeout(() => {
            // Force hide the game UI
            const gameContainer = document.getElementById('game');
            if (gameContainer) gameContainer.classList.add('hidden');
            document.body.classList.remove('game-active');
    
            // Show the victory/eliminated screen
            showLiveResults(false); 
        }, 100);
        return;
    }
  
    // --- 3. CONTINUATION CHECK ---
    // If we reach here, the game is continuing and I am still alive.
    survivors = correct.length;
    updateSurvivorCountUI(survivors);
    
    console.log(`Round ended. Survivors remaining: ${survivors}. Starting next round...`);
  
    setTimeout(() => { 
        // Triple-check flags to prevent Round 2 starting during a victory transition
        if (isLiveMode && !hasDiedLocally && !window.pendingVictory) {
            startLiveRound(); 
        }
    }, 1500);
});

    gameChannel.on('broadcast', { event: 'round-result' }, ({ payload }) => {
      if (!isHost(gameChannel)) return;
      // DEBUG: Log every incoming answer to see why it might be rejected
      console.log(`Referee received result from ${payload.userId}. Round in msg: ${payload.roundId}, Host Round: ${roundId}`);    
          
          // CHANGE: If the player is AHEAD of the host, the host should catch up
          // instead of ignoring the message.
          if (payload.roundId > roundId) {
              console.warn(`Referee catching up: Player is at ${payload.roundId}, Host was at ${roundId}`);
              roundId = payload.roundId; 
          }
      
        // Accept the result
        roundResults[payload.userId] = payload.result;
    
        const state = gameChannel.presenceState();
        const aliveIds = Object.keys(state);
        const reportedIds = Object.keys(roundResults);
    
        console.log(`Referee: ${reportedIds.length} answers received. Expected: ${aliveIds.length}`);
    
        // If everyone present has reported, end it
        const allPresentHaveAnswered = aliveIds.every(id => reportedIds.includes(id));
    
        if (allPresentHaveAnswered) {
            console.log("Referee: Everyone accounted for. Ending round.");
            endRoundAsReferee();
        }
    });
    gameChannel.on('presence', { event: 'sync' }, () => {
          const state = gameChannel.presenceState();
          const joinedCount = Object.keys(state).length;
         // GUARD: If we are already showing a victory or transitioning, do nothing
          if (window.isTransitioning || window.pendingVictory) return;
      
          console.log(`Presence Sync: ${joinedCount} connected.`);
      
         // --- REFINED MID-GAME VICTORY CHECK ---
        if (isLiveMode && window.matchStarted) {
                // ONLY trigger auto-victory if NO round is currently open.
                // If roundOpen is true, let the Referee handle the logic instead.
                if (joinedCount === 1 && !roundOpen) {
                    console.log("Presence Sync: Natural sole survivor (drop-out). Ending game.");
                    window.pendingVictory = true;
                    transitionToSoloMode(true);
                    return;
                }
        
                // Mid-game drop logic
                if (!roundOpen && joinedCount < survivors) {
                    survivors = joinedCount;
                    updateSurvivorCountUI(survivors);
        
                    if (survivors <= 1) {
                        window.pendingVictory = true;
                        transitionToSoloMode(survivors === 1);
                    }
                }
            }
          // --- START LOGIC ---
          if (joinedCount >= survivors && !window.matchStarted) {
              const delay = Math.max(0, syncedStartTime - Date.now());
              setTimeout(() => {
                  if (isLiveMode) {
                      window.matchStarted = true; // THIS IS THE KEY
                      if (questionText) questionText.innerHTML = "";
                      startLiveRound(); 
                  }
              }, delay);
          }
      })
      
    // CRITICAL: You must track presence for the 'sync' event to count you
    await gameChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            console.log("Game channel subscribed. Tracking user...");
            await gameChannel.track({
                user_id: userId,
                online_at: new Date().toISOString()
            });
        }
    });
}

async function resetLiveModeState(keepVictoryVisible = false) {
    console.log("Full reset of Live Mode state...");
  
    // --- 1. NETWORK CLEANUP ---
    // Kill the Lobby Channel
    if (lobbyChannel) {
        await supabase.removeChannel(lobbyChannel);
        lobbyChannel = null;
    }
    // Kill the Game Channel
    if (gameChannel) {
        await supabase.removeChannel(gameChannel);
        gameChannel = null;
    }

    // --- 2. TIMER & INTERVAL CLEANUP ---
    if (lobbyTimerInterval) clearInterval(lobbyTimerInterval);
    if (timer) clearInterval(timer);
    if (refereeTimeout) clearTimeout(refereeTimeout);
    
    // Clear any pending transition timeouts
    if (typeof nextRoundTimeout !== 'undefined' && nextRoundTimeout) {
        clearTimeout(nextRoundTimeout);
        nextRoundTimeout = null;
    }

    // --- 3. VARIABLE STATE RESET ---
    isLiveMode = false;
    isStarting = false;
    hasDiedLocally = false; // Required so you can click answers in the next live match
    roundOpen = false;
    accumulatedTime = 0;
    // 1. CRITICAL: Reset logical gates
    gameEnding = false;        // Required so the NEXT game can save data
  
    // 5. Reset Timer Visuals
    timeLeft = 15;
    timeDisplay.textContent = timeLeft;
    timeWrap.classList.remove('red-timer');
  
    window.matchStarted = false;
    window.pendingVictory = false;
    window.isTransitioning = false;
    window.finalStartSent = false;

    score = 0;
    roundId = 0;
    survivors = 0;
    roundResults = {};
    preloadQueue = [];
    remainingQuestions = [];

    // --- 4. UI CLEANUP ---
    document.body.classList.remove('lobby-active', 'game-active');
    
    // Hide specific live UI elements
    const survivorDisplay = document.getElementById('survivor-count');
    if (survivorDisplay) survivorDisplay.classList.add('hidden');
    if (!keepVictoryVisible) {
      const victoryScreen = document.getElementById('victory-screen');
      if (victoryScreen) {
        victoryScreen.classList.add('hidden');
        victoryScreen.style.display = 'none';
        }
    }

    const lobbyScreen = document.getElementById('lobby-screen');
    if (lobbyScreen) lobbyScreen.classList.add('hidden');

    // Reset Chat UI
    if (chatMessages) chatMessages.innerHTML = "";
    if (chatInput) {
        chatInput.value = "";
        chatInput.disabled = true;
    }

    // Stop sounds
    stopTickSound(); 
    
    console.log("Live Mode Reset Complete.");
}

function updateSurvivorCountUI(count) {
    const survivorElement = document.getElementById('survivor-count');
    if (!survivorElement) return;

    if (isLiveMode) {
        survivorElement.classList.remove('hidden');
        // Use the passed count, but fall back to the global survivors variable
        const displayCount = count !== undefined ? count : survivors;
        survivorElement.innerText = `Survivors: ${displayCount}`;
    } else {
        survivorElement.classList.add('hidden');
    }
}

function startLiveRound() {
    // If this is the first round, mark the start time for the total game duration.
    if (roundId === 0 || roundId === 1) { 
        gameStartTime = Date.now();
        console.log("Match duration tracking started.");
    }
    // ----------------------
    roundId++;
    console.log(`--- STARTING ROUND ${roundId} ---`);
    roundOpen = true;
    roundResults = {}; 

    // 1. SAFETY: Clear any old referee timeouts
    if (refereeTimeout) {
        clearTimeout(refereeTimeout);
        refereeTimeout = null;
    }

    // 2. REFEREE SAFETY VALVE: Start the countdown now
    if (isLiveMode && isHost(gameChannel)) {
        // 15s (game) + 2s (buffer) = 17s. 
        // If no one has answered by then, the Referee FORCES the end.
        refereeTimeout = setTimeout(() => {
            console.log("Referee Safety Valve: No responses received. Forcing endRound.");
            endRoundAsReferee(); 
        }, 17000); 
    }

    timeLeft = 15;
    if (timer) clearInterval(timer);

    // Inside startLiveRound() ...
    timer = setInterval(async () => {
    timeLeft--;
    updateTimerUI(timeLeft);

    if (timeLeft <= 0) {
        clearInterval(timer);
        roundOpen = false;

        if (isLiveMode) {
            // 1. Mark yourself as locally dead so you don't start new rounds
            // but keep isLiveMode true just enough to receive the broadcast
            hasDiedLocally = true;
            // --- CRITICAL ADDITION HERE ---
            // 1. Only send if we haven't already answered this round
            if (!roundResults[userId]) {
                roundResults[userId] = 'wrong';
                
                console.log("Time up: Sending 'wrong' result to Referee.");
                gameChannel.send({
                    type: 'broadcast',
                    event: 'round-result',
                    payload: { 
                        userId, 
                        result: 'wrong', 
                        roundId: roundId // Ensure this matches current round
                    }
                });
            }

            // 2. UI Update for the wait
            if (questionText) questionText.innerHTML = "Time's up! Waiting for survivors...";
            if (answersBox) answersBox.innerHTML = '<div class="loading-spinner"></div>';
            // Image cleanup
            if (questionImage) questionImage.style.display = 'none';
            // ------------------------------
            // 3. IMPORTANT: If the referee hasn't responded in 5 seconds, force endGame
            // This handles cases where the host disconnected
            setTimeout(() => {
                if (!window.pendingVictory && hasDiedLocally) {
                    console.log("No response from Referee. Closing game.");
                    showLiveResults(false); // This calls endGame(true) inside it
                }
            }, 5000);
        } else {
            // Solo/Daily modes
            endGame();
        }
    }
}, 1000);
    loadQuestion();
}

function endRoundAsReferee() {
    console.log("Referee: Executing endRound. Current results:", JSON.stringify(roundResults));
    
    // 1. Get ALL current players from Presence
    const state = gameChannel.presenceState();
    const allPlayerIds = Object.keys(state);

    // 2. FILL THE GAPS: Anyone who didn't report is 'wrong' (timed out)
    allPlayerIds.forEach(uid => {
        if (!roundResults[uid]) {
            roundResults[uid] = 'wrong'; 
        }
    });
  
    const players = Object.entries(roundResults);
    const correct = players.filter(([_, res]) => res === 'correct').map(([uid]) => uid);
    const dead = players.filter(([_, res]) => res === 'wrong').map(([uid]) => uid);
    
    let outcome = 'continue';
    let winners = [];

    // --- LOGIC ENGINE ---
    
    // Scenario A: Only 1 person is left and they got it right
    if (correct.length === 1 && (dead.length > 0 || allPlayerIds.length === 1)) {
        console.log("Referee: Sole survivor found!");
        outcome = 'win';
        winners = [correct[0]];
    }
    // Scenario B: Everyone got it wrong OR Everyone was idle (Silent Tie)
    else if (correct.length === 0) {
        // If dead.length is 0 but correct.length is 0, it means 
        // the Referee timeout fired before any messages arrived.
        // We treat everyone in the room as 'dead' for the sake of the tie.
        console.log("Referee: Silent Tie (No correct answers).");
        outcome = 'tie';
        winners = allPlayerIds; // Everyone is included in the tie result
        
        // Ensure 'dead' contains everyone so the UI knows they failed
        allPlayerIds.forEach(id => {
            if (!dead.includes(id)) dead.push(id);
        });
    }
    // Scenario C: Multiple people are right
    else if (correct.length > 1) {
        // Check if we just ran out of questions
        if (remainingQuestions.length === 0 && preloadQueue.length === 0) {
            console.log("Referee: Out of questions! Declaring co-victory.");
            outcome = 'tie';
            winners = correct;
        } else {
            outcome = 'continue';
        }
    }
    // Scenario D: The "Void" / Catch-all
    else {
        // If somehow no one is correct and no one is dead (empty room)
        outcome = (correct.length === 1) ? 'win' : 'continue';
        winners = correct;
    }

    // --- FINAL OVERRIDE: OUT OF QUESTIONS ---
    if (outcome === 'continue' && remainingQuestions.length === 0 && preloadQueue.length === 0) {
        outcome = (correct.length === 1) ? 'win' : 'tie';
        winners = correct;
    }

    // --- LOCK HOST STATE ---
    if (outcome === 'win' || outcome === 'tie') {
        console.log("Referee: Match ending. Locking local state.");
        window.pendingVictory = true; 
        isLiveMode = false;
        if (timer) clearInterval(timer);
    }

    // 4. BROADCAST
    gameChannel.send({
        type: 'broadcast',
        event: 'round-ended',
        payload: { 
            correct, 
            dead, 
            outcome, 
            winnerIds: winners,
            newSurvivorCount: correct.length
        }
    }).then(resp => {
        if (resp !== 'ok') console.error("Referee: Broadcast failed!", resp);
        else console.log("Referee: Round-ended broadcast sent successfully.");
    });

    // Reset for next potential round
    roundResults = {}; 
    if (refereeTimeout) {
        clearTimeout(refereeTimeout);
        refereeTimeout = null;
    }
}
 
async function deleteCurrentLobby(lobbyId) {
    if (!lobbyId) return;

    // Use a local flag to prevent multiple delete calls from the same client
    if (window.lobbyDeleted) return; 
    window.lobbyDeleted = true;

    const { error } = await supabase
        .from('live_lobbies')
        .delete()
        .eq('id', lobbyId);

    if (error) {
        console.error("Lobby deletion failed:", error);
        window.lobbyDeleted = false; // Reset on failure to allow retry
    }
}

async function transitionToSoloMode(isSoleWinner, userWasCorrect = true) {
    if (hasDiedLocally) return;
    window.pendingVictory = true; 
    isLiveMode = false;
    
    // 1. Capture the time spent in the Live Match exactly when it ends
    accumulatedTime = Date.now() - gameStartTime;    
    console.log(`Live Match lasted: ${accumulatedTime / 1000}s. Timer paused.`);
    if (timer) clearInterval(timer);
    stopTickSound();
    
    // 1. KILL the pending referee check immediately
    if (refereeTimeout) {
        clearTimeout(refereeTimeout);
        refereeTimeout = null;
        console.log("Referee timeout cancelled - Victory takes priority.");
    }

    // --- 0. MULTI-CALL & OVERLAP GUARD ---
    if (window.isTransitioning) return;
    window.isTransitioning = true; 

    const victoryScreen = document.getElementById('victory-screen');
    if (victoryScreen && !victoryScreen.classList.contains('hidden')) return;

    
    if (typeof nextRoundTimeout !== 'undefined' && nextRoundTimeout) {
        clearTimeout(nextRoundTimeout);
        nextRoundTimeout = null;
    }

    // Clear question area so the Victory screen is the focus
    if (questionText) questionText.textContent = "";
    if (answersBox) answersBox.innerHTML = "";
    if (questionImage) questionImage.style.display = 'none';

    // --- 2. DATA PREP ---
    const lobbyId = currentLobby?.id;
    const total = matchStartingCount || 2; 
    const odds = Math.round((1 / total) * 100);
    // Don't null currentLobby yet, we might need it for the host check in cleanup

    // HUD Cleanup: Hide the 'Survivors' count but keep the Score/Level!
    //const timerDisplay = document.getElementById('timer');
    const survivorDisplay = document.getElementById('survivor-count');
    //if (timerDisplay) timerDisplay.style.visibility = 'hidden';
    if (survivorDisplay) survivorDisplay.classList.add('hidden');
    
    const statsText = document.getElementById('player-count-stat');
    const victoryStats = document.getElementById('victory-stats');
    const oddsText = document.getElementById('odds-stat'); 
  
    // Update Stats Text
    // --- THE FIX ---
    if (!userWasCorrect) {
        // If they tied because everyone was wrong, don't let them continue
        if (soloBtn) soloBtn.classList.add('hidden'); // Hide the button
        if (victoryStats) victoryStats.textContent = "Everyone answered incorrectly! Match Over.";
        if (statsText) statsText.textContent = `Tie (No Winners)`;
    } else {
        // Normal path: They were right (either sole winner or a tie of correct answers)
        if (soloBtn) soloBtn.classList.remove('hidden'); 
        if (victoryStats) victoryStats.textContent = isSoleWinner ? "You are the last Survivor!" : "You survived the round!";
        
        if (!isSoleWinner) {
            if (statsText) statsText.textContent = `Co-Victory! Total Players: ${matchStartingCount}`;
        } else {
            if (statsText) statsText.textContent = `Sole Survivor! Total Players: ${matchStartingCount}`;
        }
    }
  
    if (oddsText) oddsText.textContent = `Survival Odds: ${odds}%`;

    // --- 3. SHOW SCREEN ---
    if (victoryScreen) victoryScreen.classList.remove('hidden');
    playSound(bonusBuffer);

    // --- 4. GRACEFUL CLEANUP ---
    const amIHost = isHost(); // Check host status BEFORE removing the channel
    const lobbyIdToDelete = currentLobby?.id;
    
    setTimeout(async () => {
        // 1. Delete from DB first while we still have the ID
        if (lobbyIdToDelete && amIHost) { 
            console.log("Host: Deleting lobby records...");
            await deleteCurrentLobby(lobbyIdToDelete);
        }
    
        // 2. Then cleanup the network
        if (gameChannel) {
            console.log("Cleaning up game channel...");
            supabase.removeChannel(gameChannel);
            gameChannel = null;
        }
        currentLobby = null; 
    }, 3000);
}

function showVictoryBanner(message) {
    // Reuse your notification logic if you have it
    if (typeof showNotification === 'function') {
        showNotification(message, bonusBuffer, "#FFD700"); // Gold text
    } else {
        alert(message); // Fallback
    }
}

function updateLobbyUI(count, startTime) {
    const timerElement = document.getElementById('lobby-timer');
    const countElement = document.getElementById('player-count');
     if (countElement) {
          countElement.innerText = `${count} players waiting...`;
      }

    // Clear any existing timer before starting a new one
    if (lobbyTimerInterval) clearInterval(lobbyTimerInterval);

    if (timerElement) {
            // Clear existing interval to prevent "racing" timers
            if (lobbyTimerInterval) clearInterval(lobbyTimerInterval);
    
            lobbyTimerInterval = setInterval(() => {
                const remaining = new Date(startTime) - new Date();
                if (remaining <= 0) {
                    clearInterval(lobbyTimerInterval);
                    timerElement.innerText = "Starting now...";
                    return;
                }
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                timerElement.innerText = `Starts in: ${mins}:${secs.toString().padStart(2, '0')}`;
            }, 1000);
        }
}

function showWaitingForPlayersOverlay() {
    questionText.innerHTML = "Get Ready!<br><span style='font-size: 0.5em; opacity: 0.7;'>Waiting for match to begin...</span>";
    answersBox.innerHTML = '<div class="loading-spinner"></div>'; // Or just leave empty
}

// 1. Listen for the Enter key
chatInput.onkeydown = (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
        sendChatMessage(chatInput.value.trim());
        chatInput.value = '';
    }
};

// 2. Function to broadcast your message
function sendChatMessage(msg) {
    if (!lobbyChannel) return;

    lobbyChannel.send({
        type: 'broadcast',
        event: 'chat',
        payload: {
            username: username,
            message: msg,
            timestamp: new Date().toISOString()
        }
    });
}


function appendMessage(user, msg) {
    const msgDiv = document.createElement('div');
    // OSRS style: Blue for name, Yellow for text
    //msgDiv.innerHTML = `<span style="color: #00ffff;">${user}:</span> ${msg}`;
    msgDiv.innerHTML = `<span style="color: #00ffff; font-weight: bold;">${user}:</span> <span style="color: #ffff00;">${msg}</span>`;
    msgDiv.style.marginBottom = "2px";
    msgDiv.style.textShadow = "1px 1px 0px #000"; // Makes it look like OSRS font
    chatMessages.appendChild(msgDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function isHost(channel) {
    const activeChannel = channel || gameChannel || lobbyChannel;
    
    if (!activeChannel || typeof activeChannel.presenceState !== 'function') {
        return false;
    }
    
    const state = activeChannel.presenceState();
    const players = Object.keys(state).sort(); 
    
    // DEBUG LOGS - Check these in F12 console
    console.log("Presence Keys:", players);
    console.log("My userId:", userId);
    console.log("Am I Host?", players[0] === userId);
    
    return players[0] === userId; 
}


async function triggerGamePrepare(lobbyId) {
    if (isStarting) return;
    isStarting = true; // Prevent double-clicks

    console.log("Host: Ensuring lobby data is saved before preparation...");

    // 1. Double-check that we actually have the lobby data locally
    // If currentLobby.question_ids is missing, we shouldn't start yet.
    if (!currentLobby || !currentLobby.question_ids) {
        console.error("Host: No question IDs found in local lobby state!");
        isStarting = false;
        return;
    }

    console.log("Host: Notifying all players to sync from DB...");

    // 2. Broadcast the signal
    // We don't need to send a 'seed' anymore because everyone will 
    // fetch the array directly from the 'live_lobbies' table.
    lobbyChannel.send({
        type: 'broadcast',
        event: 'prepare-game',
        payload: { lobbyId: lobbyId } 
    });
}

// Phase 2: Host sends the final "GO"
async function sendFinalStartSignal(count) {
    if (window.finalStartSent) return;
    window.finalStartSent = true;

    // --- NEW: LOCK THE LOBBY IN THE DATABASE ---
    // This prevents joinMatchmaking() from finding this lobby while it's active
    if (currentLobby?.id) {
        await supabase
            .from('live_lobbies')
            .update({ status: 'playing' }) 
            .eq('id', currentLobby.id);
        console.log("Lobby status updated to 'playing'.");
    }

    lobbyChannel.send({
        type: 'broadcast',
        event: 'start-game',
        payload: { 
            survivorCount: count,
            startTime: Date.now() + 2000 // Start in exactly 2 seconds
        }
    });
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Log in to play Weekly Mode!");

    // Load Questions (Same as Daily)
    const { data: allQuestions } = await supabase.from('questions').select('id').order('id', { ascending: true });
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
    const weeklyIds = shuffledList.slice(
        weekInCycle * WEEKLY_LIMIT, 
        (weekInCycle * WEEKLY_LIMIT) + WEEKLY_LIMIT
    ).map(q => q.id);

    // Setup Mode & Data
    roundOpen = true
    isDailyMode = false;
    isWeeklyMode = true;
    preloadQueue = [];
    remainingQuestions = weeklyIds; // Set the 50 Weekly IDs

    // PRELOAD FIRST (While still on the menu/loading)
    //await preloadNextQuestions();
    // 5. FETCH ONLY THE FIRST QUESTION IMMEDIATELY
    // If queue is empty, get one right now so we can start
    if (preloadQueue.length === 0) {
        await preloadNextQuestions(1); // Modified to accept a 'count'
    }

    // THE UI SWAP
    resetGame();
    document.body.classList.add('game-active'); 
    document.getElementById('start-screen').classList.add('hidden');
    game.classList.remove('hidden');
    updateSurvivorCountUI();
  
    weeklyStartTime = Date.now(); // total weekly run time
  
    loadQuestion();
  
    // FILL THE REST IN THE BACKGROUND
    // We don't 'await' this; it runs while the user is looking at question 1
    preloadNextQuestions(3);
}

function getDailyEditionNumber() {
    const startDate = new Date(RELEASE_DATE); 
    const diffTime = Math.abs(new Date() - startDate);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

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
    const startDate = new Date(RELEASE_DATE); 
    const diffTime = Math.abs(new Date() - startDate);
    const dayCounter = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const questionsPerDay = 10;
    const daysPerCycle = Math.floor(allQuestions.length / questionsPerDay); 
    const cycleNumber = Math.floor(dayCounter / daysPerCycle); 
    const dayInCycle = dayCounter % daysPerCycle;

    const shuffledList = shuffleWithSeed(allQuestions, cycleNumber);
    const dailyIds = shuffledList.slice(dayInCycle * questionsPerDay, (dayInCycle * questionsPerDay) + questionsPerDay).map(q => q.id);

    // 4. PREPARE THE DATA (Background)
    isDailyMode = true;
    isWeeklyMode = false;
     roundOpen = true
    preloadQueue = []; 
    remainingQuestions = dailyIds;   
  
    // 5. Start the engine
    //await preloadNextQuestions();
    // FETCH ONLY THE FIRST QUESTION IMMEDIATELY
    // If queue is empty, get one right now so we can start
    if (preloadQueue.length === 0) {
        await preloadNextQuestions(1); // Modified to accept a 'count'
    }
  
    // 6. UI TRANSITION (Only happens once data is ready)
    resetGame();
    document.body.classList.add('game-active'); 
    document.getElementById('start-screen').classList.add('hidden');
    game.classList.remove('hidden');
    updateSurvivorCountUI();
  
    loadQuestion();
  
    // FILL THE REST IN THE BACKGROUND
    // We don't 'await' this; it runs while the user is looking at question 1
    preloadNextQuestions(3);
}

function shuffleLiveMatch(ids, seed) {
    // 1. Force a sort so the starting point is identical on all devices
    let arr = [...ids].sort((a, b) => a - b);
    
    // 2. Initialize the generator with the match seed
    let rnd = seededRandomforLive(seed);
    let m = arr.length, t, i;

    while (m) {
        // Use the generator to pick the index
        i = Math.floor(rnd() * m--);
        t = arr[m]; 
        arr[m] = arr[i]; 
        arr[i] = t;
    }
    return arr;
}

function seededRandomforLive(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
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
            //console.log('Daily challenge sync: locking button.');
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
})(); // closes the async function AND invokes it
});   // closes DOMContentLoaded listener



// 6. EVENT LISTENERS (The code you asked about)













































































