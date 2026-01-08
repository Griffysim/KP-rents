# KO-Rents Property Management System

AI-powered property management system for South African landlords with automatic invoice generation using Perplexity API.

## Features

✨ **Landlord Dashboard**
- Dashboard with property statistics
- Tenant management (add, edit, view)
- Utility readings tracking (electricity, water)
- **AI-Generated Invoices** with Perplexity Sonar API
- **Automated Email Delivery** via SendGrid
- Payment recording and tracking
- Tenant messaging system
- Settings management

🏠 **Tenant Portal**
- View property details and rent status
- Submit meter readings
- View generated invoices
- Report issues to landlord
- Message history

🔐 **Security**
- Password-protected login (separate for landlords and tenants)
- Supabase database integration
- Environment-variable API keys (never hardcoded)

---

## Tech Stack

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (responsive, modern design)
- **Vanilla JavaScript** - No frameworks, lightweight

### Backend
- **Supabase** - PostgreSQL database (rent, tenants, utilities, invoices, payments, messages)
- **Netlify Functions** - Serverless functions for invoice generation and email

### AI & Services
- **Perplexity API (Sonar)** - Professional invoice text generation
- **SendGrid** - Email delivery

### Hosting
- **Netlify** - Deploy frontend + functions (all-in-one)
- **GitHub** - Version control

---

## Project Structure

```
ko-rents/
├── index.html                    # Main UI (landlord + tenant portals)
├── app.js                        # Application logic & Supabase integration
├── netlify/
│   └── functions/
│       ├── generate-invoice.js   # Calls Perplexity API for invoices
│       ├── send-email.js         # Sends emails via SendGrid
│       └── package.json          # Dependencies (SendGrid, node-fetch)
├── SETUP-GUIDE.md               # Detailed setup instructions
├── .gitignore                   # Git ignore rules (protects secrets)
└── README.md                    # This file
```

---

## Quick Start

### 1. Clone & Setup Repository

```bash
git clone https://github.com/yourusername/ko-rents.git
cd ko-rents
```

### 2. Create Netlify Functions Directory

```bash
mkdir -p netlify/functions
```

Copy these files into `netlify/functions/`:
- `generate-invoice.js`
- `send-email.js`
- `package.json`

### 3. Get API Keys

**Perplexity API Key:**
- Already have one from your Perplexity account
- Found in Settings → API (</> icon)

**SendGrid API Key:**
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Create API key in Settings → API Keys
3. Verify a sender email for sending invoices

**Supabase Connection:**
- Already configured in `app.js` (using provided project)
- No additional setup needed

### 4. Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment variables:

```
PERPLEXITY_API_KEY=your_perplexity_key
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=invoices@yourdomain.com
LANDLORD_REPLY_EMAIL=landlord@yourdomain.com
```

### 5. Deploy to Netlify

```bash
git add .
git commit -m "Initial KO-Rents setup"
git push
```

Netlify automatically:
1. Detects `netlify/functions/` folder
2. Installs dependencies from `package.json`
3. Deploys functions to production
4. Makes functions available at `/.netlify/functions/*`

### 6. Test

1. Open your deployed site
2. Log in as Landlord (password: `admin123`)
3. Go to **Tenants** tab
4. Click "Generate Invoice" on a tenant
5. Fill billing period and utilities
6. Click "Generate & Send Invoice"
7. Check tenant email for the invoice ✅

---

## How It Works

### Invoice Generation Flow

1. **User fills form** (tenant name, rent amount, utilities)
2. **App calls Netlify function** `/.netlify/functions/generate-invoice`
3. **Function calls Perplexity API** with invoice details + prompt
4. **Perplexity generates professional invoice text** (human-readable, ready to send)
5. **Function returns invoice text** to app
6. **User sees preview** and confirms
7. **App calls second function** `/.netlify/functions/send-email`
8. **SendGrid sends email** to tenant
9. **Invoice saved** to Supabase database

### Database Schema

**Properties**
- id, name, monthly_rent, unit_number

**Tenants**
- id, name, email, phone, property_id, monthly_rent, tenant_password

**Invoices**
- id, tenant_id, period_start, period_end, total, content, created_at

**Utilities**
- id, tenant_id, date, electricity_reading, water_reading, note

**Payments**
- id, tenant_id, date, amount, method, note

**Messages**
- id, tenant_id, subject, body, date, resolved

**Landlord Data**
- id, name, email, address, phone, bank_account

---

## Login Credentials

### Landlord
- Password: `admin123`

### Tenants
- Use property name + individual tenant password
- Passwords are set when tenant is added to the system

---

## Costs

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Perplexity API** | N/A | ~$0.01-0.03 per invoice |
| **SendGrid** | 100 emails/day | $19.95/month (40K emails) |
| **Netlify Functions** | 125K invocations/month | $0.32 per 1M invocations |
| **Supabase** | 500MB free | $25/month (1GB storage) |
| **Total** | ~$0/month to test | ~$45-50/month at scale |

---

## Customization

### Change Landlord Password

In `app.js`, find:
```javascript
const LANDLORD_PASSWORD = 'admin123';
```
Change to your desired password.

### Adjust Invoice Styling

Invoice text is generated by Perplexity API using the prompt in `generate-invoice.js`. Customize the `userPrompt` variable to change tone, format, or content.

### Add More Utilities

In `app.js`, the utility calculation:
```javascript
const utilAmount = (util.electricity_reading * 0.15) + (util.water_reading * 8.50);
```
Change rates based on your actual utility costs.

### Change Email From Address

In Netlify environment variables:
```
SENDGRID_FROM_EMAIL=custom@yourdomain.com
```

---

## Troubleshooting

### Invoice not generating?
1. Check Netlify function logs: Site → Logs → Function logs
2. Verify `PERPLEXITY_API_KEY` is set correctly
3. Check that Perplexity API key is active (not expired)

### Email not sending?
1. Check SendGrid bounce list: https://app.sendgrid.com/
2. Verify sender email is verified in SendGrid
3. Check `SENDGRID_API_KEY` is correct

### Function not found?
1. Ensure `netlify/functions/` folder exists
2. Redeploy site after adding functions
3. Check function filenames (case-sensitive)

See **SETUP-GUIDE.md** for more detailed troubleshooting.

---

## Security Notes

⚠️ **Never commit these to GitHub:**
- API keys
- Database credentials
- Passwords
- `.env` files

✅ **Always use:**
- Environment variables for secrets
- `.gitignore` to exclude sensitive files
- HTTPS for all connections (Netlify default)
- Strong passwords for tenants

---

## Future Enhancements

- [ ] Email invoice as PDF attachment
- [ ] Bulk invoice generation for multiple tenants
- [ ] Payment reminders (auto-send if overdue)
- [ ] Analytics dashboard (payment trends, vacancy rates)
- [ ] Multi-landlord support
- [ ] SMS notifications
- [ ] Mobile app (React Native/Flutter)
- [ ] Bank integration for automated rent payments
- [ ] Custom invoice templates

---

## Support

**Issues or questions?**
1. Check function logs in Netlify dashboard
2. Review SETUP-GUIDE.md for detailed instructions
3. Test with curl/Postman if functions aren't responding
4. Check Perplexity API documentation: https://docs.perplexity.ai
5. Check SendGrid documentation: https://sendgrid.com/docs

---

## License

MIT License - Use freely for your property management needs.

---

**Built with ❤️ for South African property managers**

*Last updated: January 2026*
