import fs from 'fs';
import path from 'path';

export interface YoutubeVideo {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
  channelName: string;
}

/**
 * Load YouTube channel list.
 * Priority:
 *   1. Fetch from Publisher API (production — admin.retrolab.com.vn)
 *   2. Fallback to local file (dev)
 */
async function getChannels(): Promise<{ id: string; name: string }[]> {
  // Try publisher API first
  const publisherUrl = process.env.PUBLISHER_API_URL || 'https://admin.retrolab.com.vn';
  try {
    const res = await fetch(`${publisherUrl}/api/youtube/`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[YouTube] Could not reach publisher API, falling back to local file:', (e as Error).message);
  }

  // Fallback: local file
  const localFile = path.join(process.cwd(), 'src/data/youtube_channels.json');
  try {
    if (fs.existsSync(localFile)) {
      const data = fs.readFileSync(localFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read youtube channels config", e);
  }

  return [];
}

export async function getLatestYoutubeVideos(): Promise<YoutubeVideo[]> {
  const channels = await getChannels();

  if (channels.length === 0) {
    return [];
  }

  const allVideos: YoutubeVideo[] = [];

  // Livestream detection: title keywords + description hints
  const LIVESTREAM_TITLE = /live|livestream|trực tiếp|phát sóng|🔴|\[live\]|\(live\)|đang phát|stream|phát trực tiếp/i;

  // Fetch all RSS feeds in parallel
  await Promise.allSettled(
    channels.map(async (c) => {
      try {
        const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`, {
          next: { revalidate: 3600 } // Cache for 1 hour
        });
        if (!res.ok) return;

        const xml = await res.text();
        
        // Very basic XML parsing via Regex since we don't have an XML parser
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        
        while ((match = entryRegex.exec(xml)) !== null) {
          const entryXml = match[1];
          
          const videoIdMatch = entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
          const titleMatch = entryXml.match(/<title>([^<]+)<\/title>/);
          const pubDateMatch = entryXml.match(/<published>([^<]+)<\/published>/);
          
          if (videoIdMatch && titleMatch && pubDateMatch) {
            const videoId = videoIdMatch[1];
            // Decode basic HTML entities from title
            const title = titleMatch[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");

            // Skip livestreams by title
            if (LIVESTREAM_TITLE.test(title)) continue;

            // Skip livestreams by description (RSS includes media:description)
            const descMatch = entryXml.match(/<media:description>([\s\S]*?)<\/media:description>/);
            if (descMatch) {
              const desc = descMatch[1];
              if (/streamed live|đang phát trực tiếp|live stream/i.test(desc)) continue;
            }

            // Skip if views=0 in media:statistics (likely ongoing stream)
            const viewsMatch = entryXml.match(/views="(\d+)"/);
            if (viewsMatch && viewsMatch[1] === '0') continue;

            allVideos.push({
              id: videoId,
              title: title,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              publishedAt: pubDateMatch[1],
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              channelName: c.name
            });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch youtube RSS for ${c.name}:`, e);
      }
    })
  );
  // Group videos by channel, sorted by date within each channel
  const byChannel = new Map<string, YoutubeVideo[]>();
  for (const v of allVideos) {
    if (!byChannel.has(v.channelName)) byChannel.set(v.channelName, []);
    byChannel.get(v.channelName)!.push(v);
  }
  // Sort each channel's videos by date (newest first)
  for (const vids of Array.from(byChannel.values())) {
    vids.sort((a: YoutubeVideo, b: YoutubeVideo) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  // Round-robin interleave: take 1 video from each channel in turn
  const interleaved: YoutubeVideo[] = [];
  const channelQueues = Array.from(byChannel.values());
  let maxLen = Math.max(...channelQueues.map(q => q.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const queue of channelQueues) {
      if (i < queue.length) {
        interleaved.push(queue[i]);
      }
    }
  }

  return interleaved.slice(0, 100);
}
