// Belgo's video finder: searches YouTube through the official YouTube Data API.
// Needs a free Google API key stored as the secret YOUTUBE_API_KEY (about 100 searches a day on the free quota).
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' } });
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const clean = s => String(s || '').replace(/&(amp|lt|gt|quot|#39);/g, m => ENT[m]).slice(0, 140);

export async function onRequestGet({ request, env }) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 120);
  if (!q) return json({ error: 'Nothing to look for.' }, 400);
  if (!env.YOUTUBE_API_KEY) return json({ error: 'nokey' }, 503);
  const u = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=moderate&maxResults=6&q='
    + encodeURIComponent(q) + '&key=' + encodeURIComponent(env.YOUTUBE_API_KEY);
  try {
    const r = await fetch(u);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: r.status === 403 ? 'YouTube refused the key or today\'s free searches are used up.' : 'YouTube answered ' + r.status + '.' }, 502);
    const videos = (j.items || []).filter(i => i.id?.videoId).map(i => ({
      id: i.id.videoId, title: clean(i.snippet?.title), channel: clean(i.snippet?.channelTitle),
      thumb: i.snippet?.thumbnails?.medium?.url || 'https://i.ytimg.com/vi/' + i.id.videoId + '/mqdefault.jpg',
    }));
    return json({ videos });
  } catch (e) { return json({ error: 'YouTube could not be reached.' }, 502); }
}
