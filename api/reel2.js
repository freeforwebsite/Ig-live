// /api/reel.js
export default async function handler(req, res) {
  const IG_USER_ID = (process.env.IG_USER_ID_2 || '').trim();
  const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN_2 || '').trim();

  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Missing IG_USER_ID or IG_ACCESS_TOKEN.' });
  }

  try {
    // 1. Get latest media
    const mediaUrl = `https://graph.instagram.com/v21.0/${encodeURIComponent(IG_USER_ID)}/media?fields=id,media_type,media_product_type,timestamp&limit=10&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      return res.status(502).json({ error: mediaData.error.message, raw: mediaData.error });
    }

    const reel = (mediaData.data || []).find(m => m.media_product_type === 'REELS');
    if (!reel) {
      return res.status(404).json({ error: 'No reels found on this account.' });
    }

    // 2. Get stats for that reel (Likes, Comments)
    const reelUrl = `https://graph.instagram.com/v21.0/${reel.id}?fields=like_count,comments_count,permalink,timestamp,thumbnail_url,media_url,caption&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
    const reelRes = await fetch(reelUrl);
    const reelData = await reelRes.json();

    if (reelData.error) {
      return res.status(502).json({ error: reelData.error.message, raw: reelData.error });
    }

    // 3. Attempt to fetch Views (Plays) via Insights Edge
    // This requires the instagram_manage_insights permission.
    let playsCount = null;
    try {
      const insightsUrl = `https://graph.instagram.com/v21.0/${reel.id}/insights?metric=plays&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();
      
      if (insightsData.data && insightsData.data.length > 0) {
        playsCount = insightsData.data[0].values[0].value;
      }
    } catch (e) {
      // Silently ignore insights failure so it doesn't break likes/comments
    }

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    return res.status(200).json({
      view_count: playsCount,
      like_count: reelData.like_count ?? 0,
      comments_count: reelData.comments_count ?? 0,
      permalink: reelData.permalink,
      thumbnail_url: reelData.thumbnail_url || reelData.media_url, // fallback
      caption: reelData.caption || 'Latest Reel',
      fetched_at: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Instagram API', detail: String(err) });
  }
}
