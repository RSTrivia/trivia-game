const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

const BRIDGE_URL = 'https://supabase-bridge-zzqp.onrender.com/api';

function setBusy(isBusy) {
    loginBtn.disabled = isBusy;
    signupBtn.disabled = isBusy;
}

signupBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;

    if (!username || username.length > 12 || !alphanumericRegex.test(username) || password.length < 6) {
        return alert("Check username (max 12, letters/numbers) and password (min 6).");
    }

    setBusy(true);

   try {
        const response = await fetch(`${BRIDGE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Signup failed");

        // --- THE FIX FOR PC + MOBILE ---
        // Save the unique ID and Username immediately after signup
        if (result.userId) {
            localStorage.setItem('user_id', result.userId);
        }
        
        localStorage.setItem('cachedUsername', result.username); 
        localStorage.setItem('cachedLoggedIn', 'true');
        
        // Go straight to the game
        window.location.href = 'index.html';

    } catch (err) {
        alert(err.message);
        setBusy(false);
    }
});

loginBtn.addEventListener('click', async () => {
    // 1. We take what they typed (e.g., "shir" or "Shir")
    const typedUsername = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!typedUsername || !password) return alert("Enter credentials.");

    setBusy(true);

    try {
        const response = await fetch(`${BRIDGE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 2. Send the typed name to the bridge
            body: JSON.stringify({ username: typedUsername, password })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Login failed");

        // --- THE FIX FOR PC + MOBILE ---
        if (result.userId) {
            localStorage.setItem('user_id', result.userId);
        }

        // --- STICKY CASING FIX ---
        // Instead of saving 'typedUsername', we save 'result.username'.
        // The server will look up the profile and send back the original casing (e.g., "Shir").
        localStorage.setItem('cachedUsername', result.username);
        localStorage.setItem('cachedLoggedIn', 'true');
        
        if (result.hasPlayedToday) {
            localStorage.setItem('dailyPlayedDate', new Date().toISOString().split('T')[0]);
        } else {
            localStorage.removeItem('dailyPlayedDate');
        }

        window.location.href = 'index.html';

    } catch (err) {
        alert(err.message);
        setBusy(false);
    }
});

app.classList.remove('app-hidden');
app.classList.add('app-ready');
