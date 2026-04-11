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
    localStorage.removeItem('equipped_pet_id');
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
        //await supabase.removeAllChannels();

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
        supabase.auth.signOut({ scope: 'local' }).catch(() => { });
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
            // 2. Fetch the "Login Package" from the server
            const { data: loginPackage, error: rpcError } = await supabase.rpc('get_user_login_data', {
                target_uid: authData.user.id
            });

            const finalUsername = loginPackage.username || usernameInputVal;
            localStorage.setItem('cachedUsername', finalUsername);
            localStorage.setItem('cachedLoggedIn', 'true');
            // --- ADD THIS LINE TO SYNC THE PET ---
            if (loginPackage.equipped_pet) {
                const petId = loginPackage.equipped_pet;
                localStorage.setItem('equipped_pet_id', petId);
            } else {
                localStorage.removeItem('equipped_pet_id'); // Clear if they have no pet
            }
        } catch (rpcErr) {
            console.warn("RPC failed, falling back...");
            localStorage.setItem('cachedUsername', usernameInputVal);
            localStorage.setItem('cachedLoggedIn', 'true');
        }

        // 5. Cleanup Channels - DO NOT AWAIT THIS
        //supabase.removeAllChannels();

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
//   Pet updating real-time
// 1️⃣ Synchronous updater: instantly updates menu pet from localStorage
    function updateMenuPet(petId) {
      const petImg = document.getElementById('equipped-pet-display');
      if (!petImg) return;

      if (petId && petId !== "null") {
        // Check if the string contains 'cape' instead of an exact match
        const isCape = petId.toLowerCase().includes('cape');
        const folder = isCape ? 'capes/' : 'pets/';
        const fileName = isCape ? `${petId}.png` : `${petId.replace('pet_', '')}.png`;

        petImg.src = `${folder}${fileName}`;

        petImg.style.display = 'inline-block';
        petImg.style.marginLeft = '5px';
        petImg.style.verticalAlign = 'middle';
      } else {
        petImg.style.display = 'none';
      }
    }

    // 2️⃣ Single function to sync with Supabase
    async function syncMenuPet() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Logged out → clear pet
        localStorage.removeItem('equipped_pet_id');
        updateMenuPet(null);
        return;
      }

      // Fetch equipped pet from Supabase once
      const { data, error } = await supabase
        .from('profiles')
        .select('equipped_pet')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        localStorage.setItem('equipped_pet_id', data.equipped_pet);
        updateMenuPet(data.equipped_pet);
      }
    }

    let petChannel = null; // Track this globally at the top of your script

// --- 1. THE AUTH LISTENER (The only place managing the socket) ---
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) {
            // Cleanup any existing ghost channels
            if (petChannel) {
                await supabase.removeChannel(petChannel);
                petChannel = null;
            }

            // Delay to let the session stabilize
            setTimeout(() => {
                syncMenuPet();           // Initial fetch from DB
                setupMenuPetRealtime();  // Start watching for changes
            }, 500); 
        }
    } else if (event === 'SIGNED_OUT') {
        if (petChannel) {
            supabase.removeChannel(petChannel);
            petChannel = null;
        }
        localStorage.removeItem('equipped_pet_id');
        updateMenuPet(null); // Clear the image visually
    }
});

// --- 2. THE REALTIME FUNCTION ---
async function setupMenuPetRealtime() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    if (petChannel) return;

    // Unique name prevents collision on re-login
    const uniqueChannelName = `pet-sync-${session.user.id.slice(0, 5)}-${Date.now()}`;

    petChannel = supabase
        .channel(uniqueChannelName)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
        }, payload => {
            const newPet = payload.new.equipped_pet;
            console.log("Realtime Update Received:", newPet);
            
            // This is what updates the UI visually
            localStorage.setItem('equipped_pet_id', newPet);
            updateMenuPet(newPet); 
        })
        .subscribe((status) => {
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                petChannel = null;
            }
        });
}

// --- 1. THE AUTH LISTENER (The only place managing the socket) ---
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) {
            // Cleanup any existing ghost channels
            if (petChannel) {
                await supabase.removeChannel(petChannel);
                petChannel = null;
            }

            // Delay to let the session stabilize
            setTimeout(() => {
                syncMenuPet();           // Initial fetch from DB
                setupMenuPetRealtime();  // Start watching for changes
            }, 100); 
        }
    } else if (event === 'SIGNED_OUT') {
        if (petChannel) {
            supabase.removeChannel(petChannel);
            petChannel = null;
        }
        localStorage.removeItem('equipped_pet_id');
        updateMenuPet(null); // Clear the image visually
    }
});

    // 5️⃣ Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
      // Instant render from localStorage to avoid flicker
      const currentPet = localStorage.getItem('equipped_pet_id');
      updateMenuPet(currentPet);
    });

    // This looks for buttons AND the specific top-right icons
    const allButtons = document.querySelectorAll('.btn, .btn-small, .tab-btn, #helpBtn, #discordBtn');

    allButtons.forEach(button => {
      button.addEventListener('touchstart', () => {
        button.classList.add('tapped');
      }, { passive: true });

      button.addEventListener('touchend', () => {
        // 1. Force the element to lose focus immediately
        button.blur();
        setTimeout(() => {
          button.classList.remove('tapped');
        }, 100);
      });

      button.addEventListener('touchcancel', () => {
        button.classList.remove('tapped');
      });
    });

  
    // This runs after everything else is parsed
    document.addEventListener('DOMContentLoaded', () => {
      // Select all buttons by class
      const menuButtons = document.querySelectorAll('.main-menu-btn');

      menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          // Since app.js is a module, we ensure it's loaded 
          // and then call our navigation logic
          if (typeof window.navigateTo === 'function') {
            window.navigateTo('view-home');
          } else {
            // Fallback: manually force the UI reset if app.js isn't ready
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById('view-home').classList.remove('hidden');
            window.location.hash = 'home';
          }
        });
      });
    });

app.classList.remove('app-hidden');
app.classList.add('app-ready');
