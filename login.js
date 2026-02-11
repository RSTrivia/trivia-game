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
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;

    // Enhanced Validation
    if (!username) {
        return alert("Please enter a username.");
    }
    if (username.length > 12) {
        return alert("Username cannot be longer than 12 characters.");
    }
    if (!alphanumericRegex.test(username)) {
        return alert("Username can only contain letters and numbers.");
    }
    if (password.length < 6) {
        return alert("Password must be at least 6 characters.");
    }

    setBusy(true);
    
    // 🛡️ STEP 0: PRE-CHECK USERNAME
    const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

    if (existingUser) {
        alert("Username already taken!");
        setBusy(false);
        return; // STOP HERE - This prevents the 422 POST error in the console
    }
    
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
        // SUCCESSFUL AUTO-LOGIN
        localStorage.setItem('cachedUsername', username);
        localStorage.setItem('cachedLoggedIn', 'true');
    
        // 🛡️ CRITICAL FIX: Clear old daily play data from previous users on this device
        localStorage.removeItem('dailyPlayedDate'); 
        // 🛡️ ADD THIS LINE TO CLEAR WEBSOCKETS BEFORE REDIRECT
        await supabase.removeAllChannels();
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
        setBusy(false);
        console.warn("Post-login data fetch failed, proceeding with defaults:", err);
        localStorage.setItem('cachedUsername', usernameInputVal);
    }
    
    // Save state and go home
    localStorage.setItem('cachedLoggedIn', 'true');
    await supabase.removeAllChannels();
    window.location.href = 'index.html';
});
app.classList.remove('app-hidden');
app.classList.add('app-ready');
