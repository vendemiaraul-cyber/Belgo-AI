// Belgo's video finder. No key needed.
// The search method comes from the owner's own project MeoDeo (Gol library, gol/sites/youtube.js and dailymotion.js):
//   1. the official YouTube Data API, only if the optional secret YOUTUBE_API_KEY is set
//   2. public Piped servers, which search YouTube without a key
//   3. Dailymotion's public API, when no YouTube search answers
// Playback always uses the site's own official player.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' } });
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const clean = s => String(s || '').replace(/&(amp|lt|gt|quot|#39);/g, m => ENT[m]).slice(0, 140);
const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de'];
const yt = (id, title, channel) => ({ id, title: clean(title), channel: clean(channel), site: 'YouTube',
  thumb: 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg', embed: 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0' });
const get = async url => { const r = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(String(r.status)); return r.json(); };

async function official(q, key) {
  const j = await get('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=moderate&maxResults=6&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(key));
  return (j.items || []).filter(i => i.id?.videoId).map(i => yt(i.id.videoId, i.snippet?.title, i.snippet?.channelTitle));
}
async function piped(q) {
  let last;
  for (const base of PIPED) {
    try {
      const j = await get(base + '/search?filter=videos&q=' + encodeURIComponent(q));
      const out = (j.items || []).filter(i => i.type === 'stream' && /[?&]v=/.test(i.url || ''))
        .map(i => yt(new URLSearchParams(i.url.split('?')[1]).get('v'), i.title, i.uploaderName)).filter(v => /^[\w-]{11}$/.test(v.id));
      if (out.length) return out.slice(0, 6);
    } catch (e) { last = e; }
  }
  if (last) throw last;
  return [];
}
async function dailymotion(q) {
  const j = await get('https://api.dailymotion.com/videos?limit=6&family_filter=true&fields=id,title,thumbnail_360_url,owner.screenname&search=' + encodeURIComponent(q));
  return (j.list || []).filter(i => i.id).map(i => ({ id: i.id, title: clean(i.title), channel: clean(i['owner.screenname']), site: 'Dailymotion',
    thumb: i.thumbnail_360_url || '', embed: 'https://geo.dailymotion.com/player.html?video=' + encodeURIComponent(i.id) + '&autoplay=1' }));
}

export async function onRequestGet({ request, env }) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 120);
  if (!q) return json({ error: 'Nothing to look for.' }, 400);
  const tries = [];
  if (env.YOUTUBE_API_KEY) tries.push(() => official(q, env.YOUTUBE_API_KEY));
  tries.push(() => piped(q), () => dailymotion(q));
  for (const find of tries) {
    try { const videos = await find(); if (videos.length) return json({ videos }); } catch (e) {}
  }
  return json({ videos: [], error: 'No video search answered right now.' });
}
