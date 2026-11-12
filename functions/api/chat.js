// Belgo's own brain: runs on this site's Cloudflare account through Workers AI. No key in the page.
const MODELS = ['@cf/openai/gpt-oss-120b', '@cf/openai/gpt-oss-20b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
// For building apps: the dedicated coding model first (it needs the Workers Paid plan and is refused on the
// free plan at no cost), then the best free models, then the general ones above.
const CODE_MODELS = ['@cf/moonshotai/kimi-k2.7-code', '@cf/qwen/qwen3.8-27b', '@cf/zai-org/glm-4.7-flash', ...MODELS];

// Cerebras (free key stored as the secret CEREBRAS_API_KEY) answers first when the key is set.
// Chat uses gpt-oss first; app building uses Qwen first.
const CEREBRAS_CHAT = ['gpt-oss-120b', 'qwen-3.8-27b'];
const CEREBRAS_CODE = ['qwen-3.8-27b', 'gpt-oss-120b'];
// Models that can look at a picture, on Workers AI.
const VISION = ['@cf/qwen/qwen3.8-27b', '@cf/google/gemma-4-26b-a4b-it'];
async function cerebras(key, messages, maxTokens, models) {
  let last = '';
  for (const model of models) {
    try {
      const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({ model, messages, max_completion_tokens: maxTokens }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { last = 'Cerebras ' + r.status + ': ' + (j.message || j.error?.message || ''); if (r.status === 401) break; continue; }
      const text = String(j.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (text) return { text, model: 'Cerebras ' + model };
      last = 'Cerebras ' + model + ' gave an empty answer';
    } catch (e) { last = 'Cerebras: ' + (e?.message || e); }
  }
  return { error: last };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Workers AI answers in different shapes depending on the model, so read all of them.
function pick(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r.response === 'string') return r.response;
  if (typeof r.output_text === 'string') return r.output_text;
  const choice = r.choices?.[0]?.message?.content;
  if (typeof choice === 'string') return choice;
  if (Array.isArray(r.output)) {
    return r.output.filter(o => o.type === 'message').flatMap(o => o.content || [])
      .map(c => c.text || '').join('');
  }
  return pick(r.result);
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'Not allowed.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(m => ['system', 'user', 'assistant'].includes(m?.role) && typeof m.content === 'string')
    .slice(-20).map(m => ({ role: m.role, content: m.content.slice(0, 30000) }));
  if (!messages.some(m => m.role === 'user')) return json({ error: 'No message.' }, 400);

  let last = '';
  const coding = body.task === 'code';

  // A picture to look at: only the vision models can answer.
  if (body.image) {
    const image = String(body.image);
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 2800000) return json({ error: 'The picture is too large or not a JPEG, PNG or WebP.' }, 400);
    if (!env.AI) return json({ error: 'Workers AI is not connected to this site, so Belgo cannot look at pictures.' }, 503);
    const at = messages.map(m => m.role).lastIndexOf('user');
    const seen = messages.map((m, i) => i === at ? { role: 'user', content: [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: image } }] } : m);
    const tries = VISION.map(model => [model, { messages: seen, max_tokens: 1500 }]);
    tries.push(['@cf/meta/llama-3.2-11b-vision-instruct', { messages, image, max_tokens: 1500 }]);
    for (const [model, input] of tries) {
      try {
        const text = pick(await env.AI.run(model, input)).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (text) return json({ text, model: model.split('/').pop() });
        last = model + ' gave an empty answer';
      } catch (e) { last = e?.message || String(e); }
    }
    return json({ error: last || 'No model could look at the picture.' }, 502);
  }

  if (env.CEREBRAS_API_KEY) {
    const r = await cerebras(env.CEREBRAS_API_KEY, messages, coding ? 8000 : 2000, coding ? CEREBRAS_CODE : CEREBRAS_CHAT);
    if (r.text) return json(r);
    last = r.error;
  }
  if (!env.AI) return json({ error: last || 'No AI is connected to this site.' }, 503);
  for (const model of coding ? CODE_MODELS : MODELS) {
    for (const input of [{ messages, max_tokens: coding ? 8000 : 2000 }, { input: messages }]) {
      try {
        const text = pick(await env.AI.run(model, input)).trim();
        if (text) return json({ text, model: model.split('/').pop() });
        last = model + ' gave an empty answer';
      } catch (e) {
        last = e?.message || String(e);
        // Not on this plan, retired, or out of daily allowance: the other request shape will not help.
        if (/5035|5028|3036|3042|paid|upgrade|deprecat|allocation/i.test(last)) break;
      }
    }
  }
  return json({ error: last || 'No model answered.' }, 502);
}
