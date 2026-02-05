// =======================
// KP-RENTS APP.JS
// Corrected to match actual database schema
// =======================

// Supabase Configuration
const SUPABASE_URL = 'https://fjaxofsasorfbynqustd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYXhvZnNhc29yZmJ5bnF1c3RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5OTk0NSwiZXhwIjoyMDgyNDc1OTQ1fQ.Y8AEhH3SHYz-BCCoTsJYLs6SdUg1tsUDG4OwLS4Ochs';
const NETLIFY_FUNCTIONS_URL = '/.netlify/functions';

// Global State
let currentUser = null;
let currentUserType = null; // 'landlord' or 'tenant'

// =======================
// INITIALIZATION
// =======================

window.onload = async function() {
  console.log('KP-Rents initialized');
  await loadPropertySelectForTenants();
  setTodayDate();
};

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    if (!input.value) input.value = today;
  });
}

// =======================
// AUTHENTICATION
// =======================

function switchLoginMode(mode) {
  const landlordForm = document.getElementById('landlordLoginForm');
  const tenantForm = document.getElementById('tenantLoginForm');
  const buttons = document.querySelectorAll('.login-btn-option');

  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  if (mode === 'landlord') {
    landlordForm.classList.add('active');
    tenantForm.classList.remove('active');
  } else {
    landlordForm.classList.remove('active');
    tenantForm.classList.add('active');
  }
}

async function loginLandlord() {
  const password = document.getElementById('landlordPassword').value;

  if (password === 'admin123') {
    currentUser = { id: 'landlord', name: 'Landlord' };
    currentUserType = 'landlord';
    showApp('landlord');
    await loadLandlordDashboard();
    showAlert('success', 'Welcome back, Landlord!');
  } else {
    showAlert('danger', 'Invalid password');
  }
}

async function loginTenant() {
  const propertyId = document.getElementById('propertySelect').value;
  const password = document.getElementById('tenantPassword').value;

  if (!propertyId) {
    showAlert('danger', 'Please select a property');
    return;
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*, properties(name, monthly_rent)')
    .eq('property_id', propertyId)
    .eq('tenant_password', password)
    .single();

  if (error || !tenant) {
    showAlert('danger', 'Invalid property or password');
    return;
  }

  currentUser = tenant;
  currentUserType = 'tenant';
  showApp('tenant');
  await loadTenantDashboard();
  showAlert('success', `Welcome, ${tenant.name}!`);
}

function logout() {
  currentUser = null;
  currentUserType = null;
  document.getElementById('appContainer').classList.remove('active');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('landlordPassword').value = '';
  document.getElementById('tenantPassword').value = '';
}

function showApp(userType) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');

  if (userType === 'landlord') {
    document.getElementById('landlordSection').style.display = 'block';
    document.getElementById('tenantSection').style.display = 'none';
    document.getElementById('userDisplayName').textContent = 'Landlord Dashboard';
  } else {
    document.getElementById('landlordSection').style.display = 'none';
    document.getElementById('tenantSection').style.display = 'block';
    document.getElementById('userDisplayName').textContent = `Logged in as: ${currentUser.name}`;
  }
}

// =======================
// LANDLORD DASHBOARD
// =======================

async function loadLandlordDashboard() {
  await Promise.all([
    loadDashboardStats(),
    loadPropertiesTable(),
    loadSettings(),
    loadExpenseCategories()
  ]);
}

async function loadDashboardStats() {
  const { data: properties } = await supabase.from('properties').select('*');
  const { data: tenants } = await supabase.from('tenants').select('*');

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .gte('date', currentMonth + '-01');

  const occupied = tenants?.length || 0;
  const paidTenants = new Set(payments?.map(p => p.tenant_id) || []).size;

  document.getElementById('totalPropertiesCount').textContent = properties?.length || 0;
  document.getElementById('occupiedCount').textContent = occupied;
  document.getElementById('paidCount').textContent = paidTenants;
  document.getElementById('unpaidCount').textContent = occupied - paidTenants;
}

