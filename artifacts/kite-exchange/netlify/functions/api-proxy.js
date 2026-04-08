const REPLIT_BASE = 'https://basoncecom.replit.app';

exports.handler = async (event) => {
  try {
    const path = event.path;
    const targetUrl = `${REPLIT_BASE}${path}${event.rawQuery ? '?' + event.rawQuery : ''}`;

    const headers = { ...event.headers };
    delete headers['host'];
    delete headers['x-forwarded-host'];

    const fetchOptions = {
      method: event.httpMethod,
      headers,
    };

    if (event.body && event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
      fetchOptions.body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : event.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseBody = await response.arrayBuffer();
    const responseHeaders = {};

    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    responseHeaders['access-control-allow-origin'] = '*';
    responseHeaders['access-control-allow-headers'] = '*';
    responseHeaders['access-control-allow-methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: Buffer.from(responseBody).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Proxy error', message: error.message }),
    };
  }
};
