// Global UI & Session Controller
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  initGlobalModals();
  initMobileMenu();
});

// Sync authentication state with navbar
function initAuthUI() {
  const user = api.getCurrentUser();
  const authContainer = document.getElementById('navbarAuthArea');
  if (!authContainer) return;

  if (user) {
    authContainer.innerHTML = `
      <div class="user-badge-nav">
        <i class="fa-solid fa-user-circle"></i>
        <span>${escapeHtml(user.full_name.split(' ')[0])}</span>
        ${user.role === 'admin' ? '<a href="admin.html" style="margin-left:6px; color:#ea580c; font-size:0.75rem;"><i class="fa-solid fa-shield"></i> Admin</a>' : ''}
      </div>
      <button onclick="handleLogout()" class="btn-auth-login" style="padding:6px 12px; font-size:0.8rem; cursor:pointer;">Logout</button>
      <a href="sell.html" class="btn-list-prop">
        <i class="fa-solid fa-plus"></i> List Property
      </a>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn-auth-login">Login</a>
      <a href="login.html?tab=signup" class="btn-auth-signup">Sign Up</a>
      <a href="sell.html" class="btn-list-prop">
        <i class="fa-solid fa-plus"></i> List Property
      </a>
    `;
  }
}

function handleLogout() {
  api.removeToken();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.reload();
  }, 600);
}

// Global Toast Notifications
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal handling
function initGlobalModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // Global search keyboard shortcut (Cmd+K or Ctrl+K)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) searchInput.focus();
    }
  });

  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        if (val) {
          window.location.href = `buy.html?search=${encodeURIComponent(val)}`;
        }
      }
    });
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Mobile hamburger drawer
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      if (navLinks.style.display === 'flex') {
        navLinks.style.display = 'none';
      } else {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '74px';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = '#ffffff';
        navLinks.style.padding = '20px';
        navLinks.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
        navLinks.style.zIndex = '999';
      }
    });
  }
}

// Property Details Modal Opener
async function viewPropertyDetails(id) {
  try {
    const res = await api.getPropertyById(id);
    const p = res.data;
    if (!p) return;

    let modal = document.getElementById('propertyDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'propertyDetailModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width:720px; padding:24px;">
          <button class="modal-close-btn" onclick="closeModal('propertyDetailModal')">&times;</button>
          <div id="propDetailContent"></div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal('propertyDetailModal'); });
    }

    const content = document.getElementById('propDetailContent');
    content.innerHTML = `
      <div style="border-radius:14px; overflow:hidden; margin-bottom:16px; height:280px; position:relative;">
        <img src="${p.image_url}" style="width:100%; height:100%; object-fit:cover;" alt="${escapeHtml(p.title)}">
        <span class="badge-verified" style="position:absolute; top:14px; left:14px;">
          <i class="fa-solid fa-circle-check"></i> Verified Listing
        </span>
        <div style="position:absolute; bottom:14px; right:14px; background:rgba(15,91,70,0.92); color:#fff; padding:6px 14px; border-radius:999px; font-weight:800; font-size:1.1rem;">
          ${escapeHtml(p.price_display)}
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; color:#111827;">${escapeHtml(p.title)}</h2>
          <p style="color:#6b7280; font-size:0.88rem;"><i class="fa-solid fa-location-dot" style="color:#0f5b46;"></i> ${escapeHtml(p.address)}, ${escapeHtml(p.city)}</p>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block; background:#e6f7f2; color:#0f5b46; font-weight:800; font-size:0.85rem; padding:4px 10px; border-radius:999px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> ${p.ai_match_pct}% AI Match
          </span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; background:#f8faf9; padding:12px; border-radius:12px; border:1px solid #e5ebe7; margin-bottom:16px; text-align:center;">
        <div><div style="font-size:0.75rem; color:#6b7280;">Bedrooms</div><strong style="color:#111827;">${p.beds || 'N/A'} Beds</strong></div>
        <div><div style="font-size:0.75rem; color:#6b7280;">Bathrooms</div><strong style="color:#111827;">${p.baths || 'N/A'} Baths</strong></div>
        <div><div style="font-size:0.75rem; color:#6b7280;">Carpet Area</div><strong style="color:#111827;">${p.area_sqft} sq.ft</strong></div>
        <div><div style="font-size:0.75rem; color:#6b7280;">Location Score</div><strong style="color:#0f5b46;">${p.location_score}/10</strong></div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:6px;">Property Overview</h4>
        <p style="font-size:0.85rem; color:#4b5563; line-height:1.5;">${escapeHtml(p.description)}</p>
      </div>

      <div style="margin-bottom:20px;">
        <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:8px;">Key Amenities</h4>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${(p.amenities || []).map(a => `<span style="background:#edf6f2; color:#0b3b2e; font-size:0.78rem; font-weight:600; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-check" style="color:#10b981; margin-right:4px;"></i>${escapeHtml(a)}</span>`).join('')}
        </div>
      </div>

      <!-- Schedule Site Visit / Inquiry Form -->
      <div style="border-top:1px solid #e5ebe7; padding-top:18px;">
        <h4 style="font-size:1rem; font-weight:800; color:#0f5b46; margin-bottom:12px;">
          <i class="fa-regular fa-calendar-check"></i> Schedule a Free Site Visit
        </h4>
        <form onsubmit="handleScheduleVisit(event, ${p.id}, '${escapeHtml(p.title)}')">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
            <input type="text" id="visitName" placeholder="Your Full Name *" required class="form-control">
            <input type="tel" id="visitPhone" placeholder="Mobile Number *" required class="form-control">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
            <input type="email" id="visitEmail" placeholder="Email Address *" required class="form-control">
            <input type="date" id="visitDate" required class="form-control">
          </div>
          <button type="submit" class="btn-submit-primary">
            Confirm Visit Request <i class="fa-solid fa-arrow-right" style="margin-left:6px;"></i>
          </button>
        </form>
      </div>
    `;

    openModal('propertyDetailModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleScheduleVisit(e, propertyId, propertyTitle) {
  e.preventDefault();
  const name = document.getElementById('visitName').value;
  const phone = document.getElementById('visitPhone').value;
  const email = document.getElementById('visitEmail').value;
  const date = document.getElementById('visitDate').value;

  try {
    const res = await api.submitInquiry({
      property_id: propertyId,
      property_title: propertyTitle,
      user_name: name,
      user_email: email,
      user_phone: phone,
      visit_date: date,
      message: `Site visit scheduled for ${propertyTitle} on ${date}`
    });

    closeModal('propertyDetailModal');
    showToast('Visit scheduled successfully! Our advisor will call you shortly.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Utility: escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
