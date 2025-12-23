import { supabase } from './supabase.js';

const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Helper to disable/enable UI during loading
function setBusy(isBusy) {
    loginBtn.disabled = isBusy;
    signupBtn.disabled = isBusy;
}

signupBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // ... (Your existing validation checks: length, regex, etc. are perfect) ...
    if (!username || password.length < 6) return alert("Check username/password requirements.");

    setBusy(true);
    const email = username.toLowerCase() + '@example.com';
    
    // 1. Sign Up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { display_name: username } } // Backup storage of username
    });

    if (signUpError) {
        alert(signUpError.message.includes("already registered") ? "Username taken!" : signUpError.message);
        setBusy(false);
        return;
    }

    // 2. Create Profile Record
    if (signUpData.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: signUpData.user.id, username: username });

        if (profileError) console.error("Profile error:", profileError.message);
    }

    // 3. Auto Login
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
        alert("Account created! Please log in manually.");
        setBusy(false);
    } else {
        localStorage.setItem('cachedUsername', username);
        localStorage.setItem('cachedLoggedIn', 'true');
        window.location.href = 'index.html';
    }
});

loginBtn.addEventListener('click', async () => {
    const usernameInputVal = usernameInput.value.trim();
    const password = passwordInput.value;
    const todayStr = new Date().toISOString().split('T')[0];

    if (!usernameInputVal || !password) return alert("Enter credentials.");

    setBusy(true);
    const email = usernameInputVal.toLowerCase() + '@example.com';
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error || !data.user) {
        alert("Login failed: " + (error ? error.message : "User not found"));
        setBusy(false);
        return;
    }

    // 🛡️ Wrap in try/catch to ensure we ALWAYS redirect, even if DB fetch fails
    try {
        const [profileRes, dailyRes] = await Promise.all([
            supabase.from('profiles').select('username').eq('id', data.user.id).single(),
            supabase.from('daily_attempts').select('attempt_date').eq('user_id', data.user.id).eq('attempt_date', todayStr).single()
        ]);

        const finalUsername = profileRes.data?.username || usernameInputVal;
        localStorage.setItem('cachedUsername', finalUsername);

        if (dailyRes.data) {
            localStorage.setItem('dailyPlayedDate', todayStr);
        } else {
            localStorage.removeItem('dailyPlayedDate');
        }
    } catch (err) {
        console.warn("Post-login data fetch failed, proceeding with defaults:", err);
        localStorage.setItem('cachedUsername', usernameInputVal);
    }
    
    // Save state and go home
    localStorage.setItem('cachedLoggedIn', 'true');
    window.location.href = 'index.html';
});
app.classList.remove('app-hidden');
app.classList.add('app-ready');
