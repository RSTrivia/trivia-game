
import { supabase } from './supabase.js';
window.supabase = supabase;
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ====== UI & STATE ======
const cachedMuted = localStorage.getItem('muted') === 'true';
let streak = 0;              // Tracking for normal game bonus
let dailyQuestionCount = 0;   // Tracking for daily bonus
let currentDailyStreak = 0;
let currentProfileXp = parseInt(localStorage.getItem('cached_xp')) || 0;    // Store the player's current XP locally
let currentLevel = parseInt(localStorage.getItem('cached_level')) || 1;
let username = 'Guest';
let gameEnding = false;
let isShowingNotification = false;
let notificationQueue = [];
let gridPattern = "";

let gameStarting = false;
// Add this to your script variables
let currentEquippedPet = localStorage.getItem('equipped_pet_id') || null;
let userId = null;
let syncChannel;
// Add this at the top of your script with your other global variables
let pendingIds = [];
// NEW GLOBAL TRACKER
let usedInThisSession = [];
let achievementNotificationTimeout = null;
// 1. Create a variable outside the function to track the timer
let petNotificationTimeout = null;
let lobbyChannel = null;
let normalSessionPool = [];
const TOTAL_ACHIEVEMENTS = 24;
const MAX_LEVEL = 99;

const RELEASE_DATE = '2025-12-22';
const DAILY_LIMIT = 10;
const WEEKLY_LIMIT = 50; // Change to 50 when ready to go live
const LITE_LIMIT = 100; // Change to 100 when ready to go live
const number_of_questions = 1000; // 1000

const shareBtn = document.getElementById('shareBtn');
const logBtn = document.getElementById('logBtn');
const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const mainMenuBtns = document.querySelectorAll('.main-menu-btn');
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


//live mode
const lobbyBtn = document.getElementById('btn-create-lobby');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const multiplayerBtn = document.getElementById('MultiplayerBtn');
let opponentHasAnswered = false;
let iHaveAnswered = false;
let myRole = ''; // Will be 'host' or 'guest'
let myHP = 60;
let opponentHP = 60;
const MAX_HP = 60;
const multiHeader = document.getElementById('multiplayer-header');
let isFetchingLobbyQuestion = false; // Global flag to prevent race conditions
let isSyncing = false; // Add this global variable at the top of your script
let multiplayerTransitionTimer = null; // Add this at the top of your script
let isSyncingNextRound = false;        // The "Lock"
let iAmReadyForRematch = false;
let opponentReadyForRematch = false;
let currentLobbyCode = null;
let opponentName = null;

// Do this for all your navigation buttons
const leaderBtn = document.getElementById('btn-leaderboard');
const leaderboardRows = document.querySelectorAll('#leaderboard li');
const scoreTab = document.getElementById('scoreTab');
const dailyTab = document.getElementById('dailyTab');
const weeklyTab = document.getElementById('weeklyTab');
const xpTab = document.getElementById('xpTab');
const liteTab = document.getElementById('liteTab');

let currentMode = 'score';
let realtimeSubscription = null; // Track the active listener

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
let currentQuestion = null;
let currentQuestionIndex = 0;
let preloadQueue = [];
let timer;
let timeLeft = 15;
let isDailyMode = false;
let isWeeklyMode = false;
let isMultiplayerMode = false;
let weeklyQuestionCount = 0;
let liteQuestionCount = 0;
let isLiteMode = false;
let liteQuestions = []; // To store the shuffled subset
let gameStartTime = 0;

// This intercepts and silences the "WebSocket is closed before established" error
(function () {
    const originalError = console.error;
    const originalWarn = console.warn;

    const muzzle = (...args) => {
        const message = args.join(' ');
        if (message.includes('WebSocket') || message.includes('realtime')) {
            return; // Ignore these specific errors
        }
        originalError.apply(console, args);
    };

    console.error = muzzle;
    console.warn = (...args) => {
        if (args.join(' ').includes('WebSocket')) return;
        originalWarn.apply(console, args);
    };
})();

function showGoldAlert(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'gold-toast';
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}


function formatLeaderboardTime(ms) {
    // Hide if 0, null, or the default "empty" values
    if (!ms || ms <= 0 || ms === 9999 || ms === 9999999) return "";

    const totalSeconds = ms / 1000;

    if (totalSeconds < 60) {
        // Format: 45.23s
        return ` <span style="font-size: 0.85em; opacity: 0.6;">(${totalSeconds.toFixed(2)}s)</span>`;
    } else {
        // Format: 1:23.34
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
        return ` <span style="font-size: 0.85em; opacity: 0.6;">(${minutes}:${seconds})</span>`;
    }
}

function updateLeaderboard(data) {
    leaderboardRows.forEach((row, i) => {
        const entry = data[i] || { username: '', val: '', weekly_data: null, time_ms: null };
        const userTxt = row.querySelector('.user-txt');
        const scoreSpan = row.querySelector('.score-part');

        if (!entry.username) {
            userTxt.innerHTML = ''; // Changed to innerHTML to clear images
            scoreSpan.innerHTML = '';
            return;
        }

        // ONLY attempt to get the icon if equipped_pet exists
        const itemImgHtml = getEquippedItemIcon(entry.equipped_pet);
        const fullNameHtml = `${itemImgHtml}${entry.username}`;
        if (userTxt.innerHTML !== fullNameHtml) {
            userTxt.innerHTML = fullNameHtml;
        }

        let finalHTML = "";

        if (currentMode === 'xp') {
            const xpValue = entry.val || 0;
            const level = entry.level || 1;
            finalHTML = `${xpValue.toLocaleString()} <span style="font-size: 0.85em; opacity: 0.6;">(Lvl ${level})</span>`;

        } else if (currentMode === 'weekly' || currentMode === 'lite' || currentMode === 'daily') {
            // Map the mode to the correct database column name
            const keyMap = {
                'weekly': 'weekly_data',
                'lite': 'lite_data',
                'daily': 'daily_data'
            };
            const dataKey = keyMap[currentMode];

            const s = entry[dataKey]?.score || 0;
            const t = entry[dataKey]?.time || 0;
            finalHTML = `${s.toLocaleString()}${formatLeaderboardTime(t)}`;

        } else {
            // NORMAL MODE (using val and time_ms)
            const s = entry.val || 0;
            const t = entry.time_ms || 0;
            // Pass false for isWeekly to check against the 9999999 default
            finalHTML = `${s.toLocaleString()}${formatLeaderboardTime(t)}`;
        }

        // Anti-flicker: Only update if different
        if (scoreSpan.innerHTML !== finalHTML) {
            scoreSpan.innerHTML = finalHTML;
        }
    });
}

function getEquippedItemIcon(itemId) {
    if (!itemId) return "";
    const isCape = ['max_cape', 'achievement_cape'].includes(itemId);
    
    // Use a forward slash to make the path relative to the PROJECT ROOT
    // This tells the browser: "Start from the base folder, then look in capes/ or pets/"
    const folder = isCape ? 'capes/' : 'pets/';
    const fileName = isCape ? `${itemId}.png` : `${itemId.replace('pet_', '')}.png`;

    return `<img src="${folder}${fileName}" class="mini-pet-icon" draggable="false">`;
}

window.getEquippedItemIcon = getEquippedItemIcon;
async function fetchLeaderboard() {
    let query;
    if (currentMode === 'score') {
        query = supabase
            .from('scores')
            // Added profiles(equipped_pet) here
            .select('username, val:score, time_ms')
            .gt('score', 0)
            .order('score', { ascending: false })
            .order('time_ms', { ascending: true });

    } else if (currentMode === 'lite') {
        query = supabase
            .from('scores')
            // Added profiles(equipped_pet) here
            .select('username, lite_data')
            .not('lite_data', 'is', null)
            .gt('lite_data->score', 0)
            .order('lite_data->score', { ascending: false })
            .order('lite_data->time', { ascending: true });
    } else if (currentMode === 'weekly') {
        query = supabase
            .from('scores')
            // Added profiles(equipped_pet) here
            .select('username, weekly_data')
            .not('weekly_data', 'is', null)
            .gt('weekly_data->score', 0)
            .order('weekly_data->score', { ascending: false })
            .order('weekly_data->time', { ascending: true });
    } else if (currentMode === 'daily') {
        query = supabase
            .from('scores')
            .select('username, daily_data')
            .not('daily_data', 'is', null)
            .gt('daily_data->score', 0)
            .order('daily_data->score', { ascending: false })
            .order('daily_data->time', { ascending: true });
    } else {
        query = supabase
            .from('public_profiles')
            // Added equipped_pet here
            .select('username, val:xp, level, equipped_pet')
            .gt('xp', 0)
            .order('xp', { ascending: false });
    }

    const { data, error } = await query.limit(10);
    if (error) return console.error(error);


    let formattedData = data;

    // The "Manual Join" for Pets (Only if not in XP mode)
    if (currentMode !== 'xp' && data.length > 0) {
        const usernames = data.map(entry => entry.username);

        // Fetch pets for these 10 users from the public view
        const { data: petData, error: petError } = await supabase
            .from('public_profiles')
            .select('username, equipped_pet')
            .in('username', usernames);

        if (!petError && petData) {
            // Merge the pet data into our score rows
            formattedData = data.map(entry => {
                const userProfile = petData.find(p => p.username === entry.username);
                return {
                    ...entry,
                    equipped_pet: userProfile ? userProfile.equipped_pet : null
                };
            });
        }
    }

    if (formattedData) {
        localStorage.setItem(`leaderboard_${currentMode}`, JSON.stringify(formattedData));
        updateLeaderboard(formattedData);
    }
}

// --- NEW: REALTIME SUBSCRIPTION LOGIC ---
async function subscribeToLeaderboard() {
    // 1. Clean up existing subscription safely
    if (realtimeSubscription) {
        // Only try to remove if it's NOT already closed
        if (realtimeSubscription.state !== 'closed') {
            try {
                await supabase.removeChannel(realtimeSubscription);
            } catch (e) {
                // Silently catch errors if the socket was in a weird state
            }
        }
        realtimeSubscription = null;
    }

    // 2. Determine which table to watch
    const tableToWatch = (currentMode === 'xp') ? 'profiles' : 'scores';

    // 3. Create the channel
    realtimeSubscription = supabase.channel('live-leaderboard');

    // LISTENER 1: Always watch for Pet/XP changes in 'profiles'
    realtimeSubscription.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
            // Refresh if pet changed OR if we are in XP mode and XP changed
            // 1. Leaderboard refresh
            if (currentMode === 'xp' || (payload.new && payload.new.equipped_pet !== undefined)) {
                fetchLeaderboard();
            }
            // 2. Refresh Achievements/Stats if active
            if (document.getElementById('achieveTab').classList.contains('active')) {
                loadCollection(); // This triggers renderAchievements()
            }
            if (document.getElementById('statsTab').classList.contains('active')) {
                loadCollection(); // This triggers renderStats()
            }
        }
    );

    // LISTENER 2: Only watch 'scores' if we are NOT in XP mode
    if (currentMode !== 'xp') {
        realtimeSubscription.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'scores' },
            () => {
                fetchLeaderboard();
            }
        );
    }

    realtimeSubscription.subscribe();
}

// Unified Tab Click Logic
async function handleTabClick(mode, btn) {
    if (currentMode === mode || !btn) return;
    currentMode = mode;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cached = localStorage.getItem(`leaderboard_${mode}`);
    if (cached) updateLeaderboard(JSON.parse(cached));

    fetchLeaderboard();
    await subscribeToLeaderboard(); // Re-subscribe to the correct table
}

scoreTab.onclick = () => handleTabClick('score', scoreTab);
xpTab.onclick = () => handleTabClick('xp', xpTab);
if (weeklyTab) weeklyTab.onclick = () => handleTabClick('weekly', weeklyTab);
if (liteTab) liteTab.onclick = () => handleTabClick('lite', liteTab);
if (dailyTab) dailyTab.onclick = () => handleTabClick('daily', dailyTab);


// collection

const PET_DATA = [
    { id: 'pet_mole', name: 'Baby Mole', rarity: 'common', file: 'mole.png' },
    { id: 'pet_kraken', name: 'Pet Kraken', rarity: 'common', file: 'kraken.png' },
    { id: 'pet_chompy', name: 'Chompy Chick', rarity: 'common', file: 'chompy.png' },

    { id: 'pet_zilyana', name: 'Pet Zilyana', rarity: 'uncommon', file: 'zilyana.png' },
    { id: 'pet_vorki', name: 'Vorki', rarity: 'uncommon', file: 'vorki.png' },
    { id: 'pet_snakeling', name: 'Pet Snakeling', rarity: 'uncommon', file: 'snakeling.png' },

    { id: 'pet_yami', name: 'Yami', rarity: 'rare', file: 'yami.png' },
    { id: 'pet_bloodhound', name: 'Bloodhound', rarity: 'rare', file: 'bloodhound.png' },
    { id: 'pet_rocky', name: 'Rocky', rarity: 'rare', file: 'rocky.png' },

    { id: 'pet_jad', name: 'TzRek-Jad', rarity: 'legendary', file: 'jad.png' },
    { id: 'pet_olmlet', name: 'Olmlet', rarity: 'legendary', file: 'olmlet.png' },
    { id: 'pet_corporeal_beast', name: 'Corporeal Beast', rarity: 'legendary', file: 'corporeal_beast.png' },

    { id: 'pet_zuk', name: 'TzRek-Zuk', rarity: 'mythic', file: 'zuk.png' },
    { id: 'pet_lil_zik', name: 'Lil\' Zik', rarity: 'mythic', file: 'lil_zik.png' },
    { id: 'pet_tumekens_guardian', name: 'Tumeken\'s guardian', rarity: 'mythic', file: 'tumekens_guardian.png' },
    { id: 'max_cape', name: 'Max Cape',  file: 'max_cape.png' },
    { id: 'achievement_cape', name: 'Achievement Cape', file: 'achievement_cape.png' }
];

