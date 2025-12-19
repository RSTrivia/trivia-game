import { supabase } from './supabase.js';

const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Sign Up
signupBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    alert('Enter a username and password');
    return;
  }

  const email = username.toLowerCase() + '@example.com';
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { alert('Sign-up failed: ' + error.message); return; }
  if (!data.user) { alert('Sign-up failed: no user returned'); return; }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, username });

  if (profileError) { alert('Profile creation failed: ' + profileError.message); return; }
  alert('Account created! You can now log in.');
});

// Log In
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    alert('Enter a username and password');
    return;
  }

  const email = username.toLowerCase() + '@example.com';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Login failed: ' + error.message); return; }
  if (!data.user) { alert('Login failed: no user returned'); return; }
  // Save username immediately
  localStorage.setItem('cachedUsername', username);
  localStorage.setItem('cachedLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Reveal UI once JS is ready
app.classList.remove('app-hidden');
app.classList.add('app-ready');
