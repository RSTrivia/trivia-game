import { supabase } from './supabase.js';
window.supabase = supabase; // This makes it visible to the F12 console
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ====== IMMEDIATE CACHED UI (runs before paint) ======
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
  //const muteBtn = document.getElementById('muteBtn');
  const timeWrap = document.getElementById('time-wrap');
  let correctBuffer, wrongBuffer;
  let muted = cachedMuted;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const todayStr = new Date().toISOString().split('T')[0];
const appDiv = document.getElementById('app');
const userDisplay = document.getElementById('userDisplay');
const authBtn = document.getElementById('authBtn');
const muteBtn = document.getElementById('muteBtn');
const dailyBtn = document.getElementById('dailyBtn');
let authLabel;

let username = cachedLoggedIn ? cachedUsername : '';
let score = 0;
let questions = [];
let remainingQuestions = [];
let currentQuestion = null;
let preloadQueue = []; // holds up to 2 questions 
let timer;
let timeLeft = 15;

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

if (muteBtn) {
  const muteIcon = muteBtn.querySelector('#muteIcon');
  if (muteIcon) {
    muteIcon.textContent = cachedMuted ? '🔇' : '🔊';
  }
  if (cachedMuted) {
    muteBtn.classList.add('is-muted');
  }
}

if (dailyBtn) {
    const hasPlayed = localStorage.getItem('dailyPlayedDate') === todayStr;

    // Only show gold if we are confident they are logged in AND haven't played
    if (cachedLoggedIn && !hasPlayed) {
        dailyBtn.classList.add('is-active');
        dailyBtn.classList.remove('disabled');
    } else {
        // Ensure it starts gray if there's any doubt
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');
    }
}

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

let isDailyMode = false; // Track if current game is the daily challenge


async function checkDailyStatus() {
  const currentToday = new Date().toISOString().split('T')[0];
    // 1. Get Session
    const { data: { session } } = await supabase.auth.getSession();
  
    // 2. Clear old cache! 
    // If the stored date isn't today, it's garbage. Remove it.
    if (localStorage.getItem('dailyPlayedDate') !== currentToday) {
        localStorage.removeItem('dailyPlayedDate');
    }
  
    // 2. Handle Guest / Logged Out
    if (!session) {
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');
        dailyBtn.onclick = () => alert("Daily Challenge is for members only. Please Log In to play!");
        return;
    }

    // 2.5. If cache already says we played, stop here to prevent "Gold Flickering"
    const cachedDailyDate = localStorage.getItem('dailyPlayedDate');
    if (cachedDailyDate === todayStr) {
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');
        return;
    }
      
    // 3. Database Truth Check
    const { data: existing } = await supabase
        .from('daily_attempts')
        .select('score')
        .eq('user_id', session.user.id)
        .eq('attempt_date', todayStr)
        .maybeSingle();

    if (existing) {
        // 1. Sync the cache so we don't have to keep asking the DB today
        localStorage.setItem('dailyPlayedDate', todayStr);

        // 2. Visuals: Turn off the gold
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');

        // 3. Feedback: Tell them why it's disabled if they manage to click it
        dailyBtn.onclick = () => {
            alert(`You've already completed today's challenge! Your score was: ${existing.score}/10`);
      };
    } else {
        // --- FINAL GOLD STATE ---
        dailyBtn.classList.add('is-active');
        dailyBtn.classList.remove('disabled');
        
        // 🔥 Re-attach the click listener here!
        dailyBtn.onclick = () => {
            if (isTouch) {
                dailyBtn.classList.add('tapped');
                setTimeout(() => {
                    dailyBtn.classList.remove('tapped');
                    startDailyChallenge();
                }, 150);
            } else {
                startDailyChallenge();
            }
        };
    }
}

