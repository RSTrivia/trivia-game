import { supabase } from './supabase.js';

const app = document.getElementById('app');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

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
    const usernameInput_signup = document.getElementById('username');
    const passwordInput_signup = document.getElementById('password');
    const username = usernameInput_signup.value.trim();
    const password = passwordInput_signup.value;

    setBusy(true);
    // 🛑 STOP if the name is longer than 8
    if (username.length > 7) {
        setBusy(false);
        return showGoldAlert("Max 8 characters allowed!");
    }
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
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !loginData?.user) {
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
        navigateTo('view-home');
    }
});

loginBtn.addEventListener('click', async () => {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (!usernameInput || !passwordInput) return;

    const usernameInputVal = usernameInput.value.trim();
    const password_login = passwordInput.value;

    if (!usernameInputVal || !password_login) {
        return showGoldAlert("Enter credentials.");
    }

    setBusy(true);
    try {
        const email = usernameInputVal.toLowerCase() + '@example.com';

        // 2. Clear local junk - DO NOT AWAIT THIS
        // We fire it and move on so it can't hang the login
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        const projectID = 'nnlkcwvqhkxasjtshvpw';
        localStorage.removeItem(`sb-${projectID}-auth-token`);

        // 3. Authenticate with a 5-second "Race" timeout
        const { data: authData, error: authError } = await Promise.race([
            supabase.auth.signInWithPassword({
                email: email,
                password: password_login
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
        ]);

        if (authError) {
            if (authError.status === 400) {
                showGoldAlert("Invalid username or password.");
            } else {
                showGoldAlert(authError.message);
            }
            setBusy(false); // Unlock here
            return; 
        }

        // 4. Handle RPC Data
        clearUserSessionData();
        try {
            const { data: pkg } = await supabase.rpc('get_user_login_data', {
                target_uid: authData.user.id
            });
            
            const finalUsername = pkg?.username || usernameInputVal;
            localStorage.setItem('cachedUsername', finalUsername);
            localStorage.setItem('cachedLoggedIn', 'true');
        } catch (rpcErr) {
            console.warn("RPC failed, falling back...");
            localStorage.setItem('cachedUsername', usernameInputVal);
            localStorage.setItem('cachedLoggedIn', 'true');
        }

        // 5. Cleanup Channels - DO NOT AWAIT THIS
        supabase.removeAllChannels();

        // 6. Final Redirect
        navigateTo('view-home');

    } catch (err) {
        console.error("Critical Login Error:", err);
        if (err.message === 'TIMEOUT') {
            showGoldAlert("Connection timed out. Try again.");
        } else {
            showGoldAlert("An unexpected error occurred.");
        }
    } finally {
        // 🛡️ THE GUARANTEE: This runs whether the login worked OR failed.
        // This ensures the button is NEVER stuck in a disabled state.
        setBusy(false);
    }
});

app.classList.remove('app-hidden');
app.classList.add('app-ready');
