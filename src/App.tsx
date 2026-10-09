import { Component, type ErrorInfo, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from './lib/api';
import { authClient, getOrCreateLandlordOrganization } from './lib/auth';
import { runtimeConfig } from './lib/config';
import { date, money, today } from './lib/format';
import type { AiModel, AiSettings, Expense, Invoice, Me, Message, Payment, Property, Reading, ReportSummary, Tenant } from './lib/types';

type Notice = { kind: 'success' | 'error'; text: string } | null;

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function safeMethod(value: unknown) {
  return String(value ?? 'other').replaceAll('_', ' ');
}

class WorkspaceErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: messageFor(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('KP-Rents workspace render error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <main className="auth-layout"><section className="auth-panel"><Brand /><h1>We could not open this screen</h1><p>The workspace is still protected. Reload it to try again; if the problem continues, the message below will help support trace it.</p><div className="form-error">{this.state.error}</div><Button onClick={() => window.location.reload()}>Reload workspace</Button></section></main>;
    }
    return this.props.children;
  }
}

function Brand() {
  return <div className="brand"><span className="brand-mark">KP</span><span>KP-Rents</span></div>;
}

function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props}>{children}</button>;
}

function NoticeBar({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  return <div className={`notice ${notice.kind}`} role="status"><span>{notice.text}</span><button onClick={onClose} aria-label="Dismiss notice">×</button></div>;
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="panel"><div className="panel-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}

function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }
function ErrorState({ text }: { text: string }) { return <div className="form-error">{text}</div>; }
function Stat({ label, value }: { label: string; value: ReactNode }) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }

