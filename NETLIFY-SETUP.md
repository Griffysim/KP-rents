# Netlify Functions Setup Guide for KO-Rents

## Step 1: Create Netlify Functions Directory

In your GitHub repo root, create this folder structure:

```
netlify/
└── functions/
    ├── generate-invoice.js
    └── send-email.js
```

## Step 2: Copy Function Files

### File: `netlify/functions/generate-invoice.js`

```javascript
const fetch = require('node-fetch');

const PPLX_URL = 'https://api.perplexity.ai/chat/completions';

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');

    const {
      tenantName,
      tenantEmail,
      propertyName,
      unitNumber,
      billingPeriod,
      dueDate,
      baseRent,
      utilities = [],
      landlord = {},
      additionalText = ''
    } = body;

    const utilitiesTotal = utilities.reduce(
      (sum, u) => sum + (Number(u.amount) || 0),
      0
    );
    const totalDue = Number(baseRent || 0) + utilitiesTotal;

    const systemPrompt =
      'You are an assistant generating clear, professional rental invoices ' +
      'for a South African landlord. Use ZAR currency and tenant-friendly language. ' +
      'Format the invoice as plain text suitable for email or printing.';

    const utilitiesLines = utilities.length > 0
      ? utilities
          .map(u => `- ${u.name}: R ${Number(u.amount).toFixed(2)}`)
          .join('\n')
      : '- None';

    const userPrompt = `
Generate a complete invoice email body ready to send to the tenant. Make it professional and clear.

Landlord Details:
- Name: ${landlord.name || 'Landlord'}
- Email: ${landlord.email || 'landlord@example.com'}
- Address: ${landlord.address || 'Your Address'}
- Phone: ${landlord.phone || '(555) 0000'}
- Bank Account: ${landlord.bank_account || 'To be provided'}

Tenant & Property Details:
- Tenant Name: ${tenantName}
- Tenant Email: ${tenantEmail}
- Property: ${propertyName}
- Unit: ${unitNumber || 'N/A'}

Invoice Details:
- Billing Period: ${billingPeriod}
- Due Date: ${dueDate}
- Base Rent: R ${Number(baseRent || 0).toFixed(2)}

Utilities Charged:
${utilitiesLines}

Total Amount Due: R ${totalDue.toFixed(2)}

Additional Notes from Landlord:
${additionalText || 'None'}

Please generate a professional invoice in plain text format that includes:
1. A greeting with tenant name
2. Itemized charges (rent + utilities)
3. Total amount due
4. Due date
5. Payment instructions section (with placeholder for account details)
6. Contact information
7. Professional closing

Make it warm but professional, suitable for South African rental context.
`;

    const resp = await fetch(PPLX_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Perplexity API error:', data);
      return { statusCode: resp.status, body: JSON.stringify(data) };
    }

    const content = data.choices?.[0]?.message?.content ?? '';

    return {
      statusCode: 200,
      body: JSON.stringify({
        invoiceText: content,
        totalDue,
        utilities
      })
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
```

### File: `netlify/functions/send-email.js`

**NOTE:** This is a placeholder. You need to integrate with an actual email provider.

#### Option A: Using SendGrid (Recommended)

```javascript
const sgMail = require('@sendgrid/mail');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { to, subject, body: emailBody, tenantName, landlordName } = JSON.parse(event.body || '{}');

    if (!to || !subject || !emailBody) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: to, subject, body' }) };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ko-rents.com',
      subject,
      text: emailBody,
      replyTo: process.env.LANDLORD_REPLY_EMAIL || 'landlord@example.com'
    };

    await sgMail.send(msg);

    console.log(`Email sent to ${to}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: `Email sent to ${to}` })
    };
  } catch (err) {
    console.error('SendGrid error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
```

**Install SendGrid in your repo:**
```bash
npm install @sendgrid/mail
```

#### Option B: Using Resend

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { to, subject, body: emailBody } = JSON.parse(event.body || '{}');

    if (!to || !subject || !emailBody) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
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
    console.error('Resend error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
```

## Step 3: Set Environment Variables in Netlify

1. Go to **Netlify Dashboard** → Your Site → **Settings** → **Environment variables**

2. Add these variables:

```
PERPLEXITY_API_KEY = your_perplexity_api_key_here

# If using SendGrid:
SENDGRID_API_KEY = your_sendgrid_api_key
SENDGRID_FROM_EMAIL = invoices@yourdomain.com
LANDLORD_REPLY_EMAIL = landlord@yourdomain.com

# If using Resend:
RESEND_API_KEY = your_resend_api_key
RESEND_FROM_EMAIL = invoices@yourdomain.com
```

3. Click **Deploy site** to redeploy with environment variables.

## Step 4: Get Your API Keys

### Perplexity API Key
- You already have this from your Perplexity account settings.

### Email Provider (Choose One)

**SendGrid:**
- Go to https://sendgrid.com
- Sign up (free tier available)
- Create API key in Settings → API Keys
- Verify sender email

**Resend:**
- Go to https://resend.com
- Sign up (free tier available)
- Create API key in API Keys section
- Verify domain

## Step 5: Deploy

1. Commit the new function files:
```bash
git add netlify/functions/
git commit -m "Add Perplexity API invoice generation and email functions"
git push
```

2. Netlify will automatically build and deploy.

3. Test by:
   - Open KO-Rents in browser
   - Log in as landlord
   - Go to **Tenants** tab
   - Click "Generate Invoice" on a tenant
   - Fill in billing period and utilities
   - Click "Generate & Send Invoice"
   - Check tenant's email inbox

## Troubleshooting

- **Invoice not generating:** Check Netlify function logs (Site → Functions → Logs tab)
- **Email not sending:** Verify email provider API key and sender email is verified
- **PERPLEXITY_API_KEY undefined:** Make sure env var is set and site is redeployed
