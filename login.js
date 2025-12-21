import { supabase } from './supabase.js';

const app = document.getElementById('app');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// Sign Up and auto-login
signupBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) return; // silently do nothing

  const email = username.toLowerCase() + '@example.com';

  // Sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError || !signUpData.user) return; // silently fail

  // Create profile
  await supabase.from('profiles').insert({ id: signUpData.user.id, username });

  // Auto login after sign-up
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError || !loginData.user) return; // silently fail

  // Save username & redirect
  localStorage.setItem('cachedUsername', username);
  localStorage.setItem('cachedLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Log in
loginBtn.addEventListener('click', async () => {
  const usernameInputVal = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!usernameInputVal || !password) return;

  const email = usernameInputVal.toLowerCase() + '@example.com';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error || !data.user) return;

  // FETCH the actual profile to get the correct username casing from the DB
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', data.user.id)
    .single();

  const finalUsername = profile?.username || usernameInputVal;

  // Save the OFFICIAL username from the database
  localStorage.setItem('cachedUsername', finalUsername);
  localStorage.setItem('cachedLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Reveal UI once JS is ready
app.classList.remove('app-hidden');
app.classList.add('app-ready');