// 2. The Daily Logic function
async function startDailyChallenge() {
  
    // 1. Check Auth First
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("You must be logged in to play the Daily Challenge!");

    // 2. "Burn" the attempt immediately
    const { error: burnError } = await supabase
        .from('daily_attempts')
        .insert({ 
            user_id: session.user.id, 
            score: 0, 
            attempt_date: todayStr 
        });

    if (burnError) return alert("You've already played today!");
    localStorage.setItem('dailyPlayedDate', todayStr);

    // 3. Prepare the Questions
    const { data: allQuestions } = await supabase.from('questions').select('*').order('id', { ascending: true });
    if (!allQuestions || allQuestions.length < 10) return alert("Error loading questions.");

    // Calculate rotation
    const startDate = new Date('2025-12-22'); 
    const diffTime = Math.abs(new Date() - startDate);
    const dayCounter = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const questionsPerDay = 10;
    const daysPerCycle = Math.floor(allQuestions.length / questionsPerDay);

    // --- ADD THE CHECK HERE ---
    let dailySet;
    if (daysPerCycle === 0) {
        // Fallback: If for some reason you have < 10 questions total
        dailySet = allQuestions.slice(0, questionsPerDay);
    } else {
        const cycleNumber = Math.floor(dayCounter / daysPerCycle);
        const dayInCycle = dayCounter % daysPerCycle;
    
        const shuffledList = shuffleWithSeed(allQuestions, cycleNumber);
        dailySet = shuffledList.slice(
            dayInCycle * questionsPerDay, 
            (dayInCycle * questionsPerDay) + questionsPerDay
        );
    }

    // Visually update the main menu button immediately
    dailyBtn.classList.remove('is-active'); // Ensure gold is gone
    dailyBtn.classList.add('disabled');
    dailyBtn.onclick = null;
  
    // 4. NOW Launch the Game (All data is ready)
    isDailyMode = true;
    resetGame();
    remainingQuestions = dailySet; // This now works because dailySet exists!

    // Visually update the main menu button
    dailyBtn.classList.add('disabled');
    dailyBtn.onclick = null;
    //dailyBtn.textContent = "Daily Mode";

    // Show Game Screen
    document.body.classList.add('game-active'); 
    document.getElementById('start-screen').classList.add('hidden');
    game.classList.remove('hidden');
    
    updateScore();
    loadQuestion();
}


document.addEventListener('DOMContentLoaded', async () => {


setTimeout(checkDailyStatus, 50);
  
  

  // Single, clean Click Listener
muteBtn.addEventListener('click', () => {
  muted = !muted; 
  localStorage.setItem('muted', muted);
  
  // Trigger the gold flash for visual feedback
  //if (isTouch) {
    //mobileFlash(muteBtn);
  //}
  
  // Resume AudioContext if it's the first interaction
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  syncMuteUI();
});


const subscribeToDailyChanges = (userId) => {
  supabase
    .channel('daily-updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'daily_attempts',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Daily challenge started on another device!');
        // Update LocalStorage so a refresh also stays gray
        localStorage.setItem('dailyPlayedDate', todayStr);
        
        // Instantly update the UI
        dailyBtn.classList.remove('is-active');
        dailyBtn.classList.add('disabled');
        dailyBtn.onclick = () => alert("You've already started today's challenge on another device!");
      }
    )
    .subscribe();
};

// Trigger the subscription when the session is confirmed
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) subscribeToDailyChanges(session.user.id);
});
  
   // -------------------------
  // Preload Auth: Correct Username & Button
  // -------------------------
  async function preloadAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // The cache lied! The session is dead. Fix the button.
        localStorage.setItem('cachedLoggedIn', 'false');
        if (dailyBtn) {
            dailyBtn.classList.remove('is-active');
            dailyBtn.classList.add('disabled');
        }
        return; 
    }
    
    if (!session?.user) return; // nothing to do
  
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .maybeSingle();
  
    if (!profile?.username) return;

    // --- NEW GOLD BUTTON SYNC ---
    // If we have a profile, we are officially logged in.
    const hasPlayed = localStorage.getItem('dailyPlayedDate') === todayStr;
    if (dailyBtn && !hasPlayed) {
        dailyBtn.classList.add('is-active');
        dailyBtn.classList.remove('disabled');
    }
    
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
  // Supabase auth listener (Resilient Multi-Session)
  // -------------------------
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    if (username && username !== 'Guest') return;
    
    // Normal logout logic
    username = '';
    localStorage.setItem('cachedLoggedIn', 'false');
    if (userDisplay) userDisplay.querySelector('#usernameSpan').textContent = ' Guest';
    if (authLabel) authLabel.textContent = 'Log In';

    // 🔥 FIX: Make the button grey/disabled immediately on logout
    checkDailyStatus(); 
    return;
  }

  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if (profile?.username) {
      username = profile.username;
      localStorage.setItem('cachedLoggedIn', 'true');
      localStorage.setItem('cachedUsername', username);
      
      if (userDisplay) {
        userDisplay.querySelector('#usernameSpan').textContent = ' ' + username;
      }
      if (authLabel) authLabel.textContent = 'Log Out';

      // 🔥 FIX: This is the magic line. 
      // It runs the check the moment the login is confirmed.
      checkDailyStatus(); 
    }
  }

  // Every 2 minutes, verify the state with the database just in case
setInterval(() => {
    if (localStorage.getItem('cachedLoggedIn') === 'true') {
        checkDailyStatus();
    }
}, 120000);
}); //end of DOM block
  
  // -------------------------
  // Auth Button
  // -------------------------
    // --- Update your Auth Button Logic ---
