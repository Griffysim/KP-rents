const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

exports.handler = async (event) => {
  try {
    console.log('Function invoked:', {
      httpMethod: event.httpMethod,
      path: event.path
    });

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const body = JSON.parse(event.body || '{}');

    console.log('Parsed body:', {
      tenantName: body.tenantName,
      propertyName: body.propertyName
    });

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL =
      process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';

    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not set in environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Server misconfigured: OPENROUTER_API_KEY not set'
        })
      };
    }

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
          .map((u) => `- ${u.name}: R ${Number(u.amount).toFixed(2)}`)
          .join('
')
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
5. Payment instructions section
6. Contact information
7. Professional closing

Make it warm but professional, suitable for South African rental context.
`;

    const headers = {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (process.env.SITE_URL) {
      headers['HTTP-Referer'] = process.env.SITE_URL;
    }

    if (process.env.APP_NAME) {
      headers['X-OpenRouter-Title'] = process.env.APP_NAME;
    }

    console.log('Making request to OpenRouter API...');

    const resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.2
      })
    });

    console.log('OpenRouter response status:', resp.status);

    const data = await resp.json();

    if (!resp.ok) {
      console.error('OpenRouter API error:', data);
      return {
        statusCode: resp.status,
        body: JSON.stringify(data)
      };
    }

    const content = data?.choices?.[0]?.message?.content ?? '';

    if (!content) {
      console.error('No content from OpenRouter:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No invoice content generated' })
      };
    }

    console.log('Invoice generated successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        invoiceText: content,
        totalDue,
        utilities,
        model: OPENROUTER_MODEL
      })
    };
  } catch (err) {
    console.error('Function error:', err.message, err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
        stack: err.stack
      })
    };
  }
};