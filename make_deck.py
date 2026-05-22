"""
Build AI Reckoning — Incident Investigation Demo deck.
Style matched to Chip1-Lens reference deck.
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from PIL import Image, ImageDraw, ImageFont
import io
import os as _os

# ─── Palette ─────────────────────────────────────────────────────────────────
BG       = RGBColor(0x0A, 0x0A, 0x0A)
PANEL    = RGBColor(0x12, 0x12, 0x16)
BORDER   = RGBColor(0x1E, 0x1E, 0x28)
ACCENT   = RGBColor(0x00, 0xC2, 0xA8)
AMBER    = RGBColor(0xF5, 0x9E, 0x0B)
RED      = RGBColor(0xF0, 0x4F, 0x5E)
PURPLE   = RGBColor(0xA7, 0x8B, 0xFA)
WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
OFFWHITE = RGBColor(0xE8, 0xE8, 0xF0)
DIM      = RGBColor(0x6B, 0x75, 0x85)
DIMMER   = RGBColor(0x3A, 0x3A, 0x48)

FONT_BODY = "Helvetica Neue"
FONT_MONO = "JetBrains Mono"

# ─── Helpers ─────────────────────────────────────────────────────────────────

prs = Presentation()
prs.slide_width  = Inches(13.33)
prs.slide_height = Inches(7.5)

BLANK = prs.slide_layouts[6]


def add_slide():
    return prs.slides.add_slide(BLANK)


def rect(slide, l, t, w, h, fill=None, line=None, line_w=Pt(0.5)):
    shp = slide.shapes.add_shape(1, Inches(l), Inches(t), Inches(w), Inches(h))
    shp.line.fill.background()
    if fill:
        shp.fill.solid()
        shp.fill.fore_color.rgb = fill
    else:
        shp.fill.background()
    if line:
        shp.line.color.rgb = line
        shp.line.width = line_w
    else:
        shp.line.fill.background()
    return shp


def label(slide, text, l, t, w, h,
          size=11, bold=False, color=WHITE, align=PP_ALIGN.LEFT,
          font=FONT_BODY, italic=False, wrap=True):
    txb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    txb.word_wrap = wrap
    tf = txb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = font
    return txb


def slide_bg(slide, color=BG):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def slide_number(slide, n, total):
    label(slide, f"{n} / {total}",
          l=12.3, t=7.1, w=0.9, h=0.3,
          size=8, color=DIM, align=PP_ALIGN.RIGHT)


def top_bar(slide, title_text, subtitle_text=""):
    rect(slide, 0, 0, 13.33, 0.85, fill=PANEL)
    rect(slide, 0, 0, 0.04, 0.85, fill=ACCENT)
    label(slide, "AI RECKONING", 0.18, 0.08, 3, 0.35,
          size=9, bold=True, color=ACCENT)
    label(slide, title_text, 0.18, 0.38, 10, 0.40,
          size=18, bold=True, color=WHITE)
    if subtitle_text:
        label(slide, subtitle_text, 0.18, 0.62, 12, 0.28,
              size=10, color=DIM)


def tech_note(slide, text, t=6.6):
    rect(slide, 0.35, t, 12.63, 0.6, fill=RGBColor(0x0E, 0x0E, 0x18),
         line=RGBColor(0x2A, 0x2A, 0x3A))
    label(slide, "⚙  " + text, 0.55, t + 0.07, 12.3, 0.45,
          size=9, color=DIM)


def section_label(slide, text, l, t, w=8):
    label(slide, text, l, t, w, 0.25, size=8, bold=True, color=ACCENT)
    rect(slide, l, t + 0.22, w, 0.01, fill=BORDER)


def notes(slide, text):
    tf = slide.notes_slide.notes_text_frame
    tf.text = text


def make_solution_illustration(path="/tmp/solution_illustration.png"):
    """Generates a full-canvas mock app-screenshot of AI Reckoning with result."""
    W, H = 1600, 900
    img = Image.new("RGB", (W, H), (8, 12, 22))
    d = ImageDraw.Draw(img)

    def rgb(h): return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    CA = rgb("00C2A8"); CAM = rgb("F59E0B"); CR = rgb("F04F5E")
    CP = rgb("A78BFA"); CW = rgb("E8E8F0"); CD = rgb("6B7585")
    CDM = rgb("3A3A48"); CPAN = rgb("0C1220"); CCARD = rgb("12182C")
    CBR = rgb("1A2438"); CBG = (8, 12, 22)
    FOOTER_H = 50

    try:
        fnt_xl  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
        fnt_lg  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        fnt_md  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 15)
        fnt_sm  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 12)
        fnt_xs  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 10)
        fnt_mm  = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 13)
        fnt_ms  = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 10)
    except Exception:
        fnt_xl = fnt_lg = fnt_md = fnt_sm = fnt_xs = fnt_mm = fnt_ms = ImageFont.load_default()

    # ── Header ──
    HDR = 52
    d.rectangle([0, 0, W, HDR], fill=(6, 9, 18))
    d.rectangle([0, 0, 4, HDR], fill=CA)
    d.text((16, 8),  "AI RECKONING", fill=CA,  font=fnt_md)
    d.text((16, 28), "fn-connect incident  |  2026-05-21", fill=CD, font=fnt_xs)
    # status pill
    d.rounded_rectangle([W-240, 12, W-12, 40], radius=6, fill=rgb("061A14"), outline=CA)
    d.ellipse([W-228, 22, W-214, 36], fill=CA)
    d.text((W-206, 19), "ANALYSIS COMPLETE", fill=CA, font=fnt_sm)
    # elapsed time
    d.text((W-360, 19), "3m 47s", fill=CW, font=fnt_sm)

    # ── Footer ──
    FY = H - FOOTER_H
    d.rectangle([0, FY, W, H], fill=(5, 8, 16))
    d.line([0, FY, W, FY], fill=CBR, width=1)
    d.text((20, FY + 14), "Manual investigation", fill=CD, font=fnt_sm)
    d.text((210, FY + 11), "88 min", fill=CR, font=fnt_lg)
    d.text((320, FY + 14), "  vs  ", fill=CD, font=fnt_sm)
    d.text((376, FY + 11), "~4 min", fill=CA, font=fnt_lg)
    d.text((480, FY + 14), "with AI Reckoning  —  22x faster", fill=CD, font=fnt_sm)
    d.text((W-220, FY + 14), "Chip1 Engineering  |  Hackathon 2026", fill=CDM, font=fnt_xs)

    # ── Stat chips in header ──
    chips = [("Peak errors", "3,485/2min", CR), ("Deploy", "20:34", CAM), ("Root cause", "20:55", CA)]
    cx = 340
    for lbl, val, col in chips:
        d.rounded_rectangle([cx, 8, cx+130, 44], radius=5, fill=CCARD, outline=CBR)
        d.text((cx+8, 11), lbl, fill=CD, font=fnt_xs)
        d.text((cx+8, 24), val, fill=col, font=fnt_sm)
        cx += 144

    # ── Panel layout ──
    GAP = 12
    PY  = HDR + 8
    PH  = FY - PY - 8
    PW  = (W - GAP * 4) // 3
    p1x = GAP
    p2x = GAP * 2 + PW
    p3x = GAP * 3 + PW * 2

    def panel_bg(px, accent):
        d.rectangle([px, PY, px+PW, PY+PH], fill=CPAN, outline=CBR)
        d.rectangle([px, PY, px+PW, PY+4], fill=accent)

    def panel_label(px, txt, col):
        d.text((px+14, PY+10), txt, fill=col, font=fnt_xs)
        d.line([px, PY+28, px+PW, PY+28], fill=CBR, width=1)

    panel_bg(p1x, CAM); panel_label(p1x, "INPUT DATA", CAM)
    panel_bg(p2x, CP);  panel_label(p2x, "AI REASONING", CP)
    panel_bg(p3x, CA);  panel_label(p3x, "INCIDENT REPORT", CA)

    # ─────────────────────────────────────────────────────────────
    # PANEL 1 — Input data: tabs + full log stream
    # ─────────────────────────────────────────────────────────────
    TAB_Y = PY + 32
    tab_items = [("Logs", CAM, True), ("Metrics", CD, False), ("Teams", CD, False), ("Diff", CD, False)]
    tx = p1x + 10
    for tab, col, active in tab_items:
        d.text((tx, TAB_Y), tab, fill=col, font=fnt_sm)
        if active:
            tw = d.textlength(tab, font=fnt_sm)
            d.line([tx, TAB_Y+18, tx+tw, TAB_Y+18], fill=CAM, width=2)
        tx += int(d.textlength(tab, font=fnt_sm)) + 18

    d.line([p1x, TAB_Y+22, p1x+PW, TAB_Y+22], fill=CBR, width=1)

    log_data = [
        ("2026-05-21 20:36:01", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("                    ", "     ", "                   ", "  at getOtherId(EntityIdMappingUtil.java:590)", rgb("F87171")),
        ("2026-05-21 20:36:01", "ERROR", "StockCodeSync",       "XCRM-prod 500: entity_id=0", CR),
        ("2026-05-21 20:36:02", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:02", "WARN ", "ContactService",      "Duplicate contacts accountId=4821", CAM),
        ("2026-05-21 20:36:03", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:03", "ERROR", "StockCodeSync",       "XCRM-prod 500 correlationId=8f31a9", CR),
        ("2026-05-21 20:36:04", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:04", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:05", "WARN ", "ContactService",      "Duplicate contacts accountId=7103", CAM),
        ("2026-05-21 20:36:05", "ERROR", "StockCodeSync",       "XCRM-prod 500: entity_id=0", CR),
        ("2026-05-21 20:36:06", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:07", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:07", "ERROR", "StockCodeSync",       "XCRM-prod 500 correlationId=9c44b1", CR),
        ("2026-05-21 20:36:08", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:08", "WARN ", "ContactService",      "Duplicate contacts accountId=5528", CAM),
        ("2026-05-21 20:36:09", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:09", "ERROR", "StockCodeSync",       "XCRM-prod 500: entity_id=0", CR),
        ("2026-05-21 20:36:10", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:10", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:11", "WARN ", "ContactService",      "Duplicate contacts accountId=6672", CAM),
        ("2026-05-21 20:36:11", "ERROR", "StockCodeSync",       "XCRM-prod 500 correlationId=3a77d2", CR),
        ("2026-05-21 20:36:12", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:12", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:13", "ERROR", "StockCodeSync",       "XCRM-prod 500: entity_id=0", CR),
        ("2026-05-21 20:36:14", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:14", "WARN ", "ContactService",      "Duplicate contacts accountId=8812", CAM),
        ("2026-05-21 20:36:15", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:15", "ERROR", "StockCodeSync",       "XCRM-prod 500 correlationId=5e91f8", CR),
        ("2026-05-21 20:36:16", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:17", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:17", "WARN ", "ContactService",      "Duplicate contacts accountId=2241", CAM),
        ("2026-05-21 20:36:18", "ERROR", "StockCodeSync",       "XCRM-prod 500: entity_id=0", CR),
        ("2026-05-21 20:36:18", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:19", "ERROR", "EntityIdMappingUtil", "STOCK_CODE_010: Invalid PO id - 0", CR),
        ("2026-05-21 20:36:20", "WARN ", "ContactService",      "Duplicate contacts accountId=9934", CAM),
    ]
    ly = TAB_Y + 28
    LINE_H = (PH - (TAB_Y - PY) - 28) // len(log_data)
    LINE_H = max(LINE_H, 14)
    for ts, lvl, logger, msg, col in log_data:
        if ly + LINE_H > PY + PH - 4: break
        lvl_col = CR if "ERROR" in lvl else (CAM if "WARN" in lvl else CD)
        d.text((p1x+10, ly), ts, fill=CDM, font=fnt_ms)
        d.text((p1x+155, ly), lvl.strip(), fill=lvl_col, font=fnt_ms)
        d.text((p1x+10, ly+11), msg[:52], fill=col, font=fnt_ms)
        ly += LINE_H

    # ─────────────────────────────────────────────────────────────
    # PANEL 2 — AI Reasoning: steps filling full height
    # ─────────────────────────────────────────────────────────────
    steps = [
        ("Log ingestion",          "150 lines parsed — 140 ERROR, 8 WARN, 2 INFO",          CA),
        ("Error pattern",          "STOCK_CODE_010 on every call — entity_id returns 0",    CA),
        ("Metrics correlation",    "Spike at 20:36 — 950 baseline → 2,549 errors/2min",     CA),
        ("Deploy event",           "release/2026.05.20 deployed at 20:34, 2min before",     CA),
        ("Teams thread",           "Engineer alert at 20:48 — 14min detection gap",         CA),
        ("Cross-source timestamp", "All 4 sources align: deploy triggers immediate errors", CA),
        ("Duplicate contacts",     "entity_id_mapping has duplicate rows for same contact", CA),
        ("Causal chain built",     "deploy → wrong record → ID=0 → XCRM reject → errors",  CA),
        ("Root cause identified",  "EntityIdMappingUtil.java:590  —  HIGH confidence",      CA),
    ]
    STEP_H = PH // len(steps)
    sy = PY + 6
    for i, (title, desc, col) in enumerate(steps):
        is_last = (i == len(steps) - 1)
        step_bg = rgb("0A1E18") if is_last else CCARD
        step_border = CA if is_last else CBR
        d.rounded_rectangle([p2x+10, sy, p2x+PW-10, sy+STEP_H-6],
                             radius=5, fill=step_bg, outline=step_border)
        # checkmark circle
        cx2, cy2 = p2x+28, sy + (STEP_H-6)//2
        d.ellipse([cx2-10, cy2-10, cx2+10, cy2+10],
                  fill=rgb("061A14") if is_last else rgb("0C0C18"),
                  outline=CA if is_last else CDM)
        d.text((cx2-4, cy2-7), "+" if not is_last else "✓", fill=CA if is_last else CD, font=fnt_sm)
        # text
        tx2 = p2x + 46
        d.text((tx2, sy+6), title, fill=CW if is_last else CD, font=fnt_sm)
        d.text((tx2, sy+22), desc[:52], fill=CA if is_last else CDM, font=fnt_xs)
        sy += STEP_H

    # ─────────────────────────────────────────────────────────────
    # PANEL 3 — Incident Report: full content
    # ─────────────────────────────────────────────────────────────
    # Tab bar
    rtabs = [("Root Cause", CA, True), ("Timeline", CD, False), ("Insights", CD, False), ("Actionables", CD, False)]
    rtx = p3x + 10
    for rtab, rcol, active in rtabs:
        d.text((rtx, PY + 32), rtab, fill=rcol, font=fnt_xs)
        if active:
            tw2 = int(d.textlength(rtab, font=fnt_xs))
            d.line([rtx, PY+46, rtx+tw2, PY+46], fill=CA, width=2)
        rtx += int(d.textlength(rtab, font=fnt_xs)) + 16
    d.line([p3x, PY+48, p3x+PW, PY+48], fill=CBR, width=1)

    ry = PY + 56

    # Confidence badge
    d.rounded_rectangle([p3x+12, ry, p3x+178, ry+24], radius=12, fill=rgb("061A14"), outline=CA)
    d.ellipse([p3x+22, ry+7, p3x+32, ry+17], fill=CA)
    d.text((p3x+38, ry+6), "HIGH CONFIDENCE", fill=CA, font=fnt_xs)
    ry += 34

    # Root cause statement
    d.rounded_rectangle([p3x+10, ry, p3x+PW-10, ry+90], radius=6, fill=CCARD, outline=CBR)
    d.rectangle([p3x+10, ry, p3x+14, ry+90], fill=CA)
    d.text((p3x+22, ry+8),  "Wrong contact returned for accounts", fill=CW, font=fnt_md)
    d.text((p3x+22, ry+28), "with duplicate entries in the", fill=CW, font=fnt_md)
    d.text((p3x+22, ry+48), "entity_id_mapping table — every", fill=CW, font=fnt_md)
    d.text((p3x+22, ry+68), "stock code sync fails", fill=CW, font=fnt_md)
    ry += 100

    # Location box
    d.rounded_rectangle([p3x+10, ry, p3x+PW-10, ry+54], radius=5, fill=rgb("041210"), outline=rgb("004438"))
    d.text((p3x+18, ry+6),  "LOCATION", fill=CA, font=fnt_xs)
    d.text((p3x+18, ry+22), "EntityIdMappingUtil.java:590", fill=CA, font=fnt_mm)
    d.text((p3x+18, ry+40), "fn-connect-service  /  co.altir.util", fill=CDM, font=fnt_xs)
    ry += 64

    # Causal chain
    d.text((p3x+12, ry), "CAUSAL CHAIN", fill=CD, font=fnt_xs)
    ry += 18
    chain = [
        (CAM, "1", "Deploy 20:34 — release/2026.05.20 goes live"),
        (CR,  "2", "findUnifiedEntityMappingInfoByParent returns wrong record"),
        (CR,  "3", "getOtherId() receives wrong mapping — returns ID = 0"),
        (CR,  "4", "XCRM-prod rejects entity_id=0 — STOCK_CODE_010 on every call"),
        (CA,  "5", "Fix deployed 20:55 — PR #355 switches Optional to List"),
    ]
    for col, num, text in chain:
        d.rounded_rectangle([p3x+10, ry, p3x+PW-10, ry+34], radius=4, fill=CCARD, outline=CBR)
        d.rounded_rectangle([p3x+10, ry, p3x+26, ry+34], radius=4, fill=col, outline=col)
        d.text((p3x+15, ry+10), num, fill=(0,0,0) if col==CAM else CW, font=fnt_sm)
        d.text((p3x+32, ry+10), text[:54], fill=CA if col==CA else CD, font=fnt_xs)
        ry += 40

    # Action items
    d.text((p3x+12, ry+4), "RECOMMENDED ACTIONS", fill=CD, font=fnt_xs)
    ry += 22
    actions = [
        (CR,  "URGENT", "Fix already deployed — PR #355. Verify error rate drops."),
        (CAM, "WATCH",  "Monitor entity_id_mapping for duplicate contacts."),
        (CDM, "TODO",   "Add unit tests for duplicate contact scenarios."),
    ]
    for col, badge, text in actions:
        d.rounded_rectangle([p3x+10, ry, p3x+PW-10, ry+30], radius=4, fill=CCARD, outline=CBR)
        bw = int(d.textlength(badge, font=fnt_xs)) + 12
        d.rounded_rectangle([p3x+12, ry+6, p3x+12+bw, ry+24], radius=3,
                             fill=(*col, 40) if len(col)==3 else col, outline=col)
        d.text((p3x+16, ry+9), badge, fill=col, font=fnt_xs)
        d.text((p3x+16+bw, ry+10), text[:46], fill=CD, font=fnt_xs)
        ry += 36

    img.save(path)
    return path


def incident_timeline_strip(slide, y=5.9):
    """Draws the 20:34→20:36→20:48→20:55 timeline bar used on multiple slides."""
    events = [
        (AMBER, "20:34", "Deploy"),
        (RED,   "20:36", "Errors spike"),
        (RED,   "20:48", "Alert raised"),
        (ACCENT,"20:55", "Root cause"),
    ]
    spacing = 2.85
    x0 = 0.55
    # connecting line
    rect(slide, x0 + 0.12, y + 0.1, spacing * 3 + 0.05, 0.03, fill=DIMMER)
    for i, (col, time, event) in enumerate(events):
        x = x0 + i * spacing
        # dot
        rect(slide, x, y, 0.25, 0.25, fill=col)
        label(slide, time,  x - 0.05, y + 0.32, 0.8, 0.25,
              size=9, bold=True, color=col, font=FONT_MONO)
        label(slide, event, x - 0.05, y + 0.58, 1.3, 0.3,
              size=8, color=DIM)


def error_spike_bars(slide, x0, y0, w_total, h_total):
    """Mini bar chart showing baseline vs spike error counts."""
    bars = [
        (950,  DIMMER, "20:34"),
        (980,  DIMMER, "20:35"),
        (2275, RED,    "20:36"),
        (2549, RED,    "20:37"),
        (2800, RED,    "20:38"),
        (3100, RED,    "20:48"),
        (3485, RED,    "20:58"),
    ]
    max_val = 3500
    bw = w_total / (len(bars) * 1.6)
    gap = bw * 0.6
    for i, (val, col, lbl) in enumerate(bars):
        bh = (val / max_val) * h_total
        bx = x0 + i * (bw + gap)
        by = y0 + h_total - bh
        rect(slide, bx, by, bw, bh, fill=col)
        label(slide, lbl, bx - 0.05, y0 + h_total + 0.05, bw + 0.2, 0.2,
              size=6.5, color=DIMMER, font=FONT_MONO)
    # threshold line label
    thresh_y = y0 + h_total - (1000 / max_val) * h_total
    rect(slide, x0, thresh_y, w_total, 0.01,
         fill=RGBColor(0x6B, 0x75, 0x85), line_w=Pt(0.75))
    label(slide, "baseline ~950", x0 + w_total + 0.1, thresh_y - 0.1, 1.2, 0.25,
          size=7, color=DIM)


# ─── Slides ──────────────────────────────────────────────────────────────────

TOTAL = 9

# ── 1. Title ──────────────────────────────────────────────────────────────────
s = add_slide()
slide_bg(s)
s.shapes.add_picture(
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "title_illustration.png"),
    Inches(0), Inches(0), Inches(13.33), Inches(7.5)
)
slide_number(s, 1, TOTAL)
notes(s,
"Yesterday at 20:34, we deployed fn-connect.\n"
"By 20:36, errors were spiking.\n"
"By 21:00, error volume had tripled and was still climbing.\n"
"One engineer spent 88 minutes figuring out what happened.\n"
"Today we're going to show you how to do it in 4.")


# ── 2. The Incident (illustration slide) ──────────────────────────────────────
s = add_slide()
slide_bg(s)

_inc_img = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "prod_incident_illustration.png")
s.shapes.add_picture(_inc_img, Inches(0), Inches(0), Inches(13.33), Inches(7.5))

slide_number(s, 2, TOTAL)
notes(s,
"This is what an incident looks like from the outside.\n\n"
"A deploy fires. Logs start throwing 500s and timeouts. "
"Teams starts buzzing — error rate spikes, latency up, payment timeouts, customers reporting failures.\n\n"
"Four streams of information. All at once. All in different tools.\n\n"
"An engineer has to open all four, read them, correlate the timestamps by hand, "
"form a hypothesis, confirm it with the team.\n\n"
"That's the 88 minutes at the bottom of this slide.")


# ── 3. The Problem ────────────────────────────────────────────────────────────
s = add_slide()
slide_bg(s)
s.shapes.add_picture(
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "problem_illustration.png"),
    Inches(0), Inches(0), Inches(13.33), Inches(7.5)
)
slide_number(s, 3, TOTAL)
notes(s,
"Point to each quadrant as you speak.\n\n"
"Top-left: Loki logs — 12 new errors, all red, payment API timeouts, 500s, database failures.\n"
"Top-right: Grafana — error rate climbing to 24.8%, clearly correlates with the deploy.\n"
"Bottom-left: Teams #prod-alerts — 17 messages, customers reporting failures, P1 declared.\n"
"Bottom-right: GitLab diff — the exact commit that just merged. That's four tabs.\n\n"
"Centre: one engineer. 88 minutes on the clock.\n\n"
"This is the problem. The data was always there. The bottleneck is connecting it by hand.")


# ── 4. What We Built ──────────────────────────────────────────────────────────
s = add_slide()
slide_bg(s)
s.shapes.add_picture(
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "what_we_built_illustration.png"),
    Inches(0), Inches(0), Inches(13.33), Inches(7.5)
)
slide_number(s, 4, TOTAL)
notes(s,
"Walk through top to bottom.\n\n"
"Top row: four sources — Logs (application, system, service), Metrics (time series, SLIs), "
"Teams (alerts, threads, customer context), Diff (deploy diffs, config, infra).\n\n"
"All four converge into GPT-4o — not searched in isolation, correlated simultaneously.\n\n"
"Bottom row: four outputs — Root Cause with exact file and line, Timeline of every event, "
"Insights into why it happened, Actions with URGENT/WATCH/TODO priority.\n\n"
"Notice the Root Cause card already shows EntityIdMappingUtil.java:590 — "
"that's the real answer from the real incident.")


# ── 5. The Process ────────────────────────────────────────────────────────────
s = add_slide()
slide_bg(s)

_proc_img = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "process_illustration.png")
s.shapes.add_picture(_proc_img, Inches(0), Inches(0), Inches(13.33), Inches(7.5))

slide_number(s, 5, TOTAL)
notes(s,
"Walk through left to right.\n\n"
"Logs come in — raw, noisy, hundreds of lines. "
"Deploy marker pins the version that changed. "
"AI Agent correlates all sources simultaneously, builds a causal chain. "
"Post-mortem comes out structured — root cause, timeline, actions.\n\n"
"The data was always available. The bottleneck was the human connecting it. "
"This removes that bottleneck.")


# ── 6. The Solution (illustration) ───────────────────────────────────────────
s = add_slide()
slide_bg(s)

# Full-bleed reference illustration — self-contained, no overlay needed
_sol_img = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "solution_illustration.png")
s.shapes.add_picture(_sol_img, Inches(0), Inches(0), Inches(13.33), Inches(7.5))

slide_number(s, 6, TOTAL)
notes(s,
"This is what the tool looks like when it works.\n\n"
"Left panel — the four data sources loaded and ready.\n"
"Middle panel — eight reasoning steps, all checked off. Each one is a real inference step.\n"
"Right panel — root cause, HIGH confidence, EntityIdMappingUtil.java:590.\n\n"
"The same answer the engineer found in 88 minutes.\n"
"The AI found it in 4.\n\n"
"[Switch to live browser demo now]")


# ── 7. The Answer ─────────────────────────────────────────────────────────────
s = add_slide()
slide_bg(s)
s.shapes.add_picture(
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "answer_illustration.png"),
    Inches(0), Inches(0), Inches(13.33), Inches(7.5)
)
slide_number(s, 7, TOTAL)
notes(s,
"This is the answer. 22 times faster.\n\n"
"Left side — Before, 88 minutes: four overlapping log files, question marks everywhere. "
"Which service? Where did it start? What does this mean? Manual search, context switching, guesswork.\n\n"
"Right side — After, 4 minutes: structured post-mortem, ROOT CAUSE HIGH CONFIDENCE, "
"EntityIdMappingUtil.java:590. Causal chain: Deploy → Wrong record → Entity ID=0 → "
"XCRM rejects → Fix deployed. Actions: Rollback to v1.24.6, Fix deployed in v1.24.8.\n\n"
"Same incident. Same root cause. Same fix. The only difference is 84 minutes.\n\n"
"[Pause on the 22× badge in the centre. Let it land.]")


# ── 8. Impact ─────────────────────────────────────────────────────────────────
s = add_slide()
slide_bg(s)
s.shapes.add_picture(
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "impact_illustration.png"),
    Inches(0), Inches(0), Inches(13.33), Inches(7.5)
)
slide_number(s, 8, TOTAL)
notes(s,
"Four numbers. Let them land before you speak.\n\n"
"88 minutes — that's the manual root cause time on this real incident.\n"
"~4 minutes — that's AI Reckoning on the same incident.\n"
"2.7× — the error rate kept climbing the entire time the investigation was running.\n"
"14 minutes — the gap between deploy and first alert. Silent failure window.\n\n"
"Then the three bullets below:\n"
"Faster MTTR — you spend time fixing, not finding.\n"
"Instant documentation — the report exists the moment the root cause is identified.\n"
"Faster onboarding — new engineers get AI context the first time they face production.\n\n"
"This is what AI assistance looks like in a real engineering workflow.")


# ── 9. Closing ────────────────────────────────────────────────────────────────
s = add_slide()
slide_bg(s)
s.shapes.add_picture(
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "closing_illustration.png"),
    Inches(0), Inches(0), Inches(13.33), Inches(7.5)
)
slide_number(s, 9, TOTAL)
notes(s,
"Every incident like this costs engineering time, customer trust, and sleep.\n"
"The investigation itself doesn't have to.\n\n"
"AI Reckoning turns 88 minutes of manual correlation into a 4-minute report.\n"
"The engineer still makes the decision. The AI does the detective work.\n\n"
"This ran on a real production incident. It'll run on the next one too.\n\n"
"[Pause. Let the 88 min → ~4 min badge land. Then open for questions.]")


# ─── Save ─────────────────────────────────────────────────────────────────────
out = "/Users/dnagboth/Projects/Hackathon/incident-autopsy/AI-Reckoning-Demo.pptx"
prs.save(out)
print(f"Saved: {out}")
print(f"Slides: {len(prs.slides)}")