function LoadFailure({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return <><ErrorState text={text} />{onRetry && <button className="link-button" onClick={onRetry}>Try again</button>}</>;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  const refresh = async () => {
    const result: any = await authClient.getSession();
    const nextSession = result.data?.session ? { ...result.data.session, user: result.data.user } : null;
    setSession(nextSession);
    if (!nextSession || !runtimeConfig.isApiConfigured) {
      setMe(null);
      return;
    }
    try {
      setMe(await api.me() as Me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) setMe(null);
      else setNotice({ kind: 'error', text: messageFor(error) });
    }
  };

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  const signOut = async () => {
    await authClient.signOut();
    setSession(null);
    setMe(null);
    setNotice({ kind: 'success', text: 'You have been signed out.' });
  };

  if (loading) return <main className="splash"><Brand /><p>Loading your secure workspace…</p></main>;
  if (!runtimeConfig.isApiConfigured) return <ConfigurationScreen />;
  if (!session) return <AuthScreen onAuthenticated={refresh} />;
  if (!me) return <AccessSetup session={session} onReady={refresh} onSignOut={signOut} />;

  return <WorkspaceErrorBoundary><main className="app-shell"><NoticeBar notice={notice} onClose={() => setNotice(null)} />
    {me.role === 'landlord'
      ? <LandlordWorkspace profile={me.profile} onSignOut={signOut} notify={setNotice} />
      : <TenantWorkspace profile={me.profile} onSignOut={signOut} notify={setNotice} />}
  </main></WorkspaceErrorBoundary>;
}

function ConfigurationScreen() {
  return <main className="auth-layout"><section className="auth-panel"><Brand /><h1>One deployment step remains</h1><p>KP-Rents needs the deployed Neon Function URL before the secure API can be used.</p><code>VITE_KP_RENTS_API_URL=https://…</code><p className="muted">Set this public URL in the frontend environment, rebuild the static site, then return here to create the first landlord account.</p></section></main>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const inviteId = useMemo(() => new URLSearchParams(window.location.search).get('invitationId'), []);
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>(inviteId ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'signin') {
        const result: any = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message);
        await onAuthenticated();
      } else {
        const result: any = await authClient.signUp.email({ email, password, name: name || email.split('@')[0] });
        if (result.error) throw new Error(result.error.message);
        if (!result.data?.user?.emailVerified) setMode('verify');
        else await onAuthenticated();
      }
    } catch (nextError) { setError(messageFor(nextError)); } finally { setBusy(false); }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result: any = await authClient.emailOtp.verifyEmail({ email, otp });
      if (result.error) throw new Error(result.error.message);
      await onAuthenticated();
    } catch (nextError) { setError(messageFor(nextError)); } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setError('');
    try {
      const result: any = await authClient.sendVerificationEmail({ email, callbackURL: window.location.origin });
      if (result.error) throw new Error(result.error.message);
    } catch (nextError) { setError(messageFor(nextError)); } finally { setBusy(false); }
  };

  const tenantInvite = Boolean(inviteId);
  return <main className="auth-layout"><section className="auth-panel"><Brand /><div className="eyebrow">Secure property management</div>
    <h1>{mode === 'verify' ? 'Verify your email' : tenantInvite ? 'Accept your tenant invitation' : mode === 'signin' ? 'Welcome back' : 'Create a landlord account'}</h1>
    <p>{mode === 'verify' ? `Enter the verification code sent to ${email}.` : tenantInvite ? 'Create your password using the email address that received the invitation.' : mode === 'signin' ? 'Sign in to manage your properties and rent operations.' : 'Landlords create their own workspace. Tenants join only through an email invitation.'}</p>
    {error && <div className="form-error">{error}</div>}
    {mode === 'verify' ? <form onSubmit={verify} className="stack"><label>Verification code<input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" required /></label><Button disabled={busy}>{busy ? 'Verifying…' : 'Verify email'}</Button><button type="button" className="link-button" onClick={resend} disabled={busy}>Resend code</button></form>
      : <form onSubmit={submit} className="stack">{mode === 'signup' && <label>{tenantInvite ? 'Your name' : 'Landlord name'}<input value={name} onChange={(e) => setName(e.target.value)} required /></label>}<label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label><Button disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create password & continue'}</Button></form>}
    {!tenantInvite && mode !== 'verify' && <button className="link-button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>{mode === 'signin' ? 'New landlord? Create your secure workspace' : 'Already have an account? Sign in'}</button>}
    {tenantInvite && <p className="muted small">Invitations are tied to the recipient email and cannot be forwarded.</p>}
  </section></main>;
}

function AccessSetup({ session, onReady, onSignOut }: { session: any; onReady: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const inviteId = useMemo(() => new URLSearchParams(window.location.search).get('invitationId'), []);
  const [displayName, setDisplayName] = useState(session.user?.name ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const complete = async () => {
    setBusy(true); setError('');
    try {
      if (inviteId) {
        const accepted: any = await authClient.organization.acceptInvitation({ invitationId: inviteId });
        if (accepted.error) throw new Error(accepted.error.message);
        await api.claimTenant();
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        const organizationId = await getOrCreateLandlordOrganization(displayName);
        await api.bootstrapLandlord({ displayName, organizationId });
      }
      await onReady();
    } catch (nextError) { setError(messageFor(nextError)); } finally { setBusy(false); }
  };
  return <main className="auth-layout"><section className="auth-panel"><Brand /><h1>{inviteId ? 'Finish accepting your invitation' : 'Set up your landlord workspace'}</h1><p>{inviteId ? 'Your account is verified. Confirm to join the landlord workspace and securely link your tenant profile.' : 'Create your private KP-Rents workspace. You will be its sole owner and can then invite tenants.'}</p>{error && <div className="form-error">{error}</div>}{!inviteId && <label>Landlord / business name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></label>}<div className="stack"><Button onClick={complete} disabled={busy || (!inviteId && displayName.trim().length < 2)}>{busy ? 'Setting up…' : inviteId ? 'Accept invitation' : 'Create my workspace'}</Button><button className="link-button" onClick={onSignOut}>Sign out</button></div></section></main>;
}

function WorkspaceHeader({ title, subtitle, onSignOut }: { title: string; subtitle: string; onSignOut: () => Promise<void> }) {
  return <header className="workspace-header"><Brand /><div className="workspace-user"><div><strong>{title}</strong><span>{subtitle}</span></div><Button className="secondary small-button" onClick={onSignOut}>Sign out</Button></div></header>;
}

const landlordTabs = ['Overview', 'Properties', 'Tenants', 'Rent & utilities', 'Invoices', 'Messages', 'Expenses', 'Reports', 'Settings'] as const;
type LandlordTab = typeof landlordTabs[number];

function LandlordWorkspace({ profile, onSignOut, notify }: { profile: any; onSignOut: () => Promise<void>; notify: (notice: Notice) => void }) {
  const [tab, setTab] = useState<LandlordTab>('Overview');
  return <><WorkspaceHeader title={profile.display_name} subtitle="Landlord workspace" onSignOut={onSignOut} /><div className="workspace-layout"><nav className="tabs" aria-label="Landlord workspace navigation">{landlordTabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav><section className="workspace-content">
    {tab === 'Overview' && <LandlordOverview />}{tab === 'Properties' && <PropertiesPanel notify={notify} />}{tab === 'Tenants' && <TenantsPanel profile={profile} notify={notify} />}{tab === 'Rent & utilities' && <RentUtilitiesPanel notify={notify} />}{tab === 'Invoices' && <InvoicesPanel notify={notify} />}{tab === 'Messages' && <MessagesPanel landlord notify={notify} />}{tab === 'Expenses' && <ExpensesPanel notify={notify} />}{tab === 'Reports' && <ReportsPanel notify={notify} />}{tab === 'Settings' && <SettingsPanel profile={profile} notify={notify} />}
  </section></div></>;
}

function useLoad<T>(load: () => Promise<T>, dependencies: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await loadRef.current()); } catch (err) { setError(messageFor(err)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload, ...dependencies]);
  return { data, error, loading, reload };
}

function LandlordOverview() {
  const { data, error, loading, reload } = useLoad(() => api.dashboard()); const dashboard: any = data;
  if (loading) return <Empty>Loading portfolio summary…</Empty>;
  if (error) return <LoadFailure text={error} onRetry={reload} />;
  const counts = dashboard?.counts ?? {};
  return <><div className="page-intro"><div><div className="eyebrow">Portfolio snapshot</div><h1>Keep your rent operations clear.</h1><p>Review occupancy, payment activity, and property status at a glance.</p></div></div><div className="stats-grid"><Stat label="Properties" value={counts.property_count ?? 0} /><Stat label="Active tenants" value={counts.active_tenant_count ?? 0} /><Stat label="Received this month" value={money(counts.paid_this_month)} /><Stat label="Expenses this month" value={money(counts.expenses_this_month)} /></div><Panel title="Properties"><Rows rows={(dashboard?.properties ?? []) as Property[]} render={(property) => <><div><strong>{property.name}</strong><span>{property.unit_number || 'No unit number'} · {money(property.monthly_rent)}/month</span></div><span className={`pill ${property.tenant_status === 'active' ? 'positive' : 'neutral'}`}>{property.tenant_name ? `${property.tenant_name} · ${property.tenant_status}` : 'Vacant'}</span></>} empty="Add your first property to start inviting tenants." /></Panel><Panel title="Recent payments"><Rows rows={(dashboard?.recentPayments ?? []) as Payment[]} render={(payment) => <><div><strong>{payment.tenant_name}</strong><span>{date(payment.payment_date)} · {safeMethod(payment.method)}</span></div><strong>{money(payment.amount)}</strong></>} empty="No payments recorded yet." /></Panel></>;
}

function PropertiesPanel({ notify }: { notify: (n: Notice) => void }) {
  const query = useLoad(() => api.listProperties()); const properties = (query.data ?? []) as Property[];
  const [form, setForm] = useState({ name: '', unitNumber: '', monthlyRent: '' }); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await api.createProperty({ ...form, monthlyRent: Number(form.monthlyRent) }); setForm({ name: '', unitNumber: '', monthlyRent: '' }); notify({ kind: 'success', text: 'Property added.' }); await query.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const remove = async (id: string) => { if (!window.confirm('Delete this property? It can only be deleted when it has no tenant records.')) return; try { await api.deleteProperty(id); notify({ kind: 'success', text: 'Property deleted.' }); await query.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } };
  return <><div className="page-intro"><div><div className="eyebrow">Property portfolio</div><h1>Properties</h1><p>Create a property before inviting its tenant.</p></div></div><div className="two-column"><Panel title="Add a property"><form className="stack" onSubmit={submit}><label>Property name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Oak Avenue Flat" required /></label><label>Unit number <span className="optional">optional</span><input value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} /></label><label>Monthly rent (R)<input type="number" min="0" step="0.01" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} required /></label><Button disabled={busy}>{busy ? 'Adding…' : 'Add property'}</Button></form></Panel><Panel title="Your properties">{query.loading ? <Empty>Loading…</Empty> : query.error ? <LoadFailure text={query.error} onRetry={query.reload} /> : <Rows rows={properties} render={(property) => <><div><strong>{property.name}</strong><span>{property.unit_number || 'No unit'} · {money(property.monthly_rent)}/month</span></div><div className="row-actions"><span className="pill neutral">{property.tenant_name || 'Vacant'}</span><button className="text-danger" onClick={() => remove(property.id)}>Delete</button></div></>} empty="No properties yet." />}</Panel></div></>;
}

function TenantsPanel({ profile, notify }: { profile: any; notify: (n: Notice) => void }) {
  const tenantsQuery = useLoad(() => api.listTenants()); const propertiesQuery = useLoad(() => api.listProperties()); const tenants = (tenantsQuery.data ?? []) as Tenant[]; const properties = (propertiesQuery.data ?? []) as Property[];
  const [form, setForm] = useState({ propertyId: '', name: '', email: '', phone: '', monthlyRent: '' }); const [busy, setBusy] = useState(false);
  const sendInvite = async (tenant: { id: string; email: string }) => { setBusy(true); try { const response: any = await authClient.organization.inviteMember({ email: tenant.email, role: 'member', organizationId: profile.organization_id, resend: true }); if (response.error) throw new Error(response.error.message); await api.updateTenant(tenant.id, { invitationId: response.data?.id }); notify({ kind: 'success', text: `Invitation email sent to ${tenant.email}.` }); await tenantsQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { const tenant = await api.createTenant({ ...form, monthlyRent: Number(form.monthlyRent) }); await sendInvite(tenant); setForm({ propertyId: '', name: '', email: '', phone: '', monthlyRent: '' }); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  return <><div className="page-intro"><div><div className="eyebrow">Secure access</div><h1>Tenants & invitations</h1><p>Tenant accounts are never created with shared passwords. Each invitation is sent through Neon Auth and requires a verified email.</p></div></div><div className="two-column"><Panel title="Invite a tenant"><form className="stack" onSubmit={submit}><label>Property<select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} required><option value="">Select a vacant property</option>{properties.filter((p) => !p.tenant_id).map((p) => <option value={p.id} key={p.id}>{p.name}{p.unit_number ? ` — ${p.unit_number}` : ''}</option>)}</select></label><label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Phone <span className="optional">optional</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Monthly rent (R)<input type="number" min="0" step="0.01" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} required /></label><Button disabled={busy || propertiesQuery.loading}>{busy ? 'Preparing invite…' : 'Send tenant invitation'}</Button></form>{propertiesQuery.error && <ErrorState text={propertiesQuery.error} />}</Panel><Panel title="Tenant list">{tenantsQuery.loading ? <Empty>Loading…</Empty> : tenantsQuery.error ? <LoadFailure text={tenantsQuery.error} onRetry={tenantsQuery.reload} /> : <div className="list">{tenants.length ? tenants.map((tenant) => <div className="list-row" key={tenant.id}><div><strong>{tenant.name}</strong><span>{tenant.property_name} · {tenant.email} · {money(tenant.monthly_rent)}/month</span></div><div className="row-actions"><span className={`pill ${tenant.status === 'active' ? 'positive' : 'warning'}`}>{tenant.status}</span>{tenant.status === 'invited' && <button className="link-button inline" disabled={busy} onClick={() => void sendInvite(tenant)}>Resend invite</button>}</div></div>) : <Empty>No tenants invited yet.</Empty>}</div>}</Panel></div></>;
}

function RentUtilitiesPanel({ notify }: { notify: (n: Notice) => void }) {
  const tenantsQuery = useLoad(() => api.listTenants()); const ratesQuery = useLoad(() => api.rates()); const readingsQuery = useLoad(() => api.readings()); const paymentsQuery = useLoad(() => api.payments());
  const tenants = (tenantsQuery.data ?? []) as Tenant[]; const readings = (readingsQuery.data ?? []) as Reading[]; const payments = (paymentsQuery.data ?? []) as Payment[]; const rates: any = ratesQuery.data ?? {};
  const [payment, setPayment] = useState({ tenantId: '', paymentDate: today(), amount: '', method: 'bank_transfer', note: '' }); const [reading, setReading] = useState({ tenantId: '', readingDate: today(), utilityType: 'electricity', currentReading: '', note: '' }); const [rateForm, setRateForm] = useState({ electricityRate: '', waterRate: '' }); const [busy, setBusy] = useState(false);
  useEffect(() => { if (ratesQuery.data) setRateForm({ electricityRate: String(rates.electricity_rate ?? ''), waterRate: String(rates.water_rate ?? '') }); }, [ratesQuery.data]);
  const savePayment = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api.createPayment({ ...payment, amount: Number(payment.amount) }); setPayment({ ...payment, amount: '', note: '' }); notify({ kind: 'success', text: 'Payment recorded.' }); await paymentsQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const saveReading = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api.createReading({ ...reading, currentReading: Number(reading.currentReading) }); setReading({ ...reading, currentReading: '', note: '' }); notify({ kind: 'success', text: 'Meter reading saved.' }); await readingsQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const saveRates = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api.updateRates({ electricityRate: Number(rateForm.electricityRate), waterRate: Number(rateForm.waterRate) }); notify({ kind: 'success', text: 'Utility rates updated.' }); await ratesQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const errors = [tenantsQuery.error, ratesQuery.error, readingsQuery.error, paymentsQuery.error].filter(Boolean);
  const retryAll = () => { void Promise.all([tenantsQuery.reload(), ratesQuery.reload(), readingsQuery.reload(), paymentsQuery.reload()]); };
  return <><div className="page-intro"><div><div className="eyebrow">Cashflow & consumption</div><h1>Rent & utilities</h1><p>Record payments and readings with server-side checks against previous readings.</p></div></div>{errors.length > 0 && <LoadFailure text={errors[0]} onRetry={retryAll} />}<div className="three-column"><Panel title="Record payment"><form className="stack" onSubmit={savePayment}><TenantSelect tenants={tenants} value={payment.tenantId} onChange={(tenantId) => setPayment({ ...payment, tenantId })} /><label>Payment date<input type="date" value={payment.paymentDate} onChange={(e) => setPayment({ ...payment, paymentDate: e.target.value })} required /></label><label>Amount (R)<input type="number" min="0.01" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} required /></label><label>Method<select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></label><Button disabled={busy || tenantsQuery.loading}>Record payment</Button></form></Panel><Panel title="Submit reading"><form className="stack" onSubmit={saveReading}><TenantSelect tenants={tenants} value={reading.tenantId} onChange={(tenantId) => setReading({ ...reading, tenantId })} /><label>Date<input type="date" value={reading.readingDate} onChange={(e) => setReading({ ...reading, readingDate: e.target.value })} required /></label><label>Utility<select value={reading.utilityType} onChange={(e) => setReading({ ...reading, utilityType: e.target.value })}><option value="electricity">Electricity</option><option value="water">Water</option></select></label><label>Current reading<input type="number" min="0" step="0.01" value={reading.currentReading} onChange={(e) => setReading({ ...reading, currentReading: e.target.value })} required /></label><Button disabled={busy || tenantsQuery.loading}>Save reading</Button></form></Panel><Panel title="Rates"><form className="stack" onSubmit={saveRates}><label>Electricity / unit (R)<input type="number" min="0" step="0.0001" value={rateForm.electricityRate} onChange={(e) => setRateForm({ ...rateForm, electricityRate: e.target.value })} required /></label><label>Water / unit (R)<input type="number" min="0" step="0.0001" value={rateForm.waterRate} onChange={(e) => setRateForm({ ...rateForm, waterRate: e.target.value })} required /></label><Button className="secondary" disabled={busy || ratesQuery.loading}>Update rates</Button></form></Panel></div><div className="two-column"><Panel title="Recent payments"><Rows rows={payments.slice(0, 8)} render={(p) => <><div><strong>{p.tenant_name || 'Tenant'}</strong><span>{date(p.payment_date)} · {safeMethod(p.method)}</span></div><strong>{money(p.amount)}</strong></>} empty="No payments yet." /></Panel><Panel title="Recent readings"><Rows rows={readings.slice(0, 8)} render={(r) => <><div><strong>{r.tenant_name ?? 'Tenant'} · {r.utility_type}</strong><span>{date(r.reading_date)} · {r.previous_reading} → {r.current_reading}</span></div><strong>{r.consumption} units</strong></>} empty="No readings yet." /></Panel></div></>;
}

function TenantSelect({ tenants, value, onChange }: { tenants: Tenant[]; value: string; onChange: (value: string) => void }) {
  return <label>Tenant<select value={value} onChange={(e) => onChange(e.target.value)} required><option value="">Select tenant</option>{tenants.filter((t) => t.status !== 'inactive').map((t) => <option value={t.id} key={t.id}>{t.name} — {t.property_name}</option>)}</select></label>;
}

function Rows<T extends { id: string }>({ rows, render, empty }: { rows: T[]; render: (row: T) => ReactNode; empty: string }) {
  return <div className="list">{rows.length ? rows.map((row) => <div className="list-row" key={row.id}>{render(row)}</div>) : <Empty>{empty}</Empty>}</div>;
}

function InvoicesPanel({ notify }: { notify: (n: Notice) => void }) {
  const tenantsQuery = useLoad(() => api.listTenants()); const invoicesQuery = useLoad(() => api.invoices()); const tenants = (tenantsQuery.data ?? []) as Tenant[]; const invoices = (invoicesQuery.data ?? []) as Invoice[];
  const [form, setForm] = useState({ tenantId: '', periodStart: today().slice(0, 8) + '01', periodEnd: today(), dueDate: today(), additionalAmount: '0', additionalNote: '' }); const [busy, setBusy] = useState(false); const [selected, setSelected] = useState<Invoice | null>(null); const [aiNote, setAiNote] = useState(''); const [aiBusy, setAiBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { const invoice = await api.createInvoice({ ...form, additionalAmount: Number(form.additionalAmount) }) as Invoice; setSelected(invoice); setAiNote(''); notify({ kind: 'success', text: 'Invoice generated from the recorded rent and utility data.' }); await invoicesQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const draftAiNote = async () => { if (!selected) return; setAiBusy(true); try { const result = await api.invoiceCoverNote(selected.id); setAiNote(result.content); notify({ kind: 'success', text: `AI cover note drafted with ${result.model}.` }); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setAiBusy(false); } };
  const errors = [tenantsQuery.error, invoicesQuery.error].filter(Boolean);
  return <><div className="page-intro"><div><div className="eyebrow">Billing records</div><h1>Invoices</h1><p>Generate a deterministic invoice from rent, recorded utility readings, and optional additional charges.</p></div></div>{errors.length > 0 && <LoadFailure text={errors[0]} onRetry={() => { void Promise.all([tenantsQuery.reload(), invoicesQuery.reload()]); }} />}<div className="two-column"><Panel title="Generate invoice"><form className="stack" onSubmit={submit}><TenantSelect tenants={tenants} value={form.tenantId} onChange={(tenantId) => setForm({ ...form, tenantId })} /><label>Period starts<input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} required /></label><label>Period ends<input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} required /></label><label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required /></label><label>Additional charge (R)<input type="number" min="0" step="0.01" value={form.additionalAmount} onChange={(e) => setForm({ ...form, additionalAmount: e.target.value })} /></label><label>Note <span className="optional">optional</span><textarea value={form.additionalNote} onChange={(e) => setForm({ ...form, additionalNote: e.target.value })} /></label><Button disabled={busy || tenantsQuery.loading}>{busy ? 'Generating…' : 'Generate invoice'}</Button></form></Panel><Panel title="Issued invoices"><Rows rows={invoices} render={(invoice) => <button className="list-row selectable" onClick={() => { setSelected(invoice); setAiNote(''); }}><div><strong>{invoice.tenant_name ?? 'Tenant'}</strong><span>{date(invoice.period_start)} — {date(invoice.period_end)} · due {date(invoice.due_date)}</span></div><strong>{money(invoice.total)}</strong></button>} empty="No invoices issued yet." /></Panel></div>{selected && <Panel title={`Invoice · ${money(selected.total)}`} action={<button className="link-button inline" onClick={() => { setSelected(null); setAiNote(''); }}>Close</button>}><pre className="invoice-preview">{selected.content || 'No invoice content is available.'}</pre><div className="ai-block"><h3>Optional AI cover note</h3><p className="muted small">The financial invoice above is fixed from your saved records. AI only drafts a separate tenant-facing note and never recalculates the invoice.</p><Button className="secondary" disabled={aiBusy} onClick={() => void draftAiNote()}>{aiBusy ? 'Drafting…' : 'Draft AI cover note'}</Button>{aiNote && <pre className="invoice-preview ai-output">{aiNote}</pre>}</div></Panel>}</>;
}

function MessagesPanel({ landlord, notify }: { landlord?: boolean; notify: (n: Notice) => void }) {
  const messagesQuery = useLoad(() => api.messages()); const tenantsQuery = useLoad(() => landlord ? api.listTenants() : Promise.resolve([])); const messages = (messagesQuery.data ?? []) as Message[]; const tenants = (tenantsQuery.data ?? []) as Tenant[];
  const [form, setForm] = useState({ tenantId: '', subject: '', body: '' }); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api.createMessage(landlord ? form : { subject: form.subject, body: form.body }); setForm({ tenantId: '', subject: '', body: '' }); notify({ kind: 'success', text: 'Message sent.' }); await messagesQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const resolve = async (message: Message) => { try { await api.resolveMessage(message.id, !message.resolved); await messagesQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } };
  return <><div className="page-intro"><div><div className="eyebrow">Secure correspondence</div><h1>Messages</h1><p>Keep property communication linked to the correct tenancy.</p></div></div>{messagesQuery.error && <LoadFailure text={messagesQuery.error} onRetry={messagesQuery.reload} />}<div className="two-column"><Panel title={landlord ? 'New message' : 'Message your landlord'}><form className="stack" onSubmit={submit}>{landlord && <TenantSelect tenants={tenants} value={form.tenantId} onChange={(tenantId) => setForm({ ...form, tenantId })} />}<label>Subject<input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></label><label>Message<textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></label><Button disabled={busy || (landlord && tenantsQuery.loading)}>{busy ? 'Sending…' : 'Send message'}</Button></form></Panel><Panel title="Conversation"><div className="message-list">{messages.length ? messages.map((item) => <article className={`message ${item.sender_role}`} key={item.id}><div className="message-meta"><strong>{item.sender_role === 'landlord' ? 'Landlord' : item.tenant_name ?? 'Tenant'}</strong><span>{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</span></div><h3>{item.subject}</h3><p>{item.body}</p>{landlord && <button className="link-button inline" onClick={() => void resolve(item)}>{item.resolved ? 'Reopen' : 'Mark resolved'}</button>}</article>) : <Empty>No messages yet.</Empty>}</div></Panel></div></>;
}

function ExpensesPanel({ notify }: { notify: (n: Notice) => void }) {
  const expensesQuery = useLoad(() => api.expenses()); const categoriesQuery = useLoad(() => api.categories()); const propertiesQuery = useLoad(() => api.listProperties()); const expenses = (expensesQuery.data ?? []) as Expense[]; const categories: any[] = (categoriesQuery.data ?? []); const properties = (propertiesQuery.data ?? []) as Property[];
  const [form, setForm] = useState({ propertyId: '', category: '', amount: '', expenseDate: today(), description: '' }); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api.createExpense({ ...form, propertyId: form.propertyId || null, amount: Number(form.amount) }); setForm({ ...form, amount: '', description: '' }); notify({ kind: 'success', text: 'Expense recorded.' }); await expensesQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const remove = async (id: string) => { if (!window.confirm('Delete this expense record?')) return; try { await api.deleteExpense(id); notify({ kind: 'success', text: 'Expense deleted.' }); await expensesQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } };
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  return <><div className="page-intro"><div><div className="eyebrow">Operating costs</div><h1>Expenses</h1><p>Total recorded expenses: <strong>{money(total)}</strong></p></div></div><div className="two-column"><Panel title="Add expense"><form className="stack" onSubmit={submit}><label>Property <span className="optional">optional</span><select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}><option value="">Portfolio-wide</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required><option value="">Select category</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}</select></label><label>Amount (R)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label><label>Date<input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required /></label><label>Description <span className="optional">optional</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><Button disabled={busy}>Record expense</Button></form></Panel><Panel title="Expense ledger">{expensesQuery.error ? <LoadFailure text={expensesQuery.error} onRetry={expensesQuery.reload} /> : <Rows rows={expenses} render={(expense) => <><div><strong>{expense.category} · {money(expense.amount)}</strong><span>{date(expense.expense_date)} · {expense.property_name || 'Portfolio-wide'}{expense.description ? ` · ${expense.description}` : ''}</span></div><button className="text-danger" onClick={() => void remove(expense.id)}>Delete</button></>} empty="No expenses recorded yet." />}</Panel></div></>;
}

function ReportsPanel({ notify }: { notify: (n: Notice) => void }) {
  const summaryQuery = useLoad(() => api.reportSummary()); const aiSettingsQuery = useLoad(() => api.aiSettings()); const summary = summaryQuery.data as ReportSummary | null; const aiSettings = aiSettingsQuery.data as AiSettings | null;
  const [focus, setFocus] = useState('general'); const [report, setReport] = useState(''); const [busy, setBusy] = useState(false);
  const generate = async () => { setBusy(true); try { const result = await api.generateAiReport({ focus }); setReport(result.content); notify({ kind: 'success', text: `AI report generated with ${result.model}.` }); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  if (summaryQuery.loading) return <Empty>Loading report data…</Empty>;
  if (summaryQuery.error || !summary) return <LoadFailure text={summaryQuery.error || 'The report data is unavailable.'} onRetry={summaryQuery.reload} />;
  const { portfolio, cashflow, openInvoices, expensesByCategory } = summary;
  return <><div className="page-intro"><div><div className="eyebrow">Portfolio intelligence</div><h1>Reports</h1><p>Review the live financial summary first, then use the AI assistant for a plain-language management brief.</p></div></div><div className="stats-grid"><Stat label="Properties" value={portfolio.property_count} /><Stat label="Active tenants" value={portfolio.active_tenant_count} /><Stat label="Collected this month" value={money(cashflow.collected_this_month)} /><Stat label="Net cashflow this month" value={money(cashflow.net_cashflow_this_month)} /></div><div className="two-column"><Panel title="Open invoices"><Rows rows={openInvoices} render={(invoice) => <><div><strong>{invoice.tenant_name || 'Tenant'}</strong><span>{invoice.property_name || 'Property'} · due {date(invoice.due_date)} · {invoice.status}</span></div><strong>{money(invoice.total)}</strong></>} empty="No open invoices." /></Panel><Panel title="Expenses by category"><Rows rows={expensesByCategory} render={(item) => <><div><strong>{item.category}</strong><span>{item.count} recorded item{item.count === 1 ? '' : 's'}</span></div><strong>{money(item.total)}</strong></>} empty="No expenses recorded yet." /></Panel></div><Panel title="AI management brief"><p className="muted">The assistant receives only the aggregated figures shown on this report. It does not change records, calculate invoices, or send messages.</p>{aiSettingsQuery.error && <ErrorState text={aiSettingsQuery.error} />}{aiSettings && !aiSettings.configured && <ErrorState text="AI is not active yet. Add an OpenRouter app key to the Neon Function environment, then select a model in Settings." />}<div className="form-grid"><label>Brief focus<select value={focus} onChange={(e) => setFocus(e.target.value)}><option value="general">General management summary</option><option value="cashflow">Cashflow and collection focus</option><option value="expenses">Expense review</option><option value="occupancy">Occupancy and invoice focus</option></select></label><div className="ai-action"><Button disabled={busy || !aiSettings?.configured} onClick={() => void generate()}>{busy ? 'Preparing brief…' : 'Generate AI brief'}</Button>{aiSettings?.model && <span className="muted small">Model: {aiSettings.model}</span>}</div></div>{report && <pre className="invoice-preview ai-output">{report}</pre>}</Panel></>;
}

function SettingsPanel({ profile, notify }: { profile: any; notify: (n: Notice) => void }) {
  const query = useLoad(() => api.settings()); const aiSettingsQuery = useLoad(() => api.aiSettings()); const aiModelsQuery = useLoad(() => api.aiModels()); const models = (aiModelsQuery.data ?? []) as AiModel[];
  const [form, setForm] = useState({ displayName: profile.display_name, phone: profile.phone ?? '', address: profile.address ?? '', bankAccount: profile.bank_account ?? '' }); const [busy, setBusy] = useState(false); const [aiModel, setAiModel] = useState(''); const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => { if (query.data) { const s: any = query.data; setForm({ displayName: s.display_name, phone: s.phone ?? '', address: s.address ?? '', bankAccount: s.bank_account ?? '' }); } }, [query.data]);
  useEffect(() => { if (aiSettingsQuery.data) setAiModel((aiSettingsQuery.data as AiSettings).model ?? ''); }, [aiSettingsQuery.data]);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api.updateSettings(form); notify({ kind: 'success', text: 'Landlord details saved.' }); await query.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } };
  const saveAi = async (e: FormEvent) => { e.preventDefault(); setAiBusy(true); try { await api.updateAiSettings({ model: aiModel || null }); notify({ kind: 'success', text: 'AI model preference saved.' }); await aiSettingsQuery.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setAiBusy(false); } };
  const selectedMissing = aiModel && !models.some((model) => model.id === aiModel);
  return <><div className="page-intro"><div><div className="eyebrow">Invoice & contact details</div><h1>Settings</h1><p>These details appear on generated invoices and are visible only within your secured workspace.</p></div></div><Panel title="Landlord profile"><form className="form-grid" onSubmit={submit}><label>Display name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></label><label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="wide">Postal / physical address<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label className="wide">Payment details for invoices<textarea value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></label><div><Button disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button></div></form></Panel><Panel title="AI assistant"><p className="muted">The OpenRouter key is stored only in the Neon Function environment. It is never saved in the APK, browser, or landlord profile.</p>{aiSettingsQuery.error && <LoadFailure text={aiSettingsQuery.error} onRetry={aiSettingsQuery.reload} />}{Boolean(aiSettingsQuery.data) && !(aiSettingsQuery.data as AiSettings).configured && <ErrorState text="The AI assistant is waiting for an OpenRouter app key. Once it is configured, return here to choose from the live model list." />}{aiModelsQuery.error && (aiSettingsQuery.data as AiSettings | null)?.configured && <LoadFailure text={aiModelsQuery.error} onRetry={aiModelsQuery.reload} />}<form className="form-grid" onSubmit={saveAi}><label className="wide">OpenRouter model<select value={aiModel} onChange={(e) => setAiModel(e.target.value)} disabled={!models.length}><option value="">Use the app default model</option>{selectedMissing && <option value={aiModel}>{aiModel} (saved preference)</option>}{models.map((model) => <option value={model.id} key={model.id}>{model.name} — {model.id}</option>)}</select></label><p className="muted small wide">Choose a text model from the live OpenRouter catalog. Model pricing and availability are controlled by OpenRouter; set a credit cap on the app key before enabling it.</p><div><Button disabled={aiBusy || !aiSettingsQuery.data}>{aiBusy ? 'Saving model…' : 'Save AI model'}</Button></div></form></Panel></>;
}

