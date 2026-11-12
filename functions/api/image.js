// Belgo's own painter: runs on this site's Cloudflare account through Workers AI.
const fail = (error, status) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } });

async function toBytes(out) {
  const b64 = typeof out === 'string' ? out : out?.image || out?.result?.image;
  if (typeof b64 === 'string') {
    if (/^https?:/.test(b64)) return new Uint8Array(await (await fetch(b64)).arrayBuffer());
    return Uint8Array.from(atob(b64.replace(/^data:[^,]+,/, '')), c => c.charCodeAt(0));
  }
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const kind = b => b[0] === 0x89 ? 'image/png' : b[0] === 0x52 ? 'image/webp' : 'image/jpeg';

async function klein(env, prompt) {
  const form = new FormData();
  form.append('prompt', prompt); form.append('width', '1024'); form.append('height', '1024');
  const wrapped = new Response(form);
  return env.AI.run('@cf/black-forest-labs/flux-2-klein-4b', { multipart: { body: wrapped.body, contentType: wrapped.headers.get('content-type') } });
}
const schnell = (env, prompt) => env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 6 });

export async function onRequestPost({ request, env }) {
  if (!env.AI) return fail('Workers AI is not connected to this site.', 503);
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return fail('Not allowed.', 403);

  let body;
  try { body = await request.json(); } catch { return fail('Bad request.', 400); }
  const prompt = String(body?.prompt || '').trim().slice(0, 2000);
  if (!prompt) return fail('No description.', 400);

  let last = '';
  for (const [name, run] of [['FLUX.2 klein', klein], ['FLUX.1 schnell', schnell]]) {
    try {
      const bytes = await toBytes(await run(env, prompt));
      if (bytes.length > 1000) return new Response(bytes, { headers: { 'content-type': kind(bytes), 'x-model': name, 'cache-control': 'no-store' } });
      last = name + ' returned no picture';
    } catch (e) { last = e?.message || String(e); }
  }
  return fail(last || 'No model answered.', 502);
}
