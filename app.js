import { supabase } from './supabase.js';
import { updateMenuPet, showGoldAlert } from './login.js';

// UI & STATE
const cachedMuted = localStorage.getItem('muted') === 'true';
let muted = cachedMuted;
let syncChannel;
let currentProfileXp = parseInt(localStorage.getItem('cached_xp')) || 0; // Store the player's current XP locally
let currentLevel = parseInt(localStorage.getItem('cached_level')) || 1; // Store the player's current Level locally
let username = 'Guest';
let currentMode = 'score';
let gameEnding = false;
let isShowingNotification = false;
let gameStarting = false;
let notificationQueue = [];
let pendingIds = [];
let usedInThisSession = [];
let normalSessionPool = [];
let preloadQueue = [];
let achievementNotificationTimeout = null;
let petNotificationTimeout = null;
let lobbyChannel = null;
let realtimeSubscription = null; // Track the active listener
let userId = null;
let currentEquippedPet = localStorage.getItem('equipped_pet_id') || null;
let seenMilestones = new Set(); // Track which score milestones we've already alerted this session
let correctBuffer, wrongBuffer, tickBuffer, levelUpBuffer, bonusBuffer, petBuffer, achieveBuffer, mpWinBuffer, mpLossBuffer, mpDrawBuffer;
let activeTickSource = null; // To track the clock sound
let currentQuestion = null;
let timer;
let timeLeft = 15;
let isDailyMode = false;
let isLiteMode = false;
let isWeeklyMode = false;
let isMultiplayerMode = false;
let weeklyQuestionCount = 0;
let liteQuestionCount = 0;
let dailyQuestionCount = 0; // Tracking for daily bonus
let gameStartTime = 0;
let score = 0;
let liveStats = {
    maxScore: 0,
    maxScoreTime: 9999,
    total_correct: 0,
    total_wrong: 0,
    max_daily_streak: 0,
    current_daily_streak: 0,
    daily_total: 0,
    daily_perfect: false,
    fastest_guess: false,
    just_in_time: false,
    correct_1000: false,
    correct_10000: false,
    multiplayer_wins: 0,
    multiplayer_losses: 0,
    multiplayer_draws: 0,
    multi_first_win: false,
    multi_first_loss: false,
    multi_first_draw: false,
    multi_5_wins: false,
    multi_50_wins: false,
    multi_100_wins: false,
    multi_flawless: false,
    weekly_25: false,
    weekly_50: false,
    weekly_sub_3: false,
    weekly_sub_2: false,
    lite_50: false,
    lite_100: false,
    lite_sub_8: false,
    lite_sub_6: false,
    lite_data: {},
    weekly_data: {},
    daily_data: {}
};

const TOTAL_ACHIEVEMENTS = 35;
const TOTAL_PETS = 20;
const MAX_LEVEL = 99;
const DAILY_LIMIT = 10;
const WEEKLY_LIMIT = 50;
const LITE_LIMIT = 100;//100;
const number_of_questions = 1000; // 1000 Total Questions

const lobbymainMenu = document.getElementById('lobby-main-menu-btn');
const game = document.getElementById('game');
const endScreen = document.getElementById('end-screen');
const scoreDisplay = document.getElementById('score');
const questionText = document.getElementById('questionText');
const questionImage = document.getElementById('questionImage');
const answersBox = document.getElementById('answers');
const timeDisplay = document.getElementById('time');
const timeWrap = document.getElementById('time-wrap');

const shareBtn = document.getElementById('shareBtn');
const logBtn = document.getElementById('logBtn');
const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const authBtn = document.getElementById('authBtn');
const muteBtn = document.getElementById('muteBtn');
const dailyBtn = document.getElementById('dailyBtn');
const weeklyBtn = document.getElementById('weeklyBtn');
const liteBtn = document.getElementById('liteBtn');
const mainMenuBtns = document.querySelectorAll('.main-menu-btn');
// Multiplayer mode buttons
const lobbyBtn = document.getElementById('btn-create-lobby');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const multiplayerBtn = document.getElementById('MultiplayerBtn');

// Multiplayer mode
const MAX_HP = 60;
let myHP = 60;
let opponentHP = 60;
let opponentHasAnswered = false;
let iHaveAnswered = false;
let isSyncing = false;
let iAmReadyForRematch = false;
let opponentReadyForRematch = false;
let opponentName = null;
let isEndGameProcessing = false;
let isHandlingLobbyClose = false;
let myRole = ''; // 'host' or 'guest'

// Leaderboard
const leaderBtn = document.getElementById('btn-leaderboard');
const leaderboardRows = document.querySelectorAll('#leaderboard li');
const scoreTab = document.getElementById('scoreTab');
const dailyTab = document.getElementById('dailyTab');
const weeklyTab = document.getElementById('weeklyTab');
const xpTab = document.getElementById('xpTab');
const liteTab = document.getElementById('liteTab');

// Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// This intercepts and silences the "WebSocket is closed before established" error
(function () {
    const muzzle = (...args) => {
        const message = args.join(' ');
        // Silence WebSockets, Realtime, and Supabase Auth Refresh errors
        if (
            message.includes('WebSocket') ||
            message.includes('realtime') ||
            message.includes('Refresh Token') ||
            message.includes('AuthApiError')
        ) {
            return;
        }
        // Original error behavior for everything else
        console._error(...args);
    };

    // Save original console functions to prevent infinite loops
    console._error = console.error;
    console._warn = console.warn;

    console.error = muzzle;
    console.warn = (...args) => {
        const message = args.join(' ');
        if (message.includes('WebSocket') || message.includes('Refresh Token')) return;
        console._warn(...args);
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
            userTxt.innerHTML = '';
            scoreSpan.innerHTML = '';
            userTxt.onclick = null; // Remove listener if row is empty
            userTxt.style.cursor = "default";
            return;
        }

        // Only attempt to get the icon if equipped_pet exists
        const itemImgHtml = getEquippedItemIcon(entry.equipped_pet);
        const fullNameHtml = `${itemImgHtml}${entry.username}`;
        if (userTxt.innerHTML !== fullNameHtml) {
            userTxt.innerHTML = fullNameHtml;

            userTxt.style.cursor = "pointer";
            userTxt.onclick = () => {
                openPlayerProfile(entry.username);
            };
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
            // Normal mode
            const s = entry.val || 0;
            const t = entry.time_ms || 0;
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
    // Check if the item is any version of a cape (including trimmed)
    const isCape = ['max_cape', 'achievement_cape', 'max_cape_t', 'achievement_cape_t'].includes(itemId);

    const folder = isCape ? 'capes/' : 'pets/';
    const fileName = isCape ? `${itemId}.png` : `${itemId.replace('pet_', '')}.png`;

    return `<img src="${folder}${fileName}" class="mini-pet-icon" draggable="false">`;
}

async function fetchLeaderboard() {
    let query;
    if (currentMode === 'score') {
        query = supabase
            .from('scores')
            .select('username, val:score, time_ms')
            .gt('score', 0)
            .order('score', { ascending: false })
            .order('time_ms', { ascending: true });

    } else if (currentMode === 'lite') {
        query = supabase
            .from('scores')
            .select('username, lite_data')
            .not('lite_data', 'is', null)
            .gt('lite_data->score', 0)
            .order('lite_data->score', { ascending: false })
            .order('lite_data->time', { ascending: true });
    } else if (currentMode === 'weekly') {
        query = supabase
            .from('scores')
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

// Real time leaderboard
async function subscribeToLeaderboard() {
    // Clean up existing subscription safely
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

    // Create the channel
    realtimeSubscription = supabase.channel('live-leaderboard');

    // LISTENER 1: Always watch for Pet/XP changes in 'profiles'
    realtimeSubscription.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
            // Refresh if pet changed OR if we are in XP mode and XP changed
            // Leaderboard refresh
            if (currentMode === 'xp' || (payload.new && payload.new.equipped_pet !== undefined)) {
                fetchLeaderboard();
            }
            if (document.getElementById('petsTab').classList.contains('active')) {
                loadCollection(); // This triggers loadCollection()
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


// Collection
const PET_DATA = [
    { id: 'pet_mole', name: 'Baby Mole', rarity: 'common', file: 'mole.png' },
    { id: 'pet_kraken', name: 'Pet Kraken', rarity: 'common', file: 'kraken.png' },
    { id: 'pet_chompy', name: 'Chompy Chick', rarity: 'common', file: 'chompy.png' },
    { id: 'pet_beef', name: 'Beef', rarity: 'common', file: 'beef.png' },

    { id: 'pet_zilyana', name: 'Pet Zilyana', rarity: 'uncommon', file: 'zilyana.png' },
    { id: 'pet_vorki', name: 'Vorki', rarity: 'uncommon', file: 'vorki.png' },
    { id: 'pet_snakeling', name: 'Pet Snakeling', rarity: 'uncommon', file: 'snakeling.png' },
    { id: 'pet_callisto_cub', name: 'Callisto Cub', rarity: 'uncommon', file: 'callisto_cub.png' },

    { id: 'pet_yami', name: 'Yami', rarity: 'rare', file: 'yami.png' },
    { id: 'pet_bloodhound', name: 'Bloodhound', rarity: 'rare', file: 'bloodhound.png' },
    { id: 'pet_rocky', name: 'Rocky', rarity: 'rare', file: 'rocky.png' },
    { id: 'pet_nid', name: 'Nid', rarity: 'rare', file: 'nid.png' },

    { id: 'pet_jad', name: 'TzRek-Jad', rarity: 'legendary', file: 'jad.png' },
    { id: 'pet_olmlet', name: 'Olmlet', rarity: 'legendary', file: 'olmlet.png' },
    { id: 'pet_corporeal_beast', name: 'Corporeal Beast', rarity: 'legendary', file: 'corporeal_beast.png' },
    { id: 'pet_baron', name: 'Baron', rarity: 'legendary', file: 'baron.png' },

    { id: 'pet_zuk', name: 'TzRek-Zuk', rarity: 'mythic', file: 'zuk.png' },
    { id: 'pet_lil_zik', name: 'Lil\' Zik', rarity: 'mythic', file: 'lil_zik.png' },
    { id: 'pet_tumekens_guardian', name: 'Tumeken\'s Guardian', rarity: 'mythic', file: 'tumekens_guardian.png' },
    { id: 'pet_little_nightmare', name: 'Little Nightmare', rarity: 'mythic', file: 'little_nightmare.png' },
    { id: 'max_cape', name: 'Max Cape', file: 'max_cape.png' },
    { id: 'achievement_cape', name: 'Achievement Cape', file: 'achievement_cape.png' },
    { id: 'max_cape_t', name: 'Max Cape (t)', file: 'max_cape_t.png' },
    { id: 'achievement_cape_t', name: 'Achievement Cape (t)', file: 'achievement_cape_t.png' }
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
            { id: 'lvl92', text: 'Reach Level 92', check: (d) => d.level >= 92 },
            { id: 'lvl99', text: 'Reach Max Level', check: (d) => d.level >= 99 }
        ]
    },
    {
        cat: 'Normal Mode', tasks: [
            { id: 'sc10', text: 'Reach 10 Score', check: (d) => d.maxScore >= 10 },
            { id: 'sc50', text: 'Reach 50 Score', check: (d) => d.maxScore >= 50 },
            { id: 'sc100', text: 'Reach 100 Score', check: (d) => d.maxScore >= 100 },
            { id: 'sc510', text: 'Reach 250 Score', check: (d) => d.maxScore >= 250 }
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
        cat: 'Multiplayer Mode', tasks: [
            { id: 'mpw', text: 'First Win', check: (d) => d.multi_first_win === true },
            { id: 'mpl', text: 'First Loss', check: (d) => d.multi_first_loss === true },
            { id: 'mpd', text: 'First Draw', check: (d) => d.multi_first_draw === true },
            { id: 'mp5', text: 'Reach 5 Wins', check: (d) => d.multi_5_wins === true },
            { id: 'mp50', text: 'Reach 50 Wins', check: (d) => d.multi_50_wins === true },
            { id: 'mp100', text: 'Reach 100 Wins', check: (d) => d.multi_100_wins === true },
            { id: 'mp_flawless', text: 'Flawless Win', check: (d) => d.multi_flawless === true }
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
            { id: 'p10', text: 'Unlock 10 Pets', check: (d) => d.petsUnlocked >= 10 },
            { id: 'pall', text: 'Unlock all Pets', check: (d) => d.petsUnlocked >= TOTAL_PETS }
        ]
    },
    {
        cat: 'Game', tasks: [
            { id: 'fast', text: 'Lucky Guess', check: (d) => d.fastestGuess === true },
            { id: 'close', text: 'Just in Time', check: (d) => d.justInTime === true },
            { id: 'correct_1000', text: 'Reach 1,000 Correct Answers', check: (d) => d.correct_1000 === true },
            { id: 'correct_10000', text: 'Reach 10,000 Correct Answers', check: (d) => d.correct_10000 === true }
        ]
    }
];

// tab switching
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
    renderAchievements();
    renderStats();
};

async function renderStats() {
    const pbList = document.getElementById('pbList');
    const maxCape = document.getElementById('cape-max');
    const achieveCape = document.getElementById('cape-achieve');

    const stats = getStatsObject();

    // Update Header
    document.getElementById('statsName').textContent = username;
    document.getElementById('statsLevel').textContent = currentLevel;
    const rawXPValue = document.getElementById('xpBracket').textContent.replace(/[^0-9]/g, '');
    // Convert the string to a number and format it
    const formattedXP = parseInt(rawXPValue, 10).toLocaleString();
    document.getElementById('statsXP').textContent = formattedXP;

    // Correct & Wrong Answers
    const totalCorrect = liveStats.total_correct || 0;
    const totalWrong = liveStats.total_wrong || 0;
    const totalAnswers = totalCorrect + totalWrong;

    const accuracy = totalAnswers > 0
        ? (Math.floor((totalCorrect / totalAnswers * 100) * 10) / 10).toFixed(1)
        : "0.0";

    // Update the UI elements
    const correctElem = document.getElementById('statsTotalCorrect');
    const wrongElem = document.getElementById('statsTotalWrong');
    const accuracyElem = document.getElementById('statsAccuracy');

    if (correctElem) correctElem.textContent = totalCorrect.toLocaleString();
    if (wrongElem) wrongElem.textContent = totalWrong.toLocaleString();
    if (accuracyElem) accuracyElem.textContent = `${accuracy}%`;

    // Multiplayer wins/losses/draws
    const winsEl = document.getElementById('statsWins');
    const lossesEl = document.getElementById('statsLosses');
    const drawsEl = document.getElementById('statsDraws');

    if (winsEl) winsEl.textContent = liveStats.multiplayer_wins || 0;
    if (lossesEl) lossesEl.textContent = liveStats.multiplayer_losses || 0;
    if (drawsEl) drawsEl.textContent = liveStats.multiplayer_draws || 0;

    // Daily streak and total
    const bestStreak = liveStats.max_daily_streak || 0;

    const totalDaily = liveStats.daily_total || 0;

    const streakElem = document.getElementById('statsMaxStreak');
    const totalElem = document.getElementById('statsTotalDaily');

    if (streakElem) streakElem.textContent = parseInt(bestStreak).toLocaleString();
    if (totalElem) totalElem.textContent = parseInt(totalDaily).toLocaleString();

    // Define the mapping based on HTML data-mode attributes
    const dataMap = {
        'Normal': { s: liveStats.maxScore || 0, t: liveStats.maxScoreTime || 0 },
        'Lite': JSON.parse(liveStats.lite_data || '{"score":0, "time":0}'),
        'Weekly': JSON.parse(liveStats.weekly_data || '{"score":0, "time":0}'),
        'Daily': JSON.parse(liveStats.daily_data || '{"score":0, "time":0}')
    };

    Object.keys(dataMap).forEach(mode => {
        const row = pbList.querySelector(`[data-mode="${mode}"]`);
        if (!row) return;

        const val = dataMap[mode];

        const score = val.s ?? val.score ?? 0;
        const time = val.t ?? val.time ?? 0;

        const valueSpan = row.querySelector('.stat-value');
        const newContent = `${parseInt(score).toLocaleString()} <span class="time-stamp">${formatLeaderboardTime(time)}</span>`;

        if (valueSpan.innerHTML !== newContent) {
            valueSpan.innerHTML = newContent;
        }
    });

    // Update UI Counters
    document.getElementById('stat-pet-count').textContent = `${stats.petsUnlocked}/${TOTAL_PETS}`;
    const allAchievements = ACHIEVEMENT_SCHEMA.flatMap(c => c.tasks);

    // Dynamically calculate the total count from schema
    const totalPossible = allAchievements.length;

    // Count how many are actually finished
    const completedCount = allAchievements.filter(t => t.check(stats)).length;

    // Update the UI with the dynamic total
    const achieveCountElem = document.getElementById('stat-achieve-count');
    if (achieveCountElem) {
        achieveCountElem.textContent = `${completedCount}/${totalPossible}`;
    }

    // Cape logic
    const isMaxUnlocked = stats.level >= MAX_LEVEL;
    const isAchieveUnlocked = completedCount >= totalPossible;
    const isTrimmed = isMaxUnlocked && isAchieveUnlocked;

    const currentMaxId = isTrimmed ? 'max_cape_t' : 'max_cape';
    const currentAchieveId = isTrimmed ? 'achievement_cape_t' : 'achievement_cape';

    maxCape.classList.toggle('unlocked', isMaxUnlocked);
    achieveCape.classList.toggle('unlocked', isAchieveUnlocked);

    // Apply visual state
    maxCape.classList.toggle('equipped', currentEquippedPet === 'max_cape' || currentEquippedPet === 'max_cape_t');
    achieveCape.classList.toggle('equipped', currentEquippedPet === 'achievement_cape' || currentEquippedPet === 'achievement_cape_t');

    // Update the image source dynamically if trimmed
    maxCape.querySelector('img').src = `capes/${currentMaxId}.png`;
    achieveCape.querySelector('img').src = `capes/${currentAchieveId}.png`;

    // Attach listeners using the dynamic ID
    if (!maxCape.dataset.listener) {
        maxCape.addEventListener('click', () => {
            const idToEquip = (isMaxUnlocked && isAchieveUnlocked) ? 'max_cape_t' : 'max_cape';
            handleCapeClick(idToEquip, maxCape);
        });
        maxCape.dataset.listener = "true";
    }
    if (!achieveCape.dataset.listener) {
        achieveCape.addEventListener('click', () => {
            const idToEquip = (isMaxUnlocked && isAchieveUnlocked) ? 'achievement_cape_t' : 'achievement_cape';
            handleCapeClick(idToEquip, achieveCape);
        });
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

    // Refresh the pet grid visuals
    const cachedPets = JSON.parse(localStorage.getItem('cached_pets') || '[]');
    applyUnlocks(cachedPets);

    // Refresh stats to trigger classList updates
    renderStats();
}

// Stat objects in achievements
function getStatsObject() {
    return {
        // Level, Normal Mode score, Pets
        level: currentLevel || 1,
        maxScore: liveStats.maxScore || 0,
        petsUnlocked: JSON.parse(localStorage.getItem('cached_pets') || '[]').length,

        // Daily Mode 
        dailyTotal: liveStats.daily_total || 0,
        dailyStreak: liveStats.max_daily_streak || 0,
        dailyPerfect: liveStats.daily_perfect === 'true',

        // Game
        fastestGuess: liveStats.fastest_guess === 'true',
        justInTime: liveStats.just_in_time === 'true',
        correct_1000: liveStats.correct_1000 === 'true',
        correct_10000: liveStats.correct_10000 === 'true',

        // Multiplayer Mode Booleans from LocalStorage
        multi_first_win: liveStats.multi_first_win === 'true',
        multi_first_loss: liveStats.multi_first_loss === 'true',
        multi_first_draw: liveStats.multi_first_draw === 'true',
        multi_5_wins: liveStats.multi_5_wins === 'true',
        multi_50_wins: liveStats.multi_50_wins === 'true',
        multi_100_wins: liveStats.multi_100_wins === 'true',
        multi_flawless: liveStats.multi_flawless === 'true',

        // Weekly Mode Booleans from LocalStorage
        weekly25: liveStats.weekly_25 === 'true',
        weekly50: liveStats.weekly_50 === 'true',
        weeklySub3: liveStats.weekly_sub_3 === 'true',
        weeklySub2: liveStats.weekly_sub_2 === 'true',

        // Lite Mode Booleans from LocalStorage
        lite50: liveStats.lite_50 === 'true',
        lite100: liveStats.lite_100 === 'true',
        liteSub8: liveStats.lite_sub_8 === 'true',
        liteSub6: liveStats.lite_sub_6 === 'true'
    };
}

async function renderAchievements(calculatedLevel) {
    const list = document.getElementById('achievementList');
    list.innerHTML = '';

    const stats = getStatsObject();

    // Override level if a calculated one was passed in
    if (calculatedLevel) stats.level = calculatedLevel;

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
        const img = slot.querySelector('.pet-img');

        // Force the correct image file based on the PET_DATA array
        if (img) {
            // if the ID contains 'cape', it goes to the capes folder
            // correctly handles max_cape, achievement_cape, and the _t versions
            const isCape = pet.id.includes('cape');
            const folder = isCape ? 'capes/' : 'pets/';

            img.src = `${folder}${pet.file}`;
        }
        // Update classes
        slot.className = `pet-slot ${isUnlocked ? 'unlocked' : ''} ${isEquipped ? 'equipped' : ''}`;
        nameSpan.textContent = isUnlocked ? pet.name : "???";

        // Add Click Listener for Unlocked Pets
        if (isUnlocked) {
            slot.onclick = () => equipPet(pet.id);
        } else {
            // Clear any old listeners
            slot.onclick = null;
        }
    });
    document.getElementById('logGrid').classList.add('ready');
    document.querySelector('.container').classList.add('loaded');
}
async function equipPet(petId) {
    // Toggle logic (if clicking the same pet, unequip it)
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

    // Save to Supabase using RPC
    const { error } = await supabase.rpc('equip_pet_secure', {
        pet_id_to_equip: newPetId
    });
    if (error) {
        console.error("Pet update failed:", error.message);
    }
}

async function loadCollection() {
    // Fetch fresh data
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Initial UI from LocalStorage
    const cachedPets = JSON.parse(localStorage.getItem('cached_pets') || '[]');
    if (cachedPets.length > 0) applyUnlocks(cachedPets);

    // Grab collections from supabase
    const [profileRes, scoreRes, attemptsRes] = await Promise.all([
        supabase.from('profiles').select('collection_log, achievements, xp, equipped_pet, level, total_correct, total_wrong, wins, losses, draws').eq('id', session.user.id).single(),
        supabase.from('scores').select('score, time_ms, lite_data, weekly_data, daily_data').eq('user_id', session.user.id).maybeSingle(),
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
        const a = profileData.achievements || {}; // achievements object
        const s = scoreRes.data || {}; // score object

        // Save multiplayer wins / losses / draws
        liveStats.multiplayer_wins = profileData.wins || 0;
        liveStats.multiplayer_losses = profileData.losses || 0;
        liveStats.multiplayer_draws = profileData.draws || 0;

        // Save to liveStats
        liveStats.total_correct = profileData.total_correct || 0;
        liveStats.total_wrong = profileData.total_wrong || 0;

        // Save to Cache
        currentProfileXp = profileData.xp || 0;
        currentLevel = officialLevel;
        liveStats.maxScore = maxScore;

        // Total correct answers
        liveStats.correct_1000 = (a.correct_1000 || false).toString();
        liveStats.correct_10000 = (a.correct_10000 || false).toString();

        // Multiplayer stats
        liveStats.multi_first_win = (a.multi_first_win || false).toString();
        liveStats.multi_first_loss = (a.multi_first_loss || false).toString();
        liveStats.multi_first_draw = (a.multi_first_draw || false).toString();
        liveStats.multi_5_wins = (a.multi_5_wins || false).toString();
        liveStats.multi_50_wins = (a.multi_50_wins || false).toString();
        liveStats.multi_100_wins = (a.multi_100_wins || false).toString();
        liveStats.multi_flawless = (a.multi_flawless || false).toString();

        // Weekly stats
        liveStats.weekly_25 = (a.weekly_25 || false).toString();
        liveStats.weekly_50 = (a.weekly_50 || false).toString();
        liveStats.weekly_sub_3 = (a.weekly_sub_3 || false).toString();
        liveStats.weekly_sub_2 = (a.weekly_sub_2 || false).toString();

        // Lite stats
        liveStats.lite_50 = (a.lite_50 || false).toString();
        liveStats.lite_100 = (a.lite_100 || false).toString();
        liveStats.lite_sub_8 = (a.lite_sub_8 || false).toString();
        liveStats.lite_sub_6 = (a.lite_sub_6 || false).toString();

        // all modes data
        liveStats.maxScoreTime = s.time_ms || 9999;
        liveStats.lite_data = JSON.stringify(s.lite_data || {});
        liveStats.weekly_data = JSON.stringify(s.weekly_data || {});
        liveStats.daily_data = JSON.stringify(s.daily_data || {});

        // Total Daily Games
        liveStats.daily_total = realTotalGames;

        // If hasPerfectGame is true from the table, use 'true', otherwise fallback to the JSON column
        const isPerfect = hasPerfectGame || a.daily_perfect || false;
        liveStats.daily_perfect = isPerfect.toString();

        // Best Daily Streak
        liveStats.current_daily_streak = a.daily_streak || 0;
        liveStats.max_daily_streak = a.max_streak || 0;

        // Game
        liveStats.fastest_guess = (a.fastest_guess || false).toString();
        liveStats.just_in_time = (a.just_in_time || false).toString();

        // Update Pets and UI
        currentEquippedPet = profileData.equipped_pet || null;
        if (currentEquippedPet) {
            localStorage.setItem('equipped_pet_id', currentEquippedPet);
        } else {
            localStorage.removeItem('equipped_pet_id');
        }

        const freshPets = profileData.collection_log || [];
        localStorage.setItem('cached_pets', JSON.stringify(freshPets));
        applyUnlocks(freshPets);

        const achieveTab = document.getElementById('achieveTab');
        if (achieveTab && achieveTab.classList.contains('active')) {
            renderAchievements(officialLevel);
        }

        const statsTab = document.getElementById('statsTab');
        if (statsTab && statsTab.classList.contains('active')) {
            renderStats();
        }
    }
}

// To see the player's profile through leaderboard
async function openPlayerProfile(username) {
    // Fetch data from RPC
    const { data, error } = await supabase.rpc('get_player_stats', { target_username: username });

    if (error || !data) {
        console.error("User not found or RPC error:", error);
        return;
    }

    // Calculate Achievements
    // Start with the ones stored in the DB

    let finalAchieveCount = data.completed_achievements || 0;

    // Milestone: Levels
    if (data.level >= 10) finalAchieveCount++;
    if (data.level >= 50) finalAchieveCount++;
    if (data.level >= 92) finalAchieveCount++;
    if (data.level >= 99) finalAchieveCount++;

    // Milestone: Normal Mode
    if (parseInt(data.pb_normal) >= 10) finalAchieveCount++;
    if (parseInt(data.pb_normal) >= 50) finalAchieveCount++;
    if (parseInt(data.pb_normal) >= 100) finalAchieveCount++;
    if (parseInt(data.pb_normal) >= 250) finalAchieveCount++;

    // Milestone: Pets
    if (data.pets_unlocked >= 1) finalAchieveCount++;
    if (data.pets_unlocked >= 10) finalAchieveCount++;
    if (data.pets_unlocked >= TOTAL_PETS) finalAchieveCount++;

    // Header
    document.getElementById('m-statsName').textContent = data.username;
    document.getElementById('m-statsLevel').textContent = data.level;
    document.getElementById('m-statsXP').textContent = data.xp.toLocaleString();
    document.getElementById('m-stat-achieve-count').textContent = `${finalAchieveCount}/${TOTAL_ACHIEVEMENTS}`;
    document.getElementById('m-stat-pet-count').textContent = `${data.pets_unlocked}/${TOTAL_PETS}`;

    // Stats Grid
    document.getElementById('m-statsTotalCorrect').textContent = data.total_correct.toLocaleString();
    document.getElementById('m-statsTotalWrong').textContent = data.total_wrong.toLocaleString();
    document.getElementById('m-statsMaxStreak').textContent = data.best_streak.toLocaleString();
    document.getElementById('m-statsTotalDaily').textContent = data.daily_total.toLocaleString();

    const total = data.total_correct + data.total_wrong;
    const accuracy = total > 0 ? (Math.floor((data.total_correct / total * 100) * 10) / 10).toFixed(1) : "0.0";
    document.getElementById('m-statsAccuracy').textContent = `${accuracy}%`;

    // Multiplayer
    document.getElementById('m-statsWins').textContent = data.wins;
    document.getElementById('m-statsLosses').textContent = data.losses;
    document.getElementById('m-statsDraws').textContent = data.draws;

    // Personal Bests
    const formatPB = (score, time) => {
        const timeStr = formatLeaderboardTime(time);
        return `${parseInt(score).toLocaleString()}${timeStr}`;
    };

    document.getElementById('m-pbNormal').innerHTML = formatPB(data.pb_normal, data.pb_normal_time);
    document.getElementById('m-pbDaily').innerHTML = formatPB(data.pb_daily.score || 0, data.pb_daily.time || 0);
    document.getElementById('m-pbLite').innerHTML = formatPB(data.pb_lite.score || 0, data.pb_lite.time || 0);
    document.getElementById('m-pbWeekly').innerHTML = formatPB(data.pb_weekly.score || 0, data.pb_weekly.time || 0);

    // Capes
    const isMaxUnlocked = data.level >= 99;
    const isAchieveUnlocked = finalAchieveCount >= TOTAL_ACHIEVEMENTS;
    const isTrimmed = isMaxUnlocked && isAchieveUnlocked;

    const maxCape = document.getElementById('m-cape-max');
    const achieveCape = document.getElementById('m-cape-achieve');

    maxCape.classList.toggle('unlocked', isMaxUnlocked);
    achieveCape.classList.toggle('unlocked', isAchieveUnlocked);

    // Swap images based on "Trimmed" status (99 + all achievements)
    document.getElementById('m-img-max').src = isTrimmed ? 'capes/max_cape_t.png' : 'capes/max_cape.png';
    document.getElementById('m-img-achieve').src = isTrimmed ? 'capes/achievement_cape_t.png' : 'capes/achievement_cape.png';

    // Open Modal
    document.getElementById('playerModal').classList.remove('hidden');
}


// main app
window.navigateTo = function (viewId) {
    // Immediately block all taps during the transition
    document.body.style.pointerEvents = 'none';

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    // Force clean every single 'tapped' element on the screen
    document.querySelectorAll('.tapped').forEach(el => {
        el.classList.remove('tapped');
        el.blur();
    });

    // Show the target view
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
    }

    // Reset Home Screen Children if navigating Home
    if (viewId === 'view-home') {
        const toShow = ['start-screen', 'user-controls', 'main-title'];
        toShow.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('hidden');
                el.style.display = ''; // Clear any inline 'none' or 'flex' set by JS
            }
        });
        const home = document.getElementById('view-home');
        if (home) home.style.display = '';
    }

    // App controls logic
    if (viewId === 'view-leaderboard') {
        // Force the Normal mode tab to be the active one
        handleTabClick('score', scoreTab);
        app.classList.add('hide-controls');
    } else {
        app.classList.remove('hide-controls');
    }

    const endScreen = document.getElementById('end-screen');
    if (endScreen) endScreen.classList.add('hidden');
    const mainMenuBtn = document.querySelector('.main-menu-btn');
    if (mainMenuBtn) {
        mainMenuBtn.textContent = 'Main Menu';
    }
    document.body.classList.remove('game-active');
    game.classList.add('hidden');

    // Update URL
    const path = viewId.replace('view-', '');
    window.location.hash = path;

    if (viewId === 'view-collections') {
        // Force the Pets tab to be the active one
        const petsTab = document.getElementById('petsTab');
        if (petsTab) {
            petsTab.click(); // Programmatically trigger the click
        }
        renderStats();
        renderAchievements();
    }

    // Re-enable interaction after a short delay
    // The delay ensures the transition is finished before the user can tap again
    setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
    }, 300);
};


