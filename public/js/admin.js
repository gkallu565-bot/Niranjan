// Admin Portal Controller
document.addEventListener('DOMContentLoaded', () => {
  loadAdminStats();
  loadPropertiesTable();
  loadInquiriesTable();
  loadLoanApplicationsTable();
});

async function loadAdminStats() {
  try {
    const res = await api.getAdminStats();
    const stats = res.stats;
    document.getElementById('statTotalProperties').innerText = stats.totalProperties || 0;
    document.getElementById('statTotalUsers').innerText = stats.totalUsers || 0;
    document.getElementById('statTotalInquiries').innerText = stats.totalInquiries || 0;
    document.getElementById('statTotalLoans').innerText = stats.totalLoanApplications || 0;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadPropertiesTable() {
  const tbody = document.getElementById('adminPropsTableBody');
  if (!tbody) return;

  try {
    const res = await api.getProperties();
    const properties = res.data || [];
    tbody.innerHTML = properties.map(p => `
      <tr>
        <td><strong>#${p.id}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${p.image_url}" style="width:44px; height:44px; border-radius:8px; object-fit:cover;">
            <div>
              <strong>${escapeHtml(p.title)}</strong>
              <div style="font-size:0.75rem; color:#6b7280;">${escapeHtml(p.city)}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-status active">${escapeHtml(p.listing_type).toUpperCase()}</span></td>
        <td><strong>${escapeHtml(p.price_display)}</strong></td>
        <td><span style="color:var(--primary); font-weight:800;">${p.ai_match_pct}%</span></td>
        <td>
          <button onclick="viewPropertyDetails(${p.id})" style="background:#edf6f2; border:none; padding:4px 8px; border-radius:6px; color:var(--primary); cursor:pointer; font-weight:700; margin-right:4px;">
            <i class="fa-solid fa-eye"></i> View
          </button>
          <button onclick="deletePropertyItem(${p.id})" style="background:#fee2e2; border:none; padding:4px 8px; border-radius:6px; color:#dc2626; cursor:pointer; font-weight:700;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444; text-align:center;">Failed to load properties</td></tr>`;
  }
}

async function deletePropertyItem(id) {
  if (!confirm(`Are you sure you want to delete property #${id}?`)) return;
  try {
    await api.deleteProperty(id);
    showToast('Property deleted successfully', 'success');
    loadPropertiesTable();
    loadAdminStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadInquiriesTable() {
  const tbody = document.getElementById('adminInquiriesTableBody');
  if (!tbody) return;

  try {
    const res = await api.getInquiries();
    const inquiries = res.data || [];
    if (inquiries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#9ca3af; padding:20px;">No customer inquiries yet</td></tr>`;
      return;
    }
    tbody.innerHTML = inquiries.map(i => `
      <tr>
        <td><strong>#${i.id}</strong></td>
        <td><strong>${escapeHtml(i.user_name)}</strong></td>
        <td>${escapeHtml(i.user_phone)}<br><small style="color:#6b7280;">${escapeHtml(i.user_email)}</small></td>
        <td>${escapeHtml(i.property_title || 'General')}</td>
        <td>${i.visit_date ? `<i class="fa-regular fa-calendar"></i> ${i.visit_date}` : 'Contact'}</td>
        <td><span class="badge-status pending">${escapeHtml(i.status).toUpperCase()}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444; text-align:center;">Failed to load inquiries</td></tr>`;
  }
}

async function loadLoanApplicationsTable() {
  const tbody = document.getElementById('adminLoansTableBody');
  if (!tbody) return;

  try {
    const res = await api.getLoans();
    const loans = res.data || [];
    if (loans.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#9ca3af; padding:20px;">No loan applications yet</td></tr>`;
      return;
    }
    tbody.innerHTML = loans.map(l => `
      <tr>
        <td><strong>#${l.id}</strong></td>
        <td><strong>${escapeHtml(l.full_name)}</strong><br><small style="color:#6b7280;">${escapeHtml(l.phone)}</small></td>
        <td><strong>₹${Number(l.loan_amount).toLocaleString('en-IN')}</strong></td>
        <td>₹${Number(l.monthly_income).toLocaleString('en-IN')} / mo</td>
        <td><i class="fa-solid fa-building-columns"></i> ${escapeHtml(l.bank_preference)}</td>
        <td><span class="badge-status active">${escapeHtml(l.status)}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444; text-align:center;">Failed to load loans</td></tr>`;
  }
}