function resetCollectionUI() {
    localStorage.removeItem('cached_pets');
    localStorage.removeItem('equipped_pet_id');

    currentEquippedPet = null;

    PET_DATA.forEach(pet => {
        const slot = document.getElementById(`slot-${pet.id}`);
        if (!slot) return;

        slot.className = 'pet-slot';
        slot.onclick = null;

        const nameSpan = slot.querySelector('.pet-name');
        nameSpan.textContent = '???';
    });
}

const ACHIEVEMENT_SCHEMA = [
    {
        cat: 'Levels', tasks: [
            { id: 'lvl10', text: 'Reach Level 10', check: (d) => d.level >= 10 },
            { id: 'lvl50', text: 'Reach Level 50', check: (d) => d.level >= 50 },
            { id: 'lvl99', text: 'Reach Max Level', check: (d) => d.level >= 99 }
        ]
    },
    {
        cat: 'Normal Mode', tasks: [
            { id: 'sc10', text: 'Reach 10 Score', check: (d) => d.maxScore >= 10 },
            { id: 'sc50', text: 'Reach 50 Score', check: (d) => d.maxScore >= 50 },
            { id: 'sc100', text: 'Reach 100 Score', check: (d) => d.maxScore >= 100 },
            { id: 'sc510', text: 'Reach Max Score', check: (d) => d.maxScore >= 610 }
        ]
    },
    {
        cat: 'Lite Mode', tasks: [
            { id: 'l50', text: 'Halfway 50/100', check: (d) => d.lite50 === true },
            { id: 'l100', text: 'Perfect 100/100', check: (d) => d.lite100 === true },
            { id: 'ls8', text: 'Speedrunner 100/100 sub 8m', check: (d) => d.liteSub8 === true },
            { id: 'ls6', text: 'GM Speedrunner 100/100 sub 6m', check: (d) => d.liteSub6 === true }
        ]
    },
    {
        cat: 'Daily Mode', tasks: [
            { id: 'd1', text: 'First Daily Mode', check: (d) => d.dailyTotal >= 1 },
            { id: 'd10r', text: '10 Day Streak', check: (d) => d.dailyStreak >= 10 },
            { id: 'd20t', text: '20 Daily Games', check: (d) => d.dailyTotal >= 20 },
            { id: 'd100t', text: '100 Daily Games', check: (d) => d.dailyTotal >= 100 },
            { id: 'd10d', text: 'Perfect 10/10', check: (d) => d.dailyPerfect === true }
        ]
    },
    {
        cat: 'Weekly Mode', tasks: [
            { id: 'w25', text: 'Halfway 25/50', check: (d) => d.weekly25 === true },
            { id: 'w50', text: 'Perfect 50/50', check: (d) => d.weekly50 === true },
            { id: 'ws3', text: 'Speedrunner 50/50 sub 3m', check: (d) => d.weeklySub3 === true },
            { id: 'ws2', text: 'GM Speedrunner 50/50 sub 2m', check: (d) => d.weeklySub2 === true }
        ]
    },
    {
        cat: 'Pets', tasks: [
            { id: 'p1', text: 'Unlock 1 Pet', check: (d) => d.petsUnlocked >= 1 },
            { id: 'pall', text: 'Unlock all Pets', check: (d) => d.petsUnlocked >= 15 }
        ]
    },
    {
        cat: 'Game', tasks: [
            { id: 'fast', text: 'Lucky Guess', check: (d) => d.fastestGuess === true },
            { id: 'close', text: 'Just in Time', check: (d) => d.justInTime === true }
        ]
    }
];

// TAB SWITCHING
document.getElementById('petsTab').onclick = () => {
    document.getElementById('petsTab').classList.add('active');
    document.getElementById('achieveTab').classList.remove('active');
    document.getElementById('statsTab').classList.remove('active');
    document.getElementById('logGrid').classList.remove('hidden');
    document.getElementById('statsView').classList.add('hidden');
    document.getElementById('achievementsView').classList.add('hidden');
};

document.getElementById('achieveTab').onclick = () => {
    document.getElementById('achieveTab').classList.add('active');
    document.getElementById('petsTab').classList.remove('active');
    document.getElementById('statsTab').classList.remove('active');
    document.getElementById('logGrid').classList.add('hidden');
    document.getElementById('statsView').classList.add('hidden');
    document.getElementById('achievementsView').classList.remove('hidden');
    renderAchievements();
};
document.getElementById('statsTab').onclick = () => {
    document.getElementById('statsTab').classList.add('active');
    document.getElementById('petsTab').classList.remove('active');
    document.getElementById('achieveTab').classList.remove('active');
    document.getElementById('logGrid').classList.add('hidden');
    document.getElementById('achievementsView').classList.add('hidden');
    document.getElementById('statsView').classList.remove('hidden');
    renderStats();
};

async function renderStats() {
    const statsList = document.getElementById('statsList');
    const pbList = document.getElementById('pbList');
    const maxCape = document.getElementById('cape-max');
    const achieveCape = document.getElementById('cape-achieve');

    const stats = getStatsObject();

    // 1. Update Header
    document.getElementById('statsName').textContent = `${localStorage.getItem('cachedUsername') || 'Guest'}`;
    document.getElementById('statsLevel').textContent = `${document.getElementById('levelNumber').textContent}`;
    const rawXPValue = document.getElementById('xpBracket').textContent.replace(/[^0-9]/g, '');
    // Convert the string to a number and format it
    const formattedXP = parseInt(rawXPValue, 10).toLocaleString();
    document.getElementById('statsXP').textContent = formattedXP;

    // --- Correct & Wrong Answers ---
    const totalCorrect = parseInt(localStorage.getItem('cached_total_correct') || 0);
    const totalWrong = parseInt(localStorage.getItem('cached_total_wrong') || 0);
    const totalAnswers = totalCorrect + totalWrong;

    // Calculate Accuracy
    const accuracy = totalAnswers > 0 
        ? Math.round((totalCorrect / totalAnswers) * 100) 
        : 0;

    // Update the UI elements
    const correctElem = document.getElementById('statsTotalCorrect');
    const wrongElem = document.getElementById('statsTotalWrong');
    const accuracyElem = document.getElementById('statsAccuracy');

    if (correctElem) correctElem.textContent = totalCorrect.toLocaleString();
    if (wrongElem) wrongElem.textContent = totalWrong.toLocaleString();
    if (accuracyElem) accuracyElem.textContent = `${accuracy}%`;

    // multiplayer wins/losses/draws

    const winsEl = document.getElementById('statsWins');
    const lossesEl = document.getElementById('statsLosses');
    const drawsEl = document.getElementById('statsDraws');

    if (winsEl) winsEl.textContent = parseInt(localStorage.getItem('multiplayer_wins') || 0);
    if (lossesEl) lossesEl.textContent = parseInt(localStorage.getItem('multiplayer_losses') || 0);
    if (drawsEl) drawsEl.textContent = parseInt(localStorage.getItem('multiplayer_draws') || 0);

    // Daily streak and total
    const bestStreak = localStorage.getItem('stat_max_streak') || 0;
    const totalDaily = localStorage.getItem('cached_daily_total') || 0;

    const streakElem = document.getElementById('statsMaxStreak');
    const totalElem = document.getElementById('statsTotalDaily');

    if (streakElem) streakElem.textContent = parseInt(bestStreak).toLocaleString();
    if (totalElem) totalElem.textContent = parseInt(totalDaily).toLocaleString();

    // Define the mapping based on your HTML data-mode attributes
    const dataMap = {
            'Normal': { s: localStorage.getItem('cached_score') || 0, t: localStorage.getItem('cached_time_ms') || 0 },
            'Lite': JSON.parse(localStorage.getItem('cached_lite_data') || '{"score":0, "time":0}'),
            'Weekly': JSON.parse(localStorage.getItem('cached_weekly_data') || '{"score":0, "time":0}'),
            'Daily': JSON.parse(localStorage.getItem('cached_daily_data') || '{"score":0, "time":0}')
        };

        Object.keys(dataMap).forEach(mode => {
            const row = pbList.querySelector(`[data-mode="${mode}"]`);
            if (!row) return; // Guard clause is cleaner

            const val = dataMap[mode];
            // This handles both the structure from your fetch and the structure from your cache
            const score = val.s ?? val.score ?? 0;
            const time = val.t ?? val.time ?? 0;

            const valueSpan = row.querySelector('.stat-value');
            const newContent = `${parseInt(score).toLocaleString()} <span class="time-stamp">${formatLeaderboardTime(time)}</span>`;

            // Keep the DOM update optimization
            if (valueSpan.innerHTML !== newContent) {
                valueSpan.innerHTML = newContent;
            }
        });

    // 5. Update UI Counters
    document.getElementById('stat-pet-count').textContent = `${stats.petsUnlocked}/${15}`;
    const allAchievements = ACHIEVEMENT_SCHEMA.flatMap(c => c.tasks);
    const completedCount = allAchievements.filter(t => t.check(stats)).length;
    document.getElementById('stat-achieve-count').textContent = `${completedCount}/${24}`;

    // 6. Cape Logic
    maxCape.classList.toggle('unlocked', stats.level >= MAX_LEVEL);
    achieveCape.classList.toggle('unlocked', completedCount >= TOTAL_ACHIEVEMENTS);

    // Apply visual state (does not need to be a function, just direct assignment)
    maxCape.classList.toggle('equipped', currentEquippedPet === 'max_cape');
    achieveCape.classList.toggle('equipped', currentEquippedPet === 'achievement_cape');

    // Attach listeners ONCE outside of data-heavy renders if possible, 
    // but for simplicity here, we only attach if they aren't already set.
    if (!maxCape.dataset.listener) {
        maxCape.addEventListener('click', () => handleCapeClick('max_cape', maxCape));
        maxCape.dataset.listener = "true";
    }
    if (!achieveCape.dataset.listener) {
        achieveCape.addEventListener('click', () => handleCapeClick('achievement_cape', achieveCape));
        achieveCape.dataset.listener = "true";
    }
}

// Separate helper to avoid re-defining functions
async function handleCapeClick(id, element) {
    if (!element.classList.contains('unlocked')) return;

    const newEquipped = (currentEquippedPet === id) ? null : id;
    
    currentEquippedPet = newEquipped;
    if (newEquipped) localStorage.setItem('equipped_pet_id', newEquipped);
    else localStorage.removeItem('equipped_pet_id');

    await supabase.rpc('equip_pet_secure', { pet_id_to_equip: newEquipped });
    
    // Refresh stats to trigger classList updates
    renderStats();
}

// Helper to provide the same stat object used in achievements
function getStatsObject() {
    return {
        level: parseInt(localStorage.getItem('cached_level')) || 1,
        maxScore: parseInt(localStorage.getItem('cached_max_score')) || 0,
        dailyTotal: parseInt(localStorage.getItem('cached_daily_total')) || 0,
        dailyStreak: parseInt(localStorage.getItem('stat_max_streak')) || 0,
        petsUnlocked: JSON.parse(localStorage.getItem('cached_pets') || '[]').length,
        fastestGuess: localStorage.getItem('stat_fastest') === 'true',
        justInTime: localStorage.getItem('stat_just_in_time') === 'true',
        dailyPerfect: localStorage.getItem('stat_daily_perfect') === 'true',
        // --- FIXED: Weekly Booleans from LocalStorage ---
        weekly25: localStorage.getItem('ach_stat_weekly_25') === 'true',
        weekly50: localStorage.getItem('ach_stat_weekly_50') === 'true',
        weeklySub3: localStorage.getItem('ach_stat_weekly_sub_3') === 'true',
        weeklySub2: localStorage.getItem('ach_stat_weekly_sub_2') === 'true',
        // --- FIXED: Lite Booleans from LocalStorage ---
        lite50: localStorage.getItem('ach_stat_lite_50') === 'true',
        lite100: localStorage.getItem('ach_stat_lite_100') === 'true',
        liteSub8: localStorage.getItem('ach_stat_lite_sub_8') === 'true',
        liteSub6: localStorage.getItem('ach_stat_lite_sub_6') === 'true'
    };
}


async function renderAchievements(calculatedLevel) {
    const list = document.getElementById('achievementList');
    list.innerHTML = '';

    // Get user stats from LocalStorage or Supabase
    const stats = {
        level: calculatedLevel || parseInt(localStorage.getItem('cached_level')) || 1,
        maxScore: parseInt(localStorage.getItem('cached_max_score')) || 0,
        dailyTotal: parseInt(localStorage.getItem('cached_daily_total')) || 0,
        dailyStreak: parseInt(localStorage.getItem('stat_max_streak')) || 0,
        petsUnlocked: JSON.parse(localStorage.getItem('cached_pets') || '[]').length,
        fastestGuess: localStorage.getItem('stat_fastest') === 'true',
        justInTime: localStorage.getItem('stat_just_in_time') === 'true',
        dailyPerfect: localStorage.getItem('stat_daily_perfect') === 'true',
        // --- FIXED: Weekly Booleans from LocalStorage ---
        weekly25: localStorage.getItem('ach_stat_weekly_25') === 'true',
        weekly50: localStorage.getItem('ach_stat_weekly_50') === 'true',
        weeklySub3: localStorage.getItem('ach_stat_weekly_sub_3') === 'true',
        weeklySub2: localStorage.getItem('ach_stat_weekly_sub_2') === 'true',
        // --- FIXED: Lite Booleans from LocalStorage ---
        lite50: localStorage.getItem('ach_stat_lite_50') === 'true',
        lite100: localStorage.getItem('ach_stat_lite_100') === 'true',
        liteSub8: localStorage.getItem('ach_stat_lite_sub_8') === 'true',
        liteSub6: localStorage.getItem('ach_stat_lite_sub_6') === 'true'
    };

    ACHIEVEMENT_SCHEMA.forEach(category => {
        const catHeader = document.createElement('li');
        catHeader.className = 'achieve-category';
        catHeader.textContent = category.cat;
        list.appendChild(catHeader);

        category.tasks.forEach(task => {
            const isDone = task.check(stats);
            const item = document.createElement('li');
            item.className = `achieve-item ${isDone ? 'completed' : ''}`;
            item.innerHTML = `<span>${task.text}</span><span class="status-icon"></span>`;
            list.appendChild(item);
        });
    });
}


