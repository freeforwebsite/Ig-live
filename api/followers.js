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

  // Trim accidental whitespace/newlines from the env var, and URL-encode the
  // token — long-lived tokens can contain +, /, = characters that break an
  // un-encoded query string and cause "Cannot parse access token".
  const cleanUserId = IG_USER_ID.trim();
  const cleanToken = IG_ACCESS_TOKEN.trim();

  // NOTE: this uses the newer "Instagram API with Instagram Login" endpoint
  // (graph.instagram.com), NOT the old Facebook-Page-linked Graph API
  // (graph.facebook.com). Tokens generated via Instagram Login only work
  // against graph.instagram.com — sending them to graph.facebook.com causes
  // "Cannot parse access token".
  const url = `https://graph.instagram.com/v21.0/${encodeURIComponent(cleanUserId)}?fields=followers_count,username&access_token=${encodeURIComponent(cleanToken)}`;

  try {
    const igRes = await fetch(url);
    const data = await igRes.json();

    if (data.error) {
      // Surface Meta's error subcode/type too — helps distinguish a bad token
      // from a token that's simply missing the right permission scope.
      return res.status(502).json({
        error: data.error.message || 'Instagram API error',
        type: data.error.type,
        code: data.error.code,
        error_subcode: data.error.error_subcode,
        raw: data.error
      });
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
