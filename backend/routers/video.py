"""
Video Router — Comic Panel Stitch Pipeline
==========================================
Takes all existing comic panels for a project (already generated),
stitches them into a cinematic MP4 with:
  • Alternating Ken Burns effects (pan-left, pan-right, zoom-in, zoom-out, tilt-up)
  • Smooth crossfade transitions between panels
  • Edge-TTS narration audio overlay (one track for the whole video)
  • moviepy 2.x + imageio-ffmpeg (self-contained, no system install needed)

No new API calls for images — uses what's already generated in comic_panels table.
Per-project caching in Supabase project_videos table.
"""

import asyncio
import io
import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional, Tuple

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel

from lib.supabase import supabase

router = APIRouter(prefix="/api/video", tags=["video"])
logger = logging.getLogger("nolan.video")

# ─── Config ───────────────────────────────────────────────────────────────────

BASE_DIR  = Path(__file__).parent.parent.parent
VIDEO_DIR = BASE_DIR / "frontend" / "public" / "videos"
AUDIO_DIR = BASE_DIR / "frontend" / "public" / "audio" / "video"

FPS            = 24
SECS_PER_PANEL = 5      # each panel shown for 5 seconds
CROSSFADE_SECS = 0.6    # transition between panels
VIDEO_W        = 1280
VIDEO_H        = 720

# ─── Request Model ────────────────────────────────────────────────────────────

class VideoGenerateRequest(BaseModel):
    project_id:       str
    scene_ids:        Optional[List[str]] = None
    force_regenerate: bool                = False

# ─── Fetch Comic Panels ───────────────────────────────────────────────────────

async def _fetch_comic_panels(
    project_id: str, scene_ids: Optional[List[str]]
) -> List[dict]:
    """
    Returns comic panels ordered by chapter position → scene position → panel_index.
    Each dict has: image_url, scene_id, panel_index, scene_title, scene_text.
    """
    try:
        # Get chapters ordered by position
        ch_res = (
            supabase.table("chapters")
            .select("id, position")
            .eq("project_id", project_id)
            .order("position")
            .execute()
        )
        chapters  = ch_res.data or []
        if not chapters:
            return []

        ch_ids     = [c["id"] for c in chapters]
        ch_pos_map = {c["id"]: c["position"] for c in chapters}

        # Get scenes for those chapters
        sq = (
            supabase.table("scenes")
            .select("id, title, plain_text, content, position, chapter_id")
            .in_("chapter_id", ch_ids)
            .order("position")
        )
        if scene_ids:
            sq = sq.in_("id", scene_ids)
        scenes = sq.execute().data or []
        scenes.sort(
            key=lambda s: (ch_pos_map.get(s["chapter_id"], 0), s.get("position", 0))
        )
        if not scenes:
            return []

        scene_ids_ordered = [s["id"] for s in scenes]
        scene_map         = {s["id"]: s for s in scenes}

        # Get comic panels for those scenes
        panels_res = (
            supabase.table("comic_panels")
            .select("id, scene_id, panel_index, image_url, caption_top, caption_bottom")
            .in_("scene_id", scene_ids_ordered)
            .order("panel_index")
            .execute()
        )
        panels = panels_res.data or []
        if not panels:
            logger.warning(f"[Video] No comic panels found for project={project_id[:8]}")
            return []

        # Sort by scene story-order, then panel_index within scene
        scene_order = {sid: i for i, sid in enumerate(scene_ids_ordered)}
        panels.sort(
            key=lambda p: (scene_order.get(p["scene_id"], 999), p.get("panel_index", 0))
        )

        # Enrich with scene text
        result = []
        for p in panels:
            sc = scene_map.get(p["scene_id"], {})
            txt = (sc.get("plain_text") or sc.get("content") or "").strip()
            result.append({
                "image_url":   p["image_url"],
                "scene_id":    p["scene_id"],
                "panel_index": p["panel_index"],
                "scene_title": sc.get("title", "Scene"),
                "scene_text":  txt,
                "caption":     p.get("caption_top") or p.get("caption_bottom") or "",
            })

        # Filter out placeholder/failed images
        SKIP_PATTERNS = ["placehold.co", "Generation+Failed", "Generation Failed"]
        before = len(result)
        result = [
            p for p in result
            if not any(skip in p["image_url"] for skip in SKIP_PATTERNS)
        ]
        if len(result) < before:
            logger.info(
                f"[Video] Filtered {before - len(result)} placeholder/failed panels — "
                f"{len(result)} usable panels remain"
            )

        logger.info(f"[Video] Found {len(result)} comic panels for project={project_id[:8]}")
        return result

    except Exception as e:
        logger.error(f"[Video] Panel fetch failed: {e}", exc_info=True)
        return []

