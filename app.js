// ============================================
// SUPABASE INITIALIZATION
// ============================================
const SUPABASE_URL = 'https://fjaxofsasorfbynqustd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYXhvZnNhc29yZmJ5bnF1c3RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5OTk0NSwiZXhwIjoyMDgyNDc1OTQ1fQ.Y8AEhH3SHYz-BCCoTsJYLs6SdUg1tsUDG4OwLS4Ochs';
const NETLIFY_FUNCTIONS_URL = '/.netlify/functions';

let supabaseClient;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    setTimeout(initSupabase, 50);
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase connected successfully');
    populatePropertySelect();
  } catch (error) {
    console.error('❌ Supabase initialization error:', error);
    alert('Failed to connect to database. Please refresh the page.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

const LANDLORD_PASSWORD = 'admin123';
let currentUser = {
  type: null,
  tenantId: null,
  propertyId: null
};

// ============================================
// SUPABASE DATA FUNCTIONS
// ============================================

async function getProperties() {
  try {
    const { data, error } = await supabaseClient
      .from('properties')
      .select('*')
      .order('id');
    if (error) throw error;
    console.log('✅ Properties loaded:', data);
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching properties:', error);
    showAlert('Error loading properties: ' + error.message, 'danger');
    return [];
  }
}

async function getTenants() {
  try {
    const { data, error } = await supabaseClient
      .from('tenants')
      .select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tenants:', error);
    showAlert('Error loading tenants: ' + error.message, 'danger');
    return [];
  }
}

async function getTenantById(tenantId) {
  try {
    const { data, error } = await supabaseClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }
}

async function getPropertyById(propertyId) {
  try {
    const { data, error } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching property:', error);
    return null;
  }
}

async function getPayments() {
  try {
    const { data, error } = await supabaseClient
      .from('payments')
      .select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
}

async function savePayment(payment) {
  try {
    const { data, error } = await supabaseClient
      .from('payments')
      .insert([payment])
      .select()
      .single();
    if (error) throw error;
    console.log('✅ Payment saved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error saving payment:', error);
    throw error;
  }
}

async function getUtilities() {
  try {
    const { data, error } = await supabaseClient
      .from('utilities')
      .select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching utilities:', error);
    return [];
  }
}

async function saveUtility(utility) {
  try {
    const { data, error } = await supabaseClient
      .from('utilities')
      .insert([utility])
      .select()
      .single();
    if (error) throw error;
    console.log('✅ Utility saved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error saving utility:', error);
    throw error;
  }
}

async function getInvoices() {
  try {
    const { data, error } = await supabaseClient
      .from('invoices')
      .select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

async function saveInvoice(invoice) {
  try {
    const { data, error } = await supabaseClient
      .from('invoices')
      .insert([invoice])
      .select()
      .single();
    if (error) throw error;
    console.log('✅ Invoice saved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error saving invoice:', error);
    throw error;
  }
}

async function getMessages() {
  try {
    const { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

async function saveMessage(message) {
  try {
    const { data, error } = await supabaseClient
      .from('messages')
      .insert([message])
      .select()
      .single();
    if (error) throw error;
    console.log('✅ Message saved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error saving message:', error);
    throw error;
  }
}

async function updateMessage(messageId, updates) {
  try {
    const { error } = await supabaseClient
      .from('messages')
      .update(updates)
      .eq('id', messageId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

async function getUtilityRates() {
  try {
    const { data, error } = await supabaseClient
      .from('utility_rates')
      .select('*')
      .limit(1)
      .single();
    if (error) throw error;
    return data || { electricity_rate: 0.15, water_rate: 8.50 };
  } catch (error) {
    console.error('Error fetching utility rates:', error);
    return { electricity_rate: 0.15, water_rate: 8.50 };
  }
}

async function updateUtilityRates(rates) {
  try {
    const { error } = await supabaseClient
      .from('utility_rates')
      .update(rates)
      .gt('id', ''); // Update first record
    if (error) throw error;
  } catch (error) {
    console.error('Error updating utility rates:', error);
    throw error;
  }
}

async function getLandlordData() {
  try {
    const { data, error } = await supabaseClient
      .from('landlord_data')
      .select('*')
      .eq('id', 'main')
      .single();
    if (error) throw error;
    return data || {
      name: 'Your Name',
      email: 'landlord@example.com',
      address: 'Your Address',
      phone: '555-0000',
      bank_account: 'Your Bank Account'
    };
  } catch (error) {
    console.error('Error fetching landlord data:', error);
    return {};
  }
}

async function saveLandlordData(data) {
  try {
    const { error } = await supabaseClient
      .from('landlord_data')
      .upsert({ id: 'main', ...data });
    if (error) throw error;
  } catch (error) {
    console.error('Error saving landlord data:', error);
    throw error;
  }
}

async function updateTenant(tenantId, updates) {
  try {
    const { error } = await supabaseClient
      .from('tenants')
      .update(updates)
      .eq('id', tenantId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
}

async function addNewTenant(tenant) {
  try {
    const { data, error } = await supabaseClient
      .from('tenants')
      .insert([tenant])
      .select()
      .single();
    if (error) throw error;
    console.log('✅ Tenant added:', data);
    return data;
  } catch (error) {
    console.error('❌ Error adding tenant:', error);
    throw error;
  }
}

async function populatePropertySelect() {
  const properties = await getProperties();
  const propertySelect = document.getElementById('propertySelect');
  if (!propertySelect) return;

  propertySelect.innerHTML = '<option value="">-- Select Property --</option>';
  properties.forEach(prop => {
    propertySelect.innerHTML += `<option value="${prop.id}">${prop.name}</option>`;
  });
}

// ============================================
// PERPLEXITY API & EMAIL FUNCTIONS
// ============================================

async function generateInvoiceWithAI(payload) {
  try {
    const response = await fetch(`${NETLIFY_FUNCTIONS_URL}/generate-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Invoice generation failed');
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    throw error;
  }
}

async function sendInvoiceEmail(payload) {
  try {
    const response = await fetch(`${NETLIFY_FUNCTIONS_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Email send failed');
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// ============================================
// UI FUNCTIONS
// ============================================

function switchLoginMode(mode) {
  const landlordForm = document.getElementById('landlordLoginForm');
  const tenantForm = document.getElementById('tenantLoginForm');
  const buttons = document.querySelectorAll('.login-btn-option');

  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  if (mode === 'landlord') {
    landlordForm.style.display = 'block';
    tenantForm.style.display = 'none';
  } else {
    landlordForm.style.display = 'none';
    tenantForm.style.display = 'block';
  }
}

async function loginLandlord() {
  const password = document.getElementById('landlordPassword').value;
  if (password === LANDLORD_PASSWORD) {
    currentUser.type = 'landlord';
    await showApp();
  } else {
    alert('❌ Incorrect password');
  }
}

async function loginTenant() {
  const propertyId = document.getElementById('propertySelect').value;
  const password = document.getElementById('tenantPassword').value;

  if (!propertyId) {
    alert('Please select a property');
    return;
  }

  const tenants = await getTenants();
  const tenant = tenants.find(t => t.property_id === propertyId);

  if (!tenant) {
    alert('No tenant assigned to this property');
    return;
  }

  if (tenant.tenant_password !== password) {
    alert('❌ Incorrect password');
    return;
  }

  currentUser.type = 'tenant';
  currentUser.tenantId = tenant.id;
  currentUser.propertyId = propertyId;
  await showApp();
}

function logout() {
  currentUser = {
    type: null,
    tenantId: null,
    propertyId: null
  };
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContainer').classList.remove('active');
  document.getElementById('landlordPassword').value = '';
  document.getElementById('tenantPassword').value = '';
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');

  if (currentUser.type === 'landlord') {
    document.getElementById('landlordSection').style.display = 'block';
    document.getElementById('tenantSection').style.display = 'none';
    document.getElementById('appTitle').textContent = 'Landlord Dashboard';
    document.getElementById('userDisplayName').textContent = 'Logged in as: Landlord';
    await loadLandlordDashboard();
  } else {
    document.getElementById('landlordSection').style.display = 'none';
    document.getElementById('tenantSection').style.display = 'block';
    const tenant = await getTenantById(currentUser.tenantId);
    document.getElementById('appTitle').textContent = `Welcome, ${tenant.name}`;
    document.getElementById('userDisplayName').textContent = `Logged in as: ${tenant.name}`;
    await loadTenantDashboard();
  }
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
  }
}

function showAlert(message, type = 'success') {
  const alertBox = currentUser.type === 'landlord'
    ? document.getElementById('alertBox')
    : document.getElementById('tenantAlertBox');
  alertBox.textContent = message;
  alertBox.className = `alert active alert-${type}`;
  setTimeout(() => {
    alertBox.classList.remove('active');
  }, 4000);
}

// ============================================
// LANDLORD FUNCTIONS
// ============================================

async function showTab(tabId) {
  const tabs = document.querySelectorAll('.content-section');
  const navTabs = document.querySelectorAll('.nav-tab');

  tabs.forEach(tab => tab.classList.remove('active'));
  navTabs.forEach(btn => btn.classList.remove('active'));

  const el = document.getElementById(tabId);
  if (!el) return;

  el.classList.add('active');

  // Highlight clicked tab button (works with inline onclick)
  if (window.event && window.event.target) {
    window.event.target.classList.add('active');
  }

  const logicalName = tabId.replace('Tab', '');

  if (logicalName === 'dashboard') {
    await loadLandlordDashboard();
  } else if (logicalName === 'tenants') {
    await loadTenantsList();
  } else if (logicalName === 'utilities') {
    await loadUtilitiesList();
  } else if (logicalName === 'invoices') {
    await loadInvoicesTab();
  } else if (logicalName === 'messages') {
    await loadMessagesList();
  } else if (logicalName === 'expenses') {
    await loadExpensesList();
  } else if (logicalName === 'reports') {
    await loadReportsTab();
  } else if (logicalName === 'settings') {
    await loadSettings();
  }
}

async function loadLandlordDashboard() {
  const properties = await getProperties();
  const tenants = await getTenants();
  const payments = await getPayments();

  const occupied = tenants.length;
  let paidThisMonth = 0;
  let unpaidThisMonth = 0;

  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  tenants.forEach(tenant => {
    const paid = payments.some(p => p.tenant_id === tenant.id && p.date.startsWith(currentMonth));
    if (paid) {
      paidThisMonth++;
    } else {
      unpaidThisMonth++;
    }
  });

  document.getElementById('totalPropertiesCount').textContent = properties.length;
  document.getElementById('occupiedCount').textContent = occupied;
  document.getElementById('paidCount').textContent = paidThisMonth;
  document.getElementById('unpaidCount').textContent = unpaidThisMonth;

  const tbody = document.getElementById('propertiesTableBody');
  tbody.innerHTML = '';

  properties.forEach(property => {
    const tenant = tenants.find(t => t.property_id === property.id);
    const tenantName = tenant ? tenant.name : 'Vacant';
    const paid = tenant && payments.some(p => p.tenant_id === tenant.id && p.date.startsWith(currentMonth));
    const status = tenant ? (paid ? 'Paid' : 'Unpaid') : 'Vacant';
    const badgeClass = status === 'Paid' ? 'badge-paid' : 'badge-unpaid';

    tbody.innerHTML += `
      <tr>
        <td>${property.name}</td>
        <td>${tenantName}</td>
        <td>R ${property.monthly_rent ? property.monthly_rent.toLocaleString() : '0'}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td>
          ${tenant ? `<button class="btn-small" onclick="manageTenant('${tenant.id}')">Manage</button>` : ''}
          <button class="btn-small" onclick="openEditPropertyModal('${property.id}')">Edit</button>
        </td>
      </tr>
    `;
  });
}

async function loadTenantsList() {
  const tenants = await getTenants();
  const payments = await getPayments();
  const container = document.getElementById('tenantsList');

  if (tenants.length === 0) {
    container.innerHTML = '<p>No tenants added yet.</p>';
    return;
  }

  let html = '';
  tenants.forEach(tenant => {
    const totalPaid = payments
      .filter(p => p.tenant_id === tenant.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = tenant.monthly_rent - totalPaid;

    html += `
      <div class="tenant-card">
        <h4>${tenant.name}</h4>
        <p><strong>Email:</strong> ${tenant.email}</p>
        <p><strong>Phone:</strong> ${tenant.phone}</p>
        <p><strong>Monthly Rent:</strong> R ${tenant.monthly_rent.toLocaleString()}</p>
        <p><strong>Total Paid:</strong> R ${totalPaid.toLocaleString()}</p>
        <p><strong>Balance:</strong> R ${balance.toLocaleString()}</p>
        <button class="btn-secondary" onclick="manageTenant('${tenant.id}')">Edit</button>
        <button class="btn-secondary" onclick="openRecordPaymentModal('${tenant.id}')">Record Payment</button>
        <button class="btn-secondary" onclick="openGenerateInvoiceModal('${tenant.id}')">Generate Invoice</button>
      </div>
    `;
  });

  container.innerHTML = html;
  await populateModalSelects();
}

async function manageTenant(tenantId) {
  const tenant = await getTenantById(tenantId);
  document.getElementById('editTenantId').value = tenantId;
  document.getElementById('editTenantName').value = tenant.name;
  document.getElementById('editTenantEmail').value = tenant.email;
  document.getElementById('editTenantPhone').value = tenant.phone;
  openModal('editTenantModal');
}

async function saveTenant() {
  const tenantId = document.getElementById('editTenantId').value;
  const name = document.getElementById('editTenantName').value;
  const email = document.getElementById('editTenantEmail').value;
  const phone = document.getElementById('editTenantPhone').value;

  try {
    await updateTenant(tenantId, { name, email, phone });
    closeModal('editTenantModal');
    showAlert('✅ Tenant updated successfully');
    await loadTenantsList();
  } catch (error) {
    showAlert('❌ Error updating tenant: ' + error.message, 'danger');
  }
}

async function openRecordPaymentModal(tenantId) {
  const tenant = await getTenantById(tenantId);
  document.getElementById('paymentTenantId').value = tenantId;
  document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('paymentAmount').value = tenant.monthly_rent;
  openModal('recordPaymentModal');
}

async function recordPayment() {
  const tenantId = document.getElementById('paymentTenantId').value;
  const date = document.getElementById('paymentDate').value;
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const method = document.getElementById('paymentMethod').value;
  const note = document.getElementById('paymentNotes').value;

  if (!date || !amount) {
    alert('Please fill in required fields');
    return;
  }

  try {
    await savePayment({
      id: 'pay_' + Date.now(),
      tenant_id: tenantId,
      date,
      amount,
      method,
      note
    });

    closeModal('recordPaymentModal');
    showAlert('✅ Payment recorded successfully');
    await loadTenantsList();
  } catch (error) {
    showAlert('❌ Error recording payment: ' + error.message, 'danger');
  }
}

async function openGenerateInvoiceModal(tenantId) {
  const tenant = await getTenantById(tenantId);
  const property = await getPropertyById(tenant.property_id);
  const utilities = await getUtilities();
  const tenantUtilities = utilities.filter(u => u.tenant_id === tenantId);
  const rates = await getUtilityRates();

  document.getElementById('invoiceTenantId').value = tenantId;
  document.getElementById('invoiceTenantName').value = tenant.name;
  document.getElementById('invoiceTenantEmail').value = tenant.email;
  document.getElementById('invoicePropertyName').value = property.name;
  document.getElementById('invoiceUnitNumber').value = tenant.unit_number || 'N/A';
  document.getElementById('invoiceBaseRent').value = tenant.monthly_rent;
  document.getElementById('invoiceBillingPeriodStart').value = new Date().toISOString().split('T')[0];
  document.getElementById('invoiceBillingPeriodEnd').value = new Date().toISOString().split('T')[0];

  const utilityContainer = document.getElementById('invoiceUtilitiesContainer');
  utilityContainer.innerHTML = '';

  if (tenantUtilities.length === 0) {
    utilityContainer.innerHTML = '<p>No utilities recorded for this tenant.</p>';
  } else {
    tenantUtilities.forEach(util => {
      const electricityCost = (util.consumption || 0) * rates.electricity_rate;
      const waterCost = (util.consumption || 0) * rates.water_rate;
      const utilAmount = util.utility_type === 'electricity' ? electricityCost : waterCost;

      utilityContainer.innerHTML += `
        <div class="utility-line">
          <label>${util.date} - ${util.utility_type}</label>
          <input type="number" value="${utilAmount.toFixed(2)}" step="0.01" class="utility-amount" data-utility-id="${util.id}" />
        </div>
      `;
    });
  }

  openModal('generateInvoiceModal');
}

async function generateAndSendInvoice() {
  const tenantId = document.getElementById('invoiceTenantId').value;
  const tenantName = document.getElementById('invoiceTenantName').value;
  const tenantEmail = document.getElementById('invoiceTenantEmail').value;
  const propertyName = document.getElementById('invoicePropertyName').value;
  const unitNumber = document.getElementById('invoiceUnitNumber').value;
  const baseRent = parseFloat(document.getElementById('invoiceBaseRent').value);
  const periodStart = document.getElementById('invoiceBillingPeriodStart').value;
  const periodEnd = document.getElementById('invoiceBillingPeriodEnd').value;
  const billingPeriod = `${periodStart} to ${periodEnd}`;
  const additionalCharges = document.getElementById('invoiceAdditionalCharges').value;

  const utilityElements = document.querySelectorAll('.utility-amount');
  const utilities = [];
  utilityElements.forEach((elem, index) => {
    const label = elem.previousElementSibling.textContent;
    utilities.push({
      name: label,
      amount: parseFloat(elem.value) || 0
    });
  });

  try {
    const generateBtn = document.getElementById('generateInvoiceBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const landlord = await getLandlordData();
    const invoicePayload = {
      tenantName,
      tenantEmail,
      propertyName,
      unitNumber,
      billingPeriod,
      dueDate: periodEnd,
      baseRent,
      utilities,
      landlord,
      additionalText: additionalCharges
    };

    const invoiceResult = await generateInvoiceWithAI(invoicePayload);

    const invoiceRecord = {
      id: 'inv_' + Date.now(),
      tenant_id: tenantId,
      period_start: periodStart,
      period_end: periodEnd,
      total: invoiceResult.totalDue,
      content: invoiceResult.invoiceText,
      created_at: new Date().toISOString()
    };

    await saveInvoice(invoiceRecord);

    const emailPayload = {
      to: tenantEmail,
      subject: `Invoice - ${propertyName} - ${billingPeriod}`,
      body: invoiceResult.invoiceText,
      tenantName,
      landlordName: landlord.name
    };

    await sendInvoiceEmail(emailPayload);

    closeModal('generateInvoiceModal');
    showAlert(`✅ Invoice generated and sent to ${tenantEmail} successfully!`);
    await loadInvoicesTab();

    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate & Send Invoice';
  } catch (error) {
    showAlert(`❌ Error: ${error.message}`, 'danger');
    const generateBtn = document.getElementById('generateInvoiceBtn');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate & Send Invoice';
  }
}

async function loadUtilitiesList() {
  const utilities = await getUtilities();
  const tenants = await getTenants();
  const properties = await getProperties();
  const rates = await getUtilityRates();
  const container = document.getElementById('utilitiesList');

  if (utilities.length === 0) {
    container.innerHTML = '<p>No utility readings submitted yet.</p>';
    return;
  }

  let html = `
    <table class="utilities-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Tenant</th>
          <th>Date</th>
          <th>Type</th>
          <th>Previous Reading</th>
          <th>Current Reading</th>
          <th>Consumption</th>
          <th>Cost (R)</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
  `;

  utilities.forEach(util => {
    const tenant = tenants.find(t => t.id === util.tenant_id);
    const property = properties.find(p => p.id === tenant?.property_id);
    const rate = util.utility_type === 'electricity' ? rates.electricity_rate : rates.water_rate;
    const cost = (util.consumption || 0) * rate;

    html += `
      <tr>
        <td>${property?.name || 'N/A'}</td>
        <td>${tenant?.name || 'N/A'}</td>
        <td>${util.date}</td>
        <td>${util.utility_type || 'N/A'}</td>
        <td>${util.previous_reading || 0}</td>
        <td>${util.current_reading || 0}</td>
        <td>${util.consumption || 0}</td>
        <td>R ${cost.toFixed(2)}</td>
        <td>${util.note || '-'}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

async function loadInvoicesTab() {
  const invoices = await getInvoices();
  const tenants = await getTenants();
  const container = document.getElementById('invoicesList');

  if (invoices.length === 0) {
    container.innerHTML = '<p>No invoices generated yet.</p>';
    return;
  }

  let html = '';
  invoices.forEach(invoice => {
    const tenant = tenants.find(t => t.id === invoice.tenant_id);

    html += `
      <div class="invoice-card">
        <h4>Invoice #${invoice.id.substring(0, 8).toUpperCase()}</h4>
        <p><strong>Tenant:</strong> ${tenant?.name || 'N/A'}</p>
        <p><strong>Period:</strong> ${invoice.period_start} to ${invoice.period_end}</p>
        <p><strong>Total:</strong> R ${invoice.total.toLocaleString()}</p>
        <p><strong>Generated:</strong> ${invoice.created_at}</p>
        <button class="btn-secondary" onclick="viewInvoiceDetails('${invoice.id}')">View Details</button>
        <button class="btn-secondary" onclick="resendInvoice('${invoice.id}')">Resend Email</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function viewInvoiceDetails(invoiceId) {
  const invoices = await getInvoices();
  const invoice = invoices.find(i => i.id === invoiceId);
  document.getElementById('invoiceDetailsContent').innerHTML = `<pre>${invoice.content}</pre>`;
  openModal('invoiceDetailsModal');
}

async function resendInvoice(invoiceId) {
  const invoices = await getInvoices();
  const tenants = await getTenants();
  const invoice = invoices.find(i => i.id === invoiceId);
  const tenant = tenants.find(t => t.id === invoice.tenant_id);
  const landlord = await getLandlordData();

  try {
    await sendInvoiceEmail({
      to: tenant.email,
      subject: `Invoice #${invoiceId.substring(0, 8).toUpperCase()} - Resend`,
      body: invoice.content,
      tenantName: tenant.name,
      landlordName: landlord.name
    });

    showAlert(`✅ Invoice resent to ${tenant.email}`);
  } catch (error) {
    showAlert('❌ Error resending invoice: ' + error.message, 'danger');
  }
}

async function loadMessagesList() {
  const messages = await getMessages();
  const tenants = await getTenants();
  const properties = await getProperties();
  const container = document.getElementById('messagesList');

  // Filter only parent messages (no replies)
  const parentMessages = messages.filter(m => !m.parent_message_id);

  if (parentMessages.length === 0) {
    container.innerHTML = '<p>No messages from tenants yet.</p>';
    return;
  }

  let html = '';
  parentMessages.forEach(msg => {
    const tenant = tenants.find(t => t.id === msg.tenant_id);
    const property = properties.find(p => p.id === tenant?.property_id);
    const statusBadge = msg.resolved ? 'badge-resolved' : 'badge-open';

    // Get replies to this message
    const replies = messages.filter(m => m.parent_message_id === msg.id);

    html += `
      <div class="message-card">
        <h4>${msg.subject}</h4>
        <p><strong>From:</strong> ${tenant?.name || 'N/A'} (${property?.name || 'N/A'})</p>
        <p><strong>Date:</strong> ${msg.date}</p>
        <p><strong>Status:</strong> <span class="badge ${statusBadge}">${msg.resolved ? 'Resolved' : 'Open'}</span></p>
        <p><strong>Message:</strong></p>
        <p style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin: 10px 0;">${msg.body}</p>
        
        ${replies.length > 0 ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <strong>Replies:</strong>
            ${replies.map(reply => `
              <div style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <p><strong>${reply.sender_type === 'landlord' ? 'You' : tenant?.name}:</strong></p>
                <p>${reply.reply_body || reply.body}</p>
                <small>${reply.date}</small>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <button class="btn-secondary" onclick="openReplyModal('${msg.id}', '${tenant?.name}')">Reply</button>
        <button class="btn-secondary" onclick="toggleMessageResolved('${msg.id}', ${!msg.resolved})">${msg.resolved ? 'Reopen' : 'Mark Resolved'}</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function openReplyModal(messageId, tenantName) {
  document.getElementById('replyMessageId').value = messageId;
  document.getElementById('replyTenantName').value = tenantName;
  document.getElementById('replyBody').value = '';
  openModal('replyModal');
}

async function sendReply() {
  const messageId = document.getElementById('replyMessageId').value;
  const replyBody = document.getElementById('replyBody').value;

  if (!replyBody) {
    alert('Please enter a reply');
    return;
  }

  try {
    await saveMessage({
      id: 'msg_' + Date.now(),
      parent_message_id: messageId,
      sender_type: 'landlord',
      subject: 'RE: (Reply)',
      body: replyBody,
      reply_body: replyBody,
      tenant_id: (await getMessages()).find(m => m.id === messageId).tenant_id,
      date: new Date().toISOString().split('T')[0],
      resolved: false
    });

    closeModal('replyModal');
    showAlert('✅ Reply sent successfully');
    await loadMessagesList();
  } catch (error) {
    showAlert('❌ Error sending reply: ' + error.message, 'danger');
  }
}

async function toggleMessageResolved(messageId, resolved) {
  try {
    await updateMessage(messageId, { resolved });
    showAlert(resolved ? '✅ Message marked as resolved' : '✅ Message reopened');
    await loadMessagesList();
  } catch (error) {
    showAlert('❌ Error updating message: ' + error.message, 'danger');
  }
}

async function loadSettings() {
  const landlord = await getLandlordData();
  const rates = await getUtilityRates();

  document.getElementById('landlordName').value = landlord.name || '';
  document.getElementById('landlordEmail').value = landlord.email || '';
  document.getElementById('landlordAddress').value = landlord.address || '';
  document.getElementById('landlordPhone').value = landlord.phone || '';
  document.getElementById('landlordBankAccount').value = landlord.bank_account || '';
  document.getElementById('electricityRate').value = rates.electricity_rate || 0.15;
  document.getElementById('waterRate').value = rates.water_rate || 8.50;
}

async function saveSettings() {
  const data = {
    name: document.getElementById('landlordName').value,
    email: document.getElementById('landlordEmail').value,
    address: document.getElementById('landlordAddress').value,
    phone: document.getElementById('landlordPhone').value,
    bank_account: document.getElementById('landlordBankAccount').value
  };

  const rates = {
    electricity_rate: parseFloat(document.getElementById('electricityRate').value),
    water_rate: parseFloat(document.getElementById('waterRate').value)
  };

  try {
    await saveLandlordData(data);
    await updateUtilityRates(rates);
    showAlert('✅ Settings saved successfully');
  } catch (error) {
    showAlert('❌ Error saving settings: ' + error.message, 'danger');
  }
}

async function openEditPropertyModal(propertyId) {
  const property = await getPropertyById(propertyId);
  document.getElementById('editPropertyId').value = propertyId;
  document.getElementById('editPropertyName').value = property.name;
  document.getElementById('editPropertyUnitNumber').value = property.unit_number || '';
  document.getElementById('editPropertyRent').value = property.monthly_rent || 0;
  openModal('editPropertyModal');
}

async function saveProperty() {
  const propertyId = document.getElementById('editPropertyId').value;
  const name = document.getElementById('editPropertyName').value;
  const unitNumber = document.getElementById('editPropertyUnitNumber').value;
  const monthlyRent = parseFloat(document.getElementById('editPropertyRent').value);

  try {
    const { error } = await supabaseClient
      .from('properties')
      .update({ name, unit_number: unitNumber, monthly_rent: monthlyRent })
      .eq('id', propertyId);

    if (error) throw error;

    closeModal('editPropertyModal');
    showAlert('✅ Property updated successfully');
    await loadLandlordDashboard();
  } catch (error) {
    showAlert('❌ Error saving property: ' + error.message, 'danger');
  }
}

async function addNewPropertyForm() {
  const name = document.getElementById('newPropertyName').value;
  const unitNumber = document.getElementById('newPropertyUnitNumber').value;
  const monthlyRent = parseFloat(document.getElementById('newPropertyRent').value);

  if (!name || !monthlyRent) {
    alert('Please fill in all required fields');
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('properties')
      .insert([{
        id: 'prop_' + Date.now(),
        name,
        unit_number: unitNumber,
        monthly_rent: monthlyRent
      }])
      .select()
      .single();

    if (error) throw error;

    closeModal('addPropertyModal');
    showAlert('✅ Property added successfully');
    document.getElementById('newPropertyName').value = '';
    document.getElementById('newPropertyUnitNumber').value = '';
    document.getElementById('newPropertyRent').value = '';
    await loadLandlordDashboard();
  } catch (error) {
    showAlert('❌ Error adding property: ' + error.message, 'danger');
  }
}

async function populateModalSelects() {
  const properties = await getProperties();
  const propertySelect = document.getElementById('newTenantProperty');

  propertySelect.innerHTML = '<option value="">-- Select Property --</option>';
  properties.forEach(prop => {
    propertySelect.innerHTML += `<option value="${prop.id}">${prop.name}</option>`;
  });

  const invoicePropertySelect = document.getElementById('invoiceTenantSelect');
  if (invoicePropertySelect) {
    const tenants = await getTenants();
    invoicePropertySelect.innerHTML = '<option value="">-- Select Tenant --</option>';
    tenants.forEach(tenant => {
      invoicePropertySelect.innerHTML += `<option value="${tenant.id}">${tenant.name}</option>`;
    });
  }
}

// ============================================
// TENANT FUNCTIONS
// ============================================

async function loadTenantDashboard() {
  const tenant = await getTenantById(currentUser.tenantId);
  const property = await getPropertyById(currentUser.propertyId);
  const utilities = await getUtilities();
  const tenantUtilities = utilities.filter(u => u.tenant_id === currentUser.tenantId);

  document.getElementById('tenantPropertyName').textContent = property.name;
  document.getElementById('tenantMonthlyRent').textContent = 'R ' + tenant.monthly_rent.toLocaleString();
  document.getElementById('tenantRentStatus').textContent = 'Pending';

  // Show latest readings
  if (tenantUtilities.length > 0) {
    const latestElectric = tenantUtilities.reverse().find(u => u.utility_type === 'electricity');
    const latestWater = tenantUtilities.find(u => u.utility_type === 'water');

    let latestReadings = '<h4>Latest Meter Readings:</h4>';
    if (latestElectric) {
      latestReadings += `<p>Electricity: <strong>${latestElectric.current_reading} kWh</strong></p>`;
    }
    if (latestWater) {
      latestReadings += `<p>Water: <strong>${latestWater.current_reading} m³</strong></p>`;
    }
    document.getElementById('latestReadingsContainer').innerHTML = latestReadings;
  }
}

async function submitMeterReading() {
  const date = document.getElementById('meterDate').value;
  const utilityType = document.getElementById('meterType').value;
  const currentReading = parseFloat(document.getElementById('currentMeterReading').value);
  const notes = document.getElementById('meterNotes').value;

  if (!date || !currentReading) {
    alert('Please fill in required fields');
    return;
  }

  try {
    // Get previous reading
    const utilities = await getUtilities();
    const tenantUtilities = utilities.filter(u => u.tenant_id === currentUser.tenantId && u.utility_type === utilityType);
    const previousReading = tenantUtilities.length > 0 ? tenantUtilities[tenantUtilities.length - 1].current_reading : 0;
    const consumption = currentReading - previousReading;

    await saveUtility({
      id: 'util_' + Date.now(),
      tenant_id: currentUser.tenantId,
      date,
      previous_reading: previousReading,
      current_reading: currentReading,
      consumption: consumption,
      utility_type: utilityType,
      note: notes
    });

    showAlert('✅ Meter reading submitted successfully');
    document.getElementById('meterDate').value = '';
    document.getElementById('currentMeterReading').value = '';
    document.getElementById('meterNotes').value = '';
    await loadTenantDashboard();
  } catch (error) {
    showAlert('❌ Error submitting reading: ' + error.message, 'danger');
  }
}

async function showTenantTab(tabName) {
  const tabs = document.querySelectorAll('.tenant-content-section');
  const navTabs = document.querySelectorAll('.tenant-nav-tab');

  tabs.forEach(tab => tab.classList.remove('active'));
  navTabs.forEach(btn => btn.classList.remove('active'));

  document.getElementById('tenant' + tabName + 'Tab').classList.add('active');
  event.target.classList.add('active');

  if (tabName === 'Invoices') {
    await loadTenantInvoices();
  } else if (tabName === 'Messages') {
    await loadTenantMessages();
  }
}

async function loadTenantInvoices() {
  const invoices = await getInvoices();
  const tenantInvoices = invoices.filter(inv => inv.tenant_id === currentUser.tenantId);
  const container = document.getElementById('tenantInvoicesList');

  if (tenantInvoices.length === 0) {
    container.innerHTML = '<p>No invoices available yet.</p>';
    return;
  }

  let html = '';
  tenantInvoices.forEach(inv => {
    html += `
      <div class="invoice-card">
        <h4>Invoice #${inv.id.substring(0, 8).toUpperCase()}</h4>
        <p><strong>Period:</strong> ${inv.period_start} to ${inv.period_end}</p>
        <p><strong>Total Due:</strong> R ${inv.total.toLocaleString()}</p>
        <p><strong>Generated:</strong> ${inv.created_at}</p>
        <button class="btn-secondary" onclick="viewTenantInvoiceDetails('${inv.id}')">View Full Invoice</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function viewTenantInvoiceDetails(invoiceId) {
  const invoices = await getInvoices();
  const invoice = invoices.find(i => i.id === invoiceId);
  document.getElementById('tenantInvoiceDetailsContent').innerHTML = `<pre>${invoice.content}</pre>`;
  openModal('tenantInvoiceDetailsModal');
}

async function loadTenantMessages() {
  const messages = await getMessages();
  const tenantMessages = messages.filter(msg => msg.tenant_id === currentUser.tenantId && !msg.parent_message_id);
  const container = document.getElementById('tenantMessagesList');

  if (tenantMessages.length === 0) {
    container.innerHTML = '<p>No messages sent yet.</p>';
    return;
  }

  let html = '';
  tenantMessages.forEach(msg => {
    const replies = messages.filter(m => m.parent_message_id === msg.id);
    const statusBadge = msg.resolved ? 'Resolved' : 'Open';

    html += `
      <div class="message-card">
        <h4>${msg.subject}</h4>
        <p><strong>Date Sent:</strong> ${msg.date}</p>
        <p><strong>Status:</strong> <span class="badge">${statusBadge}</span></p>
        <p><strong>Your Message:</strong></p>
        <p style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin: 10px 0;">${msg.body}</p>
        
        ${replies.length > 0 ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <strong>Landlord's Reply:</strong>
            ${replies.map(reply => `
              <div style="background: #e8f5e9; padding: 10px; margin: 10px 0; border-radius: 5px;">
                <p><strong>Landlord:</strong></p>
                <p>${reply.reply_body || reply.body}</p>
                <small>${reply.date}</small>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color: #999; font-style: italic;">Awaiting landlord reply...</p>'}
      </div>
    `;
  });

  container.innerHTML = html;
}

async function sendTenantMessage() {
  const subject = document.getElementById('tenantMessageSubject').value;
  const body = document.getElementById('tenantMessageBody').value;

  if (!subject || !body) {
    alert('Please fill in all fields');
    return;
  }

  try {
    await saveMessage({
      id: 'msg_' + Date.now(),
      tenant_id: currentUser.tenantId,
      parent_message_id: null,
      sender_type: 'tenant',
      subject,
      body,
      date: new Date().toISOString().split('T')[0],
      resolved: false
    });

    showAlert('✅ Message sent successfully');
    document.getElementById('tenantMessageSubject').value = '';
    document.getElementById('tenantMessageBody').value = '';
    await loadTenantMessages();
  } catch (error) {
    showAlert('❌ Error sending message: ' + error.message, 'danger');
  }
}
// ============================================
// PHASE 2 ADDITIONS TO APP.JS
// Add these functions to your existing app.js
// ============================================

// ============================================
// EXPENSE MANAGEMENT FUNCTIONS
// ============================================

async function getExpenseCategories() {
  try {
    const { data, error } = await supabaseClient
      .from('expense_categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return [];
  }
}

async function getExpenses(filters = {}) {
  try {
    let query = supabaseClient
      .from('expenses')
      .select('*');

    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

async function saveExpense(expense) {
  try {
    const { data, error } = await supabaseClient
      .from('expenses')
      .insert([expense])
      .select()
      .single();
    if (error) throw error;
    console.log('✅ Expense saved:', data);
    return data;
  } catch (error) {
    console.error('❌ Error saving expense:', error);
    throw error;
  }
}

async function updateExpense(expenseId, updates) {
  try {
    const { error } = await supabaseClient
      .from('expenses')
      .update(updates)
      .eq('id', expenseId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

async function deleteExpense(expenseId) {
  try {
    const { error } = await supabaseClient
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

async function addCustomCategory(categoryName) {
  try {
    const { data, error } = await supabaseClient
      .from('expense_categories')
      .insert([{ name: categoryName, icon: '📝', is_default: false }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

async function generateIncomeReport(filters = {}) {
  try {
    let query = supabaseClient
      .from('payments')
      .select('*, tenants(name, property_id), properties(name)');

    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }
    if (filters.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;

    // Calculate totals
    const totalIncome = data.reduce((sum, p) => sum + (p.amount || 0), 0);
    const byProperty = {};
    const byTenant = {};

    data.forEach(payment => {
      const propName = payment.properties?.name || 'Unknown';
      const tenantName = payment.tenants?.name || 'Unknown';

      byProperty[propName] = (byProperty[propName] || 0) + payment.amount;
      byTenant[tenantName] = (byTenant[tenantName] || 0) + payment.amount;
    });

    return {
      totalIncome,
      transactionCount: data.length,
      byProperty,
      byTenant,
      transactions: data
    };
  } catch (error) {
    console.error('Error generating income report:', error);
    throw error;
  }
}

async function generateExpenseReport(filters = {}) {
  try {
    const expenses = await getExpenses(filters);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const byCategory = {};
    const byProperty = {};

    // Get property names for mapping
    const properties = await getProperties();
    const propertyMap = {};
    properties.forEach(p => {
      propertyMap[p.id] = p.name;
    });

    expenses.forEach(expense => {
      // By category
      byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;

      // By property
      const propName = expense.property_id ? propertyMap[expense.property_id] : 'General (All Properties)';
      byProperty[propName] = (byProperty[propName] || 0) + expense.amount;
    });

    return {
      totalExpenses,
      transactionCount: expenses.length,
      byCategory,
      byProperty,
      transactions: expenses
    };
  } catch (error) {
    console.error('Error generating expense report:', error);
    throw error;
  }
}

async function generateAccountingReport(filters = {}) {
  try {
    const incomeReport = await generateIncomeReport(filters);
    const expenseReport = await generateExpenseReport(filters);

    const netProfit = incomeReport.totalIncome - expenseReport.totalExpenses;
    const profitMargin = incomeReport.totalIncome > 0 
      ? ((netProfit / incomeReport.totalIncome) * 100).toFixed(2) 
      : 0;

    return {
      period: filters.month || 'All Time',
      totalIncome: incomeReport.totalIncome,
      totalExpenses: expenseReport.totalExpenses,
      netProfit,
      profitMargin,
      incomeBreakdown: incomeReport.byProperty,
      expenseBreakdown: expenseReport.byCategory,
      propertyProfitability: await calculatePropertyProfitability(filters),
      tenantPayments: incomeReport.byTenant,
      allData: {
        income: incomeReport,
        expenses: expenseReport
      }
    };
  } catch (error) {
    console.error('Error generating accounting report:', error);
    throw error;
  }
}

async function calculatePropertyProfitability(filters = {}) {
  try {
    const properties = await getProperties();
    const profitability = {};

    for (const property of properties) {
      const propertyFilters = { ...filters, propertyId: property.id };
      const income = await generateIncomeReport(propertyFilters);
      const expenses = await generateExpenseReport(propertyFilters);

      profitability[property.name] = {
        propertyId: property.id,
        monthlyRent: property.monthly_rent,
        totalIncome: income.totalIncome,
        totalExpenses: expenses.totalExpenses,
        netProfit: income.totalIncome - expenses.totalExpenses,
        occupancyStatus: 'Occupied' // TODO: calculate from tenants table
      };
    }

    return profitability;
  } catch (error) {
    console.error('Error calculating property profitability:', error);
    return {};
  }
}

async function generateTenantReport(tenantId, filters = {}) {
  try {
    const tenant = await getTenantById(tenantId);
    const property = await getPropertyById(tenant.property_id);

    const paymentFilters = { ...filters, tenantId };
    const incomeReport = await generateIncomeReport(paymentFilters);

    const expenses = await getExpenses({ propertyId: tenant.property_id });
    const totalPropertyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Allocate shared expenses proportionally if needed
    const tenantShare = tenant.monthly_rent / property.monthly_rent;
    const allocatedExpenses = totalPropertyExpenses * tenantShare;

    return {
      tenantName: tenant.name,
      propertyName: property.name,
      totalRentPaid: incomeReport.totalIncome,
      assignedExpenses: allocatedExpenses,
      netContribution: incomeReport.totalIncome - allocatedExpenses,
      paymentHistory: incomeReport.transactions
    };
  } catch (error) {
    console.error('Error generating tenant report:', error);
    throw error;
  }
}

// ============================================
// PDF EXPORT FUNCTION
// ============================================

function generatePDFReport(reportData, reportType) {
  try {
    // Simple PDF generation (using jsPDF library - add to HTML: <script src="https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js"></script>)
    // This is a placeholder - full implementation depends on jsPDF library

    let pdfContent = `
LANDLORD ACCOUNTING REPORT
Generated: ${new Date().toLocaleDateString()}
Report Type: ${reportType}

=== SUMMARY ===
`;

    if (reportType === 'accounting') {
      pdfContent += `
Total Income: R ${reportData.totalIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
Total Expenses: R ${reportData.totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
Net Profit: R ${reportData.netProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
Profit Margin: ${reportData.profitMargin}%

=== INCOME BREAKDOWN (by Property) ===
`;
      for (const [prop, amount] of Object.entries(reportData.incomeBreakdown)) {
        pdfContent += `${prop}: R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}\n`;
      }

      pdfContent += `\n=== EXPENSE BREAKDOWN (by Category) ===\n`;
      for (const [category, amount] of Object.entries(reportData.expenseBreakdown)) {
        pdfContent += `${category}: R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}\n`;
      }
    }

    // For now, return as text. In production, use jsPDF library
    return pdfContent;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// ============================================
// CSV EXPORT FUNCTION
// ============================================

function generateCSVReport(reportData, reportType) {
  try {
    let csv = '';

    if (reportType === 'accounting') {
      csv = `Report Type,Accounting\nGenerated,${new Date().toISOString()}\n\n`;
      csv += `Summary\nTotal Income,${reportData.totalIncome}\n`;
      csv += `Total Expenses,${reportData.totalExpenses}\n`;
      csv += `Net Profit,${reportData.netProfit}\n`;
      csv += `Profit Margin,${reportData.profitMargin}%\n\n`;

      csv += `Income by Property\n`;
      for (const [prop, amount] of Object.entries(reportData.incomeBreakdown)) {
        csv += `${prop},${amount}\n`;
      }

      csv += `\nExpenses by Category\n`;
      for (const [category, amount] of Object.entries(reportData.expenseBreakdown)) {
        csv += `${category},${amount}\n`;
      }
    } else if (reportType === 'transactions') {
      csv = `Date,Type,Category,Amount,Property,Description\n`;
      reportData.forEach(row => {
        csv += `${row.date},${row.type},${row.category},${row.amount},${row.property},"${row.description}"\n`;
      });
    }

    return csv;
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
}

function downloadFile(content, filename, type) {
  const element = document.createElement('a');
  const file = new Blob([content], { type });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// ============================================
// EXPENSE MANAGEMENT UI FUNCTIONS
// ============================================

async function openAddExpenseModal() {
  const categories = await getExpenseCategories();
  const properties = await getProperties();

  let categoryOptions = '<option value="">-- Select Category --</option>';
  categories.forEach(cat => {
    categoryOptions += `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`;
  });

  let propertyOptions = '<option value="">General (All Properties)</option>';
  properties.forEach(prop => {
    propertyOptions += `<option value="${prop.id}">${prop.name}</option>`;
  });

  document.getElementById('expenseCategorySelect').innerHTML = categoryOptions;
  document.getElementById('expensePropertySelect').innerHTML = propertyOptions;

  document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseDescription').value = '';

  openModal('addExpenseModal');
}

async function saveExpenseForm() {
  const category = document.getElementById('expenseCategorySelect').value;
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;
  const propertyId = document.getElementById('expensePropertySelect').value || null;
  const description = document.getElementById('expenseDescription').value;

  if (!category || !amount || !date) {
    alert('Please fill in required fields');
    return;
  }

  try {
    await saveExpense({
      id: 'exp_' + Date.now(),
      category,
      amount,
      date,
      property_id: propertyId,
      description
    });

    closeModal('addExpenseModal');
    showAlert('✅ Expense saved successfully');
    await loadExpensesList();
  } catch (error) {
    showAlert('❌ Error saving expense: ' + error.message, 'danger');
  }
}

async function loadExpensesList() {
  const expenses = await getExpenses();
  const properties = await getProperties();
  const container = document.getElementById('expensesList');

  if (expenses.length === 0) {
    container.innerHTML = '<p>No expenses recorded yet.</p>';
    return;
  }

  const propertyMap = {};
  properties.forEach(p => {
    propertyMap[p.id] = p.name;
  });

  let html = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Date</th>
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Category</th>
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Property</th>
          <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Amount (R)</th>
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
          <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalExpenses = 0;
  expenses.forEach(exp => {
    const propName = exp.property_id ? propertyMap[exp.property_id] : 'General';
    totalExpenses += exp.amount;

    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${exp.date}</td>
        <td style="padding: 10px;">${exp.category}</td>
        <td style="padding: 10px;">${propName}</td>
        <td style="padding: 10px; text-align: right;">R ${exp.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px;">${exp.description || '-'}</td>
        <td style="padding: 10px; text-align: center;">
          <button class="btn-small" onclick="deleteExpense('${exp.id}')">Delete</button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px; font-weight: bold;">
      Total Expenses: R ${totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
    </div>
  `;

  container.innerHTML = html;
}

// ============================================
// REPORTING UI FUNCTIONS
// ============================================

async function loadReportsTab() {
  const container = document.getElementById('reportsContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
      <div class="report-card" onclick="showAccountingReport()" style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; cursor: pointer; text-align: center;">
        <h3>📊 Accounting Summary</h3>
        <p>Income, Expenses & Net Profit</p>
      </div>
      
      <div class="report-card" onclick="showIncomeReport()" style="padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 8px; cursor: pointer; text-align: center;">
        <h3>💰 Income Report</h3>
        <p>By Property, By Tenant, By Date</p>
      </div>
      
      <div class="report-card" onclick="showExpenseReport()" style="padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 8px; cursor: pointer; text-align: center;">
        <h3>💸 Expense Report</h3>
        <p>By Category, By Property, By Date</p>
      </div>
      
      <div class="report-card" onclick="showPropertyReport()" style="padding: 20px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; border-radius: 8px; cursor: pointer; text-align: center;">
        <h3>🏠 Property Report</h3>
        <p>Profitability & Occupancy</p>
      </div>
      
      <div class="report-card" onclick="showTenantReport()" style="padding: 20px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; border-radius: 8px; cursor: pointer; text-align: center;">
        <h3>👤 Tenant Report</h3>
        <p>Payment History & Status</p>
      </div>
    </div>
  `;
}

async function showAccountingReport() {
  try {
    const report = await generateAccountingReport();
    openModal('reportDetailsModal');

    let html = `
      <h3>Accounting Summary Report</h3>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <strong>Total Income:</strong><br>
            R ${report.totalIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </div>
          <div>
            <strong>Total Expenses:</strong><br>
            R ${report.totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </div>
          <div style="background: #4caf50; color: white; padding: 10px; border-radius: 5px;">
            <strong>Net Profit:</strong><br>
            R ${report.netProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </div>
          <div style="background: #667eea; color: white; padding: 10px; border-radius: 5px;">
            <strong>Profit Margin:</strong><br>
            ${report.profitMargin}%
          </div>
        </div>
      </div>

      <h4>Income Breakdown (by Property)</h4>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Property</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount</th>
        </tr>
        ${Object.entries(report.incomeBreakdown).map(([prop, amount]) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${prop}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </table>

      <h4>Expense Breakdown (by Category)</h4>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Category</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount</th>
        </tr>
        ${Object.entries(report.expenseBreakdown).map(([cat, amount]) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${cat}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </table>

      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button class="btn-secondary" onclick="downloadReportPDF('accounting')">📄 Download PDF</button>
        <button class="btn-secondary" onclick="downloadReportCSV('accounting')">📊 Download CSV</button>
      </div>
    `;

    document.getElementById('reportDetailsContent').innerHTML = html;
  } catch (error) {
    showAlert('❌ Error generating report: ' + error.message, 'danger');
  }
}

async function showIncomeReport() {
  openModal('reportFilterModal');
  document.getElementById('reportFilterTitle').textContent = 'Filter Income Report';
  document.getElementById('applyReportFilter').onclick = async () => {
    const filterType = document.getElementById('filterType').value;
    const filterValue = document.getElementById('filterValue').value;

    let filters = {};
    if (filterType === 'property' && filterValue) {
      filters.propertyId = filterValue;
    } else if (filterType === 'tenant' && filterValue) {
      filters.tenantId = filterValue;
    }

    const report = await generateIncomeReport(filters);
    displayIncomeReport(report);
    closeModal('reportFilterModal');
  };
}

function displayIncomeReport(report) {
  openModal('reportDetailsModal');

  let html = `
    <h3>Income Report</h3>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <strong>Total Income: </strong>R ${report.totalIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}<br>
      <strong>Transactions: </strong>${report.transactionCount}
    </div>

    <h4>By Property</h4>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      ${Object.entries(report.byProperty).map(([prop, amount]) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px;">${prop}</td>
          <td style="padding: 10px; text-align: right;">R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </table>

    <div style="margin-top: 20px; display: flex; gap: 10px;">
      <button class="btn-secondary" onclick="downloadReportPDF('income')">📄 Download PDF</button>
      <button class="btn-secondary" onclick="downloadReportCSV('income')">📊 Download CSV</button>
    </div>
  `;

  document.getElementById('reportDetailsContent').innerHTML = html;
}

async function showExpenseReport() {
  openModal('reportFilterModal');
  document.getElementById('reportFilterTitle').textContent = 'Filter Expense Report';
  document.getElementById('applyReportFilter').onclick = async () => {
    const filterType = document.getElementById('filterType').value;
    const filterValue = document.getElementById('filterValue').value;

    let filters = {};
    if (filterType === 'category' && filterValue) {
      filters.category = filterValue;
    } else if (filterType === 'property' && filterValue) {
      filters.propertyId = filterValue;
    }

    const report = await generateExpenseReport(filters);
    displayExpenseReport(report);
    closeModal('reportFilterModal');
  };
}

function displayExpenseReport(report) {
  openModal('reportDetailsModal');

  let html = `
    <h3>Expense Report</h3>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <strong>Total Expenses: </strong>R ${report.totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}<br>
      <strong>Transactions: </strong>${report.transactionCount}
    </div>

    <h4>By Category</h4>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      ${Object.entries(report.byCategory).map(([cat, amount]) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px;">${cat}</td>
          <td style="padding: 10px; text-align: right;">R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </table>

    <h4>By Property</h4>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      ${Object.entries(report.byProperty).map(([prop, amount]) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px;">${prop}</td>
          <td style="padding: 10px; text-align: right;">R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </table>

    <div style="margin-top: 20px; display: flex; gap: 10px;">
      <button class="btn-secondary" onclick="downloadReportPDF('expense')">📄 Download PDF</button>
      <button class="btn-secondary" onclick="downloadReportCSV('expense')">📊 Download CSV</button>
    </div>
  `;

  document.getElementById('reportDetailsContent').innerHTML = html;
}

async function showPropertyReport() {
  try {
    const profitability = await calculatePropertyProfitability();
    openModal('reportDetailsModal');

    let html = `
      <h3>Property Profitability Report</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Property</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Income</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Expenses</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Net Profit</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(profitability).map(([propName, data]) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${propName}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R ${data.totalIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R ${data.totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; background: ${data.netProfit >= 0 ? '#e8f5e9' : '#ffebee'};">R ${data.netProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button class="btn-secondary" onclick="downloadReportPDF('property')">📄 Download PDF</button>
        <button class="btn-secondary" onclick="downloadReportCSV('property')">📊 Download CSV</button>
      </div>
    `;

    document.getElementById('reportDetailsContent').innerHTML = html;
  } catch (error) {
    showAlert('❌ Error generating report: ' + error.message, 'danger');
  }
}

async function showTenantReport() {
  const tenants = await getTenants();
  openModal('selectTenantModal');

  let html = '<h3>Select Tenant</h3><div style="display: grid; gap: 10px;">';
  tenants.forEach(tenant => {
    html += `
      <button class="btn-secondary" style="width: 100%; text-align: left;" onclick="displayTenantReport('${tenant.id}')">
        ${tenant.name}
      </button>
    `;
  });
  html += '</div>';

  document.getElementById('selectTenantContent').innerHTML = html;
}

async function displayTenantReport(tenantId) {
  try {
    const report = await generateTenantReport(tenantId);
    closeModal('selectTenantModal');
    openModal('reportDetailsModal');

    let html = `
      <h3>Tenant Report: ${report.tenantName}</h3>
      <p><strong>Property:</strong> ${report.propertyName}</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div>
          <strong>Total Rent Paid:</strong><br>
          R ${report.totalRentPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </div>
        <div>
          <strong>Assigned Expenses:</strong><br>
          R ${report.assignedExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </div>
        <div style="background: #4caf50; color: white; padding: 10px; border-radius: 5px; grid-column: 1 / -1;">
          <strong>Net Contribution:</strong><br>
          R ${report.netContribution.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <h4>Payment History</h4>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount</th>
        </tr>
        ${report.paymentHistory.map(payment => `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${payment.date}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R ${payment.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </table>

      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button class="btn-secondary" onclick="downloadReportPDF('tenant')">📄 Download PDF</button>
        <button class="btn-secondary" onclick="downloadReportCSV('tenant')">📊 Download CSV</button>
      </div>
    `;

    document.getElementById('reportDetailsContent').innerHTML = html;
  } catch (error) {
    showAlert('❌ Error generating report: ' + error.message, 'danger');
  }
}

function downloadReportPDF(reportType) {
  try {
    const content = generatePDFReport({}, reportType);
    downloadFile(content, `report-${reportType}-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    showAlert('✅ PDF ready to download');
  } catch (error) {
    showAlert('❌ Error downloading PDF: ' + error.message, 'danger');
  }
}

function downloadReportCSV(reportType) {
  try {
    const content = generateCSVReport([], reportType);
    downloadFile(content, `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showAlert('✅ CSV downloaded');
  } catch (error) {
    showAlert('❌ Error downloading CSV: ' + error.message, 'danger');
  }
}