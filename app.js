// ============================================
// SUPABASE INITIALIZATION
// ============================================

// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://fjaxofsasorfbynqustd.supabaseClient.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYXhvZnNhc29yZmJ5bnF1c3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MDc1MzcsImV4cCI6MjA0NjI4MzUzN30.rOwPVmBLjMXGfvBJGS0iZJXJZDfU3K5j-_T9CkZ1jfE'; // Your anon key

let supabaseClient;

// Initialize Supabase when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        supabaseClient = window.supabaseClient.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase connected successfully');
        await populatePropertySelect();
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
        alert('Failed to connect to database. Please refresh the page.');
    }
});

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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { error } = await supabase
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
        const { data, error } = await supabase
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
        const { error } = await supabase
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
        const { error } = await supabase
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
        const { data, error } = await supabase
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
    const alertBox = currentUser.type === 'landlord' ? 
        document.getElementById('alertBox') : 
        document.getElementById('tenantAlertBox');
    
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
        const paid = payments.some(p => 
            p.tenant_id === tenant.id && p.date.startsWith(currentMonth)
        );
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
        
        const paid = tenant && payments.some(p => 
            p.tenant_id === tenant.id && p.date.startsWith(currentMonth)
        );
        
        const status = tenant ? (paid ? 'Paid' : 'Unpaid') : 'Vacant';
        const badgeClass = status === 'Paid' ? 'badge-paid' : 'badge-unpaid';
        
        tbody.innerHTML += `
            <tr>
                <td>${property.name}</td>
                <td>${tenantName}</td>
                <td>R ${property.base_rent.toLocaleString()}</td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td>
                    ${tenant ? `<button class="btn btn-small" onclick="manageTenant('${tenant.id}')">Manage</button>` : ''}
                </td>
            </tr>
        `;
    });
}

