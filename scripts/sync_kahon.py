"""
Sync Kahon (@kahonstory) YouTube channel catalog, playlists, metadata,
and cover-art ambient color palettes into public/data/kahonData.json.
"""

from __future__ import annotations

import argparse
import colorsys
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

CHANNEL_HANDLE = "@kahonstory"
CHANNEL_ID = "UC00VoVV2GIaV1p3o9Gq-7bQ"
BASE_URL = f"https://www.youtube.com/{CHANNEL_HANDLE}"
RSS_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT_DIR / "public" / "data" / "kahonData.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return resp.read().decode("utf-8", "ignore")


def extract_yt_initial_data(url: str) -> tuple[dict[str, Any], str | None, str | None]:
    html = fetch_html(url)
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html)
    if not m:
        m = re.search(r'window\["ytInitialData"\] = (\{.*?\});', html)
    if not m:
        raise RuntimeError(f"Could not locate ytInitialData on {url}")
    api_key = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', html)
    client_ver = re.search(r'"INNERTUBE_CLIENT_VERSION":"([^"]+)"', html)
    return (
        json.loads(m.group(1)),
        api_key.group(1) if api_key else None,
        client_ver.group(1) if client_ver else None,
    )


def fetch_continuation(api_key: str, client_ver: str | None, token: str) -> dict[str, Any]:
    url = f"https://www.youtube.com/youtubei/v1/browse?key={api_key}"
    payload = json.dumps(
        {
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": client_ver or "2.20261106.00.00",
                    "hl": "en",
                    "gl": "US",
                }
            },
            "continuation": token,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, headers={**HEADERS, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_continuation_token(item: dict[str, Any]) -> str | None:
    if "continuationItemRenderer" in item:
        return (
            item["continuationItemRenderer"]
            .get("continuationEndpoint", {})
            .get("continuationCommand", {})
            .get("token")
        )
    if "continuationItemViewModel" in item:
        return (
            item["continuationItemViewModel"]
            .get("continuationCommand", {})
            .get("innertubeCommand", {})
            .get("continuationCommand", {})
            .get("token")
        )
    return None


def parse_duration_seconds(duration_str: str | None) -> int:
    if not duration_str:
        return 0
    parts = [int(p) for p in duration_str.strip().split(":") if p.isdigit()]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 1:
        return parts[0]
    return 0


def parse_views_count(views_str: str | None) -> int:
    if not views_str:
        return 0
    cleaned = views_str.lower().replace("views", "").replace("view", "").replace(",", "").strip()
    m = re.match(r"^([\d.]+)\s*([kmb])?$", cleaned)
    if not m:
        return 0
    val = float(m.group(1))
    mult = {"k": 1_000, "m": 1_000_000, "b": 1_000_000_000}.get(m.group(2) or "", 1)
    return int(val * mult)


def clean_thumb_url(url: str) -> str:
    # Strip transient sqp/rs query params if not needed? Actually keeping exact or standard hq720/hqdefault:
    # YouTube i.ytimg.com clean URLs work reliably with CORS and no expiring signatures.
    if "i.ytimg.com/vi/" in url:
        return url.split("?")[0]
    return url


def extract_lockup(vm: dict[str, Any]) -> dict[str, Any]:
    content_id = vm.get("contentId")
    content_type = vm.get("contentType")
    meta = vm.get("metadata", {}).get("lockupMetadataViewModel", {})
    title = meta.get("title", {}).get("content", "").strip()

    rows = (
        meta.get("metadata", {})
        .get("contentMetadataViewModel", {})
        .get("metadataRows", [])
    )
    meta_texts: list[str] = []
    for row in rows:
        for part in row.get("metadataParts", []):
            txt = part.get("text", {}).get("content", "").strip()
            if txt:
                meta_texts.append(txt)

    thumb_vm = vm.get("contentImage", {}).get("thumbnailViewModel", {})
    if not thumb_vm:
        col = vm.get("contentImage", {}).get("collectionThumbnailViewModel", {})
        thumb_vm = col.get("primaryThumbnail", {}).get("thumbnailViewModel", {})

    sources = thumb_vm.get("image", {}).get("sources", [])
    best_thumb = sources[-1]["url"] if sources else f"https://i.ytimg.com/vi/{content_id}/hqdefault.jpg"
    best_thumb = clean_thumb_url(best_thumb)

    badge_text = None
    for ov in thumb_vm.get("overlays", []):
        bottom = ov.get("thumbnailBottomOverlayViewModel", {})
        for badge in bottom.get("badges", []):
            t = badge.get("thumbnailBadgeViewModel", {}).get("text")
            if t:
                badge_text = t.strip()
                break

    return {
        "id": content_id,
        "contentType": content_type,
        "rawTitle": title,
        "metaTexts": meta_texts,
        "badgeText": badge_text,
        "thumbnail": best_thumb,
    }


def extract_channel_info(data: dict[str, Any]) -> dict[str, Any]:
    ph = data.get("header", {}).get("pageHeaderRenderer", {}).get("content", {}).get("pageHeaderViewModel", {})
    title = ph.get("title", {}).get("dynamicTextViewModel", {}).get("text", {}).get("content", "Kahon")
    avatar_sources = (
        ph.get("image", {})
        .get("decoratedAvatarViewModel", {})
        .get("avatar", {})
        .get("avatarViewModel", {})
        .get("image", {})
        .get("sources", [])
    )
    avatar = avatar_sources[-1]["url"] if avatar_sources else ""

    banner_sources = ph.get("banner", {}).get("imageBannerViewModel", {}).get("image", {}).get("sources", [])
    banner = banner_sources[-1]["url"] if banner_sources else ""

    meta_rows = ph.get("metadata", {}).get("contentMetadataViewModel", {}).get("metadataRows", [])
    meta_parts = []
    for row in meta_rows:
        for p in row.get("metadataParts", []):
            t = p.get("text", {}).get("content")
            if t:
                meta_parts.append(t)

    desc_preview = (
        ph.get("description", {})
        .get("descriptionPreviewViewModel", {})
        .get("description", {})
        .get("content", "")
    )

    return {
        "name": title,
        "bengaliName": "কাহন",
        "handle": CHANNEL_HANDLE,
        "url": BASE_URL,
        "avatar": avatar,
        "banner": banner,
        "metaSummary": meta_parts,
        "descriptionPreview": desc_preview,
    }


def fetch_paginated_tab(tab_name: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    data, api_key, client_ver = extract_yt_initial_data(f"{BASE_URL}/{tab_name}")
    tabs = data["contents"]["twoColumnBrowseResultsRenderer"]["tabs"]
    selected = next(
        (t["tabRenderer"] for t in tabs if t.get("tabRenderer", {}).get("selected")),
        None,
    )
    if not selected:
        return data, []

    content = selected.get("content", {})
    items: list[dict[str, Any]] = []
    cont_token: str | None = None

    def process_container_items(raw_items: list[dict[str, Any]]) -> str | None:
        next_tok = None
        for it in raw_items:
            if "richItemRenderer" in it:
                c = it["richItemRenderer"].get("content", {})
                if "lockupViewModel" in c:
                    items.append(extract_lockup(c["lockupViewModel"]))
            elif "lockupViewModel" in it:
                items.append(extract_lockup(it["lockupViewModel"]))
            else:
                tok = get_continuation_token(it)
                if tok:
                    next_tok = tok
        return next_tok

    if "richGridRenderer" in content:
        cont_token = process_container_items(content["richGridRenderer"].get("contents", []))
    elif "sectionListRenderer" in content:
        for sec in content["sectionListRenderer"].get("contents", []):
            for it in sec.get("itemSectionRenderer", {}).get("contents", []):
                if "gridRenderer" in it:
                    cont_token = process_container_items(it["gridRenderer"].get("items", []))

    pages = 0
    while cont_token and api_key and pages < 40:
        pages += 1
        cdata = fetch_continuation(api_key, client_ver, cont_token)
        cont_token = None
        for act in cdata.get("onResponseReceivedActions", []):
            citems = act.get("appendContinuationItemsAction", {}).get("continuationItems", [])
            tok = process_container_items(citems)
            if tok:
                cont_token = tok

    return data, items


def fetch_playlist_videos(playlist_id: str) -> tuple[str, list[str]]:
    url = f"https://www.youtube.com/playlist?list={playlist_id}"
    data, api_key, client_ver = extract_yt_initial_data(url)
    tabs = data["contents"]["twoColumnBrowseResultsRenderer"]["tabs"]
    content = tabs[0]["tabRenderer"]["content"]
    secs = content.get("sectionListRenderer", {}).get("contents", [])

    video_ids: list[str] = []
    cont_token: str | None = None

    if secs and "itemSectionRenderer" in secs[0]:
        for it in secs[0]["itemSectionRenderer"].get("contents", []):
            if "lockupViewModel" in it:
                vid = it["lockupViewModel"].get("contentId")
                if vid:
                    video_ids.append(vid)
            else:
                tok = get_continuation_token(it)
                if tok:
                    cont_token = tok

    pages = 0
    while cont_token and api_key and pages < 30:
        pages += 1
        cdata = fetch_continuation(api_key, client_ver, cont_token)
        cont_token = None
        for act in cdata.get("onResponseReceivedActions", []):
            for it in act.get("appendContinuationItemsAction", {}).get("continuationItems", []):
                if "lockupViewModel" in it:
                    vid = it["lockupViewModel"].get("contentId")
                    if vid:
                        video_ids.append(vid)
                else:
                    tok = get_continuation_token(it)
                    if tok:
                        cont_token = tok

    # Preserve order while deduplicating
    seen: set[str] = set()
    ordered = []
    for vid in video_ids:
        if vid not in seen:
            seen.add(vid)
            ordered.append(vid)
    return playlist_id, ordered


def parse_story_metadata(raw_title: str, playlist_titles: list[str]) -> dict[str, Any]:
    segments = [s.strip() for s in raw_title.split("|") if s.strip()]
    ignore_tokens = {
        "kahon",
        "bengali audio story",
        "audio story",
        "bengali story",
        "bengali audio drama",
        "bengali horror story",
        "bengali horror audio story",
        "bengali detective story",
        "bengali detective audio story",
        "bengali audio story detective",
        "bengali audio story horror",
        "bengali thriller",
        "sunday suspense",
        "golpo",
        "bangla golpo",
        "bengali audiobook",
        "audiobook",
        "gram banglar vuter golpo",
        "gram banglar bhuter golpo",
        "goyenda golpo",
        "goyenda golpo new",
        "kahon podcast",
    }

    # Exclude generic YouTube container playlists when inferring genres
    meaningful_playlists = [
        pt for pt in playlist_titles
        if pt.lower() not in {"kahon podcast", "kahon classics podcast", "gram banglar bhuter golpo podcast"}
    ]

    genre_keywords = {
        "Detective": [
            "detective", "goyenda", "kiriti", "colonel", "victor", "jayanta",
            "manik", "byomkesh", "feluda", "spy", "hawk", "riju", "parijat",
            "abhida", "baaz", "francis", "bill bose", "sherlock", "dip kaku",
            "dipkaku", "saradwata", "arko ankhi", "blue flower",
        ],
        "Thriller": ["thriller", "suspense", "mystery", "crime", "murder"],
        "Horror": ["horror", "bhuter", "vuter", "bhoot", "ghost", "supernatural", "scary", "scare", "bhuture", "pretkahon"],
        "Classics": [
            "classics", "bibhutibhushan", "rabindranath", "sarat", "bankim",
            "moti nandi", "shirshendu", "syed mustafa", "ashapurna", "parasuram",
            "tarashankar", "manik bandopadhyay", "hemendra kumar", "niharranjan",
            "sherlock", "conan doyle", "world classics", "premendra mitra",
        ],
        "Originals": ["kahon originals"],
        "Sci-Fi & Adventure": ["sci-fi", "scifi", "science fiction", "adventure", "abhijan", "mythological", "treasure hunt"],
        "Romantic": ["romantic", "love", "prem", "valobasha", "bhalobasha"],
        "Odbhuture": ["odbhuture", "odbhut"],
        "Podcast & Adda": ["songe sahityik", "lights, mic", "kholamela adda", "adda", "interview", "teaser", "theme music", "trailer"],
    }

    story_title = segments[0] if segments else raw_title
    author = None
    series_name = None

    author_aliases = {
        "abhik dutta": "Abhik Arjun Dutta",
        "dr. amritendu mukherjee": "Amritendu Mukherjee",
        "arnab": "RJ Arnab",
        "sir arthur conan doyle": "Arthur Conan Doyle",
    }

    known_authors = [
        "Shirshendu Mukhopadhyay",
        "Anish Deb",
        "Syed Mustafa Siraj",
        "Bibhutibhushan Bandopadhyay",
        "Moti Nandi",
        "Abhik Arjun Dutta",
        "Abhik Dutta",
        "Niharranjan Gupta",
        "Himadri Kishore Dasgupta",
        "Sasthipada Chattopadhyay",
        "Sayak Aman",
        "Samaresh Basu",
        "Bimal Kar",
        "Narendranath Mitra",
        "Premendra Mitra",
        "Sharadindu Bandyopadhyay",
        "Satyajit Ray",
        "Arthur Conan Doyle",
        "Shusmita Saha",
        "RJ Arnab",
        "Krishnendu Mukhopadhyay",
        "Pracheta Gupta",
        "Amrita Koner",
        "Amritendu Mukherjee",
        "Dr. Amritendu Mukherjee",
        "Dipanwita Roy",
        "Manabendra Pal",
        "Saswata Dhar",
        "Indranil Mukhopadhyay",
        "Kajal Bhattacharya",
        "Debanjan Mukhopadhyay",
        "Hemendra Kumar Roy",
        "Debojyoti Bhattacharya",
        "Tridib Kumar Chattopadhyay",
        "Narayan Gangopadhyay",
        "Subodh Ghosh",
        "Sunil Gangopadhyay",
        "Buddhadeb Guha",
        "Suchitra Bhattacharya",
        "Ashapurna Devi",
        "Tarashankar Bandopadhyay",
        "Manik Bandopadhyay",
        "Sibram Chakraborty",
        "Leela Majumdar",
        "Sukumar Ray",
    ]

    non_author_markers = [
        "series", "thriller", "suspense", "detective", "horror", "story", "golpo",
        "podcast", "kahon", "episode", "part", "ep ", "audiobook", "drama",
        "adventure", "mystery", "romantic", "comedy", "fantasy", "mythological",
        "sci-fi", "special", "bhuter", "vuter", "goyenda", "music", "teaser", "intro",
        "dipkaku", "dip kaku", "sherlock", "kiriti", "parijat", "treasure hunt",
        "adda", "blue flower", "saradwata", "victor chatterjee", "jayanta manik",
        "baaz", "francis", "bill bose", "hawk", "riju", "abhida", "scare alert",
        "promo", "trailer", "pretkahon",
    ]

    for seg in segments[1:]:
        low = seg.lower()
        if low in ignore_tokens or low == "kahon":
            continue
        if "series" in low and not series_name:
            series_name = seg
            continue
        matched = next((a for a in known_authors if a.lower() in low), None)
        if matched and not author:
            author = author_aliases.get(matched.lower(), matched)
            continue
        if not author and not any(m in low for m in non_author_markers):
            words = seg.split()
            if 1 <= len(words) <= 4 and not re.search(r"^\d+$", seg):
                author = author_aliases.get(low, seg)

    # Infer canonical classic authors from unmistakable character series
    low_full = (raw_title + " " + " ".join(playlist_titles)).lower()
    if not author:
        if "sherlock holmes" in low_full:
            author = "Arthur Conan Doyle"
        elif "kiriti roy" in low_full:
            author = "Niharranjan Gupta"
        elif "jayanta manik" in low_full:
            author = "Hemendra Kumar Roy"
        elif "colonel" in low_full and ("colonel detective" in low_full or "niladri" in low_full):
            author = "Syed Mustafa Siraj"
        elif "stories by rj arnab" in low_full or "adda" in low_full:
            author = "RJ Arnab"

    # Match genres against raw_title + non-generic playlists + classics playlist
    genre_text = (
        raw_title
        + " "
        + " ".join(meaningful_playlists)
        + (" classics" if any("classic" in pt.lower() for pt in playlist_titles) else "")
        + (" horror" if any("bhuter" in pt.lower() for pt in playlist_titles) else "")
    ).lower()
    genres: list[str] = []
    for genre, kws in genre_keywords.items():
        if any(kw in genre_text for kw in kws):
            genres.append(genre)
    if not genres:
        genres = ["Audio Story"]

    if not series_name and meaningful_playlists:
        series_name = meaningful_playlists[0]
    elif not series_name and playlist_titles:
        series_name = playlist_titles[0]

    return {
        "storyTitle": story_title,
        "author": author or "Kahon Ensemble",
        "series": series_name,
        "genres": genres,
    }


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def adjust_hsv(r: int, g: int, b: int, min_s: float = 0.0, max_s: float = 1.0, min_v: float = 0.0, max_v: float = 1.0) -> tuple[int, int, int]:
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    s = max(min_s, min(max_s, s))
    v = max(min_v, min(max_v, v))
    nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
    return int(nr * 255), int(ng * 255), int(nb * 255)


def extract_palette_from_url(url: str, fallback_vid: str | None = None) -> dict[str, str]:
    candidates = [url]
    if fallback_vid:
        candidates.extend([
            f"https://i.ytimg.com/vi/{fallback_vid}/hqdefault.jpg",
            f"https://i.ytimg.com/vi/{fallback_vid}/mqdefault.jpg",
        ])

    img_bytes = None
    for cand in candidates:
        try:
            req = urllib.request.Request(cand, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                img_bytes = resp.read()
            break
        except Exception:
            continue

    if not img_bytes:
        return {
            "dominant": "#4a3319",
            "vibrant": "#ff9900",
            "secondary": "#313131",
            "deep": "#1d1814",
        }

    try:
        im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        # Crop out extreme top/bottom letterbox bars (common on 4:3 hqdefault)
        w, h = im.size
        im = im.crop((int(w * 0.06), int(h * 0.14), int(w * 0.94), int(h * 0.86)))
        im = im.resize((48, 48), Image.Resampling.BILINEAR)
        quant = im.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
        palette = quant.getpalette() or []
        counts = quant.getcolors() or []

        candidates_rgb: list[tuple[int, tuple[int, int, int], float, float]] = []
        for count, idx in counts:
            r, g, b = palette[idx * 3 : idx * 3 + 3]
            _, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            candidates_rgb.append((count, (r, g, b), s, v))

        # Sort by vibrancy * weight for accent
        non_extreme = [c for c in candidates_rgb if 0.12 < c[3] < 0.94] or candidates_rgb
        vibrant_pick = max(non_extreme, key=lambda c: (c[2] ** 1.4) * (0.4 + c[3]) * (c[0] ** 0.25))[1]
        dominant_pick = max(non_extreme, key=lambda c: c[0] * (0.5 + c[2]))[1]

        # Pick secondary distinct hue
        vh, _, _ = colorsys.rgb_to_hsv(*(x / 255.0 for x in vibrant_pick))
        secondary_pick = max(
            non_extreme,
            key=lambda c: abs(colorsys.rgb_to_hsv(*(x / 255.0 for x in c[1]))[0] - vh) * (0.4 + c[2]) * (c[0] ** 0.2),
        )[1]

        dom_rgb = adjust_hsv(*dominant_pick, min_s=0.22, max_s=0.72, min_v=0.22, max_v=0.45)
        vib_rgb = adjust_hsv(*vibrant_pick, min_s=0.45, max_s=0.88, min_v=0.48, max_v=0.82)
        sec_rgb = adjust_hsv(*secondary_pick, min_s=0.25, max_s=0.72, min_v=0.26, max_v=0.52)
        deep_rgb = adjust_hsv(*dominant_pick, min_s=0.20, max_s=0.58, min_v=0.12, max_v=0.22)

        return {
            "dominant": rgb_to_hex(*dom_rgb),
            "vibrant": rgb_to_hex(*vib_rgb),
            "secondary": rgb_to_hex(*sec_rgb),
            "deep": rgb_to_hex(*deep_rgb),
        }
    except Exception:
        return {
            "dominant": "#4a3319",
            "vibrant": "#ff9900",
            "secondary": "#313131",
            "deep": "#1d1814",
        }


def build_catalog_output(
    channel: dict[str, Any],
    playlists_out: list[dict[str, Any]],
    stories: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute aggregates, re-index stories sequentially, and assemble catalog dict."""
    author_counts: dict[str, int] = {}
    genre_counts: dict[str, int] = {}
    for idx, s in enumerate(stories):
        s["index"] = idx
        author = s.get("author") or "Kahon Ensemble"
        author_counts[author] = author_counts.get(author, 0) + 1
        for g in s.get("genres") or ["Audio Story"]:
            genre_counts[g] = genre_counts.get(g, 0) + 1

    top_authors = sorted(
        [{"name": k, "count": v} for k, v in author_counts.items()],
        key=lambda x: (-x["count"], x["name"]),
    )
    genres_list = sorted(
        [{"name": k, "count": v} for k, v in genre_counts.items()],
        key=lambda x: (-x["count"], x["name"]),
    )

    return {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "channel": channel,
        "stats": {
            "totalStories": len(stories),
            "totalPlaylists": len(playlists_out),
            "totalDurationHours": round(
                sum(int(s.get("durationSeconds") or 0) for s in stories) / 3600, 1
            ),
        },
        "genres": genres_list,
        "topAuthors": top_authors,
        "playlists": playlists_out,
        "stories": stories,
    }


def format_views_count(views: int) -> str:
    """Format an integer view count into concise K/M labels."""
    if views >= 1_000_000:
        val = round(views / 1_000_000, 1)
        return f"{int(val) if val.is_integer() else val}M"
    if views >= 1_000:
        val = round(views / 1_000) if views >= 100_000 else round(views / 1_000, 1)
        return f"{int(val) if float(val).is_integer() else val}K"
    return str(max(0, views))


def format_relative_time(iso_ts: str) -> str:
    """Format ISO-8601 UTC timestamp into short relative strings ('3d ago', etc.)."""
    if not iso_ts:
        return ""
    try:
        dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
    except ValueError:
        return ""
    diff = max(0.0, (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).total_seconds())
    if diff < 86400:
        return f"{max(1, int(diff // 3600))}h ago"
    days = int(diff // 86400)
    if days < 14:
        return f"{days}d ago"
    if days < 60:
        return f"{days // 7}w ago"
    if days < 365:
        return f"{max(1, days // 30)}mo ago"
    return f"{max(1, days // 365)}y ago"


def write_catalog_json(output: dict[str, Any], out_path: Path = OUT_PATH) -> None:
    """Write catalog dictionary cleanly to disk and print summary."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path}")
    print(
        f"Stories: {output['stats']['totalStories']} | "
        f"Playlists: {output['stats']['totalPlaylists']} | "
        f"Total Hours: {output['stats']['totalDurationHours']}"
    )


def sync_via_rss(out_path: Path = OUT_PATH) -> bool:
    """Fetch YouTube Atom RSS feed and merge latest releases into baseline catalog."""
    baseline: dict[str, Any] = {}
    if out_path.exists():
        try:
            baseline = json.loads(out_path.read_text(encoding="utf-8"))
        except Exception as err:
            print(f"Warning: could not parse baseline {out_path}: {err}")

    req = urllib.request.Request(RSS_URL, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            xml_bytes = resp.read()
    except Exception as err:
        print(f"RSS fetch failed: {err}")
        return False

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as err:
        print(f"RSS XML parse failed: {err}")
        return False

    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "yt": "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/",
    }

    watch_entries: list[dict[str, Any]] = []
    all_entries: list[dict[str, Any]] = []
    for entry in root.findall("atom:entry", ns):
        vid = (entry.findtext("yt:videoId", "", ns) or "").strip()
        if not vid:
            continue
        raw_title = (entry.findtext("atom:title", "", ns) or "").strip()
        published = (entry.findtext("atom:published", "", ns) or "").strip()
        link_el = entry.find("atom:link", ns)
        href = link_el.attrib.get("href", "") if link_el is not None else ""
        is_short = "/shorts/" in href
        thumb_el = entry.find("media:group/media:thumbnail", ns)
        thumb_url = thumb_el.attrib.get("url", "") if thumb_el is not None else ""
        stats_el = entry.find("media:group/media:community/media:statistics", ns)
        views_count = int(stats_el.attrib.get("views", "0") or 0) if stats_el is not None else 0

        item = {
            "id": vid,
            "rawTitle": raw_title,
            "published": published,
            "thumbUrl": thumb_url,
            "viewsCount": views_count,
            "isShort": is_short,
        }
        all_entries.append(item)
        if not is_short:
            watch_entries.append(item)

    selected = watch_entries if watch_entries else all_entries
    seed_stories = baseline.get("stories") if isinstance(baseline.get("stories"), list) else []
    seed_by_id = {s["id"]: s for s in seed_stories if isinstance(s, dict) and s.get("id")}
    playlists_out = baseline.get("playlists") if isinstance(baseline.get("playlists"), list) else []

    stories: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for item in selected:
        vid = item["id"]
        if vid in seen_ids:
            continue
        seen_ids.add(vid)

        views_count = item["viewsCount"]
        rel_time = format_relative_time(item["published"])

        if vid in seed_by_id:
            story = dict(seed_by_id[vid])
            if item["rawTitle"]:
                story["rawTitle"] = item["rawTitle"]
            if views_count > 0:
                story["viewsCount"] = views_count
                story["viewsText"] = format_views_count(views_count)
            if rel_time:
                story["publishedText"] = rel_time
            stories.append(story)
            continue

        raw_title = item["rawTitle"] or "Kahon Audio Story"
        parsed = parse_story_metadata(raw_title, [])
        hq = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
        hd = f"https://i.ytimg.com/vi/{vid}/hq720.jpg"
        is_stream = "live with" in raw_title.lower()

        stories.append(
            {
                "id": vid,
                "index": len(stories),
                "kind": "stream" if is_stream else "video",
                "rawTitle": raw_title,
                "title": parsed["storyTitle"],
                "author": parsed["author"],
                "series": parsed["series"],
                "genres": parsed["genres"],
                "durationText": "",
                "durationSeconds": 0,
                "viewsText": format_views_count(views_count),
                "viewsCount": views_count,
                "publishedText": rel_time,
                "thumbnail": hd,
                "thumbnailFallback": item["thumbUrl"] or hq,
                "thumbnailHd": hd,
                "youtubeUrl": f"https://www.youtube.com/watch?v={vid}",
                "playlists": [],
                "palette": extract_palette_from_url(item["thumbUrl"] or hq, vid),
            }
        )

    for s in seed_stories:
        if isinstance(s, dict) and s.get("id") and s["id"] not in seen_ids:
            seen_ids.add(s["id"])
            stories.append(s)

    if not stories:
        print("RSS returned no stories and no baseline was found.")
        return False

    channel = baseline.get("channel") or {
        "name": "Kahon",
        "bengaliName": "কাহন",
        "handle": CHANNEL_HANDLE,
        "url": BASE_URL,
        "avatar": "./images/kahon-logo.jpg",
        "banner": "",
        "metaSummary": [CHANNEL_HANDLE, f"{len(stories)} videos"],
        "descriptionPreview": "সাহিত্যের বিভিন্ন আঙিনা থেকে বাছাই করে নিয়ে আসা কিছু মনিমানিক্য দিয়ে তৈরী আপনাদের প্রিয় - কাহন (Kahon).",
    }

    output = build_catalog_output(channel, playlists_out, stories)
    write_catalog_json(output, out_path)
    return True


def full_scrape_main(out_path: Path = OUT_PATH) -> None:
    t0 = time.time()
    print("1/5 Fetching channel header & all videos...")
    videos_data, raw_videos = fetch_paginated_tab("videos")
    channel = extract_channel_info(videos_data)
    print(f"    -> Channel: {channel['name']} | Meta: {channel['metaSummary']}")
    print(f"    -> Videos tab count: {len(raw_videos)}")

    print("2/5 Fetching live streams & podcasts tabs...")
    _, raw_streams = fetch_paginated_tab("streams")
    _, raw_podcasts = fetch_paginated_tab("podcasts")
    print(f"    -> Streams: {len(raw_streams)} | Podcasts: {len(raw_podcasts)}")

    print("3/5 Fetching all playlists...")
    _, raw_playlists = fetch_paginated_tab("playlists")
    print(f"    -> Playlists fetched: {len(raw_playlists)}")

    playlist_map: dict[str, dict[str, Any]] = {}
    for pl in raw_playlists + raw_podcasts:
        pid = pl["id"]
        if not pid:
            continue
        is_podcast = pl in raw_podcasts
        if pid not in playlist_map:
            playlist_map[pid] = {
                "id": pid,
                "title": pl["rawTitle"],
                "thumbnail": pl["thumbnail"],
                "badgeText": pl["badgeText"],
                "isPodcast": is_podcast,
                "videoIds": [],
            }
        elif is_podcast:
            playlist_map[pid]["isPodcast"] = True

    print(f"4/5 Fetching tracklists for {len(playlist_map)} playlists...")
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_playlist_videos, pid): pid for pid in playlist_map}
        for fut in as_completed(futures):
            pid, vids = fut.result()
            playlist_map[pid]["videoIds"] = vids

    video_to_playlists: dict[str, list[dict[str, str]]] = {}
    for pid, pinfo in playlist_map.items():
        for vid in pinfo["videoIds"]:
            video_to_playlists.setdefault(vid, []).append(
                {"id": pid, "title": pinfo["title"]}
            )

    all_raw: list[tuple[dict[str, Any], str]] = []
    seen_ids: set[str] = set()
    for item in raw_videos:
        if item["id"] and item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            all_raw.append((item, "video"))
    for item in raw_streams:
        if item["id"] and item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            all_raw.append((item, "stream"))

    if not all_raw:
        raise RuntimeError("No videos retrieved from YouTube web scrape")

    print(f"5/5 Extracting cover-art ambient color palettes for {len(all_raw)} stories & {len(playlist_map)} playlists...")
    palettes: dict[str, dict[str, str]] = {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        future_map = {}
        for item, _ in all_raw:
            vid = item["id"]
            future_map[pool.submit(extract_palette_from_url, item["thumbnail"], vid)] = f"v:{vid}"
        for pid, pinfo in playlist_map.items():
            fallback_vid = pinfo["videoIds"][0] if pinfo["videoIds"] else None
            future_map[pool.submit(extract_palette_from_url, pinfo["thumbnail"], fallback_vid)] = f"p:{pid}"

        for fut in as_completed(future_map):
            key = future_map[fut]
            palettes[key] = fut.result()

    stories: list[dict[str, Any]] = []
    for idx, (item, kind) in enumerate(all_raw):
        vid = item["id"]
        pl_refs = video_to_playlists.get(vid, [])
        pl_titles = [p["title"] for p in pl_refs]
        parsed = parse_story_metadata(item["rawTitle"], pl_titles)

        views_text = item["metaTexts"][0] if len(item["metaTexts"]) >= 1 else ""
        published_text = item["metaTexts"][1] if len(item["metaTexts"]) >= 2 else ""
        dur_sec = parse_duration_seconds(item["badgeText"])

        thumb_hq720 = f"https://i.ytimg.com/vi/{vid}/hq720.jpg"
        thumb_hq = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"

        stories.append(
            {
                "id": vid,
                "index": idx,
                "kind": kind,
                "rawTitle": item["rawTitle"],
                "title": parsed["storyTitle"],
                "author": parsed["author"],
                "series": parsed["series"],
                "genres": parsed["genres"],
                "durationText": item["badgeText"] or "0:00",
                "durationSeconds": dur_sec,
                "viewsText": views_text,
                "viewsCount": parse_views_count(views_text),
                "publishedText": published_text,
                "thumbnail": item["thumbnail"] or thumb_hq,
                "thumbnailFallback": thumb_hq,
                "thumbnailHd": thumb_hq720,
                "youtubeUrl": f"https://www.youtube.com/watch?v={vid}",
                "playlists": pl_refs,
                "palette": palettes.get(f"v:{vid}"),
            }
        )

    story_id_set = {s["id"] for s in stories}
    playlists_out: list[dict[str, Any]] = []
    for pid, pinfo in playlist_map.items():
        valid_vids = [v for v in pinfo["videoIds"] if v in story_id_set]
        total_sec = sum(
            next((s["durationSeconds"] for s in stories if s["id"] == v), 0)
            for v in valid_vids
        )
        final_vids = valid_vids if valid_vids else pinfo["videoIds"]
        playlists_out.append(
            {
                "id": pid,
                "title": pinfo["title"],
                "thumbnail": pinfo["thumbnail"],
                "badgeText": pinfo["badgeText"],
                "isPodcast": pinfo["isPodcast"],
                "videoIds": final_vids,
                "storyCount": len(final_vids),
                "totalDurationSeconds": total_sec,
                "youtubeUrl": f"https://www.youtube.com/playlist?list={pid}",
                "palette": palettes.get(f"p:{pid}"),
            }
        )

    output = build_catalog_output(channel, playlists_out, stories)
    write_catalog_json(output, out_path)
    print(f"Done in {time.time() - t0:.1f}s!")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Kahon (@kahonstory) YouTube catalog.")
    parser.add_argument("--rss", action="store_true", help="Fast RSS merge against existing baseline JSON.")
    parser.add_argument("--ci", action="store_true", help="Try full scrape and fall back cleanly to RSS merge on cloud blocks.")
    parser.add_argument("--out", type=Path, default=OUT_PATH, help="Output catalog JSON path.")
    args = parser.parse_args()

    if args.rss:
        if not sync_via_rss(args.out):
            sys.exit(1)
        return

    if args.ci:
        try:
            full_scrape_main(args.out)
        except Exception as err:
            print(f"Full scrape failed in CI ({err}); falling back to RSS merge...")
            if not sync_via_rss(args.out):
                print("RSS fallback also failed; keeping existing baseline JSON intact.")
        return

    full_scrape_main(args.out)


if __name__ == "__main__":
    main()
