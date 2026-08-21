export default async function handler(req, res) {
  const IG_USER_ID = (process.env.IG_USER_ID || '').trim();
  const IG_ACCESS_TOKEN = (process.env.IG_ACCESS_TOKEN || '').trim();

  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Missing IG_USER_ID or IG_ACCESS_TOKEN.' });
  }

  try {
    // 1. Get latest media
    const mediaUrl = `https://graph.instagram.com/v21.0/${encodeURIComponent(IG_USER_ID)}/media?fields=id,media_type,media_product_type,timestamp&limit=50&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      return res.status(502).json({ error: mediaData.error.message, raw: mediaData.error });
    }

    // Grab up to 30 reels
    const reels = (mediaData.data || []).filter(m => m.media_product_type === 'REELS').slice(0, 30);
    
    if (reels.length === 0) {
      return res.status(200).json({ data: [] });
    }

    // 2. Fetch stats for all reels concurrently
    const reelPromises = reels.map(async (reel) => {
      const reelUrl = `https://graph.instagram.com/v21.0/${reel.id}?fields=like_count,comments_count,permalink,timestamp,thumbnail_url,media_url,caption&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
      const reelRes = await fetch(reelUrl);
      const reelData = await reelRes.json();

      if (reelData.error) return null;

      let playsCount = null;
      try {
        const insightsUrl = `https://graph.instagram.com/v21.0/${reel.id}/insights?metric=plays&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
        const insightsRes = await fetch(insightsUrl);
        const insightsData = await insightsRes.json();
        if (insightsData.data && insightsData.data.length > 0) {
          playsCount = insightsData.data[0].values[0].value;
        }
      } catch (e) {}

      return {
        id: reel.id,
        view_count: playsCount,
        like_count: reelData.like_count ?? 0,
        comments_count: reelData.comments_count ?? 0,
        permalink: reelData.permalink,
        thumbnail_url: reelData.thumbnail_url || reelData.media_url,
        caption: reelData.caption || 'Reel',
        timestamp: reelData.timestamp
      };
    });

    const results = await Promise.all(reelPromises);
    const validResults = results.filter(r => r !== null);

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ data: validResults });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Instagram API', detail: String(err) });
  }
}