authBtn.onclick = async () => {
    authBtn.blur();
    
    if (username && username !== 'Guest') {
        // Log out of Supabase locally
        await supabase.auth.signOut({ scope: 'local' });
        localStorage.removeItem('dailyPlayedDate'); 

        // Manually trigger the UI change for THIS device immediately
        username = '';
        localStorage.setItem('cachedLoggedIn', 'false');
        localStorage.setItem('cachedUsername', 'Guest');
        if (userDisplay) userDisplay.querySelector('#usernameSpan').textContent = ' Guest';
        if (authLabel) authLabel.textContent = 'Log In';
    } else {
        window.location.href = 'login.html';
    }
};
 

  
 
  // -------------------------
  // Buttons
  // -------------------------
startBtn.onclick = () => {
    if (isTouch) {
      // If the engine is asleep, wake it up now (PC & Mobile)
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      // 1. Show gold state immediately
      startBtn.classList.add('tapped');
      
      // 2. Short delay for the "Gold Hold" feeling
      setTimeout(() => {
        // 3. Remove gold and trigger the game
        // (startGame handles the database fetch internally)
        startBtn.classList.remove('tapped');
        startGame();
      }, 150);
    } else {
      // PC: Instant
      startGame();
    }
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

  playAgainBtn.onclick = () => {
    if (isTouch) {
      playAgainBtn.classList.add('tapped');
      setTimeout(() => {
        playAgainBtn.classList.remove('tapped');
        startGame();
      }, 150);
    } else {
      startGame();
    }
  };

  mainMenuBtn.onclick = () => {
    const goHome = () => {
      document.body.classList.remove('game-active');
      preloadQueue = []; 
      resetGame();
      game.classList.add('hidden');
      endScreen.classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
      updateScore();
    };

    //  TO SYNC THE BUTTON ---
      if (dailyBtn) {
        const hasPlayed = localStorage.getItem('dailyPlayedDate') === todayStr;
        if (hasPlayed) {
          dailyBtn.classList.remove('is-active');
          dailyBtn.classList.add('disabled');
          dailyBtn.onclick = null; // Kill the click event
          // If you want to change the text:
          // dailyBtn.textContent = "Played Today"; 
        }
      }
    
    if (isTouch) {
      mainMenuBtn.classList.add('tapped');
      setTimeout(() => {
        mainMenuBtn.classList.remove('tapped');
        goHome();
      }, 150);
    } else {
      goHome();
    }
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

//muteBtn.addEventListener('click', () => {
  //if (isTouch) mobileFlash(muteBtn);
//});

// Helper Functions (Place outside or at bottom of file)
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
    // If no questions left, trigger endGame and stop this function
    if (!remainingQuestions.length) {
        await endGame(); 
        return;
    }

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
    // 1. Create the array of options from the question object
    // Note: Use the column names exactly as they are in your Supabase table
    let answers = [
      currentQuestion.option_a, 
      currentQuestion.option_b, 
      currentQuestion.option_c, 
      currentQuestion.option_d
    ].sort(() => Math.random() - 0.5); // Shuffle for the UI

   // 2. Now loop through that new array to create buttons
    answers.forEach((ansText) => {
      const btn = document.createElement('button');
      btn.textContent = ansText;
      btn.classList.add('answer-btn');
      
      if (isTouch) {
        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          btn.click();
        }, { passive: false });
      }

      // We send the actual text (ansText) to the checkAnswer function
      btn.onclick = () => checkAnswer(ansText, btn);
      answersBox.appendChild(btn);
    });

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
        
        // 1. Immediately disable all buttons so they can't be clicked
        document.querySelectorAll('.answer-btn').forEach(btn => {
          btn.disabled = true;
          btn.blur();
        });

        playSound(wrongBuffer);
        highlightCorrectAnswer();
        setTimeout(endGame, 1000);
      }
    }, 1000); // <--- This was missing!
  } // <--- This closing brace for loadQuestion was also missing!

async function checkAnswer(selected, btn) {
    clearInterval(timer);

    // Force the button to lose focus
    if (btn) btn.blur();
    
    document.querySelectorAll('.answer-btn').forEach(b => {
        b.disabled = true;
        b.blur(); 
    });

    // --- NEW SECURE CHECK ---
    // We ask the database: "Is this choice correct for this question ID?"
    const { data: isCorrect, error } = await supabase.rpc('check_my_answer', {
        q_id: currentQuestion.id, 
        choice: selected
    });

    if (error) {
        console.error("Security check failed:", error);
        return;
    }

    if (isCorrect) {
        playSound(correctBuffer);
        btn.classList.add('correct');
        score++;
        updateScore();
        setTimeout(loadQuestion, 1000);
    } else {
        playSound(wrongBuffer);
        btn.classList.add('wrong');
        
        // Note: highlightCorrectAnswer() might need a small tweak 
        // if the client no longer knows the correct answer!
        await highlightCorrectAnswer(); 
        
        setTimeout(endGame, 1000);
    }
}

