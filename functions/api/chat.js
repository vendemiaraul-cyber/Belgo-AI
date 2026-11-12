// Belgo's own brain: runs on this site's Cloudflare account through Workers AI. No key in the page.
const MODELS = ['@cf/openai/gpt-oss-120b', '@cf/openai/gpt-oss-20b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
// For building apps: the dedicated coding model first (it needs the Workers Paid plan and is refused on the
// free plan at no cost), then the best free models, then the general ones above.
const CODE_MODELS = ['@cf/moonshotai/kimi-k2.7-code', '@cf/qwen/qwen3.8-27b', '@cf/zai-org/glm-4.7-flash', ...MODELS];

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
  if (!env.AI) return json({ error: 'Workers AI is not connected to this site.' }, 503);
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