function TenantWorkspace({ profile, onSignOut, notify }: { profile: any; onSignOut: () => Promise<void>; notify: (n: Notice) => void }) {
  const [tab, setTab] = useState<'Home' | 'Readings' | 'Invoices' | 'Messages'>('Home');
  return <><WorkspaceHeader title={profile.name} subtitle={`${profile.property_name}${profile.unit_number ? ` · ${profile.unit_number}` : ''}`} onSignOut={onSignOut} /><div className="workspace-layout"><nav className="tabs">{(['Home', 'Readings', 'Invoices', 'Messages'] as const).map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav><section className="workspace-content">{tab === 'Home' && <TenantHome profile={profile} />}{tab === 'Readings' && <TenantReadings notify={notify} />}{tab === 'Invoices' && <TenantInvoices />}{tab === 'Messages' && <MessagesPanel notify={notify} />}</section></div></>;
}

function TenantHome({ profile }: { profile: any }) { const query = useLoad(() => api.dashboard()); const dashboard: any = query.data; if (query.loading) return <Empty>Loading your tenancy…</Empty>; if (query.error) return <LoadFailure text={query.error} onRetry={query.reload} />; return <><div className="page-intro"><div><div className="eyebrow">Tenant portal</div><h1>Welcome, {profile.name}</h1><p>{profile.property_name}{profile.unit_number ? ` · ${profile.unit_number}` : ''} · Rent: <strong>{money(profile.monthly_rent)}/month</strong></p></div></div><div className="stats-grid"><Stat label="Current monthly rent" value={money(profile.monthly_rent)} /><Stat label="Invoices available" value={dashboard?.invoices?.length ?? 0} /><Stat label="Recent readings" value={dashboard?.readings?.length ?? 0} /></div><Panel title="Latest invoices"><Rows rows={(dashboard?.invoices ?? []) as Invoice[]} render={(invoice) => <><div><strong>{date(invoice.period_start)} — {date(invoice.period_end)}</strong><span>Due {date(invoice.due_date)}</span></div><strong>{money(invoice.total)}</strong></>} empty="No invoices available yet." /></Panel></>; }

function TenantReadings({ notify }: { notify: (n: Notice) => void }) { const query = useLoad(() => api.readings()); const readings = (query.data ?? []) as Reading[]; const [form, setForm] = useState({ readingDate: today(), utilityType: 'electricity', currentReading: '', note: '' }); const [busy, setBusy] = useState(false); const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { await api.createReading({ ...form, currentReading: Number(form.currentReading) }); setForm({ ...form, currentReading: '', note: '' }); notify({ kind: 'success', text: 'Reading submitted.' }); await query.reload(); } catch (err) { notify({ kind: 'error', text: messageFor(err) }); } finally { setBusy(false); } }; return <><div className="page-intro"><div><div className="eyebrow">Meter readings</div><h1>Submit a reading</h1><p>Your reading is checked against the previous confirmed value before it is saved.</p></div></div>{query.error && <LoadFailure text={query.error} onRetry={query.reload} />}<div className="two-column"><Panel title="New reading"><form className="stack" onSubmit={submit}><label>Date<input type="date" value={form.readingDate} onChange={(e) => setForm({ ...form, readingDate: e.target.value })} required /></label><label>Utility<select value={form.utilityType} onChange={(e) => setForm({ ...form, utilityType: e.target.value })}><option value="electricity">Electricity</option><option value="water">Water</option></select></label><label>Current meter reading<input type="number" min="0" step="0.01" value={form.currentReading} onChange={(e) => setForm({ ...form, currentReading: e.target.value })} required /></label><label>Note <span className="optional">optional</span><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><Button disabled={busy}>{busy ? 'Submitting…' : 'Submit reading'}</Button></form></Panel><Panel title="Your reading history"><Rows rows={readings} render={(r) => <><div><strong>{r.utility_type}</strong><span>{date(r.reading_date)} · {r.previous_reading} → {r.current_reading}</span></div><strong>{r.consumption} units</strong></>} empty="No readings submitted yet." /></Panel></div></>; }

function TenantInvoices() { const query = useLoad(() => api.invoices()); const invoices = (query.data ?? []) as Invoice[]; const [selected, setSelected] = useState<Invoice | null>(null); if (query.loading) return <Empty>Loading invoices…</Empty>; if (query.error) return <LoadFailure text={query.error} onRetry={query.reload} />; return <><div className="page-intro"><div><div className="eyebrow">Billing</div><h1>Your invoices</h1><p>Open an invoice to view its full rent and utility breakdown.</p></div></div><Panel title="Invoice history"><div className="list">{invoices.length ? invoices.map((invoice) => <button className="list-row selectable" key={invoice.id} onClick={() => setSelected(invoice)}><div><strong>{date(invoice.period_start)} — {date(invoice.period_end)}</strong><span>Due {date(invoice.due_date)} · {invoice.status}</span></div><strong>{money(invoice.total)}</strong></button>) : <Empty>No invoices available yet.</Empty>}</div></Panel>{selected && <Panel title={`Invoice · ${money(selected.total)}`} action={<button className="link-button" onClick={() => setSelected(null)}>Close</button>}><pre className="invoice-preview">{selected.content || 'No invoice content is available.'}</pre></Panel>}</>; }