function applyUnlocks(unlockedList) {
    PET_DATA.forEach(pet => {
        const slot = document.getElementById(`slot-${pet.id}`);
        if (!slot) return;

        const isUnlocked = unlockedList.includes(pet.id);
        const isEquipped = currentEquippedPet === pet.id;
        const nameSpan = slot.querySelector('.pet-name');
        const img = slot.querySelector('.pet-img'); // Get the image element

        // Force the correct image file based on the PET_DATA array
        if (img) {
            // Check if it's a cape based on the ID or a property in your PET_DATA
            const isCape = pet.id === 'max_cape' || pet.id === 'achievement_cape';
            const folder = isCape ? 'capes/' : 'pets/';
            
            // Use the file property from PET_DATA, but point to the correct folder
            img.src = `${folder}${pet.file}`;
        }
        // Update Classes
        slot.className = `pet-slot ${isUnlocked ? 'unlocked' : ''} ${isEquipped ? 'equipped' : ''}`;
        nameSpan.textContent = isUnlocked ? pet.name : "???";

        // Add Click Listener for Unlocked Pets
        if (isUnlocked) {
            slot.onclick = () => equipPet(pet.id);
        } else {
            slot.onclick = null; // Important: Clear any old listeners
        }
    });
    document.getElementById('logGrid').classList.add('ready');
    document.querySelector('.container').classList.add('loaded');
}
async function equipPet(petId) {
    // 1. Toggle logic (if clicking the same pet, unequip it)
    const newPetId = (currentEquippedPet === petId) ? null : petId;
    currentEquippedPet = newPetId;

    // Update Local Storage
    if (newPetId) {
        localStorage.setItem('equipped_pet_id', newPetId);
    } else {
        localStorage.removeItem('equipped_pet_id');
    }

    // UI Refresh
    applyUnlocks(JSON.parse(localStorage.getItem('cached_pets') || '[]'));

    // 3. Securely save to Supabase using RPC
    const { error } = await supabase.rpc('equip_pet_secure', {
        pet_id_to_equip: newPetId
    });
    if (error) {
        console.error("Pet update failed:", error.message);
    }
}

async function loadCollection() {
    // 1. Fetch fresh data
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 2. Initial UI from LocalStorage
    const cachedPets = JSON.parse(localStorage.getItem('cached_pets') || '[]');
    if (cachedPets.length > 0) applyUnlocks(cachedPets);

    // --- UPDATED: Now fetching the highest score from daily_attempts as well ---
    const [profileRes, scoreRes, attemptsRes] = await Promise.all([
        supabase.from('profiles').select('collection_log, achievements, xp, equipped_pet, level, total_correct, total_wrong, wins, losses, draws').eq('id', session.user.id).single(),
        supabase.from('scores').select('score, time_ms, lite_data, weekly_data, daily_data').eq('user_id', session.user.id).maybeSingle(),
        // Get the count AND check if a score of 10 exists
        supabase.from('daily_attempts').select('score').eq('user_id', session.user.id)
    ]);

    if (profileRes.error) {
        console.error("Error loading profile:", profileRes.error);
        return;
    }
    // Extract the actual data from the response object
    const profileData = profileRes.data;
    const maxScore = scoreRes.data?.score || 0;
    const officialLevel = profileData.level || 1;

    // Calculate total games and check for a perfect 10/10 from the attempts list
    const attempts = attemptsRes.data || [];
    const realTotalGames = attempts.length;
    const hasPerfectGame = attempts.some(attempt => attempt.score === 10);

    if (profileData) {
        const a = profileData.achievements || {}; // Define 'a' here so it's available below
        const s = scoreRes.data || {}; // Get the whole score object
        // save multiplayer wins / losses / draws
        localStorage.setItem('multiplayer_wins', profileData.wins || 0);
        localStorage.setItem('multiplayer_losses', profileData.losses || 0);
        localStorage.setItem('multiplayer_draws', profileData.draws || 0);

        // Save the counters to Cache
        localStorage.setItem('cached_total_correct', profileData.total_correct || 0);
        localStorage.setItem('cached_total_wrong', profileData.total_wrong || 0);
       
        localStorage.setItem('cached_xp', profileData.xp || 0);
        localStorage.setItem('cached_level', officialLevel);
        localStorage.setItem('cached_max_score', maxScore);
        // Save Weekly stats to LocalStorage so renderAchievements can see them
        localStorage.setItem('ach_stat_weekly_25', (a.weekly_25 || false).toString());
        localStorage.setItem('ach_stat_weekly_50', (a.weekly_50 || false).toString());
        localStorage.setItem('ach_stat_weekly_sub_3', (a.weekly_sub_3 || false).toString());
        localStorage.setItem('ach_stat_weekly_sub_2', (a.weekly_sub_2 || false).toString());
        // Save Lite stats to LocalStorage so renderAchievements can see them
        localStorage.setItem('ach_stat_lite_50', (a.lite_50 || false).toString());
        localStorage.setItem('ach_stat_lite_100', (a.lite_100 || false).toString());
        localStorage.setItem('ach_stat_lite_sub_8', (a.lite_sub_8 || false).toString());
        localStorage.setItem('ach_stat_lite_sub_6', (a.lite_sub_6 || false).toString());
        // Save to LocalStorage so renderStats() can find them
        localStorage.setItem('cached_score', s.score || 0);
        localStorage.setItem('cached_time_ms', s.time_ms || 9999);
        localStorage.setItem('cached_lite_data', JSON.stringify(s.lite_data || {}));
        localStorage.setItem('cached_weekly_data', JSON.stringify(s.weekly_data || {}));
        localStorage.setItem('cached_daily_data', JSON.stringify(s.daily_data || {}));

        // Total Daily Games (from achievements object 'a')
        localStorage.setItem('cached_daily_total', realTotalGames);

        // If hasPerfectGame is true from the table, use 'true', otherwise fallback to the JSON column
        const isPerfect = hasPerfectGame || a.daily_perfect || false;
        localStorage.setItem('stat_daily_perfect', isPerfect.toString());

        // Best Daily Streak (from achievements object 'a')
        localStorage.setItem('cached_daily_streak', a.daily_streak || 0);
        localStorage.setItem('stat_max_streak', a.max_streak || 0);
        localStorage.setItem('stat_fastest', (a.fastest_guess || false).toString());
        localStorage.setItem('stat_just_in_time', (a.just_in_time || false).toString());
        currentEquippedPet = profileData.equipped_pet || null;
        if (currentEquippedPet) {
            localStorage.setItem('equipped_pet_id', currentEquippedPet);
        } else {
            localStorage.removeItem('equipped_pet_id');
        }

        // Update Pets and UI
        const freshPets = profileData.collection_log || [];
        localStorage.setItem('cached_pets', JSON.stringify(freshPets));
        applyUnlocks(freshPets);

        const achieveTab = document.getElementById('achieveTab');
        if (achieveTab && achieveTab.classList.contains('active')) {
            renderAchievements(officialLevel);
        }
        // ADD THIS: If Stats tab is active, refresh it too
        const statsTab = document.getElementById('statsTab');
        if (statsTab && statsTab.classList.contains('active')) {
            renderStats();
        }
    }
}

// main app
window.navigateTo = function (viewId) {
    // 1. SHIELD: Immediately block all taps during the transition
    document.body.style.pointerEvents = 'none';

    // 2. Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    // 3. Force clean every single 'tapped' element on the screen
    document.querySelectorAll('.tapped').forEach(el => {
        el.classList.remove('tapped');
        el.blur();
    });

    // 4. Show the target view
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
    }

    // Reset Home Screen Children if navigating Home ---
    if (viewId === 'view-home') {
        const toShow = ['start-screen', 'user-controls', 'main-title'];
        toShow.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('hidden');
                el.style.display = ''; // Clear any inline 'none' or 'flex' set by JS
            }
        });
        // Also ensure the home view itself isn't stuck with an inline flex height
        const home = document.getElementById('view-home');
        if (home) home.style.display = ''; 
    }

    // 5. App controls logic
    if (viewId === 'view-leaderboard') {
        app.classList.add('hide-controls');
    } else {
        app.classList.remove('hide-controls');
    }
    if (viewId === 'view-collections') {
        // 2. Force the Pets tab to be the active one
        const petsTab = document.getElementById('petsTab');
        if (petsTab) {
        petsTab.click(); // Programmatically trigger the click
        }
    }
    
    document.body.classList.remove('game-active');
    game.classList.add('hidden');
    // 6. Update URL
    const path = viewId.replace('view-', '');
    window.location.hash = path;

    // 7. UN-SHIELD: Re-enable interaction after a short delay
    // The delay ensures the transition is finished before the user can tap again
    setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
    }, 300); 
};

// 1v1 MODE

function resetGameEngine() {
    console.log("Engine: Performing full memory reset...");

    // 1. Clear the data queues
    preloadQueue = [];
    window.nextFetchIndex = 0;
    window.currentLobbyIndex = 0;

    // 2. Clear the storage so the next lobby MUST fetch from DB
    sessionStorage.removeItem('current_lobby_questions');
    sessionStorage.removeItem('current_lobby_id');

    // 3. Reset Game State Flags
    gameStarting = false;
    gameEnding = false;
    isMultiplayerMode = false;
    myHP = 60; // Or your MAX_HP
    opponentHP = 60;

    // 4. Reset UI (Optional but recommended)
    if (typeof timerInterval !== 'undefined') clearInterval(timerInterval);
    const answersBox = document.getElementById('answers-box');
    if (answersBox) answersBox.innerHTML = '';

    const scoreContainer = document.getElementById('finalScore').parentElement;
    // Put the original HTML structure back
    scoreContainer.innerHTML = 'Score: <span id="finalScore">0</span>';
}

