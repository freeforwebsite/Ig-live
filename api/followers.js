// /api/followers.js
// Vercel serverless function — keeps your Instagram access token hidden from the client.
// The frontend calls THIS endpoint, never the Graph API directly.

export default async function handler(req, res) {
  const IG_USER_ID = process.env.IG_USER_ID;
  const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;

  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'Missing IG_USER_ID or IG_ACCESS_TOKEN environment variable on Vercel.'
    });
  }

  const url = `https://graph.facebook.com/v20.0/${IG_USER_ID}?fields=followers_count,username&access_token=${IG_ACCESS_TOKEN}`;

  try {
    const igRes = await fetch(url);
    const data = await igRes.json();

    if (data.error) {
      return res.status(502).json({ error: data.error.message || 'Instagram API error', raw: data.error });
    }

    // Cache for a few seconds at the edge to avoid hammering the Graph API
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');

    return res.status(200).json({
      followers_count: data.followers_count,
      username: data.username,
      fetched_at: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Instagram Graph API', detail: String(err) });
  }
}
