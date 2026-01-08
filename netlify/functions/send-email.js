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

    // Verify API key is set
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY environment variable not set');
      return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ko-rents.com',
      subject,
      text: emailBody,
      replyTo: process.env.LANDLORD_REPLY_EMAIL || 'landlord@example.com'
    };

    const result = await sgMail.send(msg);

    console.log(`Email sent to ${to}`, result[0].statusCode);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: `Email sent to ${to}` })
    };
  } catch (err) {
    console.error('SendGrid error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to send email' })
    };
  }
};