// 1v1 MODE
function resetGameEngine() {
    // Clear the data queues
    preloadQueue = [];
    window.nextFetchIndex = 0;
    window.currentLobbyIndex = 0;
    gameStartTime = null;

    // Clear the storage so the next lobby must fetch from DB
    sessionStorage.removeItem('current_lobby_questions');
    sessionStorage.removeItem('current_lobby_id');
    sessionStorage.removeItem('game_start_time');
    document.getElementById('dailyEndNote').classList.add('hidden');

    // Reset Game State Flags
    isEndGameProcessing = false;
    gameStarting = false;
    gameEnding = false;
    isMultiplayerMode = false;
    isSyncing = false
    myRole = null;
    iHaveAnswered = false;
    opponentHasAnswered = false;
    if (window.forceEndTimeout) clearTimeout(window.forceEndTimeout);

    myHP = 60;
    opponentHP = 60;

    // Reset UI
    if (typeof timerInterval !== 'undefined') clearInterval(timerInterval);
    const answersBox = document.getElementById('answers-box');
    if (answersBox) answersBox.innerHTML = '';

    const scoreContainer = document.getElementById('finalScore').parentElement;

    scoreContainer.innerHTML = 'Score: <span id="finalScore">0</span>';
    const pBtn = document.getElementById('playAgainBtn');
    if (pBtn) {
        pBtn.disabled = false; // enable button
        pBtn.innerHTML = 'Play Again';
    }
}

