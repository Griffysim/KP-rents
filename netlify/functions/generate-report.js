const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { prompt, systemPrompt, apiKey, model } = body;

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: prompt' }) };
    }

    // Prefer a landlord-supplied key/model (from Settings > AI Setup), fall back to
    // server-configured environment variables so the app keeps working out of the box.
    const OPENROUTER_API_KEY = apiKey || process.env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = model || process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';

    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'No OpenRouter API key configured. Add one in Settings > AI Setup, or set OPENROUTER_API_KEY in Netlify.'
        })
      };
    }

    const headers = {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (process.env.SITE_URL) headers['HTTP-Referer'] = process.env.SITE_URL;
    if (process.env.APP_NAME) headers['X-OpenRouter-Title'] = process.env.APP_NAME;

    const resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt || 'You are a professional property management accountant. Generate clean formal reports in plain text only. No markdown.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('OpenRouter API error:', data);
      return { statusCode: resp.status, body: JSON.stringify(data) };
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';

    if (!content) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No report content generated' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reportText: content, model: OPENROUTER_MODEL })
    };
  } catch (err) {
    console.error('Function error:', err.message, err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  }
};
