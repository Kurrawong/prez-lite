/**
 * Cloudflare Worker — AI Vocabulary Assessment Proxy
 *
 * Receives a vocabulary + validation context and returns an AI-generated
 * remediation report. Uses Cloudflare Workers AI binding.
 *
 * Environment bindings required:
 *   AI       — Workers AI binding (configured in wrangler.toml)
 *   API_KEY  — Optional bearer token for authentication (secret)
 *
 * Deploy:
 *   cd scripts/cf-worker && npx wrangler deploy
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Auth check
    if (env.API_KEY) {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      if (token !== env.API_KEY) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    try {
      const body = await request.json();
      const { system, prompt, vocab } = body;

      if (!prompt) {
        return Response.json({ error: 'Missing prompt' }, { status: 400 });
      }

      const messages = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: prompt });

      // Use Cloudflare Workers AI
      // Llama 3.3 70B fp8-fast: good quality with faster inference for free-tier timeouts
      const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
      const result = await env.AI.run(model, {
        messages,
        max_tokens: 16384,
        temperature: 0.1,
        top_p: 0.9,
      });

      return Response.json(
        {
          content: result.response,
          vocab,
          model,
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      return Response.json(
        { error: err.message || 'Internal error' },
        { status: 500 }
      );
    }
  },
};
