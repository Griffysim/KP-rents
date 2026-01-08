# KO-Rents Netlify Functions - Complete Setup Guide

## Quick Start (5 minutes)

### Step 1: Create the folder structure in your GitHub repo

Your repo should look like this:

```
your-repo-root/
├── index.html
├── app.js
├── netlify/
│   └── functions/
│       ├── generate-invoice.js
│       ├── send-email.js
│       └── package.json
└── .gitignore
```

### Step 2: Copy the three function files

Copy these files from the artifact links into your `netlify/functions/` directory:

1. **`generate-invoice.js`** - Uses Perplexity API to create professional invoices
2. **`send-email.js`** - Uses SendGrid to email invoices to tenants
3. **`package.json`** - Dependencies for the functions

### Step 3: Configure Environment Variables in Netlify

1. Go to **Netlify Dashboard** → Select your site
2. Click **Site settings** → **Environment variables**
3. Add these environment variables:

```
PERPLEXITY_API_KEY = [Your Perplexity API Key]
SENDGRID_API_KEY = [Your SendGrid API Key]
SENDGRID_FROM_EMAIL = invoices@yourdomain.com
LANDLORD_REPLY_EMAIL = landlord@yourdomain.com
```

⚠️ **Replace the bracketed values with your actual keys**

### Step 4: Deploy

1. Commit and push to GitHub:
```bash
git add netlify/
git commit -m "Add Netlify functions for invoice generation and email"
git push
```

2. Netlify will automatically:
   - Detect the functions
   - Install dependencies from package.json
   - Deploy the serverless functions

3. Your functions will be available at:
   - `/.netlify/functions/generate-invoice`
   - `/.netlify/functions/send-email`

### Step 5: Test

In your KO-Rents app:
1. Log in as Landlord
2. Go to **Tenants** tab
3. Click "Generate Invoice" on a tenant
4. Fill in the billing period
5. Click "Generate & Send Invoice"
6. Check the tenant's email for the invoice

---

## Getting Your API Keys

### Perplexity API Key

You already have this from your Perplexity account. If not:

1. Go to https://www.perplexity.ai/
2. Sign in to your account
3. Go to **Settings** → **API** (the </> icon)
4. Click **Generate API Key**
5. Copy the key (starts with `pplx-`)
6. Keep it secret! Never commit to GitHub

### SendGrid API Key (Free Tier Available)

1. Go to https://sendgrid.com
2. Sign up or log in
3. Go to **Settings** → **API Keys**
4. Click **Create API Key**
5. Choose **Full Access** (or **Restricted Access** if you prefer)
6. Copy the key
7. **Verify a Sender Email**:
   - Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
   - Add and verify an email address (use your landlord email or a custom domain)
   - Use this verified email as `SENDGRID_FROM_EMAIL`

---

## File Descriptions

### generate-invoice.js

**What it does:**
- Receives tenant, property, rent, and utilities data from your app
- Calls the Perplexity API (Sonar model) to generate a professional invoice
- Returns the formatted invoice text

**Perplexity API Used:** `sonar` (you can upgrade to `sonar-pro` for web-grounded content)

**Inputs:**
```javascript
{
  tenantName: "John Doe",
  tenantEmail: "john@example.com",
  propertyName: "KO Gardens",
  unitNumber: "Unit 4B",
  billingPeriod: "2026-01-01 to 2026-01-31",
  dueDate: "2026-02-07",
  baseRent: 8500,
  utilities: [
    { name: "Water", amount: 350.75 },
    { name: "Electricity", amount: 820.10 }
  ],
  landlord: {
    name: "Simon",
    email: "simon@ko-rents.com",
    address: "123 Main St, Cape Town",
    phone: "021 555 0000",
    bank_account: "FNB 123456789"
  },
  additionalText: "Late payment fee: 100"
}
```

**Output:**
```javascript
{
  invoiceText: "Dear John Doe...\n\nInvoice for January 2026...",
  totalDue: 9670.85,
  utilities: [...]
}
```

### send-email.js

**What it does:**
- Receives recipient email, subject, and invoice text
- Sends the email via SendGrid
- Returns success/error status

**Email Provider:** SendGrid (recommended, free tier: 100 emails/day)

**Inputs:**
```javascript
{
  to: "john@example.com",
  subject: "Invoice - KO Gardens - 2026-01-01 to 2026-01-31",
  body: "Dear John Doe...\n\nInvoice for January 2026...",
  tenantName: "John Doe",
  landlordName: "Simon"
}
```

**Output:**
```javascript
{
  ok: true,
  message: "Email sent to john@example.com"
}
```

### package.json

