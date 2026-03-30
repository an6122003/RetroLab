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

const YOUTUBE_CONFIG_FILE = path.join(process.cwd(), 'src/data/youtube_channels.json');

export async function getLatestYoutubeVideos(): Promise<YoutubeVideo[]> {
  let channels: { id: string; name: string }[] = [];
  try {
    if (fs.existsSync(YOUTUBE_CONFIG_FILE)) {
      const data = fs.readFileSync(YOUTUBE_CONFIG_FILE, 'utf8');
      channels = JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read youtube channels config", e);
  }

  if (channels.length === 0) {
    return [];
  }

  const allVideos: YoutubeVideo[] = [];

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

            allVideos.push({
              id: videoId,
              title: title,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              publishedAt: pubDateMatch[1],
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              channelName: c.name
            });
            break; // We only need the latest 1 video per channel for this UI (or let's collect all and sort)
          }
        }
      } catch (e) {
        console.error(`Failed to fetch youtube RSS for ${c.name}:`, e);
      }
    })
  );

  // Sort by published descending
  allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  // Return top 4 since the pane usually shows 4
  return allVideos.slice(0, 4);
}