async function startNewRound() {
    if (myRole !== 'host') return;
    const lobbyId = sessionStorage.getItem('current_lobby_id')?.replace(/['"]+/g, '');

    // 1. Generate & Shuffle 1000 IDs
    const allIDs = Array.from({ length: 1000 }, (_, i) => i + 1);
    for (let i = allIDs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIDs[i], allIDs[j]] = [allIDs[j], allIDs[i]];
    }
    // Force the IDs to be a clean array of numbers
    const cleanIDs = allIDs.map(id => Number(id));
    // CRITICAL: Save the new IDs locally so the Host's engine sees them
    sessionStorage.setItem('current_lobby_questions', JSON.stringify(allIDs));
    preloadQueue = []; 
    window.nextFetchIndex = 0;
    iAmReadyForRematch = false;
    opponentReadyForRematch = false;

    // 2. Update Database AND WAIT FOR IT
    const { error } = await supabase
        .from('live_lobbies')
        .update({ 
            question_ids: cleanIDs, 
            status: 'playing' // Changing status helps trigger listeners
        })
        .eq('id', lobbyId)
        .select();

    if (error) {
        console.error("DB Update Failed - Stopping Rematch:", error);
        return; // STOP HERE so we don't send a fake broadcast
    }

    console.log("Host: Database updated. Waiting for listener to trigger engine...");
}

// Helper to handle the UI swap consistently
function finalizeEndScreen(rounds = null) {
    requestAnimationFrame(() => {
        const scoreRow = document.getElementById('end-score-container');
        const multiRow = document.getElementById('multiplayer-stats-container');
        const roundsCount = document.getElementById('multi-rounds-count');

        if (rounds !== null) {
            if (scoreRow) scoreRow.classList.add('hidden');
            if (multiRow) {
                multiRow.classList.remove('hidden');
                if (roundsCount) roundsCount.textContent = rounds;
            }
        } else {
            if (scoreRow) scoreRow.classList.remove('hidden');
            if (multiRow) multiRow.classList.add('hidden');
        }

        document.body.classList.remove('game-active');
        const gameDiv = document.getElementById('game');
        const endScreen = document.getElementById('end-screen');
        if (gameDiv) gameDiv.classList.add('hidden');
        if (endScreen) endScreen.classList.remove('hidden');
        gameEnding = false;
    });
}

async function handleMultiplayerTimeout() {
    // 1. Prevent double-triggering if the player clicks right as it expires
    if (iHaveAnswered || gameEnding) return;
    iHaveAnswered = true;
    clearInterval(timer); // Stop the visual clock now that we've hit 0
    // 2. UI & Sound Feedback
    stopTickSound();
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    playSound(wrongBuffer);
    
    // Show them what they missed
    await highlightCorrectAnswer();

    // 3. OSRS Style Damage
    // A timeout is a "missed flick" - take significant damage
    const timeoutDamage = 20; 
    myHP = Math.max(0, myHP - timeoutDamage);
    triggerHitsplat('my', 20);

    // Update your bars using your existing function
    updateHPUI();

    // 4. Tell the Lobby what happened
    if (lobbyChannel) {
        lobbyChannel.send({
            type: 'broadcast',
            event: 'player_answered',
            payload: {
                user_id: userId,
                correct: false,
                hp_remaining: myHP,
                damage_taken: 20,
                timed_out: true // Inform opponent it was a timeout
            }
        });
    }

    // Clear any existing sync locks and move to transition
    isSyncing = false;
    handleMultiplayerTransition();
}

async function fetchNextLobbyQuestion() {
    if (isFetchingLobbyQuestion) return;
    
    try {
        isFetchingLobbyQuestion = true;

        // 1. Check storage first
        let stored = sessionStorage.getItem('current_lobby_questions');
        let storedIds = stored ? JSON.parse(stored) : null;

        // 2. CRITICAL: If no IDs (Rematch scenario), fetch them from the DB now
        if (!storedIds || storedIds.length === 0) {
            console.log("Fetcher: Storage empty, performing emergency DB sync...");
            const lobbyId = sessionStorage.getItem('current_lobby_id');
            
            const { data, error } = await supabase
                .from('live_lobbies')
                .select('question_ids')
                .eq('id', lobbyId)
                .single();

            if (error || !data?.question_ids) {
                console.warn("Fetcher: Could not sync IDs from DB.");
                return;
            }

            storedIds = data.question_ids;
            sessionStorage.setItem('current_lobby_questions', JSON.stringify(storedIds));
        }

        if (typeof storedIds === 'string') storedIds = JSON.parse(storedIds);

        // 3. Pointer Logic
        if (window.nextFetchIndex === undefined) window.nextFetchIndex = 0;
        
        const currentToFetch = window.nextFetchIndex;
        const nextId = storedIds[currentToFetch];

        if (!nextId) {
            console.log("End of lobby list reached.");
            return;
        }

        // 4. Increment and Fetch
        window.nextFetchIndex++;
        console.log(`DEBUG: Index ${currentToFetch} | ID: ${nextId}`);

        const data = await fetchDeterministicQuestion(Number(nextId));

        if (data) {
            preloadQueue.push(data);
        }

    } catch (err) {
        console.error("RPC Fetch Error:", err.message);
    } finally {
        isFetchingLobbyQuestion = false; 
    }
}

function subscribeToLobby(lobbyCode, lobbyId) {
    if (lobbyChannel) supabase.removeChannel(lobbyChannel);

    // RESET pointer so we start at question 0 of the lobby list
    window.currentLobbyIndex = 0;

    // We use the lobbyCode for the channel name, but the lobbyId for the DB filter
    lobbyChannel = supabase.channel(`lobby_${lobbyCode}`, {
        config: { 
            broadcast: { self: true },
            presence: { key: myRole } 
        }
    });

    // --- 1. Database Listener (The "Truth") ---
    lobbyChannel.on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'live_lobbies', 
        filter: `id=eq.${lobbyId}` 
    }, (payload) => {
    const newStatus = payload.new.status;
    console.log("DB Change Detected. New Status:", newStatus);
    const lobbyData = payload.new;
    // --- NEW: SYNC NAMES ---
    // If I am host, opponent is guest. If I am guest, opponent is host.
    opponentName = (myRole === 'host') ? lobbyData.guest_name : lobbyData.host_name;
    
    if (opponentName) {
        const oppLabel = document.getElementById('opponent-name-display');
        if (oppLabel) oppLabel.textContent = opponentName;
    }

    // --- HOST LOGIC: Opponent joined ---
    if (newStatus === 'ready' && myRole === 'host') {
        document.getElementById('host-controls').classList.remove('hidden');
        // Use the actual name here too!
        document.getElementById('lobbyStatus').innerHTML = 
            `<span style="color: #4CAF50; font-weight: bold;">${opponentName || 'Opponent'} Ready!</span>`;
        
        if (typeof playSound === 'function' && window.notificationBuffer) {
            playSound(notificationBuffer);
        }
    }

    // --- FIRST START LOGIC ---
    if (newStatus === 'active') {
        // CRITICAL: Only the Guest reacts to 'active'. 
        // The Host already started via the button click 'setTimeout'.
        if (myRole === 'guest') {
            console.log("Guest: First game ACTIVE. Launching...");
            startMultiplayerGame();
        }
    }

    // --- REMATCH START LOGIC (Round 2+) ---
    if (newStatus === 'playing') {
        console.log(`${myRole.toUpperCase()}: Starting Game from DB Signal...`);
        
        // 1. Everyone resets memory
        sessionStorage.removeItem('current_lobby_questions');
        preloadQueue = [];
        window.nextFetchIndex = 0;
        window.currentLobbyIndex = 0;

        // 2. Everyone saves the new IDs from the database payload
        if (payload.new.question_ids) {
            sessionStorage.setItem('current_lobby_questions', JSON.stringify(payload.new.question_ids));
            console.log(`${myRole.toUpperCase()}: IDs Synced. First ID:`, payload.new.question_ids[0]);
        }

        // 3. Everyone launches at the exact same time
        startMultiplayerGame();
    }
});

    // --- 2. Broadcast Listeners (The "Speed") ---
    lobbyChannel.on('broadcast', { event: 'guest-joined' }, () => {
        if (myRole === 'host') {
            // Backup in case Postgres change is slow
            document.getElementById('host-controls').classList.remove('hidden');
            document.getElementById('lobbyStatus').innerHTML = 
                '<span style="color: #4CAF50; font-weight: bold;">Opponent Connected!</span>';
        }
    });
/*
lobbyChannel.on('broadcast', { event: 'start-game' }, async () => { // Added async
    if (myRole === 'guest') {
        console.log("Rematch signal received! Resetting for Guest start...");
    
        // 1. Clear old data immediately
        sessionStorage.removeItem('current_lobby_questions');
        preloadQueue = []; 
        window.nextFetchIndex = 0;
        
        // 2. Reset flags
        isFetchingLobbyQuestion = false; 
        iAmReadyForRematch = false;
        opponentReadyForRematch = false;
        
        // 3. UI Cleanup - NUCLEAR OPTION (Fixes the "small to the left" bug)
        const endScreen = document.getElementById('end-screen');
        if (endScreen) {
            endScreen.classList.add('hidden');
        }

        // 4. SYNC FRESH IDs FROM DB (Fixes repeating questions)
        // We do this BEFORE startMultiplayerGame so the engine has the right list
        const lobbyId = sessionStorage.getItem('current_lobby_id');
        const { data, error } = await supabase
            .from('live_lobbies')
            .select('question_ids')
            .eq('id', lobbyId)
            .single();

        if (data && data.question_ids) {
            console.log("Guest: New IDs synced. First ID:", data.question_ids[0]);
            sessionStorage.setItem('current_lobby_questions', JSON.stringify(data.question_ids));
            
            // 5. Start the engine ONLY after we have the new data
            startMultiplayerGame();
        } else {
            console.error("Guest: Failed to sync new shuffle!", error);
            // Optional: fallback to the engine's loop if DB is slow
            startMultiplayerGame(); 
        }
    }
});
*/
    lobbyChannel.on('broadcast', { event: 'player-acted' }, (payload) => {
        if (payload.playerRole !== myRole) {
            // Show a "Thinking..." or "Selected an answer" message
            const statusText = document.getElementById('lobbyStatus');
            if (statusText) statusText.innerHTML = "Opponent is deciding...";
        }
    });

    lobbyChannel.on('broadcast', { event: 'rematch_ready' }, (envelope) => {
        const data = envelope.payload;
        if (data.user_id === userId) return; // Ignore my own broadcast

        console.log("Opponent is ready for a rematch!");
        opponentReadyForRematch = true;

        // IF I am the Host AND I have already clicked my own Play Again button
        if (myRole === 'host' && iAmReadyForRematch) {
            console.log("Both ready (Listener trigger): Host starting...");
            startNewRound(); 
        } else {
            // UI Polish: Change the button text so the Host knows the Guest is waiting
            const pBtn = document.getElementById('playAgainBtn');
            if (pBtn && !iAmReadyForRematch) {
                pBtn.innerHTML = `${opponentName || 'Opponent'} is ready! Play Again?`;
                //pBtn.classList.add('glow-gold'); // Optional CSS class for flair
            }
        }
    });

    // Change the event name to match what your answer/timeout functions send
    lobbyChannel.on('broadcast', { event: 'player_answered' }, (envelope) => {
    // Supabase wraps your data: envelope.payload is the object you sent
    const actualData = envelope.payload; 

    // Safety check: ensure we only process the OTHER player's data
    if (actualData && actualData.user_id !== userId) {
        console.log("Opponent answered! Syncing HP to:", actualData.hp_remaining);
        handleOpponentAction(actualData);
    }
});

    // Subscribe and Log Connection
    lobbyChannel.subscribe((status) => {
        console.log(`Lobby Channel (${lobbyCode}):`, status);
        if (status === 'CHANNEL_ERROR') {
            console.error("Failed to connect to Realtime. Check Replication settings.");
        }
    });
}

async function startMultiplayerGame() {
    console.log("Starting Multiplayer Game...");
    gameEnding = false;
    isSyncing = false;  // Reset the sync lock
    iHaveAnswered = false;
    isMultiplayerMode = true; 
    myHP = MAX_HP;
    opponentHP = MAX_HP;
    opponentHasAnswered = false;
    
    if (gameStarting) return;
    gameStarting = true;

    updateHPUI();

    try {
        // FINAL SYNC: Ensure we start at index 0 when the UI swaps
        //window.currentLobbyIndex = 0;
        //window.nextFetchIndex = 0; // The very first question to grab
        //preloadQueue = [];

        // --- THE DATABASE FETCH ---
        // We force a fetch because the broadcast didn't give us IDs
        console.log("Guest: Syncing with Lobby Database...");
        
        // --- THE CRITICAL WAIT ---
        // If the Guest starts with an empty queue, we MUST wait for the DB
        // --- THE CRITICAL WAIT (FIXED) ---
        if (myRole === 'guest') {
            console.log("Guest: Ensuring sync with Host's new questions...");
            let retryCount = 0;
            let success = false;

            while (retryCount < 10) { // Try for 5 seconds total
                await fetchNextLobbyQuestion(); // This needs to update sessionStorage/preloadQueue
                
                if (preloadQueue.length > 0) {
                    success = true;
                    break; 
                }
                
                console.warn(`Guest: Questions not ready yet. Retrying... (${retryCount + 1})`);
                await new Promise(r => setTimeout(r, 500)); // Wait 500ms
                retryCount++;
            }

            if (!success) throw new Error("Sync failed: Questions didn't load in time.");
        } else {
            // Host logic: Just fetch once, since Host created the IDs locally
            if (preloadQueue.length === 0) {
                await fetchNextLobbyQuestion();
            }
        }

        // Now that we have IDs from the DB, load the first one
        await loadQuestion(true);

        // 3. IMAGE PREPARATION (Copying your solo logic)
        // This prevents the "Black Screen" while an image is still loading
        if (currentQuestion && currentQuestion.question_image) {
            try {
                const img = currentQuestion._preloadedImg || new Image();
                if (!img.src) img.src = currentQuestion.question_image;
                await img.decode();
            } catch (e) { console.warn("Image decode failed:", e); }
        }


    requestAnimationFrame(() => {
        // --- STEP A: HIDE ALL VIEWS ---
        // This ensures no other screen (Lobby, Leaderboard, etc.) is blocking the view
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

        // --- STEP B: SHOW THE HOME VIEW (Parent) ---
        const homeView = document.getElementById('view-home');
        if (homeView) {
            homeView.classList.remove('hidden');
            homeView.style.display = 'flex'; // Force layout
        }
        // Replace 'view-lobby' with the actual ID of your lobby div
        const lobbyView = document.getElementById('view-lobby');
        if (lobbyView) {
            lobbyView.classList.add('hidden');
        }
        // --- STEP C: CLEAN UP HOME SCREEN UI ---
        // Hide the menu specific items so only the game shows
        const startScreen = document.getElementById('start-screen');
        const userControls = document.getElementById('user-controls');
        const mainTitle = document.getElementById('main-title');
        const endScreen = document.getElementById('end-screen');
        if (endScreen) {
            endScreen.classList.add('hidden');
        }

        if (startScreen) startScreen.classList.add('hidden');
        if (userControls) userControls.classList.add('hidden');
        if (mainTitle) mainTitle.classList.add('hidden');

        // --- STEP D: SHOW THE GAME ---
        document.body.classList.add('game-active');
        game.classList.remove('hidden');
        game.style.display = 'flex';

        // Show Multiplayer Header
        const mpHeader = document.getElementById('multiplayer-header');
        if (mpHeader) mpHeader.classList.remove('hidden');

        document.getElementById('score').classList.add('hidden');
        document.getElementById('rounds-display').classList.remove('hidden');
        document.getElementById('rounds-display').textContent = "Round: 1";

        const roundsDisplay = document.getElementById('rounds-display');
        roundsDisplay.textContent = "Round: 1";

        // Reset HP Bars
        document.getElementById('my-hp-fill').style.width = '100%';
        document.getElementById('opponent-hp-fill').style.width = '100%';
        document.getElementById('my-hp-text').textContent = `${MAX_HP}/${MAX_HP}`;
        document.getElementById('opponent-hp-text').textContent = `${MAX_HP}/${MAX_HP}`;

        // 5. START THE CLOCK
        gameStartTime = Date.now();
        startTimer(); 

        // 6. BACKGROUND FILL
        // While they answer Q1, fetch the next 5 from the lobby list
        preloadNextQuestions(5); 

        gameStarting = false;
        console.log("Multiplayer Game Started Successfully!");
    });
        
    } catch (err) {
        gameStarting = false;
        console.error("CRITICAL ERROR during game start:", err);
        showGoldAlert("Failed to start: " + err.message);
    }
}

function updateHPUI() {
    const myFill = document.getElementById('my-hp-fill');
    const oppFill = document.getElementById('opponent-hp-fill');

    // Safety check: if we aren't in a game view, stop
    if (!myFill || !oppFill) return;

    // Ensure we never have negative width
    const myPct = Math.max(0, (myHP / MAX_HP) * 100);
    const oppPct = Math.max(0, (opponentHP / MAX_HP) * 100);

    myFill.style.width = `${myPct}%`;
    oppFill.style.width = `${oppPct}%`;

    // Update Text
    document.getElementById('my-hp-text').textContent = `${myHP}/${MAX_HP}`;
    document.getElementById('opponent-hp-text').textContent = `${opponentHP}/${MAX_HP}`;

    console.log("Updating UI - Me:", myHP, "Opponent:", opponentHP);

    // Color logic using Classes instead of inline styles
    const bars = [
        { el: myFill, pct: myPct, text: document.getElementById('my-hp-text') },
        { el: oppFill, pct: oppPct, text: document.getElementById('opponent-hp-text') }
    ];

    bars.forEach(bar => {
        // Remove old classes
        bar.el.classList.remove('hp-low', 'hp-med', 'hp-high');
        
        if (bar.pct <= 20) {
            bar.el.classList.add('hp-low');   // Red
        } else if (bar.pct <= 40) {
            bar.el.classList.add('hp-med');   // Yellow/Orange
        } else {
            bar.el.classList.add('hp-high');  // Green
        }
    });

}