async function loadTenantsList() {
    const tenants = await getTenants();
    const properties = await getProperties();
    const payments = await getPayments();
    const container = document.getElementById('tenantsList');
    
    let html = '';
    for (const tenant of tenants) {
        const property = properties.find(p => p.id === tenant.property_id);
        const totalPaid = payments
            .filter(p => p.tenant_id === tenant.id)
            .reduce((sum, p) => sum + p.amount, 0);
        
        const balance = tenant.monthly_rent - totalPaid;
        
        html += `
            <div class="card">
                <h3>${tenant.name} - ${property.name}</h3>
                <p><strong>Email:</strong> ${tenant.email}</p>
                <p><strong>Phone:</strong> ${tenant.phone}</p>
                <p><strong>Monthly Rent:</strong> R ${tenant.monthly_rent.toLocaleString()}</p>
                <p><strong>Total Paid:</strong> R ${totalPaid.toLocaleString()}</p>
                <p><strong>Balance:</strong> <span style="color: ${balance > 0 ? '#d32f2f' : '#388e3c'}; font-weight: bold;">R ${balance.toLocaleString()}</span></p>
                <button class="btn btn-small" onclick="openEditTenantModal('${tenant.id}')">Edit</button>
                <button class="btn btn-small" onclick="openRecordPaymentModal('${tenant.id}')">Record Payment</button>
            </div>
        `;
    }
    
    container.innerHTML = html || '<p>No tenants added yet.</p>';
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

async function loadUtilitiesList() {
    const utilities = await getUtilities();
    const tenants = await getTenants();
    const properties = await getProperties();
    const container = document.getElementById('utilitiesList');
    
    if (utilities.length === 0) {
        container.innerHTML = '<p>No utility readings submitted yet.</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>Property</th><th>Tenant</th><th>Date</th><th>Electricity (kWh)</th><th>Water (m³)</th><th>Notes</th></tr></thead><tbody>';
    
    utilities.forEach(util => {
        const tenant = tenants.find(t => t.id === util.tenant_id);
        const property = properties.find(p => p.id === tenant.property_id);
        
        html += `
            <tr>
                <td>${property.name}</td>
                <td>${tenant.name}</td>
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
    const tenants = await getTenants();
    const select = document.getElementById('invoiceTenantSelect');
    
    select.innerHTML = '<option value="">-- Select Tenant --</option>';
    tenants.forEach(tenant => {
        const option = document.createElement('option');
        option.value = tenant.id;
        option.textContent = tenant.name;
        select.appendChild(option);
    });
    
    await loadTenantInvoices();
}

async function loadTenantInvoices() {
    const tenantId = document.getElementById('invoiceTenantSelect').value;
    const container = document.getElementById('tenantInvoicesList');
    
    if (!tenantId) {
        container.innerHTML = '';
        return;
    }
    
    const invoices = await getInvoices();
    const tenantInvoices = invoices.filter(inv => inv.tenant_id === tenantId);
    
    let html = `<button class="btn btn-small" onclick="openGenerateInvoiceModal('${tenantId}')">Generate New Invoice</button><br><br>`;
    
    if (tenantInvoices.length === 0) {
        html += '<p>No invoices generated yet.</p>';
    } else {
        tenantInvoices.forEach(inv => {
            html += `
                <div class="card">
                    <h3>Invoice ${inv.id.substring(0, 8).toUpperCase()}</h3>
                    <p><strong>Period:</strong> ${inv.period_start} to ${inv.period_end}</p>
                    <p><strong>Total:</strong> R ${inv.total.toLocaleString()}</p>
                    <p><strong>Generated:</strong> ${inv.created_at}</p>
                    <button class="btn btn-small" onclick="viewInvoice('${inv.id}')">View/Print</button>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

function openGenerateInvoiceModal(tenantId) {
    document.getElementById('invoiceTenantId').value = tenantId;
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('periodStart').value = firstDay.toISOString().split('T')[0];
    document.getElementById('periodEnd').value = lastDay.toISOString().split('T')[0];
    document.getElementById('additionalCharges').value = '';
    
    openModal('generateInvoiceModal');
}

async function generateInvoice() {
    const tenantId = document.getElementById('invoiceTenantId').value;
    const periodStart = document.getElementById('periodStart').value;
    const periodEnd = document.getElementById('periodEnd').value;
    const additionalCharges = parseFloat(document.getElementById('additionalCharges').value) || 0;
    
    const tenant = await getTenantById(tenantId);
    
    let total = tenant.monthly_rent + additionalCharges;
    
    try {
        await saveInvoice({
            id: 'inv_' + Date.now(),
            tenant_id: tenantId,
            period_start: periodStart,
            period_end: periodEnd,
            total,
            created_at: new Date().toISOString().split('T')[0]
        });
        closeModal('generateInvoiceModal');
        showAlert('Invoice generated successfully');
        await loadTenantInvoices();
    } catch (error) {
        showAlert('Error generating invoice: ' + error.message, 'danger');
    }
}

async function viewInvoice(invoiceId) {
    const invoices = await getInvoices();
    const invoice = invoices.find(i => i.id === invoiceId);
    const tenant = await getTenantById(invoice.tenant_id);
    const property = await getPropertyById(tenant.property_id);
    const landlord = await getLandlordData();
    
    let invoiceHTML = `
        <div class="invoice-container">
            <div class="invoice-header">
                <div>
                    <div class="invoice-title">INVOICE</div>
                    <p>Invoice #: ${invoice.id.substring(0, 8).toUpperCase()}</p>
                    <p>Date: ${invoice.created_at}</p>
                </div>
                <div>
                    <p style="text-align: right; font-weight: bold; font-size: 16px;">${landlord.name}</p>
                    <p style="text-align: right; color: #666;">${landlord.address}</p>
                    <p style="text-align: right; color: #666;">Phone: ${landlord.phone}</p>
                </div>
            </div>

            <div class="invoice-details">
                <div class="invoice-section">
                    <h4>Bill To:</h4>
                    <p><strong>${tenant.name}</strong></p>
                    <p>${property.name}</p>
                    <p>Email: ${tenant.email}</p>
                    <p>Phone: ${tenant.phone}</p>
                </div>
                <div class="invoice-section">
                    <h4>Invoice Details:</h4>
                    <p><strong>Period:</strong> ${invoice.period_start} to ${invoice.period_end}</p>
                    <p><strong>Due Date:</strong> ${invoice.period_end}</p>
                </div>
            </div>

            <table class="invoice-items">
                <thead>
                    <tr style="background: #f5f5f5; border-bottom: 2px solid #2186c4;">
                        <th style="padding: 12px; text-align: left;">Description</th>
                        <th style="padding: 12px; text-align: right;">Amount (R)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 12px;">Monthly Rent</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">${tenant.monthly_rent.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div class="invoice-total">
                <div>TOTAL AMOUNT DUE:</div>
                <div class="invoice-amount">R ${invoice.total.toLocaleString()}</div>
            </div>

            <div class="invoice-footer">
                <h4>Payment Instructions:</h4>
                <p>${landlord.bank_account}</p>
                <p style="margin-top: 20px; color: #999;">Thank you for your business!</p>
            </div>
        </div>
    `;
    
    const newWindow = window.open();
    newWindow.document.write(invoiceHTML);
    newWindow.document.close();
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
        const property = properties.find(p => p.id === tenant.property_id);
        
        const statusBadge = msg.resolved ? 
            '<span class="badge badge-paid">Resolved</span>' : 
            '<span class="badge badge-unpaid">Open</span>';
        
        html += `
            <div class="card">
                <h3>${tenant.name} - ${property.name}</h3>
                <p><strong>Subject:</strong> ${msg.subject}</p>
                <p><strong>Date:</strong> ${msg.date}</p>
                <p><strong>Status:</strong> ${statusBadge}</p>
                <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">${msg.body}</p>
                <button class="btn btn-small" onclick="toggleMessageResolved('${msg.id}')">
                    ${msg.resolved ? 'Mark Open' : 'Mark Resolved'}
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function toggleMessageResolved(messageId) {
    const messages = await getMessages();
    const message = messages.find(m => m.id === messageId);
    try {
        await updateMessageResolved(messageId, !message.resolved);
        showAlert('Message updated');
        await loadMessagesList();
    } catch (error) {
        showAlert('Error updating message: ' + error.message, 'danger');
    }
}

async function loadSettings() {
    const landlord = await getLandlordData();
    
    document.getElementById('landlordName').value = landlord.name || '';
    document.getElementById('landlordEmail').value = landlord.email || '';
    document.getElementById('landlordAddress').value = landlord.address || '';
    document.getElementById('landlordPhone').value = landlord.phone || '';
    document.getElementById('bankAccount').value = landlord.bank_account || '';
}

async function saveLandlordSettings() {
    const landlord = {
        name: document.getElementById('landlordName').value,
        email: document.getElementById('landlordEmail').value,
        address: document.getElementById('landlordAddress').value,
        phone: document.getElementById('landlordPhone').value,
        bank_account: document.getElementById('bankAccount').value
    };
    
    try {
        await saveLandlordData(landlord);
        showAlert('Settings saved successfully');
    } catch (error) {
        showAlert('Error saving settings: ' + error.message, 'danger');
    }
}

async function addTenant() {
    const propertyId = document.getElementById('modalPropertySelect').value;
    const name = document.getElementById('modalTenantName').value;
    const email = document.getElementById('modalTenantEmail').value;
    const phone = document.getElementById('modalTenantPhone').value;
    const password = document.getElementById('modalTenantPassword').value;
    
    if (!propertyId || !name || !email || !phone || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    const property = await getPropertyById(propertyId);
    
    try {
        await addNewTenant({
            id: 't_' + Date.now(),
            name,
            email,
            phone,
            property_id: propertyId,
            monthly_rent: property.base_rent,
            tenant_password: password
        });
        closeModal('addTenantModal');
        showAlert('Tenant added successfully');
        
        document.getElementById('modalPropertySelect').value = '';
        document.getElementById('modalTenantName').value = '';
        document.getElementById('modalTenantEmail').value = '';
        document.getElementById('modalTenantPhone').value = '';
        document.getElementById('modalTenantPassword').value = '';
        
        await loadTenantsList();
    } catch (error) {
        showAlert('Error adding tenant: ' + error.message, 'danger');
    }
}

// ============================================
// TENANT FUNCTIONS
// ============================================

async function showTenantTab(tabName) {
    const tabs = document.querySelectorAll('#tenantSection .content-section');
    const navTabs = document.querySelectorAll('#tenantSection .nav-tab');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    navTabs.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'overview') {
        await loadTenantDashboard();
    } else if (tabName === 'readings') {
        await loadTenantReadings();
    } else if (tabName === 'invoices') {
        await loadTenantInvoicesPortal();
    } else if (tabName === 'messages') {
        await loadTenantMessages();
    }
}

async function loadTenantDashboard() {
    const tenant = await getTenantById(currentUser.tenantId);
    const property = await getPropertyById(tenant.property_id);
    
    document.getElementById('tenantPropertyDisplay').textContent = property.name;
    document.getElementById('tenantRentDisplay').textContent = 'R ' + tenant.monthly_rent.toLocaleString();
    
    const payments = await getPayments();
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    
    const paid = payments.some(p => 
        p.tenant_id === currentUser.tenantId && p.date.startsWith(currentMonth)
    );
    
    const statusHTML = paid ? 
        '<span class="badge badge-paid">PAID</span>' : 
        '<span class="badge badge-unpaid">UNPAID</span>';
    
    document.getElementById('tenantRentStatus').innerHTML = statusHTML;
}

async function loadTenantReadings() {
    const utilities = await getUtilities();
    const tenantUtilities = utilities.filter(u => u.tenant_id === currentUser.tenantId);
    const table = document.getElementById('tenantReadingsTable');
    
    table.innerHTML = '';
    tenantUtilities.forEach(util => {
        table.innerHTML += `
            <tr>
                <td>${util.date}</td>
                <td>${util.electricity_reading}</td>
                <td>${util.water_reading}</td>
                <td>${util.note || '-'}</td>
            </tr>
        `;
    });
}

async function submitReading() {
    const date = document.getElementById('readingDate').value;
    const electricity = parseFloat(document.getElementById('electricityReading').value);
    const water = parseFloat(document.getElementById('waterReading').value);
    const notes = document.getElementById('readingNotes').value;
    
    if (!date || !electricity || !water) {
        showAlert('Please fill in all required fields', 'danger');
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
        
        document.getElementById('readingDate').value = '';
        document.getElementById('electricityReading').value = '';
        document.getElementById('waterReading').value = '';
        document.getElementById('readingNotes').value = '';
        
        showAlert('Reading submitted successfully');
        await loadTenantReadings();
    } catch (error) {
        showAlert('Error submitting reading: ' + error.message, 'danger');
    }
}

async function loadTenantInvoicesPortal() {
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
            <div class="card">
                <h3>Invoice ${inv.id.substring(0, 8).toUpperCase()}</h3>
                <p><strong>Period:</strong> ${inv.period_start} to ${inv.period_end}</p>
                <p><strong>Total Due:</strong> R ${inv.total.toLocaleString()}</p>
                <p><strong>Generated:</strong> ${inv.created_at}</p>
                <button class="btn btn-small" onclick="viewInvoice('${inv.id}')">View/Print</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function loadTenantMessages() {
    const messages = await getMessages();
    const tenantMessages = messages.filter(m => m.tenant_id === currentUser.tenantId);
    const container = document.getElementById('tenantMessagesList');
    
    if (tenantMessages.length === 0) {
        container.innerHTML = '<p>No messages sent yet.</p>';
        return;
    }
    
    let html = '';
    tenantMessages.forEach(msg => {
        const statusBadge = msg.resolved ? 
            '<span class="badge badge-paid">Resolved</span>' : 
            '<span class="badge badge-unpaid">Open</span>';
        
        html += `
            <div class="card">
                <p><strong>Date:</strong> ${msg.date} ${statusBadge}</p>
                <p><strong>Subject:</strong> ${msg.subject}</p>
                <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">${msg.body}</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function submitTenantMessage() {
    const subject = document.getElementById('messageSubject').value;
    const body = document.getElementById('messageBody').value;
    
    if (!subject || !body) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    try {
        await saveMessage({
            id: 'msg_' + Date.now(),
            tenant_id: currentUser.tenantId,
            date: new Date().toISOString().split('T')[0],
            subject,
            body,
            resolved: false
        });
        
        document.getElementById('messageSubject').value = '';
        document.getElementById('messageBody').value = '';
        
        showAlert('Message sent successfully');
        await loadTenantMessages();
    } catch (error) {
        showAlert('Error sending message: ' + error.message, 'danger');
    }
}

async function populatePropertySelect() {
    const properties = await getProperties();
    const select = document.getElementById('propertySelect');
    
    select.innerHTML = '<option value="">Select your property</option>';
    properties.forEach(property => {
        const option = document.createElement('option');
        option.value = property.id;
        option.textContent = property.name;
        select.appendChild(option);
    });
}

async function populateModalSelects() {
    const properties = await getProperties();
    const select = document.getElementById('modalPropertySelect');
    
    select.innerHTML = '<option value="">-- Select Property --</option>';
    properties.forEach(property => {
        const option = document.createElement('option');
        option.value = property.id;
        option.textContent = property.name;
        select.appendChild(option);
    });
}
