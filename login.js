import { supabase } from './supabase.js';

const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const messageDiv = document.getElementById('login-message'); // reserved in HTML

function showMessage(msg, isError = false) {
  messageDiv.textContent = msg;
  messageDiv.style.color = isError ? '#ff3b3b' : '#ffd700';
}

// Sign Up and auto-login
signupBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    showMessage('Enter a username and password', true);
    return;
  }

  const email = username.toLowerCase() + '@example.com';
  
  // Sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    showMessage('Sign-up failed: ' + signUpError.message, true);
    return;
  }
  if (!signUpData.user) {
    showMessage('Sign-up failed: no user returned', true);
    return;
  }

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: signUpData.user.id, username });
  if (profileError) {
    showMessage('Profile creation failed: ' + profileError.message, true);
    return;
  }

  // Auto login after sign-up
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) {
    showMessage('Auto-login failed: ' + loginError.message, true);
    return;
  }
  if (!loginData.user) {
    showMessage('Auto-login failed: no user returned', true);
    return;
  }

  // Save username & redirect
  localStorage.setItem('cachedUsername', username);
  localStorage.setItem('cachedLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Log In
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    showMessage('Enter a username and password', true);
    return;
  }

  const email = username.toLowerCase() + '@example.com';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage('Login failed: ' + error.message, true);
    return;
  }
  if (!data.user) {
    showMessage('Login failed: no user returned', true);
    return;
  }

  // Save username & redirect
  localStorage.setItem('cachedUsername', username);
  localStorage.setItem('cachedLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Reveal UI once JS is ready
app.classList.remove('app-hidden');
app.classList.add('app-ready');
