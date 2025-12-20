import { supabase } from './supabase.js';

const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Create a message area inside the login container
let messageDiv = document.createElement('div');
messageDiv.style.color = '#ffd700';
messageDiv.style.margin = '10px 0';
messageDiv.style.minHeight = '24px'; // keeps layout stable
messageDiv.style.textAlign = 'center';
document.querySelector('.login-container').appendChild(messageDiv);

// Function to display messages
function showMessage(msg, isError = false) {
  messageDiv.textContent = msg;
  messageDiv.style.color = isError ? '#ff3b3b' : '#ffd700';
}

// Function to log in (reuse for signup)
async function loginUser(username, password) {
  const email = username.toLowerCase() + '@example.com';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) { 
    showMessage('Login failed: ' + error.message, true); 
    return false; 
  }
  if (!data.user) { 
    showMessage('Login failed: no user returned', true); 
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
    showMessage('Enter a username and password', true);
    return;
  }

  const email = username.toLowerCase() + '@example.com';

  // 1️⃣ Sign up the user
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { 
    showMessage('Sign-up failed: ' + error.message, true);
    return; 
  }
  if (!data.user) { 
    showMessage('Sign-up failed: no user returned', true);
    return; 
  }

  // 2️⃣ Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, username });
  if (profileError) { 
    showMessage('Profile creation failed: ' + profileError.message, true);
    return; 
  }

  // 3️⃣ Log in automatically
  showMessage('Account created! Logging in...');
  await loginUser(username, password);
});

// Log In button
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    showMessage('Enter a username and password', true);
    return;
  }
  await loginUser(username, password);
});

// Reveal UI once JS is ready
app.classList.remove('app-hidden');
app.classList.add('app-ready');
