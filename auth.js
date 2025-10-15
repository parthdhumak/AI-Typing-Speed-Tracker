// Supabase Configuration
const SUPABASE_URL = 'https://jhyicwcwclalfnmhvcrw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoeWljd2N3Y2xhbGZubWh2Y3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTAxOTAsImV4cCI6MjA3NTkyNjE5MH0.iBRis_sTOosQ3QwFCrJGCGh2YMoNW-rWbKGztuwl_QY';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const message = document.getElementById('message');

// Tab switching
function showLogin() {
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    clearMessage();
}

function showSignup() {
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    clearMessage();
}

// Message handling
function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';
}

function clearMessage() {
    message.style.display = 'none';
    message.className = 'message';
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'AI+WC.html';
        }, 1500);
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
});

// Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });
        
        if (error) throw error;
        
        showMessage('Account created! Check your email to verify.', 'success');
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
});

// Social Login
async function loginWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/AI+WC.html'
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

async function loginWithGithub() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin + '/AI+WC.html'
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Password Reset
async function resetPassword() {
    const email = prompt('Enter your email address:');
    if (!email) return;
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error) throw error;
        
        showMessage('Password reset email sent!', 'success');
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Check if user is already logged in
window.addEventListener('load', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        showMessage('Already logged in! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'AI+WC.html';
        }, 1000);
    }
});