from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import json
import os
import httpx
from bs4 import BeautifulSoup
from typing import List
from ..auth import require_admin

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

YOUTUBE_CONFIG_FILE = os.getenv(
    "YOUTUBE_CONFIG_FILE",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "youtube_channels.json")
)

class YoutubeChannel(BaseModel):
    id: str
    url: str
    name: str
    avatarUrl: str

@router.get("/")
def get_channels() -> List[YoutubeChannel]:
    """Public endpoint — the website needs to fetch channels without auth."""
    if not os.path.exists(YOUTUBE_CONFIG_FILE):
        return []
    try:
        with open(YOUTUBE_CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

class AddChannelRequest(BaseModel):
    url: str

@router.post("/", dependencies=[Depends(require_admin)])
async def add_channel(request: AddChannelRequest):
    url = request.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    # Fetch channel info to get channel ID and Name
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch YouTube URL: {e}")

    soup = BeautifulSoup(resp.text, "html.parser")
    
    # Try finding item prop channelId
    channel_id_meta = soup.find("meta", itemprop="channelId")
    if not channel_id_meta:
        # Fallback to alternate rss link
        rss_link = soup.find("link", type="application/rss+xml")
        if rss_link and "channel_id=" in rss_link.get("href", ""):
            channel_id = rss_link["href"].split("channel_id=")[-1]
        else:
            raise HTTPException(status_code=400, detail="Could not extract channel ID. Make sure it's a valid YouTube channel URL.")
    else:
        channel_id = channel_id_meta["content"]

    name_meta = soup.find("meta", property="og:title")
    name = name_meta["content"] if name_meta else url.split("@")[-1]

    image_meta = soup.find("meta", property="og:image")
    avatar = image_meta["content"] if image_meta else ""

    new_channel = {
        "id": channel_id,
        "url": url,
        "name": name,
        "avatarUrl": avatar
    }

    channels = get_channels()
    # Check if already exists
    if any(c["id"] == channel_id for c in channels):
        raise HTTPException(status_code=400, detail="Channel already configured.")
        
    channels.append(new_channel)

    os.makedirs(os.path.dirname(YOUTUBE_CONFIG_FILE), exist_ok=True)
    with open(YOUTUBE_CONFIG_FILE, "w") as f:
        json.dump(channels, f, indent=2)

    return new_channel

@router.delete("/{channel_id}", dependencies=[Depends(require_admin)])
def delete_channel(channel_id: str):
    channels = get_channels()
    filtered = [c for c in channels if c["id"] != channel_id]
    if len(filtered) == len(channels):
        raise HTTPException(status_code=404, detail="Channel not found")
        
    with open(YOUTUBE_CONFIG_FILE, "w") as f:
        json.dump(filtered, f, indent=2)
    return {"status": "ok"}
