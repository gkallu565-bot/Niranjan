// Authentication Controller
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'signup') {
    switchAuthTab('signup');
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

function switchAuthTab(tab) {
  const loginTabBtn = document.getElementById('tabLoginBtn');
  const signupTabBtn = document.getElementById('tabSignupBtn');
  const loginSection = document.getElementById('loginSection');
  const signupSection = document.getElementById('signupSection');

  if (tab === 'login') {
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    loginSection.style.display = 'block';
    signupSection.style.display = 'none';
  } else {
    loginTabBtn.classList.remove('active');
    signupTabBtn.classList.add('active');
    loginSection.style.display = 'none';
    signupSection.style.display = 'block';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginSubmitBtn');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  try {
    const res = await api.login(email, password);
    showToast(`Welcome back, ${res.user.full_name}!`, 'success');
    setTimeout(() => {
      if (res.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'index.html';
      }
    }, 1000);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = 'Sign In to XenProperty';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const full_name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value.trim();
  const role = document.getElementById('regRole').value;
  const btn = document.getElementById('registerSubmitBtn');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

  try {
    const res = await api.register({ full_name, email, password, phone, role });
    showToast('Account created successfully!', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = 'Create Account';
  }
}

// 1-Click Demo Logins
function fillDemoUser() {
  document.getElementById('loginEmail').value = 'rahul@xenproperty.com';
  document.getElementById('loginPassword').value = 'user123';
  showToast('Filled User credentials (rahul@xenproperty.com)', 'success');
}

function fillDemoAdmin() {
  document.getElementById('loginEmail').value = 'admin@xenproperty.com';
  document.getElementById('loginPassword').value = 'admin123';
  showToast('Filled Admin credentials (admin@xenproperty.com)', 'success');
}