# ─── Image Download / Load ────────────────────────────────────────────────────

async def _load_image(image_url: str) -> Optional[np.ndarray]:
    """
    Loads an image from a URL or local path and returns a (H, W, 3) uint8 array.
    Returns None if loading fails (expired URL, missing file, etc.)
    """
    try:
        if image_url.startswith("/"):
            # Local path served by Next.js — resolve against frontend/public/
            local_path = BASE_DIR / "frontend" / "public" / image_url.lstrip("/")
            if local_path.exists():
                img = Image.open(local_path).convert("RGB")
                img = img.resize((VIDEO_W, VIDEO_H), Image.LANCZOS)
                return np.array(img)
            else:
                logger.warning(f"[Video] Local image not found: {local_path}")
                return None

        # Remote URL — download with timeout
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(image_url)
            if resp.status_code != 200:
                logger.warning(f"[Video] Image download HTTP {resp.status_code}: {image_url[:80]}")
                return None
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            img = img.resize((VIDEO_W, VIDEO_H), Image.LANCZOS)
            return np.array(img)

    except Exception as e:
        logger.warning(f"[Video] Image load failed ({image_url[:60]}...): {e}")
        return None

# ─── Ken Burns Effects ────────────────────────────────────────────────────────

def _effect_pan_right(img: np.ndarray, n: int) -> List[np.ndarray]:
    """Pan from left side to right side of the image (slight crop + slide)."""
    h, w = img.shape[:2]
    crop_w = int(w * 0.85)   # show 85% width, pan across the rest
    frames = []
    for i in range(n):
        t      = i / max(n - 1, 1)
        x0     = int((w - crop_w) * t)
        strip  = img[:, x0:x0 + crop_w]
        frame  = np.array(Image.fromarray(strip).resize((w, h), Image.BILINEAR), dtype=np.uint8)
        frames.append(frame)
    return frames


def _effect_pan_left(img: np.ndarray, n: int) -> List[np.ndarray]:
    """Pan from right side to left."""
    h, w  = img.shape[:2]
    crop_w = int(w * 0.85)
    frames = []
    for i in range(n):
        t     = i / max(n - 1, 1)
        x0    = int((w - crop_w) * (1 - t))
        strip = img[:, x0:x0 + crop_w]
        frame = np.array(Image.fromarray(strip).resize((w, h), Image.BILINEAR), dtype=np.uint8)
        frames.append(frame)
    return frames


def _effect_zoom_in(img: np.ndarray, n: int) -> List[np.ndarray]:
    """Slow push-in zoom (Ken Burns classic)."""
    h, w   = img.shape[:2]
    frames = []
    for i in range(n):
        t     = i / max(n - 1, 1)
        scale = 1.0 + 0.12 * t   # 1.0 → 1.12
        ch, cw = int(h / scale), int(w / scale)
        y0, x0 = (h - ch) // 2, (w - cw) // 2
        crop  = img[y0:y0 + ch, x0:x0 + cw]
        frame = np.array(Image.fromarray(crop).resize((w, h), Image.BILINEAR), dtype=np.uint8)
        frames.append(frame)
    return frames