async function startNewRound() {
    if (myRole !== 'host') return;

    const lobbyId = sessionStorage.getItem('current_lobby_id')?.replace(/['"]+/g, '');

    // Generate & Shuffle 1000 IDs
    const allIDs = Array.from({ length: 1000 }, (_, i) => i + 1);
    for (let i = allIDs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIDs[i], allIDs[j]] = [allIDs[j], allIDs[i]];
    }
    // Force the IDs to be a clean array of numbers
    const cleanIDs = allIDs.map(id => Number(id));
    // Save the new IDs locally so the Host's engine sees them
    sessionStorage.setItem('current_lobby_questions', JSON.stringify(allIDs));
    preloadQueue = [];
    window.nextFetchIndex = 0;
    iAmReadyForRematch = false;
    opponentReadyForRematch = false;

    const startTime = Date.now() + 3000;
    sessionStorage.setItem('game_start_time', startTime.toString());

    // Update Database and wait for it
    const { error } = await supabase
        .from('live_lobbies')
        .update({
            question_ids: cleanIDs,
            status: 'playing',
            game_start_time: startTime // Change status
        })
        .eq('id', lobbyId)
        .select();

    if (error) {
        console.error("DB Update Failed - Stopping Rematch:", error);
        return; // stop here so we don't send a fake broadcast
    }
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

async function leaveLobby() {
    const rawId = sessionStorage.getItem('current_lobby_id');
    if (!rawId) return;

    const lobbyId = rawId.replace(/['"]+/g, '');
    const roleAtTimeOfLeaving = myRole;

    try {
        // Fire and forget the lobby update
        if (roleAtTimeOfLeaving === 'host') {
            supabase.from('live_lobbies').update({ status: 'closed' }).eq('id', lobbyId).then();
        } else {
            supabase.from('live_lobbies').update({ guest_id: null, guest_name: null, status: 'waiting' }).eq('id', lobbyId).then();
        }
    } catch (err) {
        console.error("Cleanup error:", err);
    }

    await new Promise(res => setTimeout(res, 200));

    if (lobbyChannel) {
        // untrack before removing the channel to trigger the 'leave' event for others instantly
        supabase.removeChannel(lobbyChannel);
        lobbyChannel = null;
    }

    // Clear local memory
    sessionStorage.removeItem('current_lobby_id');
    sessionStorage.removeItem('is_host');

    // Reset the internal Role variable
    myRole = null;

    resetGameEngine();
}


async function handleMultiplayerTimeout() {
    // Prevent double-triggering if the player clicks right as it expires
    if (iHaveAnswered || gameEnding) return;
    iHaveAnswered = true;
    clearInterval(timer); // Stop the visual clock now that we've hit 0
    // UI & Sound Feedback
    stopTickSound();
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    playSound(wrongBuffer);

    // Show them what they missed
    highlightCorrectAnswer();

    // A timeout is equal to a wrong answer
    const timeoutDamage = 20;
    myHP = Math.max(0, myHP - timeoutDamage);
    triggerHitsplat('my', 20);

    // Update hp bars using existing function
    updateHPUI();

    // broadcast what happened
    if (lobbyChannel) {
        lobbyChannel.send({
            type: 'broadcast',
            event: 'player_answered',
            payload: {
                user_id: userId,
                correct: false,
                hp_remaining: myHP,
                damage_taken: 20,
                timed_out: true
            }
        });
    }

    // Clear any existing sync locks and move to transition
    isSyncing = false;
    handleMultiplayerTransition();
}

async function fetchNextLobbyQuestion(force = false) {
    try {
        // Get the latest IDs
        let stored = sessionStorage.getItem('current_lobby_questions');
        let storedIds = stored ? JSON.parse(stored) : null;

        // emergency fetch from DB if for some reason we don't have the IDs in session
        if (!storedIds || storedIds.length === 0) {
            const lobbyId = sessionStorage.getItem('current_lobby_id');
            if (!lobbyId) return null;

            const { data, error } = await supabase
                .from('live_lobbies')
                .select('question_ids')
                .eq('id', lobbyId)
                .single();

            if (error || !data?.question_ids) return null;

            storedIds = data.question_ids;
            sessionStorage.setItem('current_lobby_questions', JSON.stringify(storedIds));
        }

        if (typeof storedIds === 'string') storedIds = JSON.parse(storedIds);

        // Pointer Logic
        if (window.nextFetchIndex === undefined) window.nextFetchIndex = 0;

        const currentToFetch = window.nextFetchIndex;
        const nextId = storedIds[currentToFetch];

        if (!nextId) return null;

        // Increment pointer immediately so the next call gets index + 1
        window.nextFetchIndex++;

        // Fetch the actual data
        const data = await fetchDeterministicQuestion(Number(nextId));

        if (data) {
            // Image Pre-warming
            if (data.question_image) {
                const img = new Image();
                img.src = data.question_image;
                try {
                    await img.decode();
                    data._preloadedImg = img;
                } catch (e) { /* ignore decode errors */ }
            }

            // If it's a "force" (Game Start), handle it immediately.
            // Otherwise, return the data so Promise.all keeps the order.
            if (force) {
                preloadQueue.unshift(data);
                return data;
            }

            return data;
        }

        return null;
    } catch (err) {
        console.error("RPC Fetch Error:", err.message);
        return null;
    }
}

async function subscribeToLobby(lobbyCode, lobbyId) {
    // Cleanup check
    if (lobbyChannel) {
        await supabase.removeChannel(lobbyChannel);
    }
    // Setup the new channel
    lobbyChannel = supabase.channel(`lobby_${lobbyCode}`, {
        config: {
            broadcast: { self: false },
            presence: { key: myRole }
        }
    });

    // reset pointer so we start at question 0 of the lobby list
    window.currentLobbyIndex = 0;

    // reset the flag whenever we join a new lobby
    isHandlingLobbyClose = false;

    // Database Listener
    lobbyChannel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_lobbies',
        filter: `id=eq.${lobbyId}`
    }, (payload) => {
        const newStatus = payload.new.status;
        const lobbyData = payload.new;

        // Sync start time
        // This ensures Guest and Host use the same "Start Line" timestamp
        if (lobbyData.game_start_time) {
            gameStartTime = Number(lobbyData.game_start_time);
            sessionStorage.setItem('game_start_time', gameStartTime.toString());
        }

        // Sync names
        // If I am host, opponent is guest. If I am guest, opponent is host.
        const newOpponentName = (myRole === 'host') ? lobbyData.guest_name : lobbyData.host_name;
        const newOpponentPet = (myRole === 'host') ? lobbyData.guest_pet : lobbyData.host_pet;

        // Only update if we actually got a name. 
        // This "freezes" the last known name in memory when someone leaves.
        if (newOpponentName) {
            opponentName = newOpponentName;
            const oppLabel = document.getElementById('opponent-name-display');
            if (oppLabel) oppLabel.textContent = opponentName;
        }
        // Update Opponent Pet Image
        if (newOpponentPet) {
            updateMenuPet('opponent-multiplayer-pet', newOpponentPet);
        }
        // Opponent joined
        if (newStatus === 'ready' && myRole === 'host') {
            document.getElementById('host-controls').classList.remove('hidden');

        }

        // Start multiplayer game
        if (newStatus === 'active') {
            startMultiplayerGame();
        }

        // Rematch start logic (Rounds 2+)
        if (newStatus === 'playing') {
            // Everyone resets memory
            sessionStorage.removeItem('current_lobby_questions');
            preloadQueue = [];
            window.nextFetchIndex = 0;
            window.currentLobbyIndex = 0;

            // Everyone saves the new IDs from the database payload
            if (payload.new.question_ids) {
                sessionStorage.setItem('current_lobby_questions', JSON.stringify(payload.new.question_ids));
            }
            // Sync the Start Time exactly to the Host's calculated time
            if (payload.new.game_start_time) {
                gameStartTime = Number(payload.new.game_start_time);
                sessionStorage.setItem('game_start_time', gameStartTime.toString());
            }
            // Everyone launches at the exact same time
            startMultiplayerGame();
        }

        if (newStatus === 'closed' && myRole === 'guest') {
            // If the Guest is currently in a match, ignore the 'closed' database signal.
            // They will leave on their own terms when they click the Main Menu button.
            if (isMultiplayerMode) {
                // Update the Main Menu Button Text
                const mainMenuBtn = document.querySelector('.main-menu-btn');
                if (mainMenuBtn) {
                    mainMenuBtn.textContent = `${opponentName || "Host"} left. Main Menu?`;
                }

                return;
            }
            // If I'm the Guest, I need to know the game is over
            if (isHandlingLobbyClose) return;
            isHandlingLobbyClose = true;
            showGoldAlert("The Host has closed the lobby.");
            // Clean up and go home
            leaveLobby();
            navigateTo('view-home');
        }
        // guest disconnected (Host sees 'waiting')
        if (newStatus === 'waiting' && myRole === 'host') {
            const endScreen = document.getElementById('end-screen');
            const isOnEndScreen = endScreen && !endScreen.classList.contains('hidden');

            // If Host is still looking at the post-game results
            if (isMultiplayerMode || isOnEndScreen) {
                const mainMenuBtn = document.querySelector('.main-menu-btn');
                if (mainMenuBtn) {
                    mainMenuBtn.textContent = `${opponentName || "Guest"} left. Main Menu?`;
                }

                // We stay on this screen so the Host can finish reading their stats
                return;
            }
        }

        if (myRole === 'host') {
            handleLobbyUpdate(lobbyData);
        }
    });


    lobbyChannel.on('broadcast', { event: 'next_question_trigger' }, (envelope) => {
        if (myRole === 'guest') {
            executeTransition(envelope.payload.nextIndex);
        }
    });

    lobbyChannel.on('broadcast', { event: 'rematch_ready' }, (envelope) => {
        const data = envelope.payload;
        if (data.user_id === userId) return; // Ignore my own broadcast

        opponentReadyForRematch = true;

        // IF I am the Host AND I have already clicked my own Play Again button
        if (myRole === 'host' && iAmReadyForRematch) {
            startNewRound();
        } else {
            // Change the button text so the Host knows the Guest is waiting
            const pBtn = document.getElementById('playAgainBtn');
            if (pBtn && !iAmReadyForRematch) {
                pBtn.innerHTML = `${opponentName || 'Opponent'} is ready! Play Again?`;
            }
        }
    });

    // Change the event name to match what your answer/timeout functions send
    lobbyChannel.on('broadcast', { event: 'player_answered' }, (envelope) => {
        const actualData = envelope.payload;
        // ensure we only process the other player's data
        if (actualData && actualData.user_id !== userId) {
            // update data
            opponentHasAnswered = true; // unlocks gate
            handleOpponentAction(actualData);
            handleMultiplayerTransition(); // trigger transition (checks syncAndProceed)
        }
    });

    lobbyChannel.on('broadcast', { event: 'game_over_sync' }, (envelope) => {
        const data = envelope.payload;
        if (data && data.user_id !== userId) {
            // Update local HP values to match the final state sent by the opponent
            // This ensures both players agree on who died
            opponentHP = data.final_myHP;
            myHP = data.final_opponentHP;

            // Mark the opponent as "answered" so syncAndProceed doesn't block
            opponentHasAnswered = true;

            // DO NOT call syncAndProceed(true) here if the Host hasn't answered.
            // Instead, just wait. When the Host finally answers or times out,
            // their own code will call syncAndProceed(), see that opponentHasAnswered is true,
            // and move to the end screen.
            if (iHaveAnswered) {
                syncAndProceed(true);
            }
        }
    });

    // Keep only the 'leave' presence listener (This handles crashes/closed tabs)
    lobbyChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (myRole == 'host') {
            const guestLeft = leftPresences.some(p => p.role === 'guest');
            if (guestLeft) {
                // This makes the 'Start' button vanish the moment they close their tab
                handleOpponentLeft();

                // Also wipe the DB so a new person can join
                const lobbyId = sessionStorage.getItem('current_lobby_id');
                supabase.from('live_lobbies')
                    .update({ guest_id: null, guest_name: null, status: 'waiting' })
                    .eq('id', lobbyId)
            }
        }
    });

    lobbyChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await lobbyChannel.track({
                user_id: userId,
                role: myRole,
                username: username,
                online_at: new Date().toISOString()
            });
        }
    });
}

function handleLobbyUpdate(lobby) {
    const startBtn = document.getElementById('btn-start-multiplayer');
    const statusEl = document.getElementById('lobbyStatus');

    // If guest_id exists, someone is in the slot
    if (lobby.guest_id) {
        opponentName = lobby.guest_name || "Opponent";

        if (startBtn) startBtn.classList.remove('hidden');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color: #4CAF50; font-weight: bold;">${opponentName} connected!</span>`;
        }
    } else {
        // If guest_id is null, the slot is empty
        opponentName = null;
        if (startBtn) startBtn.classList.add('hidden');
        if (statusEl) {
            statusEl.innerHTML = '<span class="loading-dots">Waiting for opponent to join</span>';
        }
    }
}

function handleOpponentLeft() {
    // Update Status Text
    const statusEl = document.getElementById('lobbyStatus');
    if (statusEl) {
        statusEl.innerHTML = `<span style="color: #ffb800;">Opponent disconnected. Waiting...</span>`;
    }

    // Hide Host Controls (The 'Start' button)
    const hostControls = document.getElementById('host-controls');
    if (hostControls) {
        hostControls.classList.add('hidden');
    }

    // Reset internal flags
    opponentReadyForRematch = false;
    iAmReadyForRematch = false;

    // Cleanup old game data
    sessionStorage.removeItem('current_lobby_questions');
    preloadQueue = [];
    window.nextFetchIndex = 0;
    sessionStorage.removeItem('game_start_time');
    gameStartTime = null;
}

