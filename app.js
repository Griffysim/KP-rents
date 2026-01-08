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
let currentUser = { type: null, tenantId: null, propertyId: null };

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
      .select('*');
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

async function updateMessageResolved(messageId, resolved) {
  try {
    const { error } = await supabaseClient
      .from('messages')
      .update({ resolved })
      .eq('id', messageId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating message:', error);
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
  
  if (!propertySelect) return; // Exit if element doesn't exist yet
  
  propertySelect.innerHTML = '<option value="">Select your property</option>';
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
  currentUser = { type: null, tenantId: null, propertyId: null };
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
async function showTab(tabName) {
  const tabs = document.querySelectorAll('.content-section');
  const navTabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  navTabs.forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabName + 'Tab').classList.add('active');
  event.target.classList.add('active');
  if (tabName === 'dashboard') {
    await loadLandlordDashboard();
  } else if (tabName === 'tenants') {
    await loadTenantsList();
  } else if (tabName === 'utilities') {
    await loadUtilitiesList();
  } else if (tabName === 'invoices') {
    await loadInvoicesTab();
  } else if (tabName === 'messages') {
    await loadMessagesList();
  } else if (tabName === 'settings') {
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
          <button class="btn-small" onclick="manageTenant('${tenant?.id || ''}')">Manage</button>
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

async function openEditTenantModal(tenantId) {
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
    showAlert('Tenant updated successfully');
    await loadTenantsList();
  } catch (error) {
    showAlert('Error updating tenant: ' + error.message, 'danger');
  }
}

async function manageTenant(tenantId) {
  await openEditTenantModal(tenantId);
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
    showAlert('Payment recorded successfully');
    await loadTenantsList();
  } catch (error) {
    showAlert('Error recording payment: ' + error.message, 'danger');
  }
}

async function openGenerateInvoiceModal(tenantId) {
  const tenant = await getTenantById(tenantId);
  const property = await getPropertyById(tenant.property_id);
  const utilities = await getUtilities();
  
  const tenantUtilities = utilities.filter(u => u.tenant_id === tenantId);
  
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
      const utilAmount = (util.electricity_reading * 0.15) + (util.water_reading * 8.50);
      utilityContainer.innerHTML += `
        <div class="utility-line">
          <label>${util.date || 'Utility'}</label>
          <input type="number" value="${utilAmount.toFixed(2)}" step="0.01" class="utility-amount" data-utility-id="${util.id}">
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
  const additionalCharges = document.getElementById('invoiceAdditionalCharges').value || '';
  
  const utilityElements = document.querySelectorAll('.utility-amount');
  const utilities = [];
  utilityElements.forEach((elem, index) => {
    const label = elem.previousElementSibling.textContent || `Utility ${index + 1}`;
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
    showAlert('❌ Error: ' + error.message, 'danger');
    const generateBtn = document.getElementById('generateInvoiceBtn');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate & Send Invoice';
  }
}

async function loadUtilitiesList() {
  const utilities = await getUtilities();
  const tenants = await getTenants();
  const properties = await getProperties();
  const container = document.getElementById('utilitiesList');
  
  if (utilities.length === 0) {
    container.innerHTML = '<p>No utility readings submitted yet.</p>';
    return;
  }
  
  let html = '<table class="utilities-table"><thead><tr><th>Property</th><th>Tenant</th><th>Date</th><th>Electricity (kWh)</th><th>Water (m³)</th><th>Notes</th></tr></thead><tbody>';
  utilities.forEach(util => {
    const tenant = tenants.find(t => t.id === util.tenant_id);
    const property = properties.find(p => p.id === tenant?.property_id);
    html += `
      <tr>
        <td>${property?.name || 'N/A'}</td>
        <td>${tenant?.name || 'N/A'}</td>
        <td>${util.date}</td>
        <td>${util.electricity_reading}</td>
        <td>${util.water_reading}</td>
        <td>${util.note || '-'}</td>
      </tr>
    `;
  });
  html += '</tbody></table>';
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
  const modal = document.getElementById('invoiceDetailsModal');
  document.getElementById('invoiceDetailsContent').innerHTML = `
    <pre>${invoice.content}</pre>
  `;
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
  
  if (messages.length === 0) {
    container.innerHTML = '<p>No messages from tenants yet.</p>';
    return;
  }
  
  let html = '';
  messages.forEach(msg => {
    const tenant = tenants.find(t => t.id === msg.tenant_id);
    const property = properties.find(p => p.id === tenant?.property_id);
    const statusBadge = msg.resolved ? 'badge-resolved' : 'badge-open';
    html += `
      <div class="message-card">
        <h4>${msg.subject}</h4>
        <p><strong>From:</strong> ${tenant?.name || 'N/A'} (${property?.name || 'N/A'})</p>
        <p><strong>Date:</strong> ${msg.date}</p>
        <p><strong>Status:</strong> <span class="badge ${statusBadge}">${msg.resolved ? 'Resolved' : 'Open'}</span></p>
        <p>${msg.body}</p>
        <button class="btn-secondary" onclick="toggleMessageResolved('${msg.id}', ${!msg.resolved})">
          ${msg.resolved ? 'Reopen' : 'Mark Resolved'}
        </button>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function toggleMessageResolved(messageId, resolved) {
  try {
    await updateMessageResolved(messageId, resolved);
    showAlert(resolved ? '✅ Message marked as resolved' : '✅ Message reopened');
    await loadMessagesList();
  } catch (error) {
    showAlert('❌ Error updating message: ' + error.message, 'danger');
  }
}

async function loadSettings() {
  const landlord = await getLandlordData();
  document.getElementById('landlordName').value = landlord.name || '';
  document.getElementById('landlordEmail').value = landlord.email || '';
  document.getElementById('landlordAddress').value = landlord.address || '';
  document.getElementById('landlordPhone').value = landlord.phone || '';
  document.getElementById('landlordBankAccount').value = landlord.bank_account || '';
}

async function saveSettings() {
  const data = {
    name: document.getElementById('landlordName').value,
    email: document.getElementById('landlordEmail').value,
    address: document.getElementById('landlordAddress').value,
    phone: document.getElementById('landlordPhone').value,
    bank_account: document.getElementById('landlordBankAccount').value
  };
  try {
    await saveLandlordData(data);
    showAlert('✅ Settings saved successfully');
  } catch (error) {
    showAlert('❌ Error saving settings: ' + error.message, 'danger');
  }
}

async function addNewTenantForm() {
  const propertyId = document.getElementById('newTenantProperty').value;
  const name = document.getElementById('newTenantName').value;
  const email = document.getElementById('newTenantEmail').value;
  const phone = document.getElementById('newTenantPhone').value;
  const password = document.getElementById('newTenantPassword').value;
  
  if (!propertyId || !name || !email || !phone || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const property = await getPropertyById(propertyId);
    await addNewTenant({
      id: 'ten_' + Date.now(),
      property_id: propertyId,
      name,
      email,
      phone,
      tenant_password: password,
      monthly_rent: property.monthly_rent,
      unit_number: property.unit_number
    });
    closeModal('addTenantModal');
    showAlert('✅ Tenant added successfully');
    await loadTenantsList();
  } catch (error) {
    showAlert('❌ Error adding tenant: ' + error.message, 'danger');
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
  
  document.getElementById('tenantPropertyName').textContent = property.name;
  document.getElementById('tenantMonthlyRent').textContent = 'R ' + tenant.monthly_rent.toLocaleString();
  document.getElementById('tenantRentStatus').textContent = 'Pending';
}

async function submitMeterReading() {
  const date = document.getElementById('meterDate').value;
  const electricity = parseFloat(document.getElementById('electricityReading').value);
  const water = parseFloat(document.getElementById('waterReading').value);
  const notes = document.getElementById('meterNotes').value;
  
  if (!date || !electricity || !water) {
    alert('Please fill in required fields');
    return;
  }
  
  try {
    await saveUtility({
      id: 'util_' + Date.now(),
      tenant_id: currentUser.tenantId,
      date,
      electricity_reading: electricity,
      water_reading: water,
      note: notes
    });
    showAlert('✅ Meter reading submitted successfully');
    document.getElementById('meterDate').value = '';
    document.getElementById('electricityReading').value = '';
    document.getElementById('waterReading').value = '';
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
  const tenantMessages = messages.filter(msg => msg.tenant_id === currentUser.tenantId);
  const container = document.getElementById('tenantMessagesList');
  
  if (tenantMessages.length === 0) {
    container.innerHTML = '<p>No messages sent yet.</p>';
    return;
  }
  
  let html = '';
  tenantMessages.forEach(msg => {
    const statusBadge = msg.resolved ? 'Resolved' : 'Open';
    html += `
      <div class="message-card">
        <p><strong>Date:</strong> ${msg.date} <span class="badge">${statusBadge}</span></p>
        <p><strong>Subject:</strong> ${msg.subject}</p>
        <p>${msg.body}</p>
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