def _effect_zoom_out(img: np.ndarray, n: int) -> List[np.ndarray]:
    """Pull-out zoom."""
    h, w   = img.shape[:2]
    frames = []
    for i in range(n):
        t     = i / max(n - 1, 1)
        scale = 1.12 - 0.12 * t   # 1.12 → 1.0
        ch, cw = int(h / scale), int(w / scale)
        y0, x0 = (h - ch) // 2, (w - cw) // 2
        crop  = img[y0:y0 + ch, x0:x0 + cw]
        frame = np.array(Image.fromarray(crop).resize((w, h), Image.BILINEAR), dtype=np.uint8)
        frames.append(frame)
    return frames


def _effect_tilt_up(img: np.ndarray, n: int) -> List[np.ndarray]:
    """Slow tilt up (pan from bottom to top)."""
    h, w   = img.shape[:2]
    crop_h = int(h * 0.85)
    frames = []
    for i in range(n):
        t     = i / max(n - 1, 1)
        y0    = int((h - crop_h) * (1 - t))
        strip = img[y0:y0 + crop_h, :]
        frame = np.array(Image.fromarray(strip).resize((w, h), Image.BILINEAR), dtype=np.uint8)
        frames.append(frame)
    return frames


def _effect_tilt_down(img: np.ndarray, n: int) -> List[np.ndarray]:
    """Slow tilt down (pan from top to bottom)."""
    h, w   = img.shape[:2]
    crop_h = int(h * 0.85)
    frames = []
    for i in range(n):
        t     = i / max(n - 1, 1)
        y0    = int((h - crop_h) * t)
        strip = img[y0:y0 + crop_h, :]
        frame = np.array(Image.fromarray(strip).resize((w, h), Image.BILINEAR), dtype=np.uint8)
        frames.append(frame)
    return frames


EFFECTS = [
    _effect_zoom_in,
    _effect_pan_right,
    _effect_zoom_out,
    _effect_pan_left,
    _effect_tilt_up,
    _effect_tilt_down,
]


def _apply_effect(img: np.ndarray, effect_idx: int, n_frames: int) -> List[np.ndarray]:
    """Applies a rotating Ken Burns effect to an image."""
    fn = EFFECTS[effect_idx % len(EFFECTS)]
    return fn(img, n_frames)

# ─── Crossfade ────────────────────────────────────────────────────────────────

def _crossfade(a: np.ndarray, b: np.ndarray, n: int) -> List[np.ndarray]:
    """Smooth crossfade between two frames."""
    frames = []
    for i in range(n):
        alpha   = i / n
        blended = np.clip(
            (1 - alpha) * a.astype(np.float32) + alpha * b.astype(np.float32),
            0, 255
        ).astype(np.uint8)
        frames.append(blended)
    return frames

# ─── Fallback Frame ───────────────────────────────────────────────────────────

def _make_fallback(idx: int) -> np.ndarray:
    return np.full((VIDEO_H, VIDEO_W, 3), [14, 14, 20], dtype=np.uint8)

# ─── MP4 Encoder ─────────────────────────────────────────────────────────────

def _encode_mp4(
    frames: List[np.ndarray],
    audio_path: Optional[Path],
    out_path: Path,
):
    """Encodes frame list into MP4 using moviepy 2.x + built-in ffmpeg."""
    from moviepy import ImageSequenceClip, AudioFileClip

    video = ImageSequenceClip(frames, fps=FPS)

    if audio_path and audio_path.exists():
        try:
            audio   = AudioFileClip(str(audio_path))
            min_dur = min(video.duration, audio.duration)
            audio   = audio.subclipped(0, min_dur)
            video   = video.subclipped(0, min_dur).with_audio(audio)
        except Exception as e:
            logger.warning(f"[Video] Audio attach failed: {e}")

    video.write_videofile(
        str(out_path),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        logger=None,
    )

# ─── TTS Narration ────────────────────────────────────────────────────────────