function handleOpponentAction(payload) {
    opponentHasAnswered = true;
    
    // 1. Sync their HP (Force your screen to match their actual HP)
    if (payload.hp_remaining !== undefined) {
        opponentHP = payload.hp_remaining;
        console.log("Opponent HP synced to:", opponentHP);
    }

    // 2. TRIGGER THE SPLAT ON THEM
    // If they sent damage_taken: 0, it shows a Blue 0 on their side.
    // If they sent damage_taken: 20, it shows a Red 20 on their side.
    if (payload.damage_taken !== undefined) {
        triggerHitsplat('opponent', payload.damage_taken);
    }

    updateHPUI();
    handleMultiplayerTransition();
}

function triggerHitsplat(target, damage = 20) {
    // 1. Find the parent container (the HP bar area)
    const containerId = target === 'my' ? 'my-hp-group' : 'opponent-hp-group';
    const container = document.getElementById(containerId);
    if (!container) return;

    // 2. Create a NEW hitsplat element
    const splat = document.createElement('div');
    splat.textContent = damage;
    
    // 3. Apply classes based on damage
    splat.className = 'hitsplat show-splat';
    if (damage === 0) {
        splat.classList.add('miss'); // Blue
    } else {
        splat.classList.add('hit');  // Red
    }

    // 4. Add to the game world
    container.appendChild(splat);

    // 5. Cleanup after animation finishes (1 second)
    setTimeout(() => {
        splat.remove();
    }, 1000);
}

function handleMultiplayerTransition() {
    // If I've answered but the opponent hasn't, and the timer is still running...
    // WAIT. Don't trigger syncAndProceed yet.
    if (iHaveAnswered && !opponentHasAnswered && timeLeft > 0) {
        console.log("Waiting for opponent's final move... Safety timer active.");
        return; 
    }

    // If we reach here, it means either:
    // 1. Both have answered.
    // 2. The timer hit 0 (someone timed out).
    // 3. Someone died (HP <= 0).

    clearTimeout(window.multiplayerSyncTimer);
    window.multiplayerSyncTimer = setTimeout(() => {
        syncAndProceed();
    }, 1000); // 1 second buffer for visual splats to play
}

// Add a parameter 'force' that defaults to false
async function syncAndProceed(force = false) {
    clearTimeout(window.forceEndTimeout);
    // 1. THE MANDATORY SYNC GATE
    // We only proceed if:
    // - force is true (emergency/timeout)
    // - OR BOTH players have answered. 
    // We NO LONGER check isGameOver here because we want to wait for the final outcome.
    if (!force && (!iHaveAnswered || !opponentHasAnswered)) {
        console.log("Waiting for both players to finish the current question...");
        
        const statusEl = document.getElementById('lobbyStatus');
        if (statusEl && iHaveAnswered) {
            // Use backticks ` to allow the ${variable} syntax
            statusEl.innerHTML = `
                <span class="loading-dots" style="color: #ff9800;">
                    Waiting for <span style="color: #fff;">${opponentName || 'Opponent'}</span>...
                </span>
            `;
        }
        return; 
    }

    // 2. THE LOCK: Prevent double-execution
    if (isSyncing) return; 
    isSyncing = true;

    // 3. STATE RESET: Clear flags for the NEW question
    opponentHasAnswered = false;
    iHaveAnswered = false;

    // 4. STOP THE TIMER: Ensure the old clock is DEAD before Q2 starts
    clearInterval(timer);

    // 5. HP CHECK: Determine if the game is OVER
    const isGameOver = (myHP <= 0 || opponentHP <= 0);
    if (isGameOver) {
        console.log("Match concluded. Final HP - Me:", myHP, "Opponent:", opponentHP);

        // Final Result Logic (Prioritizing the Draw)
        let result = 'win';
        if (myHP <= 0 && opponentHP <= 0) {
            result = 'draw';
        } else if (myHP <= 0) {
            result = 'lose';
        }

        // Give the user 500ms to actually see the "Wrong" splat and highlight
        setTimeout(async () => {
            isSyncing = false;  // Release lock
            await endGame(result);
        }, 800); 
        return;
    }

    // 6. THE SYNCED TRANSITION
    console.log("Sync Complete. Transitioning to next question...");
    window.currentLobbyIndex++; 
    const roundsDisplay = document.getElementById('rounds-display');
    if (roundsDisplay) {
        roundsDisplay.textContent = `Round: ${window.currentLobbyIndex + 1}`;
    }
    await loadQuestion();

    // 7. REFILL & RELEASE
    setTimeout(() => { 
        isSyncing = false; 
        if (isMultiplayerMode) {
            preloadNextQuestions(5); 
        }
    }, 500);
}












async function syncDailySystem() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            lockWeeklyButton();
            lockMultiplayerButton();
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
    } catch (err) {
        // Silently catch the "Failed to fetch" browser crash
        if (err.message !== 'Failed to fetch') {
            console.error("System Sync Error:", err);
        }
    }
}



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
        if (event === 'SIGNED_OUT') {
            resetCollectionUI();
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
    authBtn.addEventListener('click', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            localStorage.setItem('manual_logout', 'true');
            await supabase.auth.signOut();

            // --- FIX STARTS HERE ---
            // Specifically remove the profile-related caches
            localStorage.removeItem('cached_xp');
            localStorage.removeItem('cached_level');
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
            currentLevel = 1;

            window.location.reload();
        } else {
            navigateTo('view-login');
        }
    });

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
                showGoldAlert("Session expired. Please log in.");
                navigateTo('view-login');
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
                showGoldAlert(`You've already completed today's challenge! Your score: ${summary.score}`);
                lockDailyButton(); // Ensure the UI reflects they are done
                return;
            }

            // 4. Broadcast and Lock UI
            if (syncChannel) {
                syncChannel.send({
                    type: 'broadcast',
                    event: 'lock-daily',
                    payload: { userId: session.user.id }
                });
            }

            loadSounds();

            // 4. Start Challenge immediately
            await startDailyChallenge(session);
            lockDailyButton();
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

    if (multiplayerBtn) {
        multiplayerBtn.onclick = async () => {
        // Check if the user is logged in
        // Note: Use your global variable (userId) or supabase.auth.getSession()
        if (!userId) {
            showGoldAlert("You must be logged in to access Multiplayer Duels.");
            return;
        }
        // 4. Navigate to the main lobby menu view
        if (typeof window.navigateTo === 'function') {
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            loadSounds();
            window.navigateTo('view-multiplayer-menu');
        } else {
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById('view-multiplayer-menu').classList.remove('hidden');
        }
        };
    }

    if (lobbyBtn) {
    lobbyBtn.addEventListener('click', async () => {
        try {
            // 1. Create the lobby
            const { data, error } = await supabase
                .from('live_lobbies')
                .insert([{ status: 'waiting',
                    host_id: userId,        // From your auth/session
                    host_name: username   // Your local username variable
                 }])
                .select('*') // Get everything (id, code, question_ids)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // 2. Setup Role and Storage
                myRole = 'host'; // Global variable to identify player
                // At this exact moment, there is no guest yet.
                // So we set the label to a "Waiting..." placeholder.
                const label = document.getElementById('opponent-name-display');
                if (label) label.textContent = "Waiting for Guest...";

                sessionStorage.setItem('is_host', 'true');
                sessionStorage.setItem('current_lobby_id', data.id);
                sessionStorage.setItem('current_lobby_questions', JSON.stringify(data.question_ids));

                // 3. Update UI
                document.getElementById('lobbyCodeDisplay').textContent = data.code;
                
                // Reset UI state (ensure start button is hidden until someone joins)
                document.getElementById('host-controls').classList.add('hidden');
                document.getElementById('lobbyStatus').innerHTML = '<span class="loading-dots">Waiting for opponent to join</span>';
                
                // This opens the "Broadcast" channel for the Start signal
                subscribeToLobby(data.code, data.id);
            }

            // 5. Navigate
            window.navigateTo('view-lobby');

        } catch (err) {
            console.error("Error creating lobby:", err.message);
        }
    });
}

