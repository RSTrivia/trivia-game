
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

    // Define the mapping based on your HTML data-mode attributes
    const dataMap = {
            'Normal': { s: localStorage.getItem('cached_score') || 0, t: localStorage.getItem('cached_time_ms') || 0 },
            'Lite': JSON.parse(localStorage.getItem('cached_lite_data') || '{"score":0, "time":0}'),
            'Weekly': JSON.parse(localStorage.getItem('cached_weekly_data') || '{"score":0, "time":0}'),
            'Daily': JSON.parse(localStorage.getItem('cached_daily_data') || '{"score":0, "time":0}')
        };

        Object.keys(dataMap).forEach(mode => {
            const row = statsList.querySelector(`[data-mode="${mode}"]`);
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
        supabase.from('profiles').select('collection_log, achievements, xp, equipped_pet, level').eq('id', session.user.id).single(),
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

        // --- SOURCE OF TRUTH OVERRIDES ---
        localStorage.setItem('cached_daily_total', realTotalGames);

        // If hasPerfectGame is true from the table, use 'true', otherwise fallback to the JSON column
        const isPerfect = hasPerfectGame || a.daily_perfect || false;
        localStorage.setItem('stat_daily_perfect', isPerfect.toString());

        // --- STANDARD SYNC ---
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

async function syncDailySystem() {
    try {
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
                alert("Session expired. Please log in.");
                navigateTo('view-login');
                return;
            }
            
            location.reload();
            
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
    if (mainMenuBtns) {
        mainMenuBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                preloadQueue = []; // Clear the buffer only when going back to menu
                resetGame();
                // Manual UI Reset instead:
                document.getElementById('end-screen').classList.add('hidden');
                document.getElementById('start-screen').classList.remove('hidden');
                document.body.classList.remove('game-active');
                // Navigate
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
    unlockweeklyButton();
}
function unlockweeklyButton() {
    if (!weeklyBtn) return;
        weeklyBtn.classList.add('is-active');
        weeklyBtn.classList.remove('is-disabled');
        weeklyBtn.style.opacity = '1'; 
        weeklyBtn.style.pointerEvents = 'auto';
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
}


async function preloadNextQuestions(targetCount = 6) {
    // 1. EXIT EARLY for Batch Modes
    // Daily and Weekly are handled entirely by their start functions.
    if (isDailyMode || isWeeklyMode) return;

    const needed = targetCount - preloadQueue.length;
    if (needed <= 0) return;

    // 2. Normal / Lite Logic only
    let activePool = normalSessionPool;

    const queuedIds = preloadQueue.map(q => String(q.id));
    // MOVE THE DECLARATION ABOVE THE LOGS
    const availableIds = activePool.filter(poolId => {
        const sId = String(poolId); // Convert current pool ID to string for comparison
        return !queuedIds.includes(sId) &&
            !usedInThisSession.includes(sId) &&
            !pendingIds.includes(sId) &&
            (currentQuestion ? String(currentQuestion.id) !== sId : true);
    });
    ;
    // CRITICAL: Stop if we ran out of questions in the pool
    if (availableIds.length === 0) return;

    // Only take as many as we need (or as many as are left)
    const toFetch = availableIds.slice(0, needed);

    // CRITICAL FIX: Add to usedInThisSession IMMEDIATELY before fetching
    toFetch.forEach(id => {
        const sId = String(id);
        pendingIds.push(sId);
        if (!usedInThisSession.includes(sId)) {
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
    });
}

async function loadQuestion(isFirst = false) {
    if (gameEnding) return;

    // 1. End Game Checks
    if (isWeeklyMode && weeklyQuestionCount >= WEEKLY_LIMIT) { await endGame(); return; }
    if (isLiteMode && liteQuestionCount >= LITE_LIMIT) { await endGame(); return; }
    if (isDailyMode && dailyQuestionCount >= DAILY_LIMIT) { await endGame(); return; }
    if (score === number_of_questions) { await endGame(); return; }

    // A. CONDITIONAL CLEANUP
    if (!isFirst) {
        document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
        questionImage.style.opacity = '0';
    }

    // B. REFILL THE BUFFER 
    let needsRefill = !isDailyMode && !isWeeklyMode;

    // ONLY refill if we are NOT in Daily Mode (since Daily is pre-loaded)
    if (!isFirst && preloadQueue.length <= 4 && needsRefill) {
        preloadNextQuestions(8);
    }

    // C. THE "NO-UNDEFINED" GATE
    if (preloadQueue.length === 0) {
        if (needsRefill) {
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
            clearInterval(timer);
            // SOLO / DAILY / WEEKLY
            handleTimeout();
        }
    }, 1000);
}

async function handleTimeout() {
    stopTickSound();
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    playSound(wrongBuffer);
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
    clearInterval(timer);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

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
        setTimeout(loadQuestion, 1000);
    } else {
        updateScore();
        // Wrong answer logic
        playSound(wrongBuffer);
        if (btn) btn.classList.add('wrong');
        await highlightCorrectAnswer();

        if (isDailyMode || isWeeklyMode || isLiteMode) {
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
            try {
                await navigator.clipboard.writeText(shareText);
            } catch (clipErr) {
                console.error("Clipboard failed:", clipErr);
            }
        }
    };
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
        return alert("Error loading weekly questions.");
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
    });
}


async function startDailyChallenge(session) {
    gridPattern = "0000000000";
    gameEnding = false;
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
    if (burnRes.error) return alert("You've already played today!");
    // Check if questions loaded
    if (questionsRes.error || !questionsRes.data) {
        console.error(questionsRes.error);
        return alert("Error loading daily questions.");
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












































































































































































































































































































