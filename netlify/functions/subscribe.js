exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Function is working!' })
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      console.log('=== RAW REQUEST ===');
      console.log('Body:', event.body);
      
      const data = JSON.parse(event.body);
      console.log('Parsed data:', data);
      
      // Handle Framer's capital "E" format
      let email = data.Email || data.email || data.fields?.email || data.data?.email;
      
      console.log('Extracted email:', email);

      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'No email found in request',
            received_data: data 
          })
        };
      }

      // Validate email format
      if (!email.includes('@')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Invalid email format' 
          })
        };
      }

      // MailerLite API call
      if (!process.env.MAILERLITE_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'API key not configured' 
          })
        };
      }

      console.log('Adding to MailerLite as UNCONFIRMED:', email);
      const mailerliteResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          email: email,
          // Force unconfirmed status to trigger confirmation email
          status: 'unconfirmed',
          resubscribe: false,
          autoresponders: true,
          // Add source as API instead of manual
          fields: {
            source: 'Framer Website',
            signup_date: new Date().toISOString().split('T')[0]
          }
        })
      });

      console.log('MailerLite status:', mailerliteResponse.status);

      const mailerliteData = await mailerliteResponse.json();
      console.log('MailerLite full response:', mailerliteData);

      // Log the subscriber status
      if (mailerliteData && mailerliteData.data) {
        console.log('Subscriber status:', mailerliteData.data.status);
        console.log('Subscriber source:', mailerliteData.data.source);
      }

      if (mailerliteResponse.ok) {
        console.log('Successfully added to MailerLite');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            message: 'Subscribed successfully - please check your email to confirm',
            subscriber_status: mailerliteData.data?.status
          })
        };
      } else {
        const errorText = await mailerliteResponse.text();
        console.log('MailerLite error response:', errorText);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Failed to add to mailing list' 
          })
        };
      }

    } catch (error) {
      console.log('Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Server error: ' + error.message 
        })
      };
    }
  }

  return { 
    statusCode: 405, 
    headers, 
    body: JSON.stringify({ 
      success: false,
      error: 'Method not allowed' 
    }) 
  };
};
