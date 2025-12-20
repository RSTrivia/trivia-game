import { supabase } from './supabase.js';

const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Function to log in (reuse for signup)
async function loginUser(username, password) {
  const email = username.toLowerCase() + '@example.com';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { 
    alert('Login failed: ' + error.message); 
    return false; 
  }
  if (!data.user) { 
    alert('Login failed: no user returned'); 
    return false; 
  }

  // Save username/session
  localStorage.setItem('cachedUsername', username);
  localStorage.setItem('cachedLoggedIn', 'true');

  // Redirect to main page
  window.location.href = 'index.html';
  return true;
}

// Sign Up + automatic login
signupBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    alert('Enter a username and password');
    return;
  }

  const email = username.toLowerCase() + '@example.com';

  // 1️⃣ Sign up the user
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { alert('Sign-up failed: ' + error.message); return; }
  if (!data.user) { alert('Sign-up failed: no user returned'); return; }

  // 2️⃣ Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, username });
  if (profileError) { alert('Profile creation failed: ' + profileError.message); return; }

  // 3️⃣ Log in immediately
  await loginUser(username, password);
});

// Log In button (unchanged)
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    alert('Enter a username and password');
    return;
  }
  await loginUser(username, password);
});

// Reveal UI once JS is ready
app.classList.remove('app-hidden');
app.classList.add('app-ready');
