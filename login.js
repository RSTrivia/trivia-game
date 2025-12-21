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

  // 1. CUSTOM ERROR: Empty fields
  if (!username || !password) {
    alert("You must enter a username and password.");
    return;
  }

  // 2. CUSTOM ERROR: Username too long (OSRS limit is 12)
  if (username.length > 12) {
    alert("Usernames cannot be longer than 12 characters.");
    return;
  }

  // 3. CUSTOM ERROR: Invalid characters
  const regex = /^[a-zA-Z0-9 ]+$/;
  if (!regex.test(username)) {
    alert("Usernames can only contain letters, numbers, and spaces.");
    return;
  }

  // 4. CUSTOM ERROR: Password too short (Supabase requirement)
  if (password.length < 6) {
    alert("Your password must be at least 6 characters long.");
    return;
  }

  // --- If it passes all checks, proceed to Supabase ---
  const email = username.toLowerCase() + '@example.com';
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError) {
    // Handling specific Supabase errors with custom messages
    if (signUpError.message.includes("already registered")) {
      alert("That username is already taken!");
    } else {
      alert("Sign up failed: " + signUpError.message);
    }
    return;
  }
  // 2. Create the profile in the 'profiles' table
  // We do this immediately after signup
  if (signUpData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: signUpData.user.id, username: username });

    if (profileError) {
      console.error("Profile creation error:", profileError.message);
      // We continue anyway, because the auth account was created
    }
  }

  // 3. Auto login after sign-up
  // Note: If you turned off "Email Confirmation" in Supabase, this works instantly.
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  });

  if (loginError) {
    alert("Account created, but auto-login failed. Please try logging in manually.");
    return;
  }

  // 4. Success! Save to local storage and redirect
  localStorage.setItem('cachedUsername', username);
  localStorage.setItem('cachedLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Log in
loginBtn.addEventListener('click', async () => {
  const usernameInputVal = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!usernameInputVal || !password) {
    alert("Please enter both a username and password.");
    return;
  }

  const email = usernameInputVal.toLowerCase() + '@example.com';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error || !data.user) {
    alert("Login failed: " + (error ? error.message : "User not found"));
    return;
  }

  // FETCH the actual profile to get the correct username casing (e.g., Zezima vs zezima)
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', data.user.id)
    .single();

  const finalUsername = profile?.username || usernameInputVal;

  localStorage.setItem('cachedUsername', finalUsername);
  localStorage.setItem('cachedLoggedIn', 'true');
  window.location.href = 'index.html';
});

// Reveal UI once JS is ready
app.classList.remove('app-hidden');
app.classList.add('app-ready');