async function startMultiplayerGame() {
    gameEnding = false;
    isSyncing = false;
    iHaveAnswered = false;
    isDailyMode = false;
    isWeeklyMode = false;
    isLiteMode = false;
    isMultiplayerMode = true;
    myHP = MAX_HP;
    opponentHP = MAX_HP;
    opponentHasAnswered = false;
    window.currentLobbyIndex = 0;
    window.nextFetchIndex = 0;
    preloadQueue = [];

    // Reset the score
    await supabase.rpc('start_new_game_session');
    // Tell the DB: "This is a new game, start my streak at 0"
    await supabase.rpc('reset_my_streak');
    const streakContainer = document.getElementById('dailyStreakContainer');
    if (streakContainer) {
        streakContainer.style.display = 'none';
    }
    // only set a new time if one doesn't already exist in sessionStorage
    // (This allows the Listener's synced time to stay "Locked In")
    if (!sessionStorage.getItem('game_start_time')) {
        gameStartTime = Date.now();
        sessionStorage.setItem('game_start_time', gameStartTime.toString());
    } else {
        gameStartTime = Number(sessionStorage.getItem('game_start_time'));
    }

    if (gameStarting) return;
    gameStarting = true;

    updateHPUI();

    try {
        await fetchNextLobbyQuestion(true);
        // Now that we have IDs from the DB, load the first one
        await loadQuestion(true);

        // image preparation
        // This prevents the "Black Screen" while an image is still loading
        if (currentQuestion && currentQuestion.question_image) {
            try {
                const img = currentQuestion._preloadedImg || new Image();
                if (!img.src) img.src = currentQuestion.question_image;
                await img.decode();
            } catch (e) { console.warn("Image decode failed:", e); }
        }

        requestAnimationFrame(() => {
            // Hide all viewes
            // This ensures no other screen (Lobby, Leaderboard, etc.) is blocking the view
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

            // show the home view
            const homeView = document.getElementById('view-home');
            if (homeView) {
                homeView.classList.remove('hidden');
                homeView.style.display = 'flex';
            }
            const lobbyView = document.getElementById('view-lobby');
            if (lobbyView) {
                lobbyView.classList.add('hidden');
            }
            // clean up home screen
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

            // show the game
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

            preloadNextQuestions(5);
            startTimer();

            // Reset HP Bars
            document.getElementById('my-hp-fill').style.width = '100%';
            document.getElementById('opponent-hp-fill').style.width = '100%';
            document.getElementById('my-hp-text').textContent = `${MAX_HP}/${MAX_HP}`;
            document.getElementById('opponent-hp-text').textContent = `${MAX_HP}/${MAX_HP}`;

            gameStarting = false;
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

    // Sync their HP (Force your screen to match their actual HP)
    if (payload.hp_remaining !== undefined) {
        opponentHP = payload.hp_remaining;
    }

    // trigger the hitsplat on them
    // If they sent damage_taken: 0, it shows a Blue 0 on their side.
    // If they sent damage_taken: 20, it shows a Red 20 on their side.
    if (payload.damage_taken !== undefined) {
        triggerHitsplat('opponent', payload.damage_taken);
    }

    updateHPUI();
    if (iHaveAnswered) {
        clearTimeout(window.multiplayerSyncTimer);
        window.multiplayerSyncTimer = setTimeout(() => {
            syncAndProceed();
        }, 1000);
    }
}

function triggerHitsplat(target, damage = 20) {
    // Find the parent container (the HP bar area)
    const containerId = target === 'my' ? 'my-hp-group' : 'opponent-hp-group';
    const container = document.getElementById(containerId);
    if (!container) return;

    // Create a new hitsplat element
    const splat = document.createElement('div');
    splat.textContent = damage;

    // Apply classes based on damage
    splat.className = 'hitsplat show-splat';
    if (damage === 0) {
        splat.classList.add('miss'); // Blue
    } else {
        splat.classList.add('hit');  // Red
    }

    // Add to the game world
    container.appendChild(splat);

    // Cleanup after animation finishes (1 second)
    setTimeout(() => {
        splat.remove();
    }, 1000);
}

function handleMultiplayerTransition() {
    if (iHaveAnswered && !opponentHasAnswered && timeLeft > 0) {
        return;
    }

    // If we reach here, it means either:
    // 1. Both have answered.
    // 2. The timer hit 0 (someone timed out).
    // 3. Someone died (HP <= 0).

    clearTimeout(window.multiplayerSyncTimer);
    window.multiplayerSyncTimer = setTimeout(() => {
        syncAndProceed(false);
    }, 1000); // 1 second buffer for visual splats to play
}


async function syncAndProceed(force = false) {
    clearTimeout(window.forceEndTimeout);
    console.log("Sync Check:", { iHaveAnswered, opponentHasAnswered, force });
    // We only proceed if force is true (emergency/timeout) OR both players have answered. 
    if (!force && (!iHaveAnswered || !opponentHasAnswered)) {
        console.log("Sync Gate: Blocked - Waiting for other player.");
        return;
    }

    // Prevent double-execution
    if (isSyncing) return;
    isSyncing = true;

    // Ensure the old clock is DEAD before Q2 starts
    clearInterval(timer);

    // Determine if the game is over based on HP
    const isGameOver = (myHP <= 0 || opponentHP <= 0);
    if (isGameOver) {
        // Final Result Logic (Prioritizing the Draw)
        let result = 'win';
        if (myHP <= 0 && opponentHP <= 0) {
            result = 'draw';
        } else if (myHP <= 0) {
            result = 'lose';
        }

        // check for a flawless victory (win with full HP)
        const wasFlawless = (result === 'win' && myHP === MAX_HP);

        // Tell the other player the game is officially over
        // This ensures if the Guest dies, the Host gets the message to stop waiting.
        if (lobbyChannel) {
            lobbyChannel.send({
                type: 'broadcast',
                event: 'game_over_sync',
                payload: {
                    user_id: userId,
                    final_myHP: myHP,
                    final_opponentHP: opponentHP
                }
            });
        }

        // Give the user 800ms to actually see the "Wrong" splat and highlight
        setTimeout(async () => {
            isSyncing = false;
            // Pass the result and the flawless flag to your endGame function
            await endGame(result, wasFlawless);
        }, 800);
        return;
    }

    // The synced transition to the next question
    if (myRole === 'host') {
        const nextIndex = window.currentLobbyIndex + 1;

        // Wait 1 second before telling the Guest to move.
        // This gives the Guest time to see their hitsplat if they were last.
        setTimeout(() => {
            if (lobbyChannel) {
                lobbyChannel.send({
                    type: 'broadcast',
                    event: 'next_question_trigger',
                    payload: { nextIndex: nextIndex }
                });
            }
            executeTransition(nextIndex);
        }, 1200);
    }
}

async function executeTransition(newIndex) {
    clearInterval(timer); // Kill the old timer immediately
    // Clear flags for the new question
    opponentHasAnswered = false;
    iHaveAnswered = false;
    window.currentLobbyIndex = newIndex;

    const roundsDisplay = document.getElementById('rounds-display');
    if (roundsDisplay) {
        roundsDisplay.textContent = `Round: ${window.currentLobbyIndex + 1}`;
    }

    await loadQuestion();

    // refill & restart
    setTimeout(() => {
        isSyncing = false;
        if (isMultiplayerMode) preloadNextQuestions(5);
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

        const { data: summary, error: error } = await supabase.rpc('get_daily_summary', {
            t: new Date().getTime()
        });

        if (error) {
            console.error("Error fetching daily summary:", error);
            return;
        }

        // UI sync: Daily Play Button
        if (summary.has_played) {
            lockDailyButton();
        } else {
            dailyBtn.classList.add('is-active');
            dailyBtn.classList.remove('is-disabled');
            dailyBtn.style.pointerEvents = 'auto';
            dailyBtn.style.opacity = '1';
        }

        // UI sync: Share Button
        if (summary.can_share) {
            shareBtn.classList.remove('is-disabled');
            shareBtn.classList.add('is-active');
            shareBtn.style.pointerEvents = "auto";
            shareBtn.style.opacity = "1";

            // current date in UTC
            const currentUtcStr = new Date().toISOString().split('T')[0];

            // Save only score and date for the share logic
            localStorage.setItem('lastDailyScore', summary.score);
            localStorage.setItem('dailyPlayedDate', currentUtcStr);
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
    // Immediately sync the daily button
    lockDailyButton();


    // Set up the listener for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        // Run the async logic in the background without making the listener wait
        (async () => {
            if (['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESH_FAILED'].includes(event)) {
                await handleAuthChange(event, session);
            }

            if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') {
                resetCollectionUI();
            }
        })();

        return; // Immediately exit the listener so the channel stays "clean"
    });

    try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            if (localStorage.getItem('cachedUsername')) {
                // If there's an error fetching the session, it's usually an expired token
                showGoldAlert("Session expired. Please log in again.");
            }
            await handleAuthChange('SIGNED_OUT', null);
        }
        // Run the UI sync once
        else if (session) {
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
    } catch (err) {
        // getSession() itself crashed
        if (localStorage.getItem('cachedUsername')) {
            showGoldAlert("Session expired. Please log in again.");
        }
        await handleAuthChange('SIGNED_OUT', null);
    }

    // Auth Button (Log In / Log Out)
    authBtn.addEventListener('click', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            localStorage.setItem('manual_logout', 'true');
            await supabase.auth.signOut();

            // Specifically remove the profile-related caches
            localStorage.removeItem('cached_xp');
            localStorage.removeItem('cached_level');
            localStorage.removeItem('cachedUsername');
            localStorage.removeItem('lastDailyScore');
            localStorage.removeItem('dailyPlayedDate');
            localStorage.removeItem('equipped_pet_id');

            // Remove Supabase tokens
            Object.keys(localStorage).forEach(key => {
                if (key.includes('supabase.auth.token')) {
                    localStorage.removeItem(key);
                }
            });

            // Reset the global variable so the UI doesn't flicker before reload
            currentProfileXp = 0;
            currentLevel = 1;

        } else {
            navigateTo('view-login');
        }
    });

    // Game Buttons
    // Normal Mode button
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

    // Lite Mode button
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

    // Daily Mode button
    if (dailyBtn) {
        dailyBtn.onclick = async () => {
            // Instant Audio & Session Check
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

            // Play Status Check via get_daily_summary
            const { data: summary, error: rpcError } = await supabase.rpc('get_daily_summary', {
                t: new Date().getTime()
            });

            if (rpcError) {
                console.error("RPC Check failed:", rpcError);
                return;
            }

            // exit if they already played today
            if (summary.has_played) {
                showGoldAlert(`You've already completed today's challenge! Your score: ${summary.score}`);
                lockDailyButton(); // Ensure the UI reflects they are done
                return;
            }

            // Broadcast and Lock UI
            if (syncChannel) {
                syncChannel.send({
                    type: 'broadcast',
                    event: 'lock-daily',
                    payload: { userId: session.user.id }
                });
            }

            loadSounds();

            // Start Challenge immediately
            await startDailyChallenge(session);
            lockDailyButton();
        };
    }

    // Weekly Mode button
    if (weeklyBtn) {
        weeklyBtn.onclick = async () => {
            // Audio setup
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            loadSounds();
            try {
                // Start Weekly Mode
                await startWeeklyChallenge();
            } catch (err) {
                console.error("Failed to start weekly mode:", err);
                // Fallback UI
                document.getElementById('start-screen').classList.add('hidden');
                game.classList.remove('hidden');
            }
        };
    }

    // Multiplayer Mode button
    if (multiplayerBtn) {
        multiplayerBtn.onclick = async () => {
            // Safety check if the user is logged in.
            if (!userId) {
                showGoldAlert("You must be logged in to access Multiplayer Duels.");
                return;
            }
            // Navigate to the main lobby menu view
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

    // Multiplayer Mode -> Create New Lobby button
    if (lobbyBtn) {
        lobbyBtn.addEventListener('click', async () => {
            try {
                const myCurrentPet = localStorage.getItem('equipped_pet_id');
                // Create the lobby
                const { data, error } = await supabase
                    .from('live_lobbies')
                    .insert([{
                        status: 'waiting',
                        host_id: userId,  // From your auth/session
                        host_name: username, // Your local username variable
                        host_pet: myCurrentPet
                    }])
                    .select('*') // Get everything (id, code, question_ids)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    // Setup Role and Storage
                    myRole = 'host'; // Global variable to identify player

                    sessionStorage.setItem('is_host', 'true');
                    sessionStorage.setItem('current_lobby_id', data.id);
                    sessionStorage.setItem('current_lobby_questions', JSON.stringify(data.question_ids));

                    // Update UI
                    document.getElementById('lobbyCodeDisplay').textContent = data.code;

                    // Reset UI state (ensure start button is hidden until someone joins)
                    document.getElementById('host-controls').classList.add('hidden');
                    document.getElementById('lobbyStatus').innerHTML = '<span class="loading-dots">Waiting for opponent to join</span>';

                    // This opens the "Broadcast" channel for the Start signal
                    subscribeToLobby(data.code, data.id);
                }

                // Navigate to the Lobby view where the host waits for a guest to join
                window.navigateTo('view-lobby');

            } catch (err) {
                console.error("Error creating lobby:", err.message);
            }
        });
    }

    // Multiplayer Mode -> Create New Lobby button -> Start Duel button
    document.getElementById('btn-start-multiplayer').addEventListener('click', async () => {
        const lobbyId = sessionStorage.getItem('current_lobby_id');
        if (!lobbyId || !lobbyChannel) return;

        try {
            const startTime = Date.now() + 1500;

            const { data, error } = await supabase
                .from('live_lobbies')
                .update({
                    status: 'active',
                    game_start_time: startTime
                })
                .eq('id', lobbyId)
                .not('guest_id', 'is', null) // Safety: Don't update if guest_id is null
                .select();

            // If 'data' is empty, the update affected 0 rows because the guest is gone.
            if (error || !data || data.length === 0) {
                showGoldAlert("Opponent has left the lobby.");
                handleOpponentLeft();
                return;
            }

            // Only if we get here does the Host start their local game logic
            sessionStorage.setItem('game_start_time', startTime.toString());
            gameStartTime = startTime;

        } catch (err) {
            console.error("Start failed:", err.message);
        }
    });

    // Copy code button in Multiplayer Mode
    if (copyCodeBtn) {
        copyCodeBtn.onclick = () => {
            const textToCopy = document.getElementById('lobbyCodeDisplay').textContent;

            // Modern Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    updateBtnText(copyCodeBtn);
                }).catch(err => {
                    console.error("Clipboard API failed, trying fallback", err);
                    fallbackCopy(textToCopy, copyCodeBtn);
                });
            } else {
                // Fallback for non-HTTPS or older browsers
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

    // Play Again button on end screen
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
                // Reset local ready states
                iAmReadyForRematch = true;
                // Wipe the old game data
                preloadQueue = [];
                window.nextFetchIndex = 0;
                sessionStorage.removeItem('current_lobby_questions');

                // UI Feedback
                const pBtn = document.getElementById('playAgainBtn');
                if (pBtn) {
                    pBtn.disabled = true; // Disable so they don't spam it while waiting
                    pBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Waiting for ${opponentName || 'Opponent'}...`;
                }

                // Broadcast to the other player
                if (lobbyChannel) {
                    lobbyChannel.send({
                        type: 'broadcast',
                        event: 'rematch_ready',
                        payload: { user_id: userId }
                    });
                }

                // Host Logic
                if (myRole === 'host' && opponentReadyForRematch) {
                    startNewRound();
                }

                return; // Stop here so we DON'T hit the solo startGame() below
            }

            // for normal mode
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

    // Join Lobby button inside "Enter Code" screen
    document.getElementById('btn-confirm-join').addEventListener('click', async () => {
        const inputCode = document.getElementById('join-code-input').value.toUpperCase().trim();

        if (inputCode.length !== 6) {
            showGoldAlert("Please enter a 6-digit code.");
            return;
        }

        // Ensure username exists
        const activeUsername = username || "Guest_" + Math.floor(Math.random() * 1000);

        try {
            resetGameEngine();
            // Look for the lobby
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from('live_lobbies')
                .select('*')
                .eq('code', inputCode)
                .eq('status', 'waiting')
                .gt('created_at', twentyFourHoursAgo)
                .maybeSingle();

            if (error || !data) {
                showGoldAlert("Lobby not found or already full.");
                return;
            }

            // the guest assignment
            myRole = 'guest'; // Now this global variable is set
            sessionStorage.setItem('is_host', 'false');
            sessionStorage.setItem('current_lobby_id', data.id);
            sessionStorage.setItem('current_lobby_questions', JSON.stringify(data.question_ids));

            // Set the Host's name on YOUR screen immediately
            const oppLabel = document.getElementById('opponent-name-display');
            if (oppLabel) oppLabel.textContent = data.host_name || "Host";

            // Show Host's pet on Guest's screen
            if (data.host_pet) {
                updateMenuPet('opponent-multiplayer-pet', data.host_pet);
            }

            // Update the DB with your own pet so the Host can see it
            const myCurrentPet = localStorage.getItem('equipped_pet_id');

            // Update the DB so the Host's "Start" button appears
            await supabase
                .from('live_lobbies')
                .update({
                    status: 'ready',
                    guest_id: userId,
                    guest_name: activeUsername, // The Guest's name
                    guest_pet: myCurrentPet
                })
                .eq('id', data.id);

            // Start listening for the "Start Game" signal from the Host
            await subscribeToLobby(data.code, data.id);

            // UI Updates
            document.getElementById('lobbyCodeDisplay').textContent = data.code;
            // Hide host-specific controls just in case
            const hostControls = document.getElementById('host-controls');
            if (hostControls) hostControls.classList.add('hidden');
            document.getElementById('lobbyStatus').innerHTML = '<span style="color: #4CAF50;">Connected! Waiting for host to start...</span>';
            // go to Lobby view where the Guest waits for the Host to start the game
            window.navigateTo('view-lobby');

        } catch (err) {
            console.error("Join Error:", err.message);
            showGoldAlert("An error occurred while trying to join.");
        }
    });

    // Main Menu buttons
    if (mainMenuBtns) {
        mainMenuBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const lobbyId = sessionStorage.getItem('current_lobby_id');

                // Check for the ID directly
                if (lobbyId) {
                    await leaveLobby();
                }
                preloadQueue = [];
                resetGame();

                // reset the join code input
                const joinInput = document.getElementById('join-code-input');
                if (joinInput) {
                    joinInput.value = ''; // Clears the text
                }
                const streakContainer = document.getElementById('dailyStreakContainer');
                if (streakContainer) {
                    streakContainer.style.display = 'none';
                }
                if (playAgainBtn) playAgainBtn.classList.remove('hidden');

                // hide the game-over screen and navigate to home 
                document.getElementById('end-screen').classList.add('hidden');
                navigateTo('view-home');
            });
        });
    }
    // if clicked main menu button while in a lobby, it will trigger leave lobby logic before going back to the home screen
    if (lobbymainMenu) {
        lobbymainMenu.onclick = async () => {
            await leaveLobby();
            navigateTo('view-home');
        };
    }
    // Mute button logic (Persists across all views and modes)
    if (muteBtn) {
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
            // If user unmutes, check if we are in the final 3 seconds
            // and make sure it's not already playing
            if (timeLeft <= 5 && timeLeft > 0 && !activeTickSource) {
                activeTickSource = playSound(tickBuffer, true);
            }
        };
    }
    // Leaderboard button in the main menu
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

async function handleAuthChange(event, session) {
    const span = document.querySelector('#usernameSpan');
    const label = authBtn?.querySelector('.btn-label');

    // Ensure the auth button is always active so guests can actually click "Log In"
    if (authBtn) {
        authBtn.style.opacity = '1';
        authBtn.style.pointerEvents = 'auto';
        authBtn.classList.remove('is-disabled');
    }

    // Logged Out State
    if (!session) {
        // only wipe if the user actually clicked Log Out
        const wasManual = localStorage.getItem('manual_logout');
        // If we are signed out, but it wasn't manual and we had a user before, it's likely a session expiration "Kick" rather than a "Logout"
        const hadUser = localStorage.getItem('cachedUsername');
        userId = null;
        // Detect if this was a "Kick" vs a "Logout"
        if (!wasManual && hadUser && event !== 'INITIAL_LOAD') {
            showGoldAlert("Your session has expired. Please log in again.");
        }
        // Only wipe if we are certain this is an intentional logout
        // and not just a slow connection.
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') {
            localStorage.removeItem('manual_logout');
            localStorage.removeItem('cached_xp');
            localStorage.removeItem('cached_level');
            localStorage.removeItem('equipped_pet_id');
            localStorage.removeItem('cachedUsername');
            if (wasManual) {
                // Clear all session-specific UI and storage
                localStorage.removeItem('lastDailyScore');
                localStorage.removeItem('dailyPlayedDate');
                localStorage.removeItem('cached_xp');
                localStorage.removeItem('cachedUsername');
                localStorage.removeItem('cached_level');
            }
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
    // Handle logged in state
    userId = session.user.id;
    // Immediately sync with local cache so we don't overwrite the HTML script's work
    username = localStorage.getItem('cachedUsername') || 'Player';
    currentProfileXp = parseInt(localStorage.getItem('cached_xp')) || 0;
    currentLevel = parseInt(localStorage.getItem('cached_level')) || 1;

    // Update the UI with the cached values right now
    if (span) span.textContent = ' ' + username;
    if (label) label.textContent = 'Log Out';
    updateLevelUI();
    loadCollection();

    // Logged In State
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
                liveStats.current_daily_streak = profile.achievements?.daily_streak || 0;
                // Save to cache
                localStorage.setItem('cached_level', currentLevel);
                localStorage.setItem('cachedUsername', username);
                localStorage.setItem('cached_xp', currentProfileXp);

                // UI Update
                if (span) span.textContent = ' ' + username;
                if (label) label.textContent = 'Log Out';
                updateLevelUI();
            }
        }
    } catch (err) {
        console.error("Profile fetch failed:", err);
    }
    // enable the Log Button for users
    if (logBtn) {
        logBtn.onclick = () => {
            // Add the class to trigger the CSS "Shine"
            logBtn.classList.add('tapped');

            // Remove it after a short delay to create the "linger" effect
            setTimeout(() => {
                logBtn.classList.remove('tapped');
            }, 300); // 300ms delay

            navigateTo('view-collections');
        };
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


function resetGame() {
    // Stop any active logic
    clearInterval(timer);
    stopTickSound();
    document.querySelectorAll('.firework-particle').forEach(p => p.remove());

    // Reset numerical state
    score = 0;
    currentQuestion = null;
    weeklyQuestionCount = 0;
    liteQuestionCount = 0;
    dailyQuestionCount = 0;
    seenMilestones.clear();

    // Reset Timer Visuals
    timeLeft = 15;
    if (timeDisplay) timeDisplay.textContent = timeLeft;
    if (timeWrap) timeWrap.classList.remove('red-timer');

    document.getElementById('dailyEndNote').classList.add('hidden');

    const gzTitle = document.getElementById('gz-title');
    if (gzTitle) gzTitle.classList.add('hidden');
    document.getElementById('multiplayer-header').classList.add('hidden');

    const scoreRow = document.getElementById('end-score-container');
    const multiRow = document.getElementById('multiplayer-stats-container');
    if (scoreRow) scoreRow.classList.remove('hidden');
    if (multiRow) multiRow.classList.add('hidden');
    document.getElementById('score').classList.remove('hidden');
    document.getElementById('rounds-display').classList.add('hidden');
    const pBtn = document.getElementById('playAgainBtn');
    if (pBtn) {
        pBtn.disabled = false; // enable
        pBtn.innerHTML = 'Play Again';
    }
    const mainMenuBtn = document.querySelector('.main-menu-btn');
    if (mainMenuBtn) {
        mainMenuBtn.textContent = 'Main Menu';
    }
}


async function preloadNextQuestions(targetCount = 6) {
    // exit early for Batch Modes
    if (isDailyMode || isWeeklyMode) return;

    const needed = targetCount - preloadQueue.length;
    if (needed <= 0) return;

    // Multiplayer parallel logic
    if (isMultiplayerMode) {
        let fetchPromises = [];
        for (let i = 0; i < needed; i++) {
            // We call the function multiple times in parallel
            fetchPromises.push(fetchNextLobbyQuestion());
        }

        // Wait for all to finish. results will be [Q1, Q2, Q3...] in order
        const results = await Promise.all(fetchPromises);

        // Push to queue in the exact order of the results array
        results.forEach(qData => {
            if (qData) preloadQueue.push(qData);
        });
        return;
    }

    // solo mode logic
    const activePool = normalSessionPool;
    if (!activePool || activePool.length === 0) return;

    const queuedIds = preloadQueue.map(q => String(q.id));
    const availableIds = activePool.filter(poolId => {
        const sId = String(poolId);
        return !queuedIds.includes(sId) &&
            !usedInThisSession.includes(sId) &&
            !pendingIds.includes(sId) &&
            (currentQuestion ? String(currentQuestion.id) !== sId : true);
    });

    if (availableIds.length === 0) return;

    const toFetch = availableIds.slice(0, needed);

    toFetch.forEach(id => {
        const sId = String(id);
        if (!pendingIds.includes(sId)) pendingIds.push(sId);
        if (!usedInThisSession.includes(sId)) usedInThisSession.push(sId);
    });

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

            // decompress the image in the background thread.
            try {
                await img.decode();
                questionData._preloadedImg = img;
            } catch (e) {
                console.warn("Image decode failed in background", e);
            }

            preloadQueue.push(questionData);
        } else if (questionData) {
            preloadQueue.push(questionData);
        }
    } catch (err) {
        console.error("Fetch worker failed:", err);
    } finally {
        pendingIds = pendingIds.filter(id => id !== assignedId.toString());
    }
}

// Fetch a specific ID (Deterministic)
async function fetchDeterministicQuestion(qId) {
    const { data, error } = await supabase.rpc('get_question_by_id', { input_id: qId });
    return (!error && data?.[0]) ? data[0] : null;
}

// Start Normal Mode Game
async function startGame() {
    if (gameStarting) return;
    gameStarting = true;
    gameEnding = false;
    isDailyMode = false;
    isMultiplayerMode = false;
    isWeeklyMode = false;

    pendingIds = [];
    usedInThisSession = [];
    normalSessionPool = [];

    // Reset the score
    await supabase.rpc('start_new_game_session');

    // Identify what is already waiting in the queue so we don't pick them again
    const alreadyBufferedIds = preloadQueue.map(q => Number(q.id));

    // Create the full pool
    let fullPool = Array.from({ length: number_of_questions }, (_, i) => i + 1);

    // Remove IDs that are already in the preloadQueue
    let availableToShuffle = fullPool.filter(id => !alreadyBufferedIds.includes(id));

    // Shuffle only the available remainder (Fisher-Yates)
    for (let i = availableToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableToShuffle[i], availableToShuffle[j]] = [availableToShuffle[j], availableToShuffle[i]];
    }

    // Build the final session pool: [Existing Queue IDs] + [Shuffled Others]
    usedInThisSession = [...alreadyBufferedIds.map(id => String(id))];
    normalSessionPool = availableToShuffle;

    // If Lite Mode is active, truncate the pool to exactly 100 questions
    if (isLiteMode) {
        // In Lite Mode, we only want 100 total. 
        // We take (100 - already buffered) from the shuffled pool.
        const neededForLite = Math.max(0, 100 - alreadyBufferedIds.length);
        normalSessionPool = normalSessionPool.slice(0, neededForLite);
    }

    // internal state reset
    clearInterval(timer);
    score = 0;
    // Tell the DB: "This is a new game, start my streak at 0"
    await supabase.rpc('reset_my_streak');
    dailyQuestionCount = 0;
    liteQuestionCount = 0;
    currentQuestion = null;
    updateScore();
    resetGame();
    // Only clear if we have nothing. If we have items, the game starts instantly.
    if (preloadQueue.length === 0) {
        await preloadNextQuestions(1);
    }

    await loadQuestion(true);

    // wait for the image to be ready for display
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
        if (timeDisplay) timeDisplay.textContent = 15;

        // Swap screens. User finally sees the game
        document.body.classList.add('game-active');
        game.classList.remove('hidden');
        document.getElementById('start-screen').classList.add('hidden');
        endScreen.classList.add('hidden');

        gameStartTime = Date.now();
        startTimer(); // Start the clock
        // Start immediately for Solo, fill question in the background, while the user is playing.
        preloadNextQuestions(8);
        gameStarting = false;
    });
}

async function loadQuestion(isFirst = false) {
    if (gameEnding) return;
    // force UI cleanup
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => {
        btn.classList.remove('correct', 'wrong', 'selected');
        btn.disabled = false;
        // This ensures the transition starts from a clean dark background
        btn.style.backgroundColor = "";
    });

    // Reset internal state for the new question
    iHaveAnswered = false;
    opponentHasAnswered = false;

    // Multiplayer End Checks (Before we do anything else, check if the game should end)
    if (isMultiplayerMode) {
        // Someone died or we ran out of lobby questions
        if (myHP <= 0 || opponentHP <= 0 || (preloadQueue.length === 0 && !isFirst)) {
            // Determine result for endGame
            const result = myHP <= 0 ? (opponentHP <= 0 ? 'draw' : 'lose') : 'win';
            await endGame(result);
            return;
        }
    }
    // conditional cleanup
    if (!isFirst) {
        document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
        if (questionImage) questionImage.style.opacity = '0';
    }

    // refill the buffer
    let needsRefill = !isDailyMode && !isWeeklyMode;

    // only refill if we are NOT in Daily Mode
    if (!isMultiplayerMode && !isFirst && preloadQueue.length <= 4) {
        if (needsRefill) {
            preloadNextQuestions(8);
        }
    }

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

    // populate data (Now guaranteed to have data)
    currentQuestion = preloadQueue.shift();

    // Safety check just in case DB returned null
    if (!currentQuestion) {
        return;
    }

    questionText.textContent = currentQuestion.question;

    // render answers
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

    // image handling
    if (currentQuestion.question_image) {
        // Use the already decoded image if it exists
        if (currentQuestion._preloadedImg) {
            questionImage.src = currentQuestion._preloadedImg.src;
            questionImage.style.display = 'block';
            questionImage.style.opacity = '1';
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

    // Multiplayer specific reset and refill logic
    if (isMultiplayerMode) {
        iHaveAnswered = false;
        opponentHasAnswered = false;
        isSyncing = false;

        // Multiplayer refill happens AFTER the UI is updated
        if (!isFirst && preloadQueue.length <= 4) {
            preloadNextQuestions(5);
        }
    }

    // start timer
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

        // round end logic
        if (timeLeft <= 0) {
            clearInterval(timer); // Stop the interval immediately
            if (isMultiplayerMode) {
                if (iHaveAnswered) {
                    // syncAndProceed is handling the transition.
                    return;
                }
                // Only trigger the damage/timeout if I haven't answered
                handleMultiplayerTimeout();
            } else {
                // Solo modes timeout logic
                handleTimeout();
            }
        }
    }, 1000);
}

async function handleTimeout() {
    stopTickSound();
    // Disable buttons so user can't click after time is up
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    // Send to checkAnswer as a "Wrong answer"
    await checkAnswer(null, null);
}

async function checkAnswer(choiceId, btn) {
    stopTickSound();
    //if (timeLeft <= 0) return;
    // Only stop the timer if we are not in multiplayer.
    // In Multiplayer, we want to see it run down to 0 for the opponent.
    if (!isMultiplayerMode) {
        clearInterval(timer);
    }
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

    // Track state for the sync
    if (isWeeklyMode) weeklyQuestionCount++;
    if (isDailyMode) dailyQuestionCount++;
    if (isLiteMode) liteQuestionCount++;
    // 2. Determine the active count to send to the database
    const activeCount = isDailyMode ? dailyQuestionCount 
                  : isWeeklyMode ? weeklyQuestionCount 
                  : isLiteMode ? liteQuestionCount 
                  : 0;
    // call RPC process answer
    const { data: res, error: rpcErr } = await supabase.rpc('process_answer_test', {
        input_id: Number(currentQuestion.id), // Ensure it's an integer
        choice: Number(choiceId),             // Ensure it's an integer
        is_daily: Boolean(isDailyMode),       // Ensure it's a boolean
        is_weekly: Boolean(isWeeklyMode),
        is_lite: Boolean(isLiteMode),
        is_multiplayer: Boolean(isMultiplayerMode),
        current_count: activeCount,
        daily_limit: DAILY_LIMIT,
        p_time_ms: Math.floor(Date.now() - gameStartTime) // Pass time for PB tracking
    });

    if (rpcErr) return console.error("RPC Error:", rpcErr);

    // local damage & hitsplat logic
    if (isMultiplayerMode) {
        iHaveAnswered = true;
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

    // Multiplayer broadcast logic (This goes before the UI updates so the opponent sees it in real-time)
    if (isMultiplayerMode) {
        lobbyChannel.send({
            type: 'broadcast',
            event: 'player_answered',
            payload: {
                user_id: userId,
                playerRole: myRole,
                correct: res.correct,
                hp_remaining: myHP,
                damage_taken: res.correct ? 0 : 20
            }
        });

        // safety timeout
        // If I've answered but the opponent hasn't, start a 20s fallback
        if (iHaveAnswered && !opponentHasAnswered) {
            clearTimeout(window.forceEndTimeout);
            window.forceEndTimeout = setTimeout(() => {
                // Double check they still haven't answered before forcing
                if (!opponentHasAnswered) {
                    //console.warn("Opponent AFK. Forcing sync...");
                    syncAndProceed(true); // 'true' bypasses the wait
                }
            }, 15000);
        }

        handleMultiplayerTransition();
    }

    if (res.correct) {
        playSound(correctBuffer);
        btn.classList.add('correct');
        score++;
        updateScore();
        // Users
        if (userId) {
            const xpData = res.xp_info;
            // Check if xpData exists AND it's not null (Make sure user isn't a Guest)
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
                    showNotification(`LEVEL UP!`, levelUpBuffer, "#ffde00");

                    // Milestone notifications
                    if (xpData.new_level >= 10 && xpData.old_level < 10) showAchievementNotification("Reach Level 10");
                    if (xpData.new_level >= 50 && xpData.old_level < 50) showAchievementNotification("Reach Level 50");
                    if (xpData.new_level >= 92 && xpData.old_level < 92) showAchievementNotification("Reach Level 92");
                    if (xpData.new_level >= 99 && xpData.old_level < 99) showAchievementNotification("Reach Max Level");
                }
            }
            // Always sync the total count to local storage for the stats profile page
            if (res.total_correct !== undefined) {
                liveStats.total_correct = res.total_correct;
            }

            if (res.achievement_pop) {
                const milestoneText = res.achievement_pop === 1000
                    ? "Reach 1,000 Correct Answers"
                    : "Reach 10,000 Correct Answers";

                // Trigger notification and update local achievement list
                showAchievementNotification(milestoneText);
            }

            // Score Milestone Logic
            // This is only for Normal Mode
            if (res.milestone) {
                // Only show if we haven't seen this specific milestone text this session
                if (!seenMilestones.has(res.milestone)) {
                    showAchievementNotification(res.milestone);

                    // Add it to the "already seen" list
                    seenMilestones.add(res.milestone);
                }
            }

            // integrated pet logic
            const petData = res.pet_info;
            if (petData && petData.unlocked) {

                // Show the Pet Notification immediately
                showCollectionLogNotification(petData.pet_name);
                // Determine if an achievement needs to pop later
                let achievementName = null;

                // Achievement: Unlock 1 Pet
                if (petData.total_unlocked === 1) {
                    achievementName = "Unlock 1 Pet";
                }

                // Achievement: Unlock 8 Pets
                if (petData.total_unlocked === 10) {
                    achievementName = "Unlock 10 Pets";
                }

                // Achievement: Unlock all Pets
                if (petData.is_all_pets) {
                    achievementName = "Unlock all Pets";
                }

                // If there is an achievement, show it after a 2s delay
                if (achievementName) {
                    setTimeout(() => {
                        showAchievementNotification(achievementName);
                    }, 2000);
                }

                // Update LocalStorage Cache
                let currentCached = JSON.parse(localStorage.getItem('cached_pets') || "[]");
                if (!currentCached.includes(petData.pet_id)) {
                    currentCached.push(petData.pet_id);
                    localStorage.setItem('cached_pets', JSON.stringify(currentCached));
                }

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
                        // Filter only new achievements and apply a staggered delay
                        results.filter(r => r.is_new).forEach((r, index) => {
                            setTimeout(() => {
                                showAchievementNotification(r.display_name);
                            }, index * 1500); // 1.5 second delay between each achievement if multiple pop at once
                        });
                    }
                });
            }

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
                        results.filter(r => r.is_new).forEach((r, index) => {
                            // We add a slight offset (e.g., +1000ms) just in case an 
                            // instant notification is already firing.
                            setTimeout(() => {
                                showAchievementNotification(r.display_name);
                            }, (index * 1500) + 1000);
                        });
                    }
                });
            }
        }

    } else {
        // Wrong answer logic
        updateScore();
        playSound(wrongBuffer);
        if (btn) btn.classList.add('wrong');
        highlightCorrectAnswer();
        liveStats.total_wrong = liveStats.total_wrong + 1;
    }

     // multiplayer
        if (isMultiplayerMode) {
            setTimeout(() => {
                handleMultiplayerTransition();
            }, 1000);
        } else if (res.game_over) {
        // We simply pass the submission results (which include is_pb) to endGame
        setTimeout(() => {
            endGame(res.submit_result, false, res.daily_message); // Pass the final stats to endGame
        }, 1500);
        } else {
            // normal mode (always ends on wrong answer)
            setTimeout(loadQuestion, res.correct ? 1000 : 1300);
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

    const level = currentLevel || 1;
    const xp = currentProfileXp || 0;

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

// Notification for Level Ups and XP Bonuses
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

    // Only play if sound exists and it's a valid audio buffer
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

    // If more notifications are waiting, go fast (600ms).
    // If it's the last one, stay longer (1600ms) so the player can actually read it.
    const displayTime = notificationQueue.length > 0 ? 600 : 1600;

    setTimeout(() => {
        notif.classList.add('fade-out');

        setTimeout(() => {
            notif.remove();
            isShowingNotification = false;
            processQueue();
        }, 300);
    }, displayTime);
}

function createParticle(parent, xPosPercent, colors) {
    const p = document.createElement('div');
    p.className = 'firework-particle';

    // Get viewport coordinates
    const rect = parent.getBoundingClientRect();

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

async function endGame(result = null, wasFlawless = false, dailyMessage = null) {
    if (isMultiplayerMode && isEndGameProcessing) return;
    isEndGameProcessing = true;
    if (isMultiplayerMode && result) {
        gameEnding = false;
    } else if (gameEnding) {
        return;
    }

    if (isMultiplayerMode && !result) {
        //console.warn("Race condition blocked: Solo endGame tried to override MP result.");
        return;
    }

    gameEnding = true;

    clearInterval(timer);
    stopTickSound();

    // Calculate time for the current segment (Solo)
    const endTime = Date.now();

    // This covers all modes
    const totalMs = endTime - gameStartTime;

    // multiplayer result handling
    if (isMultiplayerMode && result) {
        // record the result in the database and get & show new achievements
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: newAchievements, error } = await supabase.rpc('record_match_result', {
                p_user_id: session.user.id,
                p_result: result, // 'win', 'lose', or 'draw'
                p_is_flawless: wasFlawless // flawless win
            });

            if (!error && newAchievements && newAchievements.length > 0) {
                newAchievements.forEach((row, index) => {
                    const task = ACHIEVEMENT_SCHEMA.flatMap(c => c.tasks).find(t => t.id === row.new_achievement_id);
                    if (task) {
                        // Add a small delay between notifications so they don't overlap
                        setTimeout(() => {
                            showAchievementNotification(task.text);
                        }, index * 1500);
                    }
                });
            }
        }

        const gameOverTitle = document.getElementById('game-over-title');
        const gzTitle = document.getElementById('gz-title');

        // Set the message according to multiplayer game result
        if (gzTitle) {
            gzTitle.classList.remove('hidden');
            if (result === 'win') {
                gzTitle.textContent = "Victory!";
                playSound(mpWinBuffer);
            } else if (result === 'draw') {
                gzTitle.textContent = "Draw!";
                playSound(mpDrawBuffer);
            } else {
                gzTitle.textContent = "Defeat!";
                playSound(mpLossBuffer);
            }
        }

        // set gameovertitle with dynamic opponent name and HP values
        if (gameOverTitle) {
            gameOverTitle.classList.remove('hidden');

            if (result === 'win') {

                gameOverTitle.innerHTML = `<span>You defeated <span>${opponentName || 'your opponent'}</span> with ${myHP} HP left!</span>`;
            }
            else if (result === 'lose') {
                gameOverTitle.innerHTML = `<span><span>${opponentName || 'Opponent'}</span> survived with ${opponentHP} HP.</span>`;
            }
            else {
                gameOverTitle.textContent = "A double knockout!";
            }
        }

        const startStr = sessionStorage.getItem('game_start_time');

        let finalDisplayTime = 0;
        if (startStr) {
            // Calculate the difference in milliseconds
            const sharedStart = parseInt(startStr);
            finalDisplayTime = endTime - sharedStart;
        } else {
            // Fallback if the session storage was missing
            finalDisplayTime = endTime - gameStartTime;
        }

        displayFinalTime(finalDisplayTime);
        // Hide Multiplayer Bars so they don't leak into end screen
        const mpHeader = document.getElementById('multiplayer-header');
        if (mpHeader) mpHeader.classList.add('hidden');

        // End Multiplayer Game and show end screen (This also handles the UI cleanup for multiplayer mode)
        finalizeEndScreen(window.currentLobbyIndex || 0);

        // Clean up Lobby specific flags
        iAmReadyForRematch = false;
        opponentReadyForRematch = false;

        // UI Cleanup
        const pBtn = document.getElementById('playAgainBtn');
        if (pBtn) {
            pBtn.disabled = false;
            pBtn.innerHTML = 'Play Again';
        }
        // Reset the lock after a delay (when they are safely on the end screen)
        setTimeout(() => {
            isEndGameProcessing = false;
        }, 2000);

        // Update the LocalStorage based on the match result
        if (result === 'win') {
            const wins = liveStats.multiplayer_wins || 0;
            liveStats.multiplayer_wins = wins + 1;
        } else if (result === 'lose') {
            const losses = liveStats.multiplayer_losses || 0;
            liveStats.multiplayer_losses = losses + 1;
        } else if (result === 'draw') {
            const draws = liveStats.multiplayer_draws || 0;
            liveStats.multiplayer_draws = draws + 1;
        }
        // Refresh the stats page in the background
        // This ensures that if the user clicks "Stats" after the game, the data is already there.
        await renderStats();

        return;
    }

    // prepare data first (Quietly in background)
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Determine the mode string for the RPC
        let mode = 'normal';
        if (isDailyMode) mode = 'daily';
        else if (isWeeklyMode) mode = 'weekly';
        else if (isLiteMode) mode = 'lite';

        // call check_game_achievements RPC to get the results
        const { data: results, error: achError } = await supabase.rpc('check_game_achievements', {
            p_mode: mode,
            p_score: score,
            p_time_ms: Math.floor(totalMs)
        });

        if (!achError && results && results.length > 0) {
            // Update LocalStorage from the DB
            const stats = results[0].current_stats;
            if (stats) {
                liveStats.max_daily_streak = stats.max_streak || 0;
                liveStats.daily_total = stats.daily_total || 0;
                liveStats.daily_perfect = stats.daily_perfect || false;
                liveStats.current_daily_streak = stats.daily_streak || 0;
            }

            // Show all earned achievement notifications (Staggered)
            // Filter first so we only count the 'new' ones for the delay index
            const newEarned = results.filter(res => res.is_new);

            newEarned.forEach((res, index) => {
                // Add a 1.5 second delay multiplied by the position in the list
                setTimeout(() => {
                    showAchievementNotification(res.display_name);
                }, index * 1500);
            });
        }
    }
    const streakContainer = document.getElementById('dailyStreakContainer');
    const streakCount = document.getElementById('streakCount');

    // reset weekly UI
    // hide immediately so it doesn't leak into Normal/Daily modes
    if (weeklyTimeContainer) weeklyTimeContainer.style.display = 'none';

    const finalScore = document.getElementById('finalScore');

    // populate end screen before showing it
    if (finalScore) {
        if (isLiteMode) {
            // This shows the 3/100 format only on the end screen
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
    // Save Score and Check for PB
    let isPB = result && result.is_pb;
    // Reset visibility of titles
    if (gameOverTitle) gameOverTitle.classList.add('hidden');
    if (gzTitle) gzTitle.classList.add('hidden');

    if (isWeeklyMode) {
        // UI Visibility resets
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        if (dailyStreakContainer) dailyStreakContainer.style.display = 'none';

        displayFinalTime(totalMs);

        // Update Titles
        if (gameOverTitle) {
            gameOverTitle.textContent = isPB ? "New PB achieved!" : "Weekly Mode Completed!";
            gameOverTitle.classList.remove('hidden');
        }
    } else if (isDailyMode) {
        if (playAgainBtn) playAgainBtn.classList.add('hidden');
        // Saves the score for the leaderboard
        displayFinalTime(totalMs);
        if (gameOverTitle) {
            // 1. Ensure we have a message, otherwise use a default OSRS-style fallback
            const message = dailyMessage || "Game Over!";
            if (isPB) {
                gameOverTitle.textContent = `${message}\nNew PB achieved!`;
            } else {
                gameOverTitle.textContent = message;
            }
            gameOverTitle.classList.remove('hidden');
        }

        document.getElementById('dailyEndNote').classList.remove('hidden');
        const currentUtcStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('lastDailyScoreDate', currentUtcStr);
        localStorage.setItem('lastDailyScore', score);
        localStorage.setItem('dailyPlayedDate', currentUtcStr);

        // Show the streak container
        if (streakContainer && streakCount) {
            streakContainer.style.display = 'block';
            streakCount.textContent = liveStats.current_daily_streak;
        }

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.classList.remove('is-disabled');
            shareBtn.style.filter = "sepia(1) saturate(2.2) hue-rotate(-18deg) brightness(0.85)";
            shareBtn.style.opacity = "1";
            shareBtn.style.pointerEvents = "auto";
        }

    } else {
        // Normal or Lite Modes
        if (streakContainer) streakContainer.style.display = 'none';
        if (playAgainBtn) playAgainBtn.classList.remove('hidden');
        displayFinalTime(totalMs);
        // Lite Mode Specific Logic
        if (isLiteMode) {
            if (gameOverTitle) {
                gameOverTitle.textContent = isPB ? "New PB achieved!" : "Lite Mode Completed!";
                gameOverTitle.classList.remove('hidden');
            }

        } else {
            // Trigger the high-score save
            if (isPB) {
                liveStats.maxScore = score;
            }
            // check if all questions were answered correctly in normal mode
            const isPerfectRun = score === number_of_questions;
            // Check for Gz! (Completion) first
            if (isPerfectRun) {
                // handle the gz title
                if (gzTitle) {
                    const gzMessages = ['You won!', 'Gz!', 'GG!', 'Victory!'];
                    const randomMessage = gzMessages[Math.floor(Math.random() * gzMessages.length)];
                    gzTitle.textContent = randomMessage;
                    gzTitle.classList.remove('hidden');
                }
                // Handle the PB/Status text under the Gz
                if (gameOverTitle) {
                    if (isPB) {
                        gameOverTitle.textContent = "New PB achieved!";
                        gameOverTitle.classList.remove('hidden');
                    } else {
                        // Hide if it's a perfect run but not a PB (keeps UI clean)
                        gameOverTitle.classList.add('hidden');
                        gameOverTitle.textContent = "";
                    }
                    // Otherwise, show standard Game Over, or PB achieved if its PB.
                }
            } else {
                // Standard Game Over (Failed/Partial run)
                if (gzTitle) gzTitle.classList.add('hidden'); // Ensure Gz is hidden
                if (gameOverTitle) {
                    gameOverTitle.textContent = isPB ? "New PB achieved!" : "Game Over!";
                    gameOverTitle.classList.remove('hidden');
                }
            }
        }
    }

    // swap to endscreen
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

    // push xp drop down if in multiplayer mode
    if (isMultiplayerMode) {
        xpDrop.style.setProperty('top', '110px', 'important');
    }

    // This ensures that as soon as the 1.2s animation is done, it is gone from the DOM
    xpDrop.onanimationend = () => {
        xpDrop.remove();
    };

    gameContainer.appendChild(xpDrop);

    // Fallback cleanup
    setTimeout(() => {
        if (xpDrop.parentNode) xpDrop.remove();
    }, 1300);
}

// Share button for daily mode
if (shareBtn) {
    shareBtn.onclick = async () => {
        // UI Feedback
        shareBtn.classList.add('tapped');
        setTimeout(() => shareBtn.classList.remove('tapped'), 300);

        // Auth Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showGoldAlert("Please log in to share your score!");
            return;
        }

        // fetch the edition number (Directly from DB Truth)
        const { data: dailyData, error: dailyErr } = await supabase.rpc('get_daily_questions');
        if (dailyErr || !dailyData || dailyData.length === 0) {
            console.error("Could not fetch daily edition for sharing");
            return;
        }
        const dailyEdition = dailyData[0].edition_number;

        // Get Data
        const currentScore = parseInt(localStorage.getItem('lastDailyScore') || "0");
        // Pull the streak we just saved in handleAuthChange
        const currentStreak = liveStats.current_daily_streak || "0";

        const currentUtcStr = new Date().toISOString().split('T')[0];

        // Build the Grid
        // fetch the real pattern from the DB 
        const { data: attemptData } = await supabase
            .from('daily_attempts')
            .select('grid_pattern')
            .match({ user_id: session.user.id, attempt_date: currentUtcStr })
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

        // Desktop Tooltip Logic
        if (window.matchMedia("(hover: hover)").matches) {
            const tooltip = document.createElement('div');
            tooltip.className = 'copy-tooltip';
            tooltip.innerText = 'Copied!';

            // Get the button's exact position on the screen
            const rect = shareBtn.getBoundingClientRect();

            // Place it relative to the viewport, not the button
            tooltip.style.position = 'fixed';
            tooltip.style.top = (rect.top - 30) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';

            document.body.appendChild(tooltip);

            setTimeout(() => tooltip.remove(), 500);
        }

        // Execution
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile && navigator.share) {
            try {
                await navigator.share({
                    title: 'OSRS Trivia',
                    text: shareText
                });
            } catch (err) {
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

    // Clear any existing timer so they don't overlap
    if (petNotificationTimeout) {
        clearTimeout(petNotificationTimeout);
    }
    // Reset the state immediately to restart animation
    modal.classList.remove('active');

    // Play sound
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
        'Tumeken\'s Guardian': 'tumekens_guardian.png',
        'Lil\' Zik': 'lil_zik.png',
        'TzRek-Zuk': 'zuk.png',
        'Beef': 'beef.png',
        'Nid': 'nid.png',
        'Callisto Cub': 'callisto_cub.png',
        'Baron': 'baron.png',
        'Little Nightmare': 'little_nightmare.png'
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

    // Dynamic Display Time (Mobile: 2s, PC: 6s)
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
    isMultiplayerMode = false;
    pendingIds = []
    preloadQueue = [];
    usedInThisSession = [];
    weeklyQuestionCount = 0;
    score = 0;
    updateScore();

    // Reset the score
    await supabase.rpc('start_new_game_session');

    // Tell the DB: "This is a new game, start my streak at 0"
    await supabase.rpc('reset_my_streak');

    // ensure the pool is ready (We only fetch the 50 IDs, not the full data)
    const { data, error } = await supabase.rpc('get_weekly_questions', {});
    if (error || !data) {
        console.error(error);
        return showGoldAlert("Error loading weekly questions.");
    }

    // convert the string IDs
    const allWeeklyIds = data.map(q => String(q.question_id || q.id));
    // shuffle the IDs (Fisher-Yates)
    for (let i = allWeeklyIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Swap elements
        [allWeeklyIds[i], allWeeklyIds[j]] = [allWeeklyIds[j], allWeeklyIds[i]];
    }

    // Lock All 50 IDs immediately
    pendingIds = [...allWeeklyIds];

    // Fire the first 5 immediately for a fast start (Indices 0, 1, 2, 3, 4)
    allWeeklyIds.slice(0, 5).forEach(id => fetchAndBufferQuestion(id));

    // wait for question #1
    while (preloadQueue.length === 0) {
        await new Promise(r => setTimeout(r, 50));
    }

    // Fire the remaining 45 in the background (Indices 5 through 49)
    allWeeklyIds.slice(5).forEach(id => fetchAndBufferQuestion(id));

    // UI TRANSITION
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

        gameStartTime = Date.now();
        startTimer();
        gameStarting = false;
    });
}

async function startDailyChallenge(session) {
    if (gameStarting) return;
    gameStarting = true;
    gameEnding = false;
    isDailyMode = true;
    isWeeklyMode = false;
    isLiteMode = false;
    isMultiplayerMode = false;
    pendingIds = [];
    preloadQueue = [];
    usedInThisSession = [];
    score = 0;
    dailyQuestionCount = 0;
    updateScore();
    // Reset the score
    await supabase.rpc('start_new_game_session');

    // burn attempt & fetch daily IDs from RPC
    // Replace your burnRes / questionsRes logic with this:
    const [initRes, questionsRes] = await Promise.all([
        supabase.rpc('initialize_daily_challenge'),
        supabase.rpc('get_daily_questions')
    ]);
    // 1. Check if the initialization failed
    if (initRes.data?.error === 'ALREADY_PLAYED') {
        return showGoldAlert("You've already played today!");
    }
    if (!initRes.data?.success) {
        console.error("Initialization error:", initRes.error);
        return showGoldAlert("Could not start Daily Challenge.");
    }
    // Check if questions loaded
    if (questionsRes.error || !questionsRes.data) {
        console.error(questionsRes.error);
        return showGoldAlert("Error loading daily questions.");
    }

    // reset streak
    await supabase.rpc('reset_my_streak');

    // Extract IDs in the specific order from DB
    const allDailyIds = questionsRes.data.map(q => String(q.question_id));

    // batch load: Start all 10 workers immediately
    // We don't use 'preloadNextQuestions' here because we already have the IDs.
    pendingIds = [...allDailyIds]; // Lock all 10

    // We start all fetches, but we keep them in a Promise array to preserve index
    const fetchPromises = allDailyIds.map(id => fetchDeterministicQuestion(id));

    // Wait for only the first question to display the game immediately
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

    // Start the Game UI
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

    // Fill the rest of the queue in the correct order
    for (let i = 1; i < fetchPromises.length; i++) {
        const qData = await fetchPromises[i];
        if (qData) {
            // warm the image in background
            if (qData.question_image) {
                const img = new Image();
                img.src = qData.question_image;
                img.decode().then(() => { qData._preloadedImg = img; }).catch(() => { });
            }
            preloadQueue.push(qData); // Pushes in order: 2, then 3, then 4...
        }
    }
}


// Audio
async function loadSounds() {
    if (!correctBuffer) correctBuffer = await loadAudio('./sounds/correct.mp3');
    if (!wrongBuffer) wrongBuffer = await loadAudio('./sounds/wrong.mp3');
    if (!tickBuffer) tickBuffer = await loadAudio('./sounds/tick.mp3');
    if (!levelUpBuffer) levelUpBuffer = await loadAudio('./sounds/level.mp3');
    if (!bonusBuffer) bonusBuffer = await loadAudio('./sounds/bonus.mp3');
    if (!petBuffer) petBuffer = await loadAudio('./sounds/pet.mp3');
    if (!achieveBuffer) achieveBuffer = await loadAudio('./sounds/achievement.mp3');
    if (!mpWinBuffer) mpWinBuffer = await loadAudio('./sounds/multiplayer_win.mp3');
    if (!mpLossBuffer) mpLossBuffer = await loadAudio('./sounds/multiplayer_loss.mp3');
    if (!mpDrawBuffer) mpDrawBuffer = await loadAudio('./sounds/multiplayer_draw.mp3');
}

async function loadAudio(url) {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    return audioCtx.decodeAudioData(buf);
}

function playSound(buffer, loop = false) {
    if (!buffer || muted) return;

    // On mobile, we must resume inside the play call too 
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
    return source;
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
    // Multiplayer UI handling
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

// Mobile tap feedback (Flash)
document.addEventListener('DOMContentLoaded', () => {
    (async () => {

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

        // Apply to all buttons currently on the screen
        const staticButtons = document.querySelectorAll('.btn, .btn-small, #authBtn, #muteBtn');
        staticButtons.forEach(applyFlash);


    })(); // closes the async function AND invokes it
}); // closes DOMContentLoaded listener
