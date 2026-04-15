import os
import uuid
import httpx
import logging
from pathlib import Path
from tempfile import NamedTemporaryFile

from reportlab.lib.pagesizes import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth

from lib.supabase import supabase

logger = logging.getLogger("nolan.comic.exporter")

# Graphic Novel Standard Size in points (1 inch = 72 points)
PAGE_WIDTH = 6.625 * 72   # 477 pt
PAGE_HEIGHT = 10.25 * 72  # 738 pt

# Local storage path for exports
BASE_DIR = Path(__file__).parent.parent.parent.parent
PUBLIC_DIR = BASE_DIR / "frontend" / "public"
EXPORTS_DIR = PUBLIC_DIR / "exports"

def ensure_exports_dir():
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

def wrap_text(text: str, max_width: float, font_name: str, font_size: float) -> list[str]:
    """Wraps text to fit within max_width."""
    lines = []
    words = text.split()
    current_line = []
    for word in words:
        current_line.append(word)
        width = stringWidth(" ".join(current_line), font_name, font_size)
        if width > max_width:
            if len(current_line) == 1:
                # Word is too long by itself, force break
                lines.append(current_line[0])
                current_line = []
            else:
                current_line.pop()
                lines.append(" ".join(current_line))
                current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))
    return lines

def draw_caption(c: canvas.Canvas, text: str, x: float, y: float, w: float, h: float, align="top"):
    """Draws a narration caption box with wrapped text."""
    if not text:
        return
        
    padding = 10
    font_name = "Helvetica"
    font_size = 10
    line_height = 12
    max_text_width = w - (padding * 2)
    
    lines = wrap_text(text, max_text_width, font_name, font_size)
    
    # Calculate box height
    box_height = padding * 2 + (len(lines) * line_height)
    
    # Decide position
    if align == "top":
        box_y = y + h - box_height
    else:
        # bottom
        box_y = y
        
    # Draw yellow-ish narration box
    c.saveState()
    c.setFillColor(HexColor("#FDF6E3"))
    c.setStrokeColor(black)
    c.setLineWidth(1.5)
    c.rect(x, box_y, w, box_height, fill=1, stroke=1)
    
    # Draw text
    c.setFillColor(black)
    c.setFont(font_name, font_size)
    text_y = box_y + box_height - padding - font_size
    for line in lines:
        c.drawString(x + padding, text_y, line)
        text_y -= line_height
        
    c.restoreState()

def draw_speech_bubble(c: canvas.Canvas, text: str, cx: float, cy: float, panel_w: float):
    """Draws a rounded rectangle speech bubble at cx, cy."""
    if not text:
        return
        
    padding = 8
    font_name = "Helvetica-Bold"
    font_size = 9
    line_height = 11
    max_text_width = min(panel_w * 0.4, 150) # Bubbles shouldn't be too wide
    
    lines = wrap_text(text, max_text_width, font_name, font_size)
    
    # Find widest line for bubble width
    max_line_width = max([stringWidth(l, font_name, font_size) for l in lines] + [0])
    
    box_w = max_line_width + (padding * 2)
    box_h = (len(lines) * line_height) + (padding * 2)
    
    # cx, cy are centers. Calculate top-left.
    box_x = cx - (box_w / 2)
    box_y = cy - (box_h / 2)
    
    c.saveState()
    c.setFillColor(white)
    c.setStrokeColor(black)
    c.setLineWidth(1)
    c.roundRect(box_x, box_y, box_w, box_h, radius=6, fill=1, stroke=1)
    
    c.setFillColor(black)
    c.setFont(font_name, font_size)
    text_y = box_y + box_h - padding - font_size + 2
    for line in lines:
        # Center align text
        lw = stringWidth(line, font_name, font_size)
        px = box_x + (box_w - lw) / 2
        c.drawString(px, text_y, line)
        text_y -= line_height
        
    c.restoreState()


