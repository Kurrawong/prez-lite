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
      // @cf/meta/llama-3.1-70b-instruct is a good balance of quality and speed
      // Can be changed to other models available in Workers AI
      const result = await env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages,
        max_tokens: 8192,
        temperature: 0.3,
      });

      return Response.json(
        {
          content: result.response,
          vocab,
          model: '@cf/meta/llama-3.1-70b-instruct',
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
