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

function clearUserSessionData() {
    // List all keys that belong to a specific user
    const userKeys = [
        'cachedUsername', 
        'cachedLoggedIn', 
        'dailyPlayedDate'
    ];
    
    userKeys.forEach(key => localStorage.removeItem(key));
}

signupBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    setBusy(true);
    
    // Add a Password Length Check
    if (password.length < 6) {
        setBusy(false);
        return showGoldAlert("Password must be 6+ characters.");
    }
    // Handle the "Empty Username" edge case
    if (!username) {
        setBusy(false);
        return showGoldAlert("Please enter a username.");
    }
        
   // 🛡️ Ask the DB to validate EVERYTHING (Length, Regex, Availability)
    const { data: validationResult, error: rpcErr } = await supabase
        .rpc('check_username_available', { target_username: username });

    if (rpcErr) {
        setBusy(false);
        return showGoldAlert("Server error. Try again later.");
    }

    // If the DB says anything other than 'OK', show that specific message
    if (validationResult !== 'OK') {
        showGoldAlert(validationResult);
        setBusy(false);
        return;
    }
    
    const email = username.toLowerCase() + '@example.com';

    //sign up
    const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { display_name: username } } 
    });

    if (signUpError) {
        showGoldAlert(signUpError.message);
        setBusy(false);
        return;
    }

   // 2. AUTO-LOGIN
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
        // If auto-login fails for some weird reason, at least they have an account now
        showGoldAlert("Account created!\nPlease log in manually.");
        setBusy(false);
    } else {
        // SUCCESSFUL AUTO-LOGIN
        
        // 🛡️ RESET: Wipe any data left over from previous people on this device
        clearUserSessionData(); 

        // 🛡️ SET: Save the new user's details
        localStorage.setItem('cachedUsername', username);
        localStorage.setItem('cachedLoggedIn', 'true');
        
        // 🛡️ CLEANUP: Kill any lingering socket connections
        await supabase.removeAllChannels();

        // 🛡️ REDIRECT: Go to the game
        window.location.href = 'index.html';
    }
});

loginBtn.addEventListener('click', async () => {
    const usernameInputVal = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!usernameInputVal || !password) return showGoldAlert("Enter credentials.");

    setBusy(true);
    const email = usernameInputVal.toLowerCase() + '@example.com';
    
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    // Better Error Handling
    if (authError) {
        setBusy(false);
        // Specifically check for 'Invalid login credentials'
        if (authError.status === 400) {
            return showGoldAlert("Invalid username or password.");
        }
        return showGoldAlert(authError.message);
    }

    if (!authData?.user) {
        setBusy(false);
        return showGoldAlert("Login failed. Please try again.");
    }

    // 🛡️ RESET: Clear any old user data from the device immediately
    clearUserSessionData();

    try {
        // 2. Fetch the "Login Package" from the server
        const { data: loginPackage, error: rpcError } = await supabase.rpc('get_user_login_data', { 
            target_uid: authData.user.id 
        });

        if (rpcError) throw rpcError;

        // 3. Apply Server Data to Local Storage
        const finalUsername = loginPackage.username || usernameInputVal;
        localStorage.setItem('cachedUsername', finalUsername);
        localStorage.setItem('cachedLoggedIn', 'true');

        if (loginPackage.has_played_today) {
            const todayStr = new Date().toISOString().split('T')[0];
            localStorage.setItem('dailyPlayedDate', todayStr);
        }

    } catch (err) {
        console.warn("Post-login verification failed:", err);
        // Fallback to basic data so the user can still enter the game
        localStorage.setItem('cachedUsername', usernameInputVal);
        localStorage.setItem('cachedLoggedIn', 'true');
    }
    
    // 4. Cleanup and Redirect
    await supabase.removeAllChannels();
    window.location.href = 'index.html';
});

app.classList.remove('app-hidden');
app.classList.add('app-ready');

