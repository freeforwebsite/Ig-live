// /api/followers2.js
// Second Instagram account - uses IG_USER_ID_2 and IG_ACCESS_TOKEN_2

export default async function handler(req, res) {
  const IG_USER_ID = (process.env.IG_USER_ID_2 || '').trim();
  const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN_2 || '').trim();

  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'Missing IG_USER_ID_2 or IG_ACCESS_TOKEN_2 environment variable on Vercel.'
    });
  }

  const url = `https://graph.instagram.com/v21.0/${encodeURIComponent(IG_USER_ID)}?fields=followers_count,media_count,username&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;

  try {
    const igRes = await fetch(url);
    const data = await igRes.json();

    if (data.error) {
      return res.status(502).json({
        error: data.error.message || 'Instagram API error',
        type: data.error.type,
        code: data.error.code,
        raw: data.error
      });
    }

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    return res.status(200).json({
      followers_count: data.followers_count,
      media_count: data.media_count,
      username: data.username,
      fetched_at: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Instagram Graph API', detail: String(err) });
  }
}