**What it does:**
- Tells Netlify to install SendGrid and node-fetch packages
- Required for functions to work

**Dependencies:**
- `@sendgrid/mail@^7.7.0` - SendGrid email API
- `node-fetch@^2.6.11` - Fetch library for Node.js

---

## Troubleshooting

### Error: "PERPLEXITY_API_KEY undefined"

**Solution:** Make sure you've:
1. Added `PERPLEXITY_API_KEY` to Netlify environment variables
2. Redeployed the site after adding the variable
3. Used the exact correct API key (no extra spaces or quotes)

Check Netlify logs:
- Go to **Site** → **Logs** → **Function logs**

### Error: "Email service not configured"

**Solution:** Make sure you've:
1. Added `SENDGRID_API_KEY` to Netlify environment variables
2. Verified a sender email in SendGrid
3. Set `SENDGRID_FROM_EMAIL` to your verified email

### Invoices not generating

**Solution:** Check the function logs:
1. Open Netlify dashboard
2. Go to **Functions** tab
3. Click **generate-invoice** to view logs
4. Look for error messages

### Emails not sending

**Solution:** Check SendGrid:
1. Go to https://app.sendgrid.com/
2. Click **Mail Send** to see email history
3. Look for bounces, failures, or blocks
4. Verify the sender email is verified (not in review)

---

## Advanced: Alternative Email Providers

### Option A: Resend (EU-Friendly, Modern)

Replace `send-email.js` with:

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  try {
    const { to, subject, body: emailBody } = JSON.parse(event.body || '{}');

    if (!to || !subject || !emailBody) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'invoices@ko-rents.com',
      to,
      subject,
      text: emailBody
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, messageId: response.id })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
```

**Setup:**
1. Sign up at https://resend.com
2. Create API key
3. Update `package.json` to include `"resend": "^1.0.0"`
4. Set environment variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`

### Option B: Mailgun (Reliable, Enterprise-Ready)

Similar approach to SendGrid. Requires:
- `mailgun-js` package
- `MAILGUN_API_KEY` environment variable
- `MAILGUN_DOMAIN` environment variable

---

## Security Best Practices

✅ **Do:**
- Store API keys ONLY in Netlify environment variables
- Never commit API keys to GitHub
- Use separate SendGrid keys for different environments
- Verify sender emails are legitimate
- Log important events (email sent, invoice generated)

❌ **Don't:**
- Hard-code API keys in functions
- Share API keys via email or chat
- Use production API keys in development
- Forget to verify sender emails in SendGrid

---

## Monitoring & Logs

### View Function Logs

1. Netlify Dashboard → Your Site
2. **Logs** → **Function logs**
3. Filter by function name: `generate-invoice` or `send-email`
4. Check timestamps and error messages

### View SendGrid Email Status

1. Go to https://app.sendgrid.com
2. **Mail Send** → View sent emails
3. Click on email to see delivery status
4. Check bounce rates, failures, bounces

### Perplexity API Usage

1. Go to https://www.perplexity.ai/
2. Account Settings → API
3. View API usage and costs
4. Monitor usage vs. quota

---

## Costs

### Perplexity API
- **Sonar**: $0.003 per 1K input tokens, $0.01 per 1K output tokens
- **Sonar Pro**: $0.015 per 1K input tokens, $0.05 per 1K output tokens
- Typical invoice generation: ~1-3 cents per invoice

### SendGrid
- **Free tier**: 100 emails/day (perfect for testing)
- **Paid**: $19.95/month for 40K emails/month
- Usually $0.0005-0.001 per email at scale

### Netlify Functions
- **Free tier**: 125K invocations/month (plenty for property management)
- **Paid**: $0.32 per 1M invocations

---

## Support & Debugging

**If something breaks:**

1. Check Netlify function logs
2. Test with curl or Postman:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/generate-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Test",
    "tenantEmail": "test@example.com",
    "propertyName": "Test Property",
    "unitNumber": "1",
    "billingPeriod": "Jan 2026",
    "dueDate": "2026-02-07",
    "baseRent": 5000,
    "utilities": [],
    "landlord": {}
  }'
```

3. Check SendGrid bounce list for email issues
4. Verify Perplexity API key is correct

---

## Next Steps

After deployment:

1. ✅ Test invoice generation with a test tenant
2. ✅ Verify email delivery
3. ✅ Check invoice formatting
4. ✅ Customize additional charges (in app.js if needed)
5. ✅ Set up monitoring for function logs
6. ✅ Monitor Perplexity API usage
7. ✅ Scale SendGrid plan as needed (as you add more tenants)

---

**Questions? Check the app.js comments or Netlify documentation: https://docs.netlify.com/functions/overview/**