async def generate_comic_pdf(project_id: str, comic_id: str) -> str:
    """
    Downloads images, lays out PDF, draws captions/bubbles, and saves to /exports.
    Returns the public URL of the PDF.
    """
    ensure_exports_dir()
    file_name = f"comic_{comic_id}.pdf"
    file_path = EXPORTS_DIR / file_name
    
    try:
        # 1. Fetch comic metadata
        comic_res = supabase.table("comics").select("title").eq("id", comic_id).single().execute()
        comic_title = comic_res.data.get("title", "Generated Comic") if comic_res.data else "Generated Comic"
        
        # 2. Fetch pages and panels
        # Current pipeline dumps all panels into page 1, so we'll fetch all panels for the comic
        pages_res = supabase.table("comic_pages").select("id").eq("comic_id", comic_id).execute()
        page_ids = [p["id"] for p in (pages_res.data or [])]
        
        if not page_ids:
            raise Exception("No pages found for this comic.")
            
        panels_res = supabase.table("comic_panels").select("*").in_("page_id", page_ids).order("panel_index").execute()
        panels = panels_res.data or []
        
        if not panels:
            raise Exception("No panels found for this comic.")
            
        # 3. Initialize PDF Canvas
        c = canvas.Canvas(str(file_path), pagesize=(PAGE_WIDTH, PAGE_HEIGHT))
        c.setTitle(comic_title)
        
        # Draw Title Page
        c.setFillColor(black)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1)
        c.setFillColor(HexColor("#ba9eff"))
        c.setFont("Helvetica-Bold", 24)
        title_w = stringWidth(comic_title, "Helvetica-Bold", 24)
        c.drawString((PAGE_WIDTH - title_w) / 2, PAGE_HEIGHT / 1.5, comic_title)
        c.setFont("Helvetica", 12)
        c.setFillColor(white)
        sub_title = "Nolan AI Studio Generation"
        sub_w = stringWidth(sub_title, "Helvetica", 12)
        c.drawString((PAGE_WIDTH - sub_w) / 2, PAGE_HEIGHT / 1.5 - 30, sub_title)
        c.showPage()

        # 4. Group panels into layouts (2 panels per page vertically)
        PANELS_PER_PAGE = 2
        pages_groups = [panels[i:i + PANELS_PER_PAGE] for i in range(0, len(panels), PANELS_PER_PAGE)]
        
        # Margins
        margin_x = 20
        margin_y = 20
        gutter_y = 15 # space between panels
        
        panel_w = PAGE_WIDTH - (margin_x * 2)
        # Calculate panel height if 2 fit on a page
        panel_h = (PAGE_HEIGHT - (margin_y * 2) - gutter_y) / 2
        
        # We will use httpx to download images aggressively
        async with httpx.AsyncClient() as http_client:
            for group in pages_groups:
                c.setFillColor(black)
                c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1) # Black background page
                
                # Draw top-down
                current_y = PAGE_HEIGHT - margin_y
                
                for panel in group:
                    # Move anchor down by panel_h
                    current_y -= panel_h
                    p_x = margin_x
                    p_y = current_y
                    
                    img_url = panel.get("image_url")
                    if img_url:
                        tmp_name = None
                        try:
                            if img_url.startswith("/"):
                                # Local file in frontend/public
                                local_path = PUBLIC_DIR / img_url.lstrip("/")
                                if not local_path.exists():
                                    raise FileNotFoundError(f"Local image not found: {local_path}")
                                img_reader = ImageReader(str(local_path))
                            else:
                                # Remote URL
                                # Add timeout and follow redirects
                                img_resp = await http_client.get(img_url, timeout=30.0, follow_redirects=True)
                                img_resp.raise_for_status()
                                
                                # Save to temp file
                                with NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                                    tmp.write(img_resp.content)
                                    tmp_name = tmp.name
                                    
                                img_reader = ImageReader(tmp_name)

                            # Draw crop/scale to fit panel bounds
                            c.drawImage(img_reader, p_x, p_y, width=panel_w, height=panel_h, preserveAspectRatio=True, anchor="c")
                        except Exception as e:
                            logger.error(f"Failed to load image {img_url}: {e}")
                            c.setStrokeColor(white)
                            c.rect(p_x, p_y, panel_w, panel_h)
                            c.setFillColor(white)
                            c.drawString(p_x + 50, p_y + (panel_h/2), "Image Load Error")
                        finally:
                            if tmp_name and os.path.exists(tmp_name):
                                try:
                                    os.remove(tmp_name)
                                except Exception as clean_err:
                                    logger.warning(f"Failed to clean temp file {tmp_name}: {clean_err}")

                    # Draw Captions
                    draw_caption(c, panel.get("caption_top"), p_x, p_y, panel_w, panel_h, align="top")
                    draw_caption(c, panel.get("caption_bottom"), p_x, p_y, panel_w, panel_h, align="bottom")
                    
                    # Draw Speech Bubbles
                    # x and y from LLM are roughly percentages from 10 to 90
                    bubbles = panel.get("speech_bubbles") or []
                    for b in bubbles:
                        text = b.get("text", "")
                        bx = float(b.get("x", 50))
                        by = float(b.get("y", 50))
                        
                        # Convert percentage to absolute points relative to this panel
                        # Keep it inside bounds
                        bx_clamp = max(10, min(bx, 90))
                        by_clamp = max(10, min(by, 90))
                        
                        abs_x = p_x + (panel_w * (bx_clamp / 100.0))
                        # Graphic Novel Y goes from bottom (0%) to top (100%), but LLM might mean top=0.
                        # Let's assume standard programming coordinates (0,0 is top-left in web, but bottom-left in PDF)
                        # We'll map (x,y) from top-left (0,0) to bottom-left (p_x, p_y+panel_h)
                        abs_y = p_y + panel_h - (panel_h * (by_clamp / 100.0))
                        
                        draw_speech_bubble(c, text, abs_x, abs_y, panel_w)
                        
                    # Move anchor down for next panel via gutter
                    current_y -= gutter_y
                    
                c.showPage()
                
        c.save()
        
        logger.info(f"Successfully generated PDF: {file_path}")
        return f"/exports/{file_name}"
        
    except Exception as e:
        logger.error(f"Failed to generate PDF for comic {comic_id}: {e}", exc_info=True)
        raise e
