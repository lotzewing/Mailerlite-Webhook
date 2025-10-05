exports.handler = async function(event, context) {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Handle GET requests (for testing)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'MailerLite subscription endpoint is working!',
        instructions: 'Send a POST request with { "email": "test@example.com" }'
      })
    };
  }

  // Handle POST requests (actual form submissions)
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const email = data.email;

      console.log('Received email:', email);

      // Validate email
      if (!email || !email.includes('@')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Valid email required' })
        };
      }

      // Check if API key is set
      if (!process.env.MAILERLITE_API_KEY) {
        console.error('MailerLite API key not found');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Server configuration error' })
        };
      }

      // Add subscriber to MailerLite
      const mailerliteResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });

      console.log('MailerLite response status:', mailerliteResponse.status);

      if (mailerliteResponse.ok) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Subscribed successfully' })
        };
      } else {
        const errorData = await mailerliteResponse.text();
        console.error('MailerLite API error:', errorData);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Subscription failed' })
        };
      }
    } catch (error) {
      console.error('Function error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server error' })
      };
    }
  }

  // If method is not GET, POST, or OPTIONS
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};