document.getElementById('btn-start-multiplayer').addEventListener('click', async () => {
    const lobbyId = sessionStorage.getItem('current_lobby_id');
    
    // 1. Safety Check: Make sure we actually have a lobby to start
    if (!lobbyId || !lobbyChannel) {
        console.error("Missing Lobby ID or Channel connection.");
        return;
    }

    try {
        // 2. Update DB: This tells the GUEST to start via their Postgres listener
        const { error } = await supabase
            .from('live_lobbies')
            .update({ status: 'active' })
            .eq('id', lobbyId);

        if (error) throw error;

        // 3. Broadcast: This is a fast "backup" signal for the Guest
        lobbyChannel.send({ 
            type: 'broadcast', 
            event: 'start-game', 
            payload: { timestamp: Date.now() } 
        });

        // 4. Start Locally with a delay
        console.log("Lobby set to active. Syncing with Guest...");
       // 800ms gives the Guest's internet enough time to receive the 'active' status
        setTimeout(() => {
            console.log("Starting local game engine now!");
            startMultiplayerGame();
        }, 800);
       

    } catch (err) {
        console.error("Failed to transition lobby to active:", err.message);
        showGoldAlert("Connection error: Could not start duel.");
    }
});

    if (copyCodeBtn) {
    copyCodeBtn.onclick = () => {
        const textToCopy = document.getElementById('lobbyCodeDisplay').textContent;

        // 1. Try the modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            updateBtnText(copyCodeBtn);
        }).catch(err => {
            console.error("Clipboard API failed, trying fallback", err);
            fallbackCopy(textToCopy, copyCodeBtn);
        });
        } else {
        // 2. Fallback for non-HTTPS or older browsers
        fallbackCopy(textToCopy, copyCodeBtn);
        }
    };
    }

    // Helper function for the "Old School" copy method
    function fallbackCopy(text, btn) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        updateBtnText(btn);
    } catch (err) {
        console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
    }

    // Helper to handle the "Copied!" button flicker
    function updateBtnText(btn) {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = originalText, 2000);
    }

    if (playAgainBtn) {
            playAgainBtn.onclick = async () => {
            gameEnding = false;

            if (isWeeklyMode) {
                await startWeeklyChallenge();
                return; // Stop here
            } 
            
            if (isDailyMode) {
                preloadQueue = [];
                await startDailyChallenge();
                return; // Stop here
            } 
            
            if (isLiteMode) {
                await startGame();
                return; // Stop here
            } 

            if (isMultiplayerMode) {
                // 1. Reset local ready states
                iAmReadyForRematch = true;
                
                // 2. Wipe the old game data
                preloadQueue = [];
                window.nextFetchIndex = 0;
                sessionStorage.removeItem('current_lobby_questions'); 

                // 3. UI Feedback
                const pBtn = document.getElementById('playAgainBtn');
                if (pBtn) {
                    pBtn.disabled = true; // Disable so they don't spam it while waiting
                    // Use backticks ` and the || 'Opponent' fallback for safety
                    pBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Waiting for ${opponentName || 'Opponent'}...`;
                }

                // 4. Tell the other player
                if (lobbyChannel) {
                    lobbyChannel.send({
                        type: 'broadcast',
                        event: 'rematch_ready',
                        payload: { user_id: userId }
                    });
                }

                // 5. Host Logic
                if (myRole === 'host' && opponentReadyForRematch) {
                    console.log("Both ready! Host starting new round...");
                    startNewRound(); 
                }
                
                return; // CRITICAL: Stop here so we DON'T hit the solo startGame() below
            }

            // --- ONLY REACHED IF NOT IN ANY SPECIAL MODE (NORMAL SOLO) ---
            await startGame();
        };
    };
    

    // Navigates to the "Enter Code" screen
    document.getElementById('btn-join-lobby').addEventListener('click', () => {
        window.navigateTo('view-join-lobby');
    });

    // Back button logic
    document.getElementById('btn-cancel-join').addEventListener('click', () => {
        window.navigateTo('view-multiplayer-menu');
    });

    document.getElementById('btn-confirm-join').addEventListener('click', async () => {
    const inputCode = document.getElementById('join-code-input').value.toUpperCase().trim();
    
    if (inputCode.length !== 6) {
        showGoldAlert("Please enter a 6-digit code.");
        return;
    }

    try {
        resetGameEngine();
        // 1. Look for the lobby
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('live_lobbies')
            .select('*')
            .eq('code', inputCode)
            .eq('status', 'waiting')
            .gt('created_at', twentyFourHoursAgo)
            .single();

        if (error || !data) {
            showGoldAlert("Lobby not found or already full.");
            return;
        }

        currentLobbyCode = data.code; // Sets the global variable for the fetcher

        // --- THE "GUEST" ASSIGNMENT ---
        myRole = 'guest'; // Now this global variable is set
        sessionStorage.setItem('is_host', 'false');
        sessionStorage.setItem('current_lobby_id', data.id);
        sessionStorage.setItem('current_lobby_questions', JSON.stringify(data.question_ids));

        // 2. Set the Host's name on YOUR screen immediately
        const oppLabel = document.getElementById('opponent-name-display');
        if (oppLabel) oppLabel.textContent = data.host_name || "Host";


        // 2. Update the DB so the Host's "Start" button appears
        await supabase
            .from('live_lobbies')
            .update({ 
                status: 'ready',
                guest_id: userId, 
                guest_name: username, // The Guest's name
            })
            .eq('id', data.id);
        
        // 4. Start listening for the "Start Game" signal from the Host
        subscribeToLobby(data.code, data.id);

        // 4. THE MAGIC PILL: Broadcast the arrival
        // We wrap this in a tiny timeout to ensure the subscription is active
        setTimeout(() => {
            if (lobbyChannel) {
                lobbyChannel.send({
                    type: 'broadcast',
                    event: 'guest-joined',
                    payload: { name: 'Guest' }
                });
            }
        }, 500); // Give the socket half a second to open

        // 3. UI Updates
        document.getElementById('lobbyCodeDisplay').textContent = data.code;
        // Hide host-specific controls just in case
        const hostControls = document.getElementById('host-controls');
        if (hostControls) hostControls.classList.add('hidden');
        document.getElementById('lobbyStatus').innerHTML = '<span style="color: #4CAF50;">Connected! Waiting for host to start...</span>';
        
        window.navigateTo('view-lobby');

    } catch (err) {
        console.error("Join Error:", err.message);
        showGoldAlert("An error occurred while trying to join.");
    }
});


    if (mainMenuBtns) {
        mainMenuBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                preloadQueue = []; 
                resetGame();
                myRole = null; // Clear the role
                currentLobbyCode = null;    // Clear the code
                isMultiplayerMode = false;
                // RESET THE JOIN CODE INPUT
                const joinInput = document.getElementById('join-code-input');
                if (joinInput) {
                    joinInput.value = ''; // Clears the text
                }
                iHaveAnswered = false;
                opponentHasAnswered = false;
                isSyncing = false;
                myHP = 60; // Or your default OSRS HP
                opponentHP = 60;
                // Just hide the game-over screen and navigate. 
                // navigateTo will handle the rest!
                document.getElementById('end-screen').classList.add('hidden');
                
                navigateTo('view-home');
            });
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
    if (leaderBtn) {
        leaderBtn.addEventListener('click', () => {
            navigateTo('view-leaderboard');
        });
    }
    
    // Initial Run (Immediately pull from Score cache)
    (async () => {
        const cachedString = localStorage.getItem(`leaderboard_${currentMode}`);
        if (cachedString) {
            updateLeaderboard(JSON.parse(cachedString));
        }
        await fetchLeaderboard();
        await subscribeToLeaderboard(); // Start the first listener
    })();
    // This will check if a user has played daily mode already and will unlock it if they did
    await syncDailySystem();
    await loadCollection();
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
            // Clear all session-specific UI and storage
            localStorage.removeItem('lastDailyScore');
            localStorage.removeItem('dailyPlayedDate');
            localStorage.removeItem('cached_xp');
            localStorage.removeItem('cachedUsername');
            localStorage.removeItem('lastDailyMessage');
            localStorage.removeItem('cached_level');
        }
        if (event === 'SIGNED_OUT') {
            localStorage.removeItem('cached_xp');
            localStorage.removeItem('cachedUsername');
            localStorage.removeItem('cached_level');
        }
        
        username = 'Guest'; // Force 'Guest' instead of cached username
        currentProfileXp = 0; // Force 0 XP for guests
        currentLevel = 1;
    
        if (span) span.textContent = 'Guest';
        if (label) label.textContent = 'Log In / Sign Up';

        [shareBtn, logBtn].forEach(btn => {
            if (btn) {
                btn.classList.add('is-disabled');
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            }
        });

        updateLevelUI()
        lockDailyButton();
        lockWeeklyButton();
        lockMultiplayerButton();
        loadCollection();
        return; // Stop here for guests
    }
    // 3. Handle LOGGED IN State
    userId = session.user.id;
    // 1. Immediately sync with local cache so we don't overwrite the HTML script's work
    username = localStorage.getItem('cachedUsername') || 'Player';
    currentProfileXp = parseInt(localStorage.getItem('cached_xp')) || 0;
    currentLevel = parseInt(localStorage.getItem('cached_level')) || 1;

    // 2. Update the UI with the cached values right now
    if (span) span.textContent = ' ' + username;
    if (label) label.textContent = 'Log Out';
    updateLevelUI();
    loadCollection();

    // 2. Logged In State
    // Fetch profile
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('username, xp, achievements, level')
            .eq('id', userId)
            .single();

        if (profile && !error) {
            // Only update and save if the data is different/newer than cache
            if (profile.xp !== currentProfileXp || profile.username !== username) {
                username = profile.username || 'Player';
                currentProfileXp = profile.xp || 0;
                currentLevel = profile.level || 1;
                // Access the daily_streak inside the achievements JSONB
                currentDailyStreak = profile.achievements?.daily_streak || 0;
                // Save to cache
                localStorage.setItem('cached_level', currentLevel);
                localStorage.setItem('cachedUsername', username);
                localStorage.setItem('cached_xp', currentProfileXp);
                localStorage.setItem('cached_daily_streak', currentDailyStreak); // Also cache it

                // UI Update
                if (span) span.textContent = ' ' + username;
                if (label) label.textContent = 'Log Out';
                updateLevelUI();
            }
        }
    } catch (err) {
        console.error("Profile fetch failed:", err);
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

            navigateTo('view-collections');
        });
        logBtn.classList.remove('is-disabled');
        logBtn.style.opacity = '1';
        logBtn.style.pointerEvents = 'auto';
        logBtn.removeAttribute('tabindex');
    }

    await syncDailySystem();
    unlockWeeklyButton();
    unlockMultiplayerButton();
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
    weeklyBtn.classList.add('is-disabled');
    weeklyBtn.classList.remove('is-active');
    weeklyBtn.style.opacity = '0.5';
    weeklyBtn.style.pointerEvents = 'none';

}

function unlockWeeklyButton() {
    if (!weeklyBtn) return;
        weeklyBtn.classList.add('is-active');
        weeklyBtn.classList.remove('is-disabled');
        weeklyBtn.style.opacity = '1'; 
        weeklyBtn.style.pointerEvents = 'auto';
}

function lockMultiplayerButton() {
    if (!multiplayerBtn) return;
    multiplayerBtn.classList.add('is-disabled');
    multiplayerBtn.classList.remove('is-active');
    multiplayerBtn.style.opacity = '0.5';
    multiplayerBtn.style.pointerEvents = 'none';

}
function unlockMultiplayerButton() {
    if (!multiplayerBtn) return;
        multiplayerBtn.classList.add('is-active');
        multiplayerBtn.classList.remove('is-disabled');
        multiplayerBtn.style.opacity = '1'; 
        multiplayerBtn.style.pointerEvents = 'auto';
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
    liteQuestionCount = 0;
    dailyQuestionCount = 0;

    // 5. Reset Timer Visuals
    timeLeft = 15;
    if (timeDisplay) timeDisplay.textContent = timeLeft;
    if (timeWrap) timeWrap.classList.remove('red-timer');

    const gzTitle = document.getElementById('gz-title');
    if (gzTitle) gzTitle.classList.add('hidden');
    document.getElementById('multiplayer-header').classList.add('hidden');

    const scoreRow = document.getElementById('end-score-container');
    const multiRow = document.getElementById('multiplayer-stats-container');
    if (scoreRow) scoreRow.classList.remove('hidden');
    if (multiRow) multiRow.classList.add('hidden');
    document.getElementById('score').classList.remove('hidden');
    document.getElementById('rounds-display').classList.add('hidden');
}


async function preloadNextQuestions(targetCount = 6) {
    // 1. EXIT EARLY for Batch Modes
    // Daily and Weekly are handled entirely by their start functions.
    if (isDailyMode || isWeeklyMode) return;

    const needed = targetCount - preloadQueue.length;
    if (needed <= 0) return;

    let toFetch = [];

    // 2. Determine which pool to use
    let activePool;
    if (isMultiplayerMode) {
        for (let i = 0; i < needed; i++) {
            // sequential is safer to prevent index racing.
            await fetchNextLobbyQuestion(); 
        }
    } else {
        activePool = normalSessionPool;
        if (!activePool || activePool.length === 0) {
            console.warn("Preload: No active pool found.");
            return;
        }
        const queuedIds = preloadQueue.map(q => String(q.id));
        // MOVE THE DECLARATION ABOVE THE LOGS
        const availableIds = activePool.filter(poolId => {
        const sId = String(poolId); // Convert current pool ID to string for comparison
        return !queuedIds.includes(sId) &&
            !usedInThisSession.includes(sId) &&
            !pendingIds.includes(sId) &&
            (currentQuestion ? String(currentQuestion.id) !== sId : true);
        });
        // CRITICAL: Stop if we ran out of questions in the pool
        if (availableIds.length === 0) return;

        // Only take as many as we need (or as many as are left)
        toFetch = availableIds.slice(0, needed);
}

    if (toFetch.length === 0) return;

    // Add to pending to prevent duplicate workers for the same ID
    toFetch.forEach(id => {
        const sId = String(id);
        if (!pendingIds.includes(sId)) pendingIds.push(sId);
        // Only track "used" for Single Player logic
        if (!isMultiplayerMode && !usedInThisSession.includes(sId)) {
            usedInThisSession.push(sId);
        }
    });

    // Fire workers in parallel with specific IDs assigned
    const workers = toFetch.map(id => fetchAndBufferQuestion(id));
    await Promise.all(workers);
}

async function fetchAndBufferQuestion(assignedId) {
    if (!assignedId) return;

    try {
        const questionData = await fetchDeterministicQuestion(assignedId);

        if (questionData && questionData.question_image) {
            // Create the image object immediately
            const img = new Image();
            img.src = questionData.question_image;

            // This 'decode()' is the secret sauce. It forces the browser to 
            // decompress the image in the background thread.
            try {
                await img.decode();
                questionData._preloadedImg = img;
            } catch (e) {
                console.warn("Image decode failed in background", e);
            }

            //usedInThisSession.push(assignedId);
            preloadQueue.push(questionData);
        } else if (questionData) {
            //usedInThisSession.push(assignedId);
            preloadQueue.push(questionData);
        }
    } catch (err) {
        console.error("Fetch worker failed:", err);
    } finally {
        pendingIds = pendingIds.filter(id => id !== assignedId.toString());
    }
}

// Helper: Fetch a specific ID (Deterministic)
async function fetchDeterministicQuestion(qId) {
    const { data, error } = await supabase.rpc('get_question_by_id', { input_id: qId });
    return (!error && data?.[0]) ? data[0] : null;
}

async function startGame() {
    if (gameStarting) return;
    gameStarting = true;
    gameEnding = false;
    isDailyMode = false;
    isWeeklyMode = false;

    pendingIds = [];
    usedInThisSession = [];
    normalSessionPool = [];

    // 1. Identify what is already waiting in the queue so we don't pick them again
    const alreadyBufferedIds = preloadQueue.map(q => Number(q.id));

    // 2. Create the full pool
    let fullPool = Array.from({ length: number_of_questions }, (_, i) => i + 1);
    // 3. Remove IDs that are already in the preloadQueue
    // This prevents the "duplicate" issue when keeping the queue
    let availableToShuffle = fullPool.filter(id => !alreadyBufferedIds.includes(id));

    // 4. Shuffle only the available remainder (Fisher-Yates)
    for (let i = availableToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableToShuffle[i], availableToShuffle[j]] = [availableToShuffle[j], availableToShuffle[i]];
    }

    // 5. Build the final session pool: [Existing Queue IDs] + [Shuffled Others]
    // We add buffered IDs to usedInThisSession so they aren't fetched again
    usedInThisSession = [...alreadyBufferedIds.map(id => String(id))];
    normalSessionPool = availableToShuffle;

    // 6. If Lite Mode is active, truncate the pool to exactly 100 questions
    if (isLiteMode) {
        // In Lite Mode, we only want 100 total. 
        // We take (100 - already buffered) from the shuffled pool.
        const neededForLite = Math.max(0, 100 - alreadyBufferedIds.length);
        normalSessionPool = normalSessionPool.slice(0, neededForLite);
    }

    // 7. INTERNAL STATE RESET
    clearInterval(timer);
    score = 0;
    streak = 0;
    // Tell the DB: "This is a new game, start my streak at 0"
    await supabase.rpc('reset_my_streak');
    dailyQuestionCount = 0;
    liteQuestionCount = 0;
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
        gameStarting = false;
    });
}

async function loadQuestion(isFirst = false) {
    if (gameEnding) return;
    // --- MULTIPLAYER END CHECK ---
    if (isMultiplayerMode) {
        // Someone died or we ran out of lobby questions
        if (myHP <= 0 || opponentHP <= 0 || (preloadQueue.length === 0 && !isFirst)) {
            // Determine result for endGame
            const result = myHP <= 0 ? (opponentHP <= 0 ? 'draw' : 'lose') : 'win';
            await endGame(result); 
            return;
        }
    } else {
        // 1. End Game Checks for single player modes
        if (isWeeklyMode && weeklyQuestionCount >= WEEKLY_LIMIT) { await endGame(); return; }
        if (isLiteMode && liteQuestionCount >= LITE_LIMIT) { await endGame(); return; }
        if (isDailyMode && dailyQuestionCount >= DAILY_LIMIT) { await endGame(); return; }
        if (score === number_of_questions) { await endGame(); return; }
    }
    // A. CONDITIONAL CLEANUP
    if (!isFirst) {
        document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
        if (questionImage) questionImage.style.opacity = '0';
    }

    // B. REFILL THE BUFFER 
    let needsRefill = !isDailyMode && !isWeeklyMode;

    // ONLY refill if we are NOT in Daily Mode (since Daily is pre-loaded)
    if (!isMultiplayerMode && !isFirst && preloadQueue.length <= 4) {
        if (needsRefill) {
            preloadNextQuestions(8); // Solo logic stays here
        }
    }

    // C. THE "NO-UNDEFINED" GATE
    if (preloadQueue.length === 0) {
        if (isMultiplayerMode) {
            // Force a fetch from the lobby list specifically
            await fetchNextLobbyQuestion(); 
        } else if (needsRefill) {
            await fetchAndBufferQuestion();
        } else {
            await endGame();
            return;
        }
    }

    // Final safety check: if still empty, something is wrong with the network/DB
    if (preloadQueue.length === 0) {
        console.error("Critical: Could not populate question queue.");
        return; 
    }

    // D. POPULATE DATA (Now guaranteed to have data)
    currentQuestion = preloadQueue.shift();
    console.log("Question loaded:", currentQuestion.id);

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
        // Use the already decoded image if it exists
        if (currentQuestion._preloadedImg) {
            questionImage.src = currentQuestion._preloadedImg.src;
            questionImage.style.display = 'block';
            questionImage.style.opacity = '1'; // Show it instantly
        } else {
            // Fallback if the background worker hasn't finished yet
            questionImage.src = currentQuestion.question_image;
            questionImage.style.display = 'block';
            questionImage.onload = () => { questionImage.style.opacity = '1'; };
        }
    } else {
        questionImage.style.display = 'none';
        questionImage.style.opacity = '0';
        questionImage.src = '';
    }

    // --- G. MULTIPLAYER SPECIFIC RESET & REFILL (AT THE END) ---
    if (isMultiplayerMode) {
        iHaveAnswered = false;
        opponentHasAnswered = false;
        isSyncing = false;
        const statusText = document.getElementById('lobbyStatus');
        if (statusText) statusText.innerHTML = '';

        // Multiplayer refill happens AFTER the UI is updated
        if (!isFirst && preloadQueue.length <= 4) {
            preloadNextQuestions(5); 
        }
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

    timer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = timeLeft;

        if (timeLeft <= 5 && timeLeft > 0 && !activeTickSource) {
            activeTickSource = playSound(tickBuffer, true);
        }
        if (timeLeft <= 5) timeWrap.classList.add('red-timer');

        // --- ROUND END LOGIC ---
        if (timeLeft <= 0) {
            clearInterval(timer); // Stop the interval immediately
            if (isMultiplayerMode) {
                if (iHaveAnswered) {
                console.log("Timer hit 0, but I already answered. Waiting for sync...");
                // Do nothing here! syncAndProceed is already handling the transition.
                return;
            }
            // Only trigger the damage/timeout if I HAVEN'T answered
            handleMultiplayerTimeout();
            } else {
                // SOLO / DAILY / WEEKLY
                handleTimeout();
            }
        }
    }, 1000);
}

async function handleTimeout() {
    stopTickSound();
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    playSound(wrongBuffer);
   
    // --- MULTIPLAYER TIMEOUT LOGIC ---
    if (isMultiplayerMode) {
        const damageTaken = 20;
        myHP = Math.max(0, myHP - damageTaken);
        
        // 1. Show the red splat locally
        triggerHitsplat('my', damageTaken);
        updateHPUI();

        // 2. Broadcast that you timed out (which counts as 'wrong')
        if (lobbyChannel) {
            lobbyChannel.send({
                type: 'broadcast',
                event: 'player_answered',
                payload: {
                    user_id: userId,
                    playerRole: myRole,
                    correct: false, // Timeout is always wrong
                    hp_remaining: myHP,
                    damage_taken: 20
                }
            });
        }

        // 3. Mark yourself as finished for this round
        iHaveAnswered = true; 
        
        // 4. EMERGENCY EXIT: If I just died, don't wait for a 1.5s transition.
        // Go straight to syncAndProceed(true) to force the end.
        if (myHP <= 0) {
            console.log("Local player reached 0 HP. Forcing syncAndProceed now.");
            syncAndProceed(true); 
        } else {
            handleMultiplayerTransition(); 
        }

        await highlightCorrectAnswer();
        return; // EXIT HERE so solo logic doesn't run
    }

    await highlightCorrectAnswer();

    if (isWeeklyMode) weeklyQuestionCount++;
    if (isDailyMode) dailyQuestionCount++;
    if (isLiteMode) liteQuestionCount++;
    updateScore();

    // 2. Corrected Logic & Syntax (Fixed the missing closing parenthesis)
    if ((isDailyMode && dailyQuestionCount < DAILY_LIMIT) || (isWeeklyMode && weeklyQuestionCount < WEEKLY_LIMIT) || (isLiteMode && liteQuestionCount < LITE_LIMIT)) {
        setTimeout(loadQuestion, 1300);
    } else {
        // If it's Normal mode OR we reached the limit for Daily/Weekly/Lite
        setTimeout(endGame, 1000);
    }
}

async function checkAnswer(choiceId, btn) {
    stopTickSound();
    if (timeLeft <= 0) return;
    // Only stop the timer if we are NOT in multiplayer.
    // In Multiplayer, we want to see it run down to 0 for the opponent.
    if (!isMultiplayerMode) {
        clearInterval(timer);
    }
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    // Track state for the sync
    if (isMultiplayerMode) iHaveAnswered = true;
    if (isWeeklyMode) weeklyQuestionCount++;
    if (isDailyMode) dailyQuestionCount++;
    if (isLiteMode) liteQuestionCount++;

    // THE ONE CALL TO RULE THEM ALL
    const { data: res, error: rpcErr } = await supabase.rpc('process_answer', {
        input_id: Number(currentQuestion.id), // Ensure it's an integer
        choice: Number(choiceId),             // Ensure it's an integer
        is_daily: Boolean(isDailyMode),       // Ensure it's a boolean
        current_count: isDailyMode ? dailyQuestionCount : 0,
        daily_limit: DAILY_LIMIT
    });

    if (rpcErr) return console.error("RPC Error:", rpcErr);
    // Sync local streak with DB Truth
    streak = res.new_streak;

    // --- 1. LOCAL DAMAGE & SPLAT LOGIC ---
    if (isMultiplayerMode) {
        if (res.correct) {
            // You got it right! Show a Blue 0 on yourself.
            triggerHitsplat('my', 0);
        } else {
            // You got it wrong! Show a Red 20 and drop HP.
            const damageTaken = 20;
            myHP = Math.max(0, myHP - damageTaken);
            updateHPUI();
            triggerHitsplat('my', damageTaken);
        }
    }

    // --- 2. MULTIPLAYER BROADCAST ---
    if (isMultiplayerMode) {
        lobbyChannel.send({
            type: 'broadcast',
            event: 'player_answered', // Changed to match your new listener
            payload: {
                user_id: userId,
                playerRole: myRole,
                correct: res.correct,
                hp_remaining: myHP,
                // If YOU were correct, the OPPONENT will take damage on their screen
                damage_taken: res.correct ? 0 : 20
            }
        });
        // --- NEW: SAFETY TIMEOUT ---
        // If I've answered but the opponent hasn't, start a 20s fallback
        if (iHaveAnswered && !opponentHasAnswered) {
            console.log("Waiting for opponent's final move... Safety timer active.");
            clearTimeout(window.forceEndTimeout);
            window.forceEndTimeout = setTimeout(() => {
                // Double check they still haven't answered before forcing
                if (!opponentHasAnswered) {
                    console.warn("Opponent AFK. Forcing sync...");
                    syncAndProceed(true); // 'true' bypasses the wait
                }
            }, 20000); 
        }
        // Trigger the sync check
        handleMultiplayerTransition();
    }

  

    if (res.correct) {
        playSound(correctBuffer);
        btn.classList.add('correct');
        score++;
        updateScore();
        // --- NEW: DAILY GRID PATTERN LOGIC ---
        if (isDailyMode) {
            // 1. Map the question number to the correct string index
            let patternArray = gridPattern.split('');
            let index = dailyQuestionCount - 1;

            // 2. Flip the 0 to a 1
            patternArray[index] = "1";
            gridPattern = patternArray.join('');

            // 3. Update the DB immediately
            // Using .match ensures we hit the specific attempt for today
            await supabase
                .from('daily_attempts')
                .update({ grid_pattern: gridPattern })
                .match({ user_id: userId, attempt_date: todayStr });
        }
        // 🛡️ THE "MASTER" GUEST CHECK
        if (userId) {
            const xpData = res.xp_info; // This is the JSON object from add_user_xp
            // Check if xpData exists AND it's not null (Guest check)
            if (xpData && xpData.new_xp !== undefined) {
                // Update local state with truth from DB
                currentProfileXp = xpData.new_xp;
                currentLevel = xpData.new_level;
                // Sync the Cache (XP and Level)
                localStorage.setItem('cached_xp', currentProfileXp);
                localStorage.setItem('cached_level', xpData.new_level);
                // Refresh the UI
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
         
            let instantID = null;
            if (timeLeft >= 14) instantID = 777; // Lucky Guess
            else if (timeLeft <= 1 && timeLeft > 0) instantID = 999; // Just in Time

            if (instantID) {
                supabase.rpc('check_game_achievements', {
                    p_mode: 'instant',
                    p_score: parseInt(instantID, 10), // Explicitly force integer
                    p_time_ms: 0                      // Explicitly 0
                }).then(({ data: results, error }) => {
                    if (error) console.error("Achievement RPC Error:", error.message);
                    if (results) {
                        results.forEach(r => {
                            if (r.is_new) showAchievementNotification(r.display_name);
                        });
                    }
                });
            }

            // --- MID-GAME ACHIEVEMENT CHECK ---
            // Only trigger RPC if they hit a specific milestone number
            let shouldCheck = false;
            if (isWeeklyMode && score === 25) shouldCheck = true;
            if (isLiteMode && score === 50) shouldCheck = true;

            if (shouldCheck) {
                // Fire and forget so the game flow isn't interrupted
                supabase.rpc('check_game_achievements', {
                    p_mode: isWeeklyMode ? 'weekly' : 'lite',
                    p_score: score,
                    p_time_ms: Math.floor(Date.now() - gameStartTime)
                }).then(({ data: results }) => {
                    if (results) {
                        results.forEach(r => {
                            // Only show if it's actually the first time (is_new)
                            if (r.is_new) showAchievementNotification(r.display_name);
                        });
                    }
                });
            }
        }
        // --- MODIFIED NEXT QUESTION LOGIC ---
        if (isMultiplayerMode) {
            handleMultiplayerTransition();
        } else {
            setTimeout(loadQuestion, 1000); // Standard Solo behavior
        }
    } else {
        updateScore();
        // Wrong answer logic
        playSound(wrongBuffer);
        if (btn) btn.classList.add('wrong');
        await highlightCorrectAnswer();

        if (isMultiplayerMode) {
            handleMultiplayerTransition();
        } else if (isDailyMode || isWeeklyMode || isLiteMode) {
            setTimeout(loadQuestion, 1300);
        } else {
            setTimeout(endGame, 1000);
        }
    }
}

function updateLevelUI() {
    const lvlNum = document.getElementById('levelNumber');
    const xpBracket = document.getElementById('xpBracket');

    // If these don't exist yet, don't try to set textContent
    if (!lvlNum || !xpBracket) {
        console.warn("UI Elements not found yet. Retrying...");
        return;
    }

    // Use a "Source of Truth" hierarchy: 
    // 1. Current variable -> 2. LocalStorage -> 3. Hardcoded Default
    const level = currentLevel || parseInt(localStorage.getItem('cached_level')) || 1;
    const xp = currentProfileXp || parseInt(localStorage.getItem('cached_xp')) || 0;

    lvlNum.textContent = level;
    xpBracket.textContent = `(${xp.toLocaleString()} XP)`;

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
    // If the question failed to load, don't try to read its ID
    if (!currentQuestion) {
        console.warn("No current question to highlight.");
        return;
    }
    const { data: correctId } = await supabase.rpc('reveal_correct_answer', {
        input_id: currentQuestion.id
    });
    document.querySelectorAll('.answer-btn').forEach(btn => {
        if (parseInt(btn.dataset.answerId) === correctId) {
            btn.classList.add('correct');
        }
    });
}

async function endGame(result = null) {
    // If this is a Multiplayer result, we IGNORE the gameEnding lock 
    // to ensure the Victory/Defeat screen overrides any "Game Over" glitch.
    if (isMultiplayerMode && result) {
        gameEnding = false; // Force reset the lock for the final screen
    } else if (gameEnding) {
        return;
    }
    
    if (isMultiplayerMode && !result) {
        console.warn("Race condition blocked: Solo endGame tried to override MP result.");
        return;
    }

    gameEnding = true;

    clearInterval(timer);
    stopTickSound();

    // 1. Calculate time for the CURRENT segment (Solo)
    const endTime = Date.now();

    // This covers all modes
    const totalMs = endTime - gameStartTime;
    const totalSeconds = totalMs / 1000;

    // --- MULTIPLAYER RESULT HANDLING ---
    if (isMultiplayerMode && result) {
        // RECORD THE STAT IN THE DATABASE
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
        const { error } = await supabase.rpc('record_match_result', {
            p_user_id: session.user.id,
            p_result: result // 'win', 'lose', or 'draw'
        });

        if (error) console.error("Error saving match stat:", error);
        else console.log(`Match stat (${result}) recorded!`);
    }

        const gameOverTitle = document.getElementById('game-over-title');
        const gzTitle = document.getElementById('gz-title');

        // 1. Set the big "Gz!" or "Game Over" message
        if (gzTitle) {
            gzTitle.classList.remove('hidden');
            if (result === 'win') {
                gzTitle.textContent = "Victory!";
            } else if (result === 'draw') {
                gzTitle.textContent = "Draw!";
            } else {
                gzTitle.textContent = "Defeat!";
            }
        }

        displayFinalTime(totalMs);

        if (gameOverTitle) {
            gameOverTitle.classList.remove('hidden');

            if (result === 'win') {
                // Keep everything between the backticks on one line
                gameOverTitle.innerHTML = `<span style="font-size: 0.9em;">You defeated <span style="color: #D7D8D9;">${opponentName || 'your opponent'}</span> with ${myHP} HP left!</span>`;
            } 
            else if (result === 'lose') {
                gameOverTitle.innerHTML = `<span style="font-size: 0.9em;"><span style="color: #D7D8D9;">${opponentName || 'Opponent'}</span> survived with ${opponentHP} HP.</span>`;
            }
            else {
                gameOverTitle.textContent = "A double knockout!";
            }
        }
        const endScreen = document.getElementById('end-screen');
        if (endScreen) {
            endScreen.classList.remove('hidden');
        }
        // 4. Hide Multiplayer Header (Bars) so they don't leak into end screen
        const mpHeader = document.getElementById('multiplayer-header');
        if (mpHeader) mpHeader.classList.add('hidden');
   
        // This is the "Kill Switch"
        finalizeEndScreen(window.currentLobbyIndex || 0);
             
        // Clean up Lobby specific flags
        iAmReadyForRematch = false;
        opponentReadyForRematch = false;

        // 3. UI Cleanup
        const pBtn = document.getElementById('playAgainBtn');
        if (pBtn) {
            pBtn.disabled = false;
            pBtn.innerHTML = 'Play Again';
        }

        return;
    }

    // 1. PREPARE DATA FIRST (Quietly in background)
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Determine the mode string for the RPC
        let mode = 'normal';
        if (isDailyMode) mode = 'daily';
        else if (isWeeklyMode) mode = 'weekly';
        else if (isLiteMode) mode = 'lite';


        // This replaces updateDailyStreak and multiple saveAchievement calls
        const { data: results, error: achError } = await supabase.rpc('check_game_achievements', {
            p_mode: mode,
            p_score: score,
            p_time_ms: Math.floor(totalMs)
        });

        if (!achError && results && results.length > 0) {
            // 1. Update LocalStorage from the DB "Source of Truth"
            const stats = results[0].current_stats;
            if (stats) {
                localStorage.setItem('cached_daily_streak', stats.daily_streak || 0);
                localStorage.setItem('stat_max_streak', stats.max_streak || 0);
                localStorage.setItem('cached_daily_total', stats.daily_total || 0);
                localStorage.setItem('stat_daily_perfect', stats.daily_perfect || false);

                // Update the global variable for the UI
                currentDailyStreak = stats.daily_streak || 0;
            }

            // 2. Show all earned achievement notifications
            results.forEach(res => {
                if (res.is_new) {
                    showAchievementNotification(res.display_name);
                }
            });
        }
    }
    const scoreKey = Math.min(Math.max(score, 0), 10);
    const options = dailyMessages[scoreKey] || ["Game Over!"];
    const randomMsg = options[Math.floor(Math.random() * options.length)];
    const streakContainer = document.getElementById('dailyStreakContainer');
    const streakCount = document.getElementById('streakCount');

    // RESET WEEKLY UI (Crucial Fix)
    // We hide this immediately so it doesn't leak into Normal/Daily modes
    if (weeklyTimeContainer) weeklyTimeContainer.style.display = 'none';

    const finalScore = document.getElementById('finalScore');

    // 3. POPULATE END SCREEN BEFORE SHOWING IT
    if (finalScore) {
        if (isLiteMode) {
            // This shows the 3/100 format ONLY on the end screen
            finalScore.textContent = `${score}/${LITE_LIMIT}`;
        } else if (isWeeklyMode) {
            finalScore.textContent = `${score}/${WEEKLY_LIMIT}`;
        } else if (isDailyMode) {
            finalScore.textContent = `${score}/${DAILY_LIMIT}`;
        } else {
            // Normal display for normal mode
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
            let isLitePB = session ? await saveScore(session, 'lite', score, totalMs, username) : false;
            if (gameOverTitle) {
                gameOverTitle.textContent = isLitePB ? "New PB achieved!" : "Lite Mode Completed!";
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
            // we check if all questions were answered correctly in normal mode.
            const isPerfectRun = score === number_of_questions;
            // Check for Gz! (Completion) first
            if (isPerfectRun) {
                // Handle the "Completion" Titles
                if (gzTitle) {
                    const gzMessages = ['You won!', 'Gz!', 'GG!', 'Victory!'];
                    const randomMessage = gzMessages[Math.floor(Math.random() * gzMessages.length)];
                    gzTitle.textContent = randomMessage;
                    gzTitle.classList.remove('hidden');
                }
                // Handle the PB/Status text under the Gz
                if (gameOverTitle) {
                    if (isNormalPB) {
                        gameOverTitle.textContent = "New PB achieved!";
                        gameOverTitle.classList.remove('hidden');
                    } else {
                        // Hide if it's a perfect run but NOT a PB (keeps UI clean)
                        gameOverTitle.classList.add('hidden');
                        gameOverTitle.textContent = "";
                    }
                    // Otherwise, show standard Game Over, or PB achieved if its PB.
                }
            } else {
                // Standard Game Over (Failed/Partial run)
                if (gzTitle) gzTitle.classList.add('hidden'); // Ensure Gz is hidden
                if (gameOverTitle) {
                    gameOverTitle.textContent = isNormalPB ? "New PB achieved!" : "Game Over!";
                    gameOverTitle.classList.remove('hidden');
                }
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

    // IF MULTIPLAYER: Push it down so it doesn't hit the HP bars
    if (isMultiplayerMode) {
        // Using setProperty ensures we override the CSS !important
        xpDrop.style.setProperty('top', '110px', 'important');
    }

    // This ensures that as soon as the 1.2s animation is done, it is GONE from the DOM
    xpDrop.onanimationend = () => {
        xpDrop.remove();
    };

    gameContainer.appendChild(xpDrop);

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
            showGoldAlert("Please log in to share your score!");
            return;
        }

        // 3. FETCH THE EDITION NUMBER (Directly from DB Truth)
        const { data: dailyData, error: dailyErr } = await supabase.rpc('get_daily_questions');
        if (dailyErr || !dailyData || dailyData.length === 0) {
            console.error("Could not fetch daily edition for sharing");
            return;
        }
        const dailyEdition = dailyData[0].edition_number;

        // 3. Get Data
        const currentScore = parseInt(localStorage.getItem('lastDailyScore') || "0");
        // Pull the streak we just saved in handleAuthChange
        const currentStreak = localStorage.getItem('cached_daily_streak') || "0";

        const dateStr = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        // 4. Build the Grid
        // 4. FETCH THE REAL PATTERN FROM DB
        const { data: attemptData } = await supabase
            .from('daily_attempts')
            .select('grid_pattern')
            .match({ user_id: session.user.id, attempt_date: todayStr })
            .single();

        const pattern = attemptData?.grid_pattern || "0000000000";
        // This maps '1' to 🟩 and '0' to 🟥 based on the exact order of play
        const dynamicGrid = pattern.split('')
            .map(bit => bit === "1" ? "🟩" : "🟥")
            .join('');

        const totalQs = 10;

        const shareText = `OSRS Trivia ${dailyEdition}  ${currentScore}/${totalQs} ⚔️\n` +
            `${dynamicGrid}\n` +
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
            // Check if modern Clipboard API exists
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(shareText);
                } catch (clipErr) {
                    console.error("Modern Clipboard failed:", clipErr);
                    fallbackCopyTextToClipboard(shareText);
                }
            } else {
                // Use the old-school textarea method for insecure/old contexts
                fallbackCopyTextToClipboard(shareText);
            }
        }
    };
}

// Helper function for the "Legacy" way
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure it's not visible but still part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (!successful) console.error("Fallback copy failed");
    } catch (err) {
        console.error('Fallback: Unable to copy', err);
    }

    document.body.removeChild(textArea);
}

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
    const displayTime = isMobile ? 6000 : 8000;

    petNotificationTimeout = setTimeout(() => {
        modal.classList.remove('active');
        petNotificationTimeout = null;
    }, displayTime);
}


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
    const displayTime = isMobile ? 4000 : 7000;

    achievementNotificationTimeout = setTimeout(() => {
        modal.classList.remove('active');
        achievementNotificationTimeout = null;
    }, displayTime);
    
    loadCollection();
}

async function startWeeklyChallenge() {
    if (gameStarting) return;
    gameStarting = true;
    gameEnding = false;
    isWeeklyMode = true;
    isDailyMode = false;
    isLiteMode = false;
    pendingIds = []
    preloadQueue = [];
    usedInThisSession = [];
    weeklyQuestionCount = 0;
    score = 0;
    streak = 0;
    updateScore();

    // Tell the DB: "This is a new game, start my streak at 0"
    await supabase.rpc('reset_my_streak');

    // 1. ENSURE THE POOL IS READY (We only fetch the 50 IDs, not the full data)
    const { data, error } = await supabase.rpc('get_weekly_questions', {});
    if (error || !data) {
        console.error(error);
        return showGoldAlert("Error loading weekly questions.");
    }

    // 3. CONVERT TO STRING IDS
    const allWeeklyIds = data.map(q => String(q.question_id || q.id));
    // 4. SHUFFLE THE IDS (Fisher-Yates)
    for (let i = allWeeklyIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Swap elements
        [allWeeklyIds[i], allWeeklyIds[j]] = [allWeeklyIds[j], allWeeklyIds[i]];
    }

    // 4. LOCK ALL 50 IDS IMMEDIATELY
    // This prevents any other background logic from "stealing" these IDs
    pendingIds = [...allWeeklyIds];

    // 1. Fire the first 5 immediately for a fast start (Indices 0, 1, 2, 3, 4)
    allWeeklyIds.slice(0, 5).forEach(id => fetchAndBufferQuestion(id));

    // 6. WAIT FOR QUESTION #1 (The Barrier)
    // 2. Wait a tiny bit (until first question is ready)
    while (preloadQueue.length === 0) {
        await new Promise(r => setTimeout(r, 50));
    }

    // 3. Fire the remaining 45 in the background (Indices 5 through 49)
    allWeeklyIds.slice(5).forEach(id => fetchAndBufferQuestion(id));

    // 7. UI TRANSITION
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
        gameStarting = false;
    });
}


async function startDailyChallenge(session) {
    if (gameStarting) return;
    gameStarting = true;
    gameEnding = false;
    gridPattern = "0000000000";
    isDailyMode = true;
    isWeeklyMode = false;
    isLiteMode = false;
    pendingIds = [];
    preloadQueue = [];
    usedInThisSession = [];
    score = 0;
    // 6. Reset Score Visual
    streak = 0;
    // 7. INTERNAL STATE RESET
    dailyQuestionCount = 0;
    updateScore();

    // 1. BURN ATTEMPT & FETCH DAILY IDs FROM RPC
    const [burnRes, questionsRes] = await Promise.all([
        supabase.from('daily_attempts').insert({
            user_id: session.user.id,
            attempt_date: todayStr,
            grid_pattern: gridPattern
        }),
        supabase.rpc('get_daily_questions') // The new logic happens here!
    ]);
    // Your exact error check
    if (burnRes.error) return showGoldAlert("You've already played today!");
    // Check if questions loaded
    if (questionsRes.error || !questionsRes.data) {
        console.error(questionsRes.error);
        return showGoldAlert("Error loading daily questions.");
    }

    // Tell the DB: "This is a new game, start my streak at 0"
    await supabase.rpc('reset_my_streak');

    // 3. Extract IDs in the SPECIFIC order from SQL
    const allDailyIds = questionsRes.data.map(q => String(q.question_id));

    // 4. BATCH LOAD: Start all 10 workers immediately
    // We don't use 'preloadNextQuestions' here because we already have the IDs.
    pendingIds = [...allDailyIds]; // Lock all 10

    // 4. ORDERED FETCH (The "Map" Strategy)
    // We start all fetches, but we keep them in a Promise array to preserve index
    const fetchPromises = allDailyIds.map(id => fetchDeterministicQuestion(id));

    // 5. Wait for ONLY the first question to display the game immediately
    const firstQuestionData = await fetchPromises[0];
    if (firstQuestionData) {
        // Image pre-warming for Question 1
        if (firstQuestionData.question_image) {
            const img = new Image();
            img.src = firstQuestionData.question_image;
            try { await img.decode(); firstQuestionData._preloadedImg = img; } catch (e) { }
        }
        preloadQueue.push(firstQuestionData);
    }

    // 6. Start the Game UI
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
        gameStarting = false;
    });

    // 7. BACKGROUND: Fill the rest of the queue in the CORRECT order
    // We already started the fetches in step 4, now we just wait for them in sequence
    for (let i = 1; i < fetchPromises.length; i++) {
        const qData = await fetchPromises[i];
        if (qData) {
            // Optional: warm the image in background
            if (qData.question_image) {
                const img = new Image();
                img.src = qData.question_image;
                img.decode().then(() => { qData._preloadedImg = img; }).catch(() => { });
            }
            preloadQueue.push(qData); // Pushes in order: 2, then 3, then 4...
        }
    }
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

function updateScore() {
    if (!scoreDisplay) return;
    // 1. MULTIPLAYER UI HANDLING
    if (isMultiplayerMode) {
        // We hide the score display so the HP bars are the focus
        scoreDisplay.style.display = 'none';
        return; // Exit early: no achievement checks or solo text updates needed
    } else {
        // Ensure it's visible if we go back to a solo mode later
        scoreDisplay.style.display = 'block';
    }

    if (isWeeklyMode) {
        scoreDisplay.textContent = `Score: ${score}/${weeklyQuestionCount}`;
    } else if (isDailyMode) {
        scoreDisplay.textContent = `Score: ${score}/${dailyQuestionCount}`;
    } else if (isLiteMode) {
        scoreDisplay.textContent = `Score: ${score}/${liteQuestionCount}`;
    } else {
        // Keeps the "Normal" mode behavior exactly as it was
        scoreDisplay.textContent = `Score: ${score}`;
    }
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























































































































































































































































































