async function loadPropertiesTable() {
  const { data: properties } = await supabase
    .from('properties')
    .select(`
      *,
      tenants (
        id,
        name,
        monthly_rent
      )
    `);

  const tbody = document.getElementById('propertiesTableBody');
  tbody.innerHTML = '';

  if (!properties || properties.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No properties added yet</td></tr>';
    return;
  }

  for (const property of properties) {
    const tenant = property.tenants && property.tenants.length > 0 ? property.tenants[0] : null;
    const status = tenant ? 
      '<span class="badge badge-paid">Occupied</span>' : 
      '<span class="badge badge-unpaid">Vacant</span>';

    const row = `
      <tr>
        <td>${property.name}</td>
        <td>${tenant ? tenant.name : 'No tenant'}</td>
        <td>R${(property.monthly_rent || 0).toFixed(2)}</td>
        <td>${status}</td>
        <td>
          <button class="btn-small" onclick="editProperty('${property.id}')">Edit</button>
          <button class="btn-small" onclick="deleteProperty('${property.id}')">Delete</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  }
}

// =======================
// PROPERTY MANAGEMENT
// =======================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

async function addNewPropertyForm() {
  const name = document.getElementById('newPropertyName').value.trim();
  const unitNumber = document.getElementById('newPropertyUnitNumber').value.trim();
  const rent = parseFloat(document.getElementById('newPropertyRent').value) || 0;

  if (!name) {
    showAlert('danger', 'Property name is required');
    return;
  }

  const propertyId = 'prop_' + Date.now();
  const displayName = unitNumber ? `${name} - ${unitNumber}` : name;

  const { error } = await supabase.from('properties').insert([{
    id: propertyId,
    name: displayName,
    monthly_rent: rent
  }]);

  if (error) {
    showAlert('danger', 'Error adding property: ' + error.message);
    return;
  }

  showAlert('success', 'Property added successfully!');
  closeModal('addPropertyModal');
  document.getElementById('newPropertyName').value = '';
  document.getElementById('newPropertyUnitNumber').value = '';
  document.getElementById('newPropertyRent').value = '';
  await loadPropertiesTable();
  await loadDashboardStats();
}

async function editProperty(propertyId) {
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (!property) return;

  document.getElementById('editPropertyId').value = property.id;
  document.getElementById('editPropertyName').value = property.name;
  document.getElementById('editPropertyUnitNumber').value = '';
  document.getElementById('editPropertyRent').value = property.monthly_rent || 0;

  openModal('editPropertyModal');
}

async function saveProperty() {
  const id = document.getElementById('editPropertyId').value;
  const name = document.getElementById('editPropertyName').value.trim();
  const rent = parseFloat(document.getElementById('editPropertyRent').value) || 0;

  if (!name) {
    showAlert('danger', 'Property name is required');
    return;
  }

  const { error } = await supabase
    .from('properties')
    .update({ name, monthly_rent: rent })
    .eq('id', id);

  if (error) {
    showAlert('danger', 'Error updating property: ' + error.message);
    return;
  }

  showAlert('success', 'Property updated successfully!');
  closeModal('editPropertyModal');
  await loadPropertiesTable();
  await loadDashboardStats();
}

async function deleteProperty(propertyId) {
  if (!confirm('Are you sure you want to delete this property?')) return;

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId);

  if (error) {
    showAlert('danger', 'Error deleting property: ' + error.message);
    return;
  }

  showAlert('success', 'Property deleted successfully!');
  await loadPropertiesTable();
  await loadDashboardStats();
}

// =======================
// TENANT MANAGEMENT
// =======================

async function populateModalSelects() {
  const { data: properties } = await supabase.from('properties').select('*');

  const select = document.getElementById('newTenantProperty');
  select.innerHTML = '<option value="">-- Select Property --</option>';

  if (properties) {
    properties.forEach(prop => {
      select.innerHTML += `<option value="${prop.id}">${prop.name}</option>`;
    });
  }
}

async function loadTenantsList() {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, properties(name, monthly_rent)');

  const container = document.getElementById('tenantsList');
  container.innerHTML = '';

  if (!tenants || tenants.length === 0) {
    container.innerHTML = '<p>No tenants added yet.</p>';
    return;
  }

  for (const tenant of tenants) {
    const property = tenant.properties || {};

    // Get account balance
    const { data: balance } = await supabase
      .rpc('get_tenant_balance', { p_tenant_id: tenant.id });

    const tenantCard = `
      <div class="tenant-card">
        <h4>${tenant.name}</h4>
        <p><strong>Property:</strong> ${property.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${tenant.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${tenant.phone || 'N/A'}</p>
        <p><strong>Monthly Rent:</strong> R${(tenant.monthly_rent || property.monthly_rent || 0).toFixed(2)}</p>
        <p><strong>Account Balance:</strong> R${(balance || 0).toFixed(2)}</p>
        <button class="btn-small" onclick="editTenant('${tenant.id}')">Edit</button>
        <button class="btn-small" onclick="viewTenantAccount('${tenant.id}')">View Account</button>
        <button class="btn-small" onclick="openRecordPayment('${tenant.id}')">Record Payment</button>
        <button class="btn-small" onclick="openGenerateInvoice('${tenant.id}')">Generate Invoice</button>
        <button class="btn-small" onclick="deleteTenant('${tenant.id}')">Remove</button>
      </div>
    `;
    container.innerHTML += tenantCard;
  }
}

async function addNewTenantForm() {
  const propertyId = document.getElementById('newTenantProperty').value;
  const name = document.getElementById('newTenantName').value.trim();
  const email = document.getElementById('newTenantEmail').value.trim();
  const phone = document.getElementById('newTenantPhone').value.trim();
  const password = document.getElementById('newTenantPassword').value.trim();

  if (!propertyId || !name) {
    showAlert('danger', 'Property and tenant name are required');
    return;
  }

  // Get property rent
  const { data: property } = await supabase
    .from('properties')
    .select('monthly_rent')
    .eq('id', propertyId)
    .single();

  const tenantId = 'tenant_' + Date.now();

  const { error } = await supabase.from('tenants').insert([{
    id: tenantId,
    property_id: propertyId,
    name,
    email,
    phone,
    tenant_password: password || 'tenant123',
    monthly_rent: property?.monthly_rent || 0
  }]);

  if (error) {
    showAlert('danger', 'Error adding tenant: ' + error.message);
    return;
  }

  showAlert('success', 'Tenant added successfully!');
  closeModal('addTenantModal');
  document.getElementById('newTenantName').value = '';
  document.getElementById('newTenantEmail').value = '';
  document.getElementById('newTenantPhone').value = '';
  document.getElementById('newTenantPassword').value = '';
  await loadTenantsList();
  await loadDashboardStats();
  await loadPropertiesTable();
}

async function editTenant(tenantId) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (!tenant) return;

  document.getElementById('editTenantId').value = tenant.id;
  document.getElementById('editTenantName').value = tenant.name;
  document.getElementById('editTenantEmail').value = tenant.email || '';
  document.getElementById('editTenantPhone').value = tenant.phone || '';

  openModal('editTenantModal');
}

async function saveTenant() {
  const id = document.getElementById('editTenantId').value;
  const name = document.getElementById('editTenantName').value.trim();
  const email = document.getElementById('editTenantEmail').value.trim();
  const phone = document.getElementById('editTenantPhone').value.trim();

  if (!name) {
    showAlert('danger', 'Tenant name is required');
    return;
  }

  const { error } = await supabase
    .from('tenants')
    .update({ name, email, phone })
    .eq('id', id);

  if (error) {
    showAlert('danger', 'Error updating tenant: ' + error.message);
    return;
  }

  showAlert('success', 'Tenant updated successfully!');
  closeModal('editTenantModal');
  await loadTenantsList();
}

async function deleteTenant(tenantId) {
  if (!confirm('Are you sure you want to remove this tenant?')) return;

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId);

  if (error) {
    showAlert('danger', 'Error removing tenant: ' + error.message);
    return;
  }

  showAlert('success', 'Tenant removed successfully!');
  await loadTenantsList();
  await loadDashboardStats();
  await loadPropertiesTable();
}

// =======================
// TENANT ACCOUNT LEDGER
// =======================

async function viewTenantAccount(tenantId) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, properties(name)')
    .eq('id', tenantId)
    .single();

  if (!tenant) return;

  const { data: transactions } = await supabase
    .from('tenant_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  let html = `
    <h3>Account Statement: ${tenant.name}</h3>
    <p><strong>Property:</strong> ${tenant.properties?.name || 'N/A'}</p>
    <p><strong>Monthly Rent:</strong> R${(tenant.monthly_rent || 0).toFixed(2)}</p>
    <hr>
    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Debit</th>
          <th>Credit</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (transactions && transactions.length > 0) {
    transactions.forEach(t => {
      html += `
        <tr>
          <td>${t.date}</td>
          <td>${t.description}</td>
          <td>R${t.debit.toFixed(2)}</td>
          <td>R${t.credit.toFixed(2)}</td>
          <td>R${t.balance.toFixed(2)}</td>
        </tr>
      `;
    });
  } else {
    html += '<tr><td colspan="5" style="text-align: center;">No transactions yet</td></tr>';
  }

  html += `
      </tbody>
    </table>
  `;

  document.getElementById('reportDetailsContent').innerHTML = html;
  openModal('reportDetailsModal');
}

// =======================
// PAYMENT RECORDING
// =======================

async function openRecordPayment(tenantId) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, properties(name)')
    .eq('id', tenantId)
    .single();

  if (!tenant) return;

  document.getElementById('paymentTenantId').value = tenantId;
  document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('paymentAmount').value = tenant.monthly_rent || 0;

  openModal('recordPaymentModal');
}

async function recordPayment() {
  const tenantId = document.getElementById('paymentTenantId').value;
  const date = document.getElementById('paymentDate').value;
  const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
  const method = document.getElementById('paymentMethod').value;
  const notes = document.getElementById('paymentNotes').value.trim();

  if (!date || amount <= 0) {
    showAlert('danger', 'Valid date and amount are required');
    return;
  }

  const paymentId = 'pay_' + Date.now();

  // Insert payment
  const { error: payError } = await supabase.from('payments').insert([{
    id: paymentId,
    tenant_id: tenantId,
    date,
    amount,
    method,
    note: notes
  }]);

  if (payError) {
    showAlert('danger', 'Error recording payment: ' + payError.message);
    return;
  }

  // Add to tenant account ledger
  const { error: ledgerError } = await supabase.from('tenant_accounts').insert([{
    id: 'acc_' + Date.now(),
    tenant_id: tenantId,
    date,
    transaction_type: 'payment',
    description: `Payment received - ${method}`,
    debit: 0,
    credit: amount,
    related_payment_id: paymentId
  }]);

  if (ledgerError) {
    console.error('Ledger error:', ledgerError);
  }

  showAlert('success', 'Payment recorded successfully!');
  closeModal('recordPaymentModal');
  document.getElementById('paymentNotes').value = '';
  await loadTenantsList();
  await loadDashboardStats();
}

// =======================
// UTILITIES MANAGEMENT
// =======================

async function loadUtilitiesList() {
  // Load water utilities
  const { data: waterReadings } = await supabase
    .from('utilities_water')
    .select('*, tenants(name), properties(name)')
    .order('date', { ascending: false });

  // Load electricity utilities
  const { data: elecReadings } = await supabase
    .from('utilities_electricity')
    .select('*, tenants(name), properties(name)')
    .order('date', { ascending: false });

  const container = document.getElementById('utilitiesList');
  container.innerHTML = '<h3>Water Readings</h3>';

  if (waterReadings && waterReadings.length > 0) {
    waterReadings.forEach(reading => {
      container.innerHTML += `
        <div class="tenant-card">
          <h4>💧 ${reading.tenants?.name || 'Unknown'} - ${reading.properties?.name || 'Unknown'}</h4>
          <p><strong>Date:</strong> ${reading.date}</p>
          <p><strong>Previous Reading:</strong> ${reading.previous_reading} m³</p>
          <p><strong>Current Reading:</strong> ${reading.current_reading} m³</p>
          <p><strong>Consumption:</strong> ${reading.consumption} m³</p>
          <p><strong>Rate:</strong> R${reading.rate}/m³</p>
          <p><strong>Amount:</strong> R${reading.amount.toFixed(2)}</p>
          ${reading.note ? `<p><strong>Note:</strong> ${reading.note}</p>` : ''}
        </div>
      `;
    });
  } else {
    container.innerHTML += '<p>No water readings yet.</p>';
  }

  container.innerHTML += '<h3 style="margin-top: 30px;">Electricity Readings</h3>';

  if (elecReadings && elecReadings.length > 0) {
    elecReadings.forEach(reading => {
      container.innerHTML += `
        <div class="tenant-card">
          <h4>⚡ ${reading.tenants?.name || 'Unknown'} - ${reading.properties?.name || 'Unknown'}</h4>
          <p><strong>Date:</strong> ${reading.date}</p>
          <p><strong>Previous Reading:</strong> ${reading.previous_reading} kWh</p>
          <p><strong>Current Reading:</strong> ${reading.current_reading} kWh</p>
          <p><strong>Consumption:</strong> ${reading.consumption} kWh</p>
          <p><strong>Rate:</strong> R${reading.rate}/kWh</p>
          <p><strong>Amount:</strong> R${reading.amount.toFixed(2)}</p>
          ${reading.note ? `<p><strong>Note:</strong> ${reading.note}</p>` : ''}
        </div>
      `;
    });
  } else {
    container.innerHTML += '<p>No electricity readings yet.</p>';
  }
}

// =======================
// INVOICE GENERATION
// =======================

async function openGenerateInvoice(tenantId) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, properties(name, monthly_rent)')
    .eq('id', tenantId)
    .single();

  if (!tenant) return;

  document.getElementById('invoiceTenantId').value = tenant.id;
  document.getElementById('invoiceTenantName').value = tenant.name;
  document.getElementById('invoiceTenantEmail').value = tenant.email || '';
  document.getElementById('invoicePropertyName').value = tenant.properties?.name || '';
  document.getElementById('invoiceUnitNumber').value = '';
  document.getElementById('invoiceBaseRent').value = tenant.monthly_rent || tenant.properties?.monthly_rent || 0;

  // Set default billing period (current month)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  document.getElementById('invoiceBillingPeriodStart').value = firstDay.toISOString().split('T')[0];
  document.getElementById('invoiceBillingPeriodEnd').value = lastDay.toISOString().split('T')[0];

  // Load latest utilities for this tenant
  await loadInvoiceUtilities(tenantId);

  openModal('generateInvoiceModal');
}

async function loadInvoiceUtilities(tenantId) {
  // Get utility rates
  const { data: rates } = await supabase
    .from('utility_rates')
    .select('*')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  const waterRate = rates?.water_rate || 8.50;
  const elecRate = rates?.electricity_rate || 0.15;

  // Get latest water reading
  const { data: waterReading } = await supabase
    .from('utilities_water')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // Get latest electricity reading
  const { data: elecReading } = await supabase
    .from('utilities_electricity')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const container = document.getElementById('invoiceUtilitiesContainer');
  container.innerHTML = '';

  // Water utility
  if (waterReading) {
    container.innerHTML += `
      <div class="utility-line">
        <label>💧 Water: ${waterReading.consumption} m³ @ R${waterReading.rate}/m³</label>
        <span class="utility-amount">R${waterReading.amount.toFixed(2)}</span>
      </div>
    `;
  } else {
    container.innerHTML += '<p>No water readings available</p>';
  }

  // Electricity utility
  if (elecReading) {
    container.innerHTML += `
      <div class="utility-line">
        <label>⚡ Electricity: ${elecReading.consumption} kWh @ R${elecReading.rate}/kWh</label>
        <span class="utility-amount">R${elecReading.amount.toFixed(2)}</span>
      </div>
    `;
  } else {
    container.innerHTML += '<p>No electricity readings available</p>';
  }
}

async function generateAndSendInvoice() {
  const tenantId = document.getElementById('invoiceTenantId').value;
  const tenantName = document.getElementById('invoiceTenantName').value;
  const tenantEmail = document.getElementById('invoiceTenantEmail').value;
  const propertyName = document.getElementById('invoicePropertyName').value;
  const baseRent = parseFloat(document.getElementById('invoiceBaseRent').value) || 0;
  const periodStart = document.getElementById('invoiceBillingPeriodStart').value;
  const periodEnd = document.getElementById('invoiceBillingPeriodEnd').value;
  const additionalCharges = document.getElementById('invoiceAdditionalCharges').value.trim();

  // Get latest utilities
  const { data: waterReading } = await supabase
    .from('utilities_water')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const { data: elecReading } = await supabase
    .from('utilities_electricity')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // Get landlord details
  const { data: landlord } = await supabase
    .from('landlord_data')
    .select('*')
    .limit(1)
    .single();

  // Calculate total
  let total = baseRent;
  let utilityLines = '';

  if (waterReading) {
    total += waterReading.amount;
    utilityLines += `Water: ${waterReading.consumption} m³ @ R${waterReading.rate}/m³ = R${waterReading.amount.toFixed(2)}
`;
  }

  if (elecReading) {
    total += elecReading.amount;
    utilityLines += `Electricity: ${elecReading.consumption} kWh @ R${elecReading.rate}/kWh = R${elecReading.amount.toFixed(2)}
`;
  }

  // Parse additional charges
  if (additionalCharges) {
    const lines = additionalCharges.split('
');
    lines.forEach(line => {
      const match = line.match(/(-?\d+\.?\d*)/);
      if (match) {
        total += parseFloat(match[0]);
      }
    });
  }

  // Generate invoice content
  const invoiceContent = `
INVOICE
=====================================
From: ${landlord?.name || 'Landlord'}
Email: ${landlord?.email || ''}
Phone: ${landlord?.phone || ''}
Bank: ${landlord?.bank_account || ''}

To: ${tenantName}
Email: ${tenantEmail}
Property: ${propertyName}

Billing Period: ${periodStart} to ${periodEnd}
=====================================

Base Rent: R${baseRent.toFixed(2)}

${utilityLines}

${additionalCharges ? 'Additional Charges:
' + additionalCharges + '
' : ''}

TOTAL DUE: R${total.toFixed(2)}
=====================================
  `.trim();

  const invoiceId = 'inv_' + Date.now();

  // Save invoice
  const { error: invError } = await supabase.from('invoices').insert([{
    id: invoiceId,
    tenant_id: tenantId,
    period_start: periodStart,
    period_end: periodEnd,
    total,
    content: invoiceContent,
    created_at: new Date().toISOString().split('T')[0]
  }]);

  if (invError) {
    showAlert('danger', 'Error generating invoice: ' + invError.message);
    return;
  }

  // Add to tenant account ledger
  const { error: ledgerError } = await supabase.from('tenant_accounts').insert([{
    id: 'acc_' + Date.now(),
    tenant_id: tenantId,
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'rent',
    description: `Invoice for ${periodStart} to ${periodEnd}`,
    debit: total,
    credit: 0,
    related_invoice_id: invoiceId
  }]);

  if (ledgerError) {
    console.error('Ledger error:', ledgerError);
  }

  showAlert('success', 'Invoice generated successfully!');
  closeModal('generateInvoiceModal');
  await loadInvoicesList();
  await loadTenantsList();
}

async function loadInvoicesList() {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, tenants(name, properties(name))')
    .order('created_at', { ascending: false });

  const container = document.getElementById('invoicesList');
  container.innerHTML = '';

  if (!invoices || invoices.length === 0) {
    container.innerHTML = '<p>No invoices generated yet.</p>';
    return;
  }

  invoices.forEach(invoice => {
    const invoiceCard = `
      <div class="invoice-card">
        <h4>Invoice #${invoice.id.slice(-8)}</h4>
        <p><strong>Tenant:</strong> ${invoice.tenants?.name || 'Unknown'}</p>
        <p><strong>Property:</strong> ${invoice.tenants?.properties?.name || 'Unknown'}</p>
        <p><strong>Period:</strong> ${invoice.period_start} to ${invoice.period_end}</p>
        <p><strong>Total:</strong> R${invoice.total.toFixed(2)}</p>
        <p><strong>Created:</strong> ${invoice.created_at}</p>
        <button class="btn-small" onclick="viewInvoice('${invoice.id}')">View Details</button>
      </div>
    `;
    container.innerHTML += invoiceCard;
  });
}

async function viewInvoice(invoiceId) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (!invoice) return;

  document.getElementById('invoiceDetailsContent').innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace; background: #f5f5f5; padding: 20px; border-radius: 5px;">
${invoice.content}
    </pre>
  `;

  openModal('invoiceDetailsModal');
}

// =======================
// MESSAGES
// =======================

async function loadMessagesList() {
  const { data: messages } = await supabase
    .from('messages')
    .select('*, tenants(name)')
    .order('date', { ascending: false });

  const container = document.getElementById('messagesList');
  container.innerHTML = '';

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p>No messages yet.</p>';
    return;
  }

  messages.forEach(msg => {
    const status = msg.resolved ? 
      '<span class="badge badge-resolved">Resolved</span>' : 
      '<span class="badge badge-open">Open</span>';

    const messageCard = `
      <div class="message-card">
        <h4>${msg.subject} ${status}</h4>
        <p><strong>From:</strong> ${msg.tenants?.name || 'Unknown'}</p>
        <p><strong>Date:</strong> ${msg.date}</p>
        <p><strong>Message:</strong> ${msg.body}</p>
        ${msg.reply_content ? `<p><strong>Your Reply:</strong> ${msg.reply_content}</p>` : ''}
        <button class="btn-small" onclick="openReplyModal('${msg.id}', '${msg.tenants?.name}')">Reply</button>
        ${!msg.resolved ? `<button class="btn-small" onclick="markMessageResolved('${msg.id}')">Mark Resolved</button>` : ''}
      </div>
    `;
    container.innerHTML += messageCard;
  });
}

async function openReplyModal(messageId, tenantName) {
  document.getElementById('replyMessageId').value = messageId;
  document.getElementById('replyTenantName').value = tenantName;
  document.getElementById('replyBody').value = '';
  openModal('replyModal');
}

async function sendReply() {
  const messageId = document.getElementById('replyMessageId').value;
  const reply = document.getElementById('replyBody').value.trim();

  if (!reply) {
    showAlert('danger', 'Reply message is required');
    return;
  }

  const { error } = await supabase
    .from('messages')
    .update({ 
      reply_content: reply,
      resolved: true 
    })
    .eq('id', messageId);

  if (error) {
    showAlert('danger', 'Error sending reply: ' + error.message);
    return;
  }

  showAlert('success', 'Reply sent successfully!');
  closeModal('replyModal');
  await loadMessagesList();
}

async function markMessageResolved(messageId) {
  const { error } = await supabase
    .from('messages')
    .update({ resolved: true })
    .eq('id', messageId);

  if (error) {
    showAlert('danger', 'Error updating message: ' + error.message);
    return;
  }

  showAlert('success', 'Message marked as resolved');
  await loadMessagesList();
}

// =======================
// EXPENSES MANAGEMENT
// =======================

async function loadExpenseCategories() {
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name');

  const select = document.getElementById('expenseCategorySelect');
  select.innerHTML = '<option value="">-- Select Category --</option>';

  if (categories) {
    categories.forEach(cat => {
      select.innerHTML += `<option value="${cat.name}">${cat.icon || ''} ${cat.name}</option>`;
    });
  }

  // Also populate property select for expenses
  const { data: properties } = await supabase.from('properties').select('*');
  const propSelect = document.getElementById('expensePropertySelect');
  propSelect.innerHTML = '<option value="">General (All Properties)</option>';

  if (properties) {
    properties.forEach(prop => {
      propSelect.innerHTML += `<option value="${prop.id}">${prop.name}</option>`;
    });
  }
}

async function openAddExpenseModal() {
  document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
  openModal('addExpenseModal');
}

async function saveExpenseForm() {
  const category = document.getElementById('expenseCategorySelect').value;
  const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
  const date = document.getElementById('expenseDate').value;
  const propertyId = document.getElementById('expensePropertySelect').value || null;
  const description = document.getElementById('expenseDescription').value.trim();

  if (!category || !date || amount <= 0) {
    showAlert('danger', 'Category, date, and valid amount are required');
    return;
  }

  const { error } = await supabase.from('expenses').insert([{
    category,
    amount,
    date,
    property_id: propertyId,
    description
  }]);

  if (error) {
    showAlert('danger', 'Error saving expense: ' + error.message);
    return;
  }

  showAlert('success', 'Expense added successfully!');
  closeModal('addExpenseModal');
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseDescription').value = '';
  await loadExpensesList();
}

async function loadExpensesList() {
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, properties(name)')
    .order('date', { ascending: false });

  const container = document.getElementById('expensesList');
  container.innerHTML = '';

  if (!expenses || expenses.length === 0) {
    container.innerHTML = '<p>No expenses recorded yet.</p>';
    return;
  }

  // Group by category
  const grouped = {};
  expenses.forEach(exp => {
    if (!grouped[exp.category]) {
      grouped[exp.category] = [];
    }
    grouped[exp.category].push(exp);
  });

  Object.keys(grouped).sort().forEach(category => {
    const categoryTotal = grouped[category].reduce((sum, exp) => sum + exp.amount, 0);

    container.innerHTML += `<h3>${category} (Total: R${categoryTotal.toFixed(2)})</h3>`;

    grouped[category].forEach(exp => {
      container.innerHTML += `
        <div class="tenant-card">
          <p><strong>Date:</strong> ${exp.date}</p>
          <p><strong>Amount:</strong> R${exp.amount.toFixed(2)}</p>
          ${exp.properties ? `<p><strong>Property:</strong> ${exp.properties.name}</p>` : '<p><strong>Property:</strong> General</p>'}
          ${exp.description ? `<p><strong>Description:</strong> ${exp.description}</p>` : ''}
        </div>
      `;
    });
  });
}

// =======================
// REPORTS
// =======================

async function loadReportsTab() {
  const reportsContainer = document.getElementById('reportsContainer');

  reportsContainer.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
      <div class="report-card" onclick="generateIncomeReport()">
        <h4>💰 Income Report</h4>
        <p>View all payments and rental income</p>
      </div>
      <div class="report-card" onclick="generateExpenseReport()">
        <h4>💸 Expense Report</h4>
        <p>View all expenses by category</p>
      </div>
      <div class="report-card" onclick="generatePropertyPerformance()">
        <h4>📊 Property Performance</h4>
        <p>Income vs expenses per property</p>
      </div>
      <div class="report-card" onclick="generateTenantAccountsReport()">
        <h4>👥 Tenant Accounts</h4>
        <p>View all tenant balances</p>
      </div>
    </div>
  `;
}

async function generateIncomeReport() {
  const { data: payments } = await supabase
    .from('payments')
    .select('*, tenants(name, properties(name))')
    .order('date', { ascending: false });

  const total = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  let html = `
    <h3>💰 Income Report</h3>
    <div class="report-summary">
      <div class="summary-card income">
        <h3>Total Income</h3>
        <div class="amount">R${total.toFixed(2)}</div>
      </div>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Tenant</th>
          <th>Property</th>
          <th>Amount</th>
          <th>Method</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (payments && payments.length > 0) {
    payments.forEach(p => {
      html += `
        <tr>
          <td>${p.date}</td>
          <td>${p.tenants?.name || 'Unknown'}</td>
          <td>${p.tenants?.properties?.name || 'N/A'}</td>
          <td>R${p.amount.toFixed(2)}</td>
          <td>${p.method}</td>
        </tr>
      `;
    });
  } else {
    html += '<tr><td colspan="5" style="text-align: center;">No payments recorded</td></tr>';
  }

  html += `
      </tbody>
    </table>
  `;

  document.getElementById('reportDetailsContent').innerHTML = html;
  openModal('reportDetailsModal');
}

async function generateExpenseReport() {
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, properties(name)')
    .order('date', { ascending: false });

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

  let html = `
    <h3>💸 Expense Report</h3>
    <div class="report-summary">
      <div class="summary-card expense">
        <h3>Total Expenses</h3>
        <div class="amount">R${total.toFixed(2)}</div>
      </div>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Property</th>
          <th>Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (expenses && expenses.length > 0) {
    expenses.forEach(e => {
      html += `
        <tr>
          <td>${e.date}</td>
          <td>${e.category}</td>
          <td>${e.properties?.name || 'General'}</td>
          <td>R${e.amount.toFixed(2)}</td>
          <td>${e.description || '-'}</td>
        </tr>
      `;
    });
  } else {
    html += '<tr><td colspan="5" style="text-align: center;">No expenses recorded</td></tr>';
  }

  html += `
      </tbody>
    </table>
  `;

  document.getElementById('reportDetailsContent').innerHTML = html;
  openModal('reportDetailsModal');
}

async function generatePropertyPerformance() {
  const { data: properties } = await supabase.from('properties').select('*');

  let html = `
    <h3>📊 Property Performance</h3>
    <table class="report-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Income</th>
          <th>Expenses</th>
          <th>Profit/Loss</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (properties && properties.length > 0) {
    for (const prop of properties) {
      // Get income
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .eq('property_id', prop.id);

      const tenantIds = tenants?.map(t => t.id) || [];

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .in('tenant_id', tenantIds.length > 0 ? tenantIds : ['none']);

      const income = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('property_id', prop.id);

      const expenseTotal = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

      const profit = income - expenseTotal;
      const profitClass = profit >= 0 ? 'color: green' : 'color: red';

      html += `
        <tr>
          <td>${prop.name}</td>
          <td>R${income.toFixed(2)}</td>
          <td>R${expenseTotal.toFixed(2)}</td>
          <td style="${profitClass}">R${profit.toFixed(2)}</td>
        </tr>
      `;
    }
  } else {
    html += '<tr><td colspan="4" style="text-align: center;">No properties available</td></tr>';
  }

  html += `
      </tbody>
    </table>
  `;

  document.getElementById('reportDetailsContent').innerHTML = html;
  openModal('reportDetailsModal');
}

async function generateTenantAccountsReport() {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, properties(name)');

  let html = `
    <h3>👥 Tenant Accounts Summary</h3>
    <table class="report-table">
      <thead>
        <tr>
          <th>Tenant</th>
          <th>Property</th>
          <th>Balance</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (tenants && tenants.length > 0) {
    for (const tenant of tenants) {
      const { data: balance } = await supabase
        .rpc('get_tenant_balance', { p_tenant_id: tenant.id });

      const balanceAmount = balance || 0;
      const balanceClass = balanceAmount > 0 ? 'color: red' : balanceAmount < 0 ? 'color: green' : '';

      html += `
        <tr>
          <td>${tenant.name}</td>
          <td>${tenant.properties?.name || 'N/A'}</td>
          <td style="${balanceClass}">R${balanceAmount.toFixed(2)}</td>
          <td><button class="btn-small" onclick="closeModal('reportDetailsModal'); viewTenantAccount('${tenant.id}')">View Statement</button></td>
        </tr>
      `;
    }
  } else {
    html += '<tr><td colspan="4" style="text-align: center;">No tenants available</td></tr>';
  }

  html += `
      </tbody>
    </table>
  `;

  document.getElementById('reportDetailsContent').innerHTML = html;
  openModal('reportDetailsModal');
}

// =======================
// SETTINGS
// =======================

async function loadSettings() {
  const { data: landlord } = await supabase
    .from('landlord_data')
    .select('*')
    .limit(1)
    .single();

  if (landlord) {
    document.getElementById('landlordName').value = landlord.name || '';
    document.getElementById('landlordEmail').value = landlord.email || '';
    document.getElementById('landlordAddress').value = landlord.address || '';
    document.getElementById('landlordPhone').value = landlord.phone || '';
    document.getElementById('landlordBankAccount').value = landlord.bank_account || '';
  }

  // Load utility rates
  const { data: rates } = await supabase
    .from('utility_rates')
    .select('*')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (rates) {
    document.getElementById('electricityRate').value = rates.electricity_rate || 0.15;
    document.getElementById('waterRate').value = rates.water_rate || 8.50;
  }
}

async function saveSettings() {
  const name = document.getElementById('landlordName').value.trim();
  const email = document.getElementById('landlordEmail').value.trim();
  const address = document.getElementById('landlordAddress').value.trim();
  const phone = document.getElementById('landlordPhone').value.trim();
  const bankAccount = document.getElementById('landlordBankAccount').value.trim();
  const electricityRate = parseFloat(document.getElementById('electricityRate').value) || 0.15;
  const waterRate = parseFloat(document.getElementById('waterRate').value) || 8.50;

  // Check if landlord_data exists
  const { data: existing } = await supabase
    .from('landlord_data')
    .select('*')
    .limit(1)
    .single();

  if (existing) {
    // Update
    const { error } = await supabase
      .from('landlord_data')
      .update({
        name,
        email,
        address,
        phone,
        bank_account: bankAccount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) {
      showAlert('danger', 'Error updating settings: ' + error.message);
      return;
    }
  } else {
    // Insert
    const { error } = await supabase
      .from('landlord_data')
      .insert([{
        id: 'landlord_' + Date.now(),
        name,
        email,
        address,
        phone,
        bank_account: bankAccount
      }]);

    if (error) {
      showAlert('danger', 'Error saving settings: ' + error.message);
      return;
    }
  }

  // Update utility rates
  const { data: existingRates } = await supabase
    .from('utility_rates')
    .select('*')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (existingRates) {
    await supabase
      .from('utility_rates')
      .update({
        electricity_rate: electricityRate,
        water_rate: waterRate
      })
      .eq('id', existingRates.id);
  } else {
    await supabase
      .from('utility_rates')
      .insert([{
        electricity_rate: electricityRate,
        water_rate: waterRate,
        effective_from: new Date().toISOString().split('T')[0]
      }]);
  }

  showAlert('success', 'Settings saved successfully!');
}

// =======================
// TENANT SECTION
// =======================

async function loadTenantDashboard() {
  await loadTenantOverview();
  await loadTenantInvoices();
  await loadTenantMessages();
}

async function loadTenantOverview() {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, properties(name, monthly_rent)')
    .eq('id', currentUser.id)
    .single();

  if (!tenant) return;

  document.getElementById('tenantPropertyName').textContent = tenant.properties?.name || 'N/A';
  document.getElementById('tenantMonthlyRent').textContent = `R${(tenant.monthly_rent || tenant.properties?.monthly_rent || 0).toFixed(2)}`;

  // Get account balance
  const { data: balance } = await supabase
    .rpc('get_tenant_balance', { p_tenant_id: currentUser.id });

  const balanceText = balance > 0 ? `Owing: R${balance.toFixed(2)}` : 
                     balance < 0 ? `Credit: R${Math.abs(balance).toFixed(2)}` : 
                     'Paid up';

  document.getElementById('tenantRentStatus').textContent = balanceText;

  // Load latest readings
  const { data: waterReading } = await supabase
    .from('utilities_water')
    .select('*')
    .eq('tenant_id', currentUser.id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const { data: elecReading } = await supabase
    .from('utilities_electricity')
    .select('*')
    .eq('tenant_id', currentUser.id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const container = document.getElementById('latestReadingsContainer');

  if (waterReading || elecReading) {
    container.innerHTML = '<h4>Latest Meter Readings</h4>';

    if (waterReading) {
      container.innerHTML += `
        <p><strong>💧 Water (${waterReading.date}):</strong> ${waterReading.current_reading} m³ 
        (Used: ${waterReading.consumption} m³, Cost: R${waterReading.amount.toFixed(2)})</p>
      `;
    }

    if (elecReading) {
      container.innerHTML += `
        <p><strong>⚡ Electricity (${elecReading.date}):</strong> ${elecReading.current_reading} kWh 
        (Used: ${elecReading.consumption} kWh, Cost: R${elecReading.amount.toFixed(2)})</p>
      `;
    }
  } else {
    container.innerHTML = '<h4>Latest Meter Readings</h4><p><em>No readings submitted yet.</em></p>';
  }
}

async function submitMeterReading() {
  const date = document.getElementById('meterDate').value;
  const type = document.getElementById('meterType').value;
  const currentReading = parseFloat(document.getElementById('currentMeterReading').value) || 0;
  const notes = document.getElementById('meterNotes').value.trim();

  if (!date || currentReading <= 0) {
    showTenantAlert('danger', 'Date and valid reading are required');
    return;
  }

  // Get previous reading
  const table = type === 'water' ? 'utilities_water' : 'utilities_electricity';

  const { data: lastReading } = await supabase
    .from(table)
    .select('current_reading')
    .eq('tenant_id', currentUser.id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const previousReading = lastReading?.current_reading || 0;

  // Get rate
  const { data: rates } = await supabase
    .from('utility_rates')
    .select('*')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  const rate = type === 'water' ? (rates?.water_rate || 8.50) : (rates?.electricity_rate || 0.15);

  // Insert reading
  const readingId = (type === 'water' ? 'water_' : 'elec_') + Date.now();

  const { error } = await supabase.from(table).insert([{
    id: readingId,
    tenant_id: currentUser.id,
    property_id: currentUser.property_id,
    date,
    previous_reading: previousReading,
    current_reading: currentReading,
    rate,
    note: notes
  }]);

  if (error) {
    showTenantAlert('danger', 'Error submitting reading: ' + error.message);
    return;
  }

  showTenantAlert('success', 'Reading submitted successfully!');
  document.getElementById('currentMeterReading').value = '';
  document.getElementById('meterNotes').value = '';
  await loadTenantOverview();
}

async function loadTenantInvoices() {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', currentUser.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('tenantInvoicesList');
  container.innerHTML = '';

  if (!invoices || invoices.length === 0) {
    container.innerHTML = '<p>No invoices yet.</p>';
    return;
  }

  invoices.forEach(invoice => {
    container.innerHTML += `
      <div class="invoice-card">
        <h4>Invoice #${invoice.id.slice(-8)}</h4>
        <p><strong>Period:</strong> ${invoice.period_start} to ${invoice.period_end}</p>
        <p><strong>Total:</strong> R${invoice.total.toFixed(2)}</p>
        <p><strong>Date:</strong> ${invoice.created_at}</p>
        <button class="btn-small" onclick="viewTenantInvoice('${invoice.id}')">View Details</button>
      </div>
    `;
  });
}

async function viewTenantInvoice(invoiceId) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (!invoice) return;

  document.getElementById('tenantInvoiceDetailsContent').innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace; background: #f5f5f5; padding: 20px; border-radius: 5px;">
${invoice.content}
    </pre>
  `;

  openModal('tenantInvoiceDetailsModal');
}

async function sendTenantMessage() {
  const subject = document.getElementById('tenantMessageSubject').value.trim();
  const body = document.getElementById('tenantMessageBody').value.trim();

  if (!subject || !body) {
    showTenantAlert('danger', 'Subject and message are required');
    return;
  }

  const messageId = 'msg_' + Date.now();

  const { error } = await supabase.from('messages').insert([{
    id: messageId,
    tenant_id: currentUser.id,
    date: new Date().toISOString().split('T')[0],
    subject,
    body,
    sender_type: 'tenant',
    resolved: false
  }]);

  if (error) {
    showTenantAlert('danger', 'Error sending message: ' + error.message);
    return;
  }

  showTenantAlert('success', 'Message sent to landlord!');
  document.getElementById('tenantMessageSubject').value = '';
  document.getElementById('tenantMessageBody').value = '';
  await loadTenantMessages();
}

async function loadTenantMessages() {
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', currentUser.id)
    .order('date', { ascending: false });

  const container = document.getElementById('tenantMessagesList');
  container.innerHTML = '';

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p>No messages yet.</p>';
    return;
  }

  messages.forEach(msg => {
    const status = msg.resolved ? 
      '<span class="badge badge-resolved">Resolved</span>' : 
      '<span class="badge badge-open">Pending</span>';

    container.innerHTML += `
      <div class="message-card">
        <h4>${msg.subject} ${status}</h4>
        <p><strong>Date:</strong> ${msg.date}</p>
        <p><strong>Your Message:</strong> ${msg.body}</p>
        ${msg.reply_content ? `<p style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-top: 10px;"><strong>Landlord Reply:</strong> ${msg.reply_content}</p>` : '<p><em>Waiting for landlord reply...</em></p>'}
      </div>
    `;
  });
}

// =======================
// NAVIGATION
// =======================

function showTab(tabName) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  // Deactivate all tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Show selected section
  document.getElementById(tabName).classList.add('active');

  // Activate selected tab
  event.target.classList.add('active');

  // Load data for specific tabs
  if (tabName === 'tenantsTab') loadTenantsList();
  if (tabName === 'utilitiesTab') loadUtilitiesList();
  if (tabName === 'invoicesTab') loadInvoicesList();
  if (tabName === 'messagesTab') loadMessagesList();
  if (tabName === 'expensesTab') loadExpensesList();
  if (tabName === 'reportsTab') loadReportsTab();
}

function showTenantTab(tabName) {
  // Hide all tenant sections
  document.querySelectorAll('.tenant-content-section').forEach(section => {
    section.classList.remove('active');
  });

  // Deactivate all tenant tabs
  document.querySelectorAll('.tenant-nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Show selected section
  document.getElementById(`tenant${tabName}Tab`).classList.add('active');

  // Activate selected tab
  event.target.classList.add('active');
}

// =======================
// UTILITY FUNCTIONS
// =======================

function showAlert(type, message) {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert alert-${type} active`;
  alertBox.textContent = message;

  setTimeout(() => {
    alertBox.classList.remove('active');
  }, 4000);
}

function showTenantAlert(type, message) {
  const alertBox = document.getElementById('tenantAlertBox');
  alertBox.className = `alert alert-${type} active`;
  alertBox.textContent = message;

  setTimeout(() => {
    alertBox.classList.remove('active');
  }, 4000);
}

async function loadPropertySelectForTenants() {
  const { data: properties } = await supabase.from('properties').select('*');

  const select = document.getElementById('propertySelect');
  select.innerHTML = '<option value="">Select your property</option>';

  if (properties) {
    properties.forEach(prop => {
      select.innerHTML += `<option value="${prop.id}">${prop.name}</option>`;
    });
  }
}
