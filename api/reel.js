// /api/reel.js
export default async function handler(req, res) {
  const IG_USER_ID = (process.env.IG_USER_ID || '').trim();
  const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN || '').trim();

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

    // 2. Get stats for that reel
    // Note: 'views' or 'play_count' is not natively exposed on the base media node in this API 
    // without querying /insights, which requires additional permissions (instagram_manage_insights).
    // We remove it from the fields to prevent the API from throwing a 400/502 error.
    const reelUrl = `https://graph.instagram.com/v21.0/${reel.id}?fields=like_count,comments_count,permalink,timestamp,thumbnail_url,media_url,caption&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
    const reelRes = await fetch(reelUrl);
    const reelData = await reelRes.json();

    if (reelData.error) {
      return res.status(502).json({ error: reelData.error.message, raw: reelData.error });
    }

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    return res.status(200).json({
      view_count: null, // Views not available without insights permission
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
