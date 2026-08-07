import { Router } from 'express';
import axios from 'axios';
import { authGuard } from '../middleware/auth';

const router = Router();
const baseUrl = 'https://www.googleapis.com/youtube/v3/search';

router.get('/search', authGuard, async (req, res, next) => {
  try {
    const query = String(req.query.q || '');
    if (!query) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured' });
    }

    const response = await axios.get(baseUrl, {
      params: {
        key: apiKey,
        q: query,
        part: 'snippet',
        maxResults: 5,
        type: 'video',
      },
    });

    const results = response.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

export default router;
