exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Handle GET requests
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Function is working!' })
    };
  }

  // Handle POST requests
  if (event.httpMethod === 'POST') {
    try {
      console.log('=== RAW REQUEST ===');
      console.log('Headers:', event.headers);
      console.log('Body:', event.body);
      
      const data = JSON.parse(event.body);
      console.log('Parsed data:', data);
      
      // Framer might send the email in different fields
      let email = data.email || data.fields?.email || data.data?.email;
      
      console.log('Extracted email:', email);

      if (!email) {
        console.log('Available data keys:', Object.keys(data));
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'No email found',
            received_data: data 
          })
        };
      }

      // Validate email format
      if (!email.includes('@')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email format' })
        };
      }

      // MailerLite API call
      if (!process.env.MAILERLITE_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'API key not configured' })
        };
      }

      const mailerliteResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: email })
      });

      console.log('MailerLite status:', mailerliteResponse.status);

      if (mailerliteResponse.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      } else {
        const errorText = await mailerliteResponse.text();
        console.log('MailerLite error:', errorText);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'MailerLite subscription failed' })
        };
      }

    } catch (error) {
      console.log('Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server error: ' + error.message })
      };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