async def _generate_narration(story_text: str, project_id: str) -> Optional[Path]:
    """Generates a TTS narration MP3. Returns local Path or None."""
    try:
        AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        from services.audio.tts_service import TTSService

        script   = " ".join(story_text.split()[:150])
        filename = f"narration_{project_id[:8]}.mp3"
        path     = AUDIO_DIR / filename

        if path.exists():
            logger.info(f"[Video] Reusing cached narration: {filename}")
            return path

        tts     = TTSService()
        success = await tts.generate_audio(
            script, str(path),
            voice="en-US-JennyNeural", pitch="+0Hz", rate="-5%",
        )
        return path if success else None

    except Exception as e:
        logger.warning(f"[Video] Narration failed: {e}")
        return None

# ─── Supabase Cache ───────────────────────────────────────────────────────────

def _get_cached(project_id: str) -> Optional[dict]:
    try:
        res = (
            supabase.table("project_videos")
            .select("id, video_url, task_id, prompt, audio_url, created_at")
            .eq("project_id", project_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        logger.warning(f"[Video] Cache lookup failed: {e}")
        return None


def _save_cache(
    project_id: str, task_id: str, video_url: str,
    prompt: str, audio_url: Optional[str] = None,
):
    try:
        supabase.table("project_videos").insert({
            "project_id": project_id,
            "task_id":    task_id,
            "video_url":  video_url,
            "prompt":     prompt,
            "audio_url":  audio_url,
        }).execute()
        logger.info(f"[Video] Cached for project={project_id[:8]}")
    except Exception as e:
        logger.warning(f"[Video] Cache save failed: {e}")

# ─── Main Pipeline (async) ────────────────────────────────────────────────────

async def _run_pipeline(
    project_id: str, panels: List[dict]
) -> Tuple[str, Optional[str]]:
    """
    1. Download all panel images in parallel (max 5 concurrent)
    2. Start TTS narration in parallel
    3. Build frame sequence with Ken Burns + crossfades
    4. Encode MP4 in thread (non-blocking)
    5. Return (video_url, audio_url)
    """
    # ── Download all images in parallel ──────────────────────────────────────
    sem = asyncio.Semaphore(5)

    async def _dl(panel, idx):
        async with sem:
            arr = await _load_image(panel["image_url"])
            return arr if arr is not None else _make_fallback(idx)

    image_arrays = await asyncio.gather(
        *[_dl(p, i) for i, p in enumerate(panels)]
    )

    # Filter out any panels we couldn't load (shouldn't happen, but be safe)
    valid = [(img, panels[i]) for i, img in enumerate(image_arrays) if img is not None]
    if not valid:
        raise ValueError("Could not load any comic panel images")

    logger.info(f"[Video] {len(valid)}/{len(panels)} images loaded")

    # ── Build combined story text for narration ───────────────────────────────
    story_parts = []
    seen_scenes = set()
    for _, panel in valid:
        sid = panel["scene_id"]
        if sid not in seen_scenes and panel.get("scene_text"):
            story_parts.append(panel["scene_text"])
            seen_scenes.add(sid)
    story_text = " ".join(story_parts)

    # ── Start TTS narration in parallel ──────────────────────────────────────
    audio_task = asyncio.create_task(_generate_narration(story_text, project_id))

    # ── Build frame sequence ──────────────────────────────────────────────────
    n_scene_frames = int(SECS_PER_PANEL * FPS)   # frames per panel
    n_cross_frames = int(CROSSFADE_SECS * FPS)    # crossfade frames

    all_frames: List[np.ndarray] = []

    for idx, (img, _) in enumerate(valid):
        # Apply a different Ken Burns effect for each panel (cycle through them)
        panel_frames = _apply_effect(img, idx, n_scene_frames)

        # Crossfade from previous panel's last frame into this panel's first frame
        if idx > 0 and all_frames:
            cross = _crossfade(all_frames[-1], panel_frames[0], n_cross_frames)
            all_frames.extend(cross)

        all_frames.extend(panel_frames)

    duration = len(all_frames) / FPS
    logger.info(
        f"[Video] Frame sequence: {len(all_frames)} frames "
        f"({duration:.1f}s) from {len(valid)} panels"
    )

    # ── Wait for audio ────────────────────────────────────────────────────────
    try:
        audio_path = await asyncio.wait_for(audio_task, timeout=60)
    except Exception:
        audio_path = None

    audio_url = f"/audio/video/narration_{project_id[:8]}.mp3" if audio_path else None

    # ── Encode MP4 in thread (keeps event loop free) ──────────────────────────
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    filename  = f"comic_film_{project_id[:8]}_{uuid.uuid4().hex[:6]}.mp4"
    out_path  = VIDEO_DIR / filename
    video_url = f"/videos/{filename}"

    await asyncio.to_thread(_encode_mp4, all_frames, audio_path, out_path)

    size_kb = out_path.stat().st_size // 1024
    logger.info(f"[Video] MP4 encoded → {filename} ({size_kb} KB)")

    return video_url, audio_url

# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_video(payload: VideoGenerateRequest):
    """
    Generate a cinematic video from existing comic panel images.

    Uses panels already stored in the comic_panels Supabase table.
    Applies alternating Ken Burns effects (pan-left/right, zoom-in/out, tilt-up/down)
    with smooth crossfade transitions and TTS narration audio.

    Caching: returns existing cached video unless force_regenerate=True.
    """
    pid = payload.project_id

    # ── 1. Return cached ─────────────────────────────────────────────────────
    if not payload.force_regenerate:
        cached = _get_cached(pid)
        if cached:
            logger.info(f"[Video] Cache hit for project={pid[:8]}")
            return {
                "status":    "cached",
                "video_url": cached["video_url"],
                "audio_url": cached.get("audio_url"),
                "task_id":   cached["task_id"],
                "prompt":    cached.get("prompt", ""),
            }

    # ── 2. Fetch comic panels ─────────────────────────────────────────────────
    panels = await _fetch_comic_panels(pid, payload.scene_ids)
    if not panels:
        raise HTTPException(
            status_code=400,
            detail=(
                "No comic panels found for this project. "
                "Generate comic panels first using the Comic Studio feature."
            ),
        )

    # Cap at 20 panels to keep encode time reasonable
    if len(panels) > 20:
        logger.info(f"[Video] Capping at 20 panels ({len(panels)} available)")
        panels = panels[:20]

    logger.info(
        f"[Video] Starting comic-stitch pipeline: "
        f"{len(panels)} panels for project={pid[:8]}"
    )

    # ── 3. Run pipeline ───────────────────────────────────────────────────────
    try:
        video_url, audio_url = await _run_pipeline(pid, panels)
    except Exception as e:
        logger.error(f"[Video] Pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Video generation failed: {e}")

    # ── 4. Cache result ───────────────────────────────────────────────────────
    task_id = f"comic_{uuid.uuid4().hex[:12]}"
    _save_cache(
        pid, task_id, video_url,
        f"Comic panel stitch — {len(panels)} panels",
        audio_url,
    )

    return {
        "status":    "generated",
        "video_url": video_url,
        "audio_url": audio_url,
        "task_id":   task_id,
        "prompt":    f"Comic panel stitch — {len(panels)} panels",
    }


@router.get("/project/{project_id}")
async def get_project_video(project_id: str):
    """Returns saved video for a project on editor load."""
    cached = _get_cached(project_id)
    if not cached:
        return {"status": "none", "video_url": None, "audio_url": None}
    return {
        "status":    "cached",
        "video_url": cached["video_url"],
        "audio_url": cached.get("audio_url"),
        "task_id":   cached["task_id"],
        "prompt":    cached.get("prompt", ""),
    }


@router.delete("/project/{project_id}")
async def clear_project_video(project_id: str):
    """Clears cached video so next generate produces a fresh one."""
    try:
        supabase.table("project_videos").delete().eq("project_id", project_id).execute()
        return {"status": "cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
