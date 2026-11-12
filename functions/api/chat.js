// Belgo's own brain: runs on this site's Cloudflare account through Workers AI. No key in the page.
const MODELS = ['@cf/openai/gpt-oss-120b', '@cf/openai/gpt-oss-20b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
// For building apps: the dedicated coding model first (it needs the Workers Paid plan and is refused on the
// free plan at no cost), then the best free models, then the general ones above.
const CODE_MODELS = ['@cf/moonshotai/kimi-k2.7-code', '@cf/openai/gpt-oss-120b', '@cf/zai-org/glm-4.7-flash', '@cf/qwen/qwen3.8-27b', ...MODELS];
// Coding models the person can pick in Belgo's settings. The picked one is tried first; the list above is the backup.
const CODE_CHOICES = {
  'gpt-oss-120b': '@cf/openai/gpt-oss-120b', 'glm-4.7-flash': '@cf/zai-org/glm-4.7-flash', 'qwen3.8-27b': '@cf/qwen/qwen3.8-27b',
  'gemma-4': '@cf/google/gemma-4-26b-a4b-it', 'kimi-k2.7-code': '@cf/moonshotai/kimi-k2.7-code', 'glm-5.3-flash': '@cf/zai-org/glm-5.3-flash',
};
const CEREBRAS_HAS = { 'gpt-oss-120b': 'gpt-oss-120b', 'qwen3.8-27b': 'qwen-3.8-27b' };

// Cerebras (free key stored as the secret CEREBRAS_API_KEY) answers first when the key is set.
// Chat uses gpt-oss first; app building uses Qwen first.
const CEREBRAS_CHAT = ['gpt-oss-120b', 'qwen-3.8-27b'];
const CEREBRAS_CODE = ['gpt-oss-120b', 'qwen-3.8-27b'];
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

// Other free coding models. Each works once its free API key is stored as a secret on the Pages project.
// The model is chosen from the provider's own live list, so retired model names do not break Belgo.
const FREE_CODERS = {
  gemini: { name: 'Gemini', key: 'GEMINI_API_KEY', base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    ok: id => /gemini/.test(id) && !/lite|image|tts|embed|audio|live|vision|nano|8b/.test(id), prefer: [/gemini-[\d.]+-flash$/, /flash-latest/, /flash/] },
  groq: { name: 'Groq', key: 'GROQ_API_KEY', base: 'https://api.groq.com/openai/v1',
    ok: id => !/whisper|tts|guard|embed|safeguard/.test(id), prefer: [/kimi/, /coder/, /qwen/, /gpt-oss-120b/, /70b/] },
  openrouter: { name: 'OpenRouter', key: 'OPENROUTER_API_KEY', base: 'https://openrouter.ai/api/v1',
    ok: id => id.endsWith(':free'), prefer: [/coder/, /kimi/, /glm/, /deepseek/, /qwen/, /gpt-oss/] },
  nvidia: { name: 'NVIDIA', key: 'NVIDIA_API_KEY', base: 'https://integrate.api.nvidia.com/v1',
    ok: id => !/embed|rerank|guard|vision|ocr|tts|asr/.test(id), prefer: [/kimi/, /qwen.*coder/, /glm/, /deepseek/, /devstral|codestral/] },
};
const modelCache = {};
async function freeCoder(id, env, messages) {
  const p = FREE_CODERS[id], key = env[p.key];
  if (!key) return { error: p.name + ' has no key set (' + p.key + ').' };
  const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + key };
  try {
    if (!modelCache[id]) {
      const r = await fetch(p.base + '/models', { headers });
      if (!r.ok) return { error: p.name + ' ' + r.status + ' when listing models. Check the key.' };
      const ids = ((await r.json()).data || []).map(m => String(m.id)).filter(p.ok);
      const ranked = p.prefer.flatMap(re => ids.filter(m => re.test(m)).sort().reverse());
      modelCache[id] = [...new Set([...ranked, ...ids])].slice(0, 3);
    }
    let last = p.name + ' lists no usable model.';
    for (const model of modelCache[id]) {
      const r = await fetch(p.base + '/chat/completions', { method: 'POST', headers, body: JSON.stringify({ model, messages, max_tokens: 16000 }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { last = p.name + ' ' + r.status + ': ' + (j.error?.message || j.message || ''); continue; }
      const text = String(j.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (text) return { text, model: p.name + ' ' + model.replace(/^models\//, '').replace(/:free$/, '') };
      last = p.name + ' ' + model + ' gave an empty answer';
    }
    return { error: last };
  } catch (e) { return { error: p.name + ': ' + (e?.message || e) }; }
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

  const picked = coding && CODE_CHOICES[body.model] || '';
  // App building: a free coding provider answers first. The picked one, or on Automatic every one that has a key.
  if (coding && !picked) {
    for (const id of FREE_CODERS[body.model] ? [body.model] : Object.keys(FREE_CODERS).filter(k => env[FREE_CODERS[k].key])) {
      const r = await freeCoder(id, env, messages);
      if (r.text) return json(r);
      last = r.error;
    }
  }
  if (env.CEREBRAS_API_KEY) {
    const want = coding && picked ? (CEREBRAS_HAS[body.model] ? [CEREBRAS_HAS[body.model]] : []) : coding ? CEREBRAS_CODE : CEREBRAS_CHAT;
    const r = want.length ? await cerebras(env.CEREBRAS_API_KEY, messages, coding ? 16000 : 2000, want) : { error: '' };
    if (r.text) return json(r);
    last = r.error;
  }
  if (!env.AI) return json({ error: last || 'No AI is connected to this site.' }, 503);
  const chain = !coding ? MODELS : picked ? [picked, ...CODE_MODELS.filter(m => m !== picked)] : CODE_MODELS;
  for (const model of chain) {
    for (const input of [{ messages, max_tokens: coding ? 16000 : 2000 }, { input: messages }]) {
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