async function highlightCorrectAnswer() {
    // 1. Fetch the correct text from the server since the client doesn't have it
    const { data: correctAnswerText, error } = await supabase.rpc('reveal_correct_answer', {
        q_id: currentQuestion.id
    });

    if (error) {
        console.error("Could not reveal answer:", error);
        return;
    }

    // 2. Find the button that contains that specific text
    document.querySelectorAll('.answer-btn').forEach((btn) => {
        if (btn.innerText.trim() === correctAnswerText) {
            btn.classList.add('correct');
        }
    });
}

  function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
  }



   async function endGame() {
  await supabase.auth.getSession();
  if (endGame.running) return;
  endGame.running = true;
  
  document.body.classList.remove('game-active'); 
  clearInterval(timer);
  game.classList.add('hidden');
  endScreen.classList.remove('hidden');
  finalScore.textContent = score;

  const gameOverTitle = document.getElementById('game-over-title');
  const gzTitle = document.getElementById('gz-title');

  if (isDailyMode) {
    // 1. Hide the Play Again button for Daily Mode
    playAgainBtn.classList.add('hidden');
    
    // 2. Pick a random message based on the score
    const options = dailyMessages[score] || ["Game Over!"];
    const randomMsg = options[Math.floor(Math.random() * options.length)];
    
    // 3. Update the UI
    gameOverTitle.textContent = randomMsg;
    gameOverTitle.classList.remove('hidden');
    gzTitle.classList.add('hidden');

    // 4. Save Daily Score to the new table
    if (username && username !== 'Guest') {
      await submitDailyScore(score);
    }
    
    // Reset mode for next session
    isDailyMode = false; 
  } else {
    // --- STANDARD MODE LOGIC ---
    playAgainBtn.classList.remove('hidden');
    
    if (score === questions.length && remainingQuestions.length === 0) {
      const gzMessages = ['Gz!', 'Go touch grass', 'See you in Lumbridge'];
      gzTitle.textContent = gzMessages[Math.floor(Math.random() * gzMessages.length)];
      gzTitle.classList.remove('hidden');
      gameOverTitle.classList.add('hidden');
    } else {
      gameOverTitle.textContent = "Game Over!";
      gzTitle.classList.add('hidden');
      gameOverTitle.classList.remove('hidden');
    }

    if (username && username !== 'Guest') {
      await submitLeaderboardScore(username, score);
    }
  }
}
  // Initialize the running flag **after the function exists**
  endGame.running = false;



async function startGame() {
// 1. FRESH HANDSHAKE
  const { data: sessionData } = await supabase.auth.getSession();

  // CHANGE: Only clear username if there is DEFINITELY no session anymore
  if (!sessionData.session && localStorage.getItem('cachedLoggedIn') === 'true') {
    // If we thought we were logged in but the session is gone, THEN revert
    username = '';
    localStorage.setItem('cachedLoggedIn', 'false');
    if (userDisplay) userDisplay.querySelector('#usernameSpan').textContent = ' Guest';
  }
  
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

  // 2. FETCH QUESTIONS
  const { data, error } = await supabase.from('questions').select('*');
  
  if (error || !data?.length) {
    console.error("Fetch error:", error);
    alert('Failed to load questions. Please check your connection.');
    return;
  }

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
  // If muted is true, stop immediately
  if (!buffer || muted) return;

  // PC FIX: If the engine is still suspended, try one last resume 
  // before giving up, or just allow it to attempt playback.
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.5;
  source.connect(gainNode).connect(audioCtx.destination);
  source.start();
}

// Function to sync UI with the 'muted' variable
const syncMuteUI = () => {
  const muteIcon = document.getElementById('muteIcon');
  if (!muteBtn || !muteIcon) return;

  muteIcon.textContent = muted ? '🔇' : '🔊';

  if (muted) {
    muteBtn.classList.add('is-muted');
  } else {
    muteBtn.classList.remove('is-muted');
  }
};

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


async function submitDailyScore(dailyScore) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // We use .update() here because the row already exists from when they clicked "Start"
  const { error } = await supabase
    .from('daily_attempts')
    .update({ score: dailyScore })
    .eq('user_id', user.id)
    .eq('attempt_date', todayStr);

  if (error) console.error("Error updating daily score:", error.message);
}
























































































