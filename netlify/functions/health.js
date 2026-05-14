const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'X-Data-Policy': 'no-storage',
};

function isConfigured(value, placeholder) {
  return Boolean(value && value !== placeholder);
}

export const handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      status: 'ok',
      geminiConfigured: isConfigured(
        process.env.GEMINI_API_KEY,
        'YOUR_GEMINI_API_KEY_HERE'
      ),
      anthropicConfigured: isConfigured(
        process.env.ANTHROPIC_API_KEY,
        'YOUR_ANTHROPIC_API_KEY_HERE'
      ),
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
      anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    }),
  };
};