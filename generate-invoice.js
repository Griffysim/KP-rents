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
