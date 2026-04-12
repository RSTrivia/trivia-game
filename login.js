import { supabase } from './supabase.js';

const app = document.getElementById('app');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

function setBusy(isBusy) {
    loginBtn.disabled = isBusy;
    signupBtn.disabled = isBusy;
}

// create customizable alert
export function showGoldAlert(message) {
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
    localStorage.removeItem('my-multiplayer-pet');
    // List all keys that belong to a specific user and remove them
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
    // alert if the name is longer than 8
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

    // Ask the DB to validate EVERYTHING (Length, Regex, Availability)
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

    // sign up
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

    // AUTO-LOGIN
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !loginData?.user) {
        // If auto-login fails for some weird reason, at least they have an account now
        showGoldAlert("Account created!\nPlease log in manually.");
        setBusy(false);
    } else {
        // SUCCESSFUL AUTO-LOGIN
        // Wipe any data left over from previous people on this device
        clearUserSessionData();

        // Save the new user's details
        localStorage.setItem('cachedUsername', username);
        localStorage.setItem('cachedLoggedIn', 'true');

        // Kill any lingering socket connections
        //await supabase.removeAllChannels();

        // Go to home view
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

        // clear junk
        supabase.auth.signOut({ scope: 'local' }).catch(() => { });
        const projectID = 'nnlkcwvqhkxasjtshvpw';
        localStorage.removeItem(`sb-${projectID}-auth-token`);

        // Authenticate with a 5-second "Race" timeout
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
            setBusy(false);
            return;
        }

        // clear data
        clearUserSessionData();
        
        try {
            // Fetch the "Login Package" from the server
            const { data: loginPackage, error: rpcError } = await supabase.rpc('get_user_login_data', {
                target_uid: authData.user.id
            });

            const finalUsername = loginPackage.username || usernameInputVal;
            localStorage.setItem('cachedUsername', finalUsername);
            localStorage.setItem('cachedLoggedIn', 'true');
    
            if (loginPackage.equipped_pet) {
                const petId = loginPackage.equipped_pet;
                localStorage.setItem('equipped_pet_id', petId);
                localStorage.setItem('my-multiplayer-pet', petId);
            } else {
                localStorage.removeItem('equipped_pet_id'); // Clear if they have no pet
                localStorage.removeItem('my-multiplayer-pet');
            }
        } catch (rpcErr) {
            console.warn("RPC failed, falling back...");
            localStorage.setItem('cachedUsername', usernameInputVal);
            localStorage.setItem('cachedLoggedIn', 'true');
        }

        // Cleanup Channels
        //supabase.removeAllChannels();

        // go to home
        navigateTo('view-home');

    } catch (err) {
        console.error("Critical Login Error:", err);
        if (err.message === 'TIMEOUT') {
            showGoldAlert("Connection timed out. Try again.");
        } else {
            showGoldAlert("An unexpected error occurred.");
        }
    } finally {
        // This runs whether the login worked OR failed.
        // This ensures the button is NEVER stuck in a disabled state.
        setBusy(false);
    }
});

// Pet updating real-time
// Synchronous updater: instantly updates menu pet from localStorage
    export function updateMenuPet(elementId, petId) {
      const petImg = document.getElementById(elementId);
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

    // Single function to sync with Supabase
    async function syncMenuPet() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Logged out → clear pet
        localStorage.removeItem('equipped_pet_id');
        localStorage.removeItem('my-multiplayer-pet');
        updateMenuPet('equipped-pet-display', null);
        updateMenuPet('my-multiplayer-pet', null);
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
        updateMenuPet('equipped-pet-display', data.equipped_pet);
        localStorage.setItem('my-multiplayer-pet', data.equipped_pet);
        updateMenuPet('my-multiplayer-pet', data.equipped_pet);
      }
    }

    let petChannel = null; // Track this globally at the top of your script

// AUTH LISTENER
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
                syncMenuPet(); // Initial fetch from DB
                setupMenuPetRealtime();  // Start watching for changes
            }, 500); 
        }
    } else if (event === 'SIGNED_OUT') {
        if (petChannel) {
            supabase.removeChannel(petChannel);
            petChannel = null;
        }
        localStorage.removeItem('equipped_pet_id');
        localStorage.removeItem('my-multiplayer-pet');
        updateMenuPet('equipped-pet-display', null); // Clear the image visually
        updateMenuPet('my-multiplayer-pet', null);
    }
});

// THE REALTIME FUNCTION
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
            
            // update the UI visually
            localStorage.setItem('equipped_pet_id', newPet);
            localStorage.setItem('my-multiplayer-pet', newPet);
            
            updateMenuPet('equipped-pet-display', newPet); 
            updateMenuPet('my-multiplayer-pet', newPet);
        })
        .subscribe((status) => {
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                petChannel = null;
            }
        });
}


    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
     // Instant render from localStorage
      const currentPet = localStorage.getItem('equipped_pet_id');
      updateMenuPet('equipped-pet-display', currentPet);
      updateMenuPet('my-multiplayer-pet', currentPet);
    });

    // This looks for buttons AND the specific top-right icons
    const allButtons = document.querySelectorAll('.btn, .btn-small, .tab-btn, #helpBtn, #discordBtn');

    allButtons.forEach(button => {
      button.addEventListener('touchstart', () => {
        button.classList.add('tapped');
      }, { passive: true });

      button.addEventListener('touchend', () => {
        // Force the element to lose focus immediately
        button.blur();
        setTimeout(() => {
          button.classList.remove('tapped');
        }, 100);
      });

      button.addEventListener('touchcancel', () => {
        button.classList.remove('tapped');
      });
        
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
