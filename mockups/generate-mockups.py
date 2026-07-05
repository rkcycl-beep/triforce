from PIL import Image, ImageDraw, ImageFont
import os

# Hebrew renders RTL correctly with Raanana; Latin text uses Helvetica.
HEBREW_FONT = "/System/Library/Fonts/Supplemental/Raanana.ttc"
LATIN_FONT = "/System/Library/Fonts/Helvetica.ttc"

def get_font(size, bold=False):
    try:
        return ImageFont.truetype(HEBREW_FONT, size)
    except Exception:
        return ImageFont.load_default()

def get_latin_font(size, bold=False):
    try:
        return ImageFont.truetype(LATIN_FONT, size)
    except Exception:
        return ImageFont.load_default()

WIDTH, HEIGHT = 390, 844

def create_entry_gate():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#f8faf9")
    draw = ImageDraw.Draw(img)

    # Soft background tint
    for y in range(HEIGHT):
        color = (248, 250, 249) if y < HEIGHT // 2 else (238, 244, 241)
        draw.line([(0, y), (WIDTH, y)], fill=color)

    logo_font = get_latin_font(48, bold=True)
    main_title_font = get_font(32, bold=True)
    subtitle_font = get_font(18)
    card_title_font = get_font(34, bold=True)
    card_desc_font = get_font(16)
    badge_font = get_font(14, bold=True)
    note_font = get_font(13)

    # Logo + main identity
    draw.text((WIDTH // 2, 90), "TriForce", fill="#16a34a", font=logo_font, anchor="mm")
    draw.text((WIDTH // 2, 145), "Sports App", fill="#1f2937", font=get_latin_font(28, bold=True), anchor="mm")
    draw.text((WIDTH // 2, 188), "בחרו את המערכת המתאימה לכם", fill="#6b7280", font=subtitle_font, anchor="mm")

    # Helper: draw a large colorful card
    def draw_card(y, h, title, desc, badge, gradient_colors):
        c1, c2 = gradient_colors
        # Gradient-ish fill via horizontal stripes
        for yy in range(y, y + h):
            ratio = (yy - y) / h
            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)
            draw.rounded_rectangle([22, yy, WIDTH - 22, yy + 1], radius=0, fill=(r, g, b))
        # Re-draw rounded rect outline for clean corners
        draw.rounded_rectangle([22, y, WIDTH - 22, y + h], radius=28, fill=None, outline=(255, 255, 255, 60), width=2)
        # Title (large, white)
        draw.text((WIDTH - 32, y + 28), title, fill="white", font=card_title_font, anchor="rm")
        # Description
        draw.text((WIDTH - 32, y + 70), desc, fill="#f0fdf4", font=card_desc_font, anchor="rm")
        # Badge: white pill with dark text
        badge_w = 130
        draw.rounded_rectangle([32, y + h - 42, 32 + badge_w, y + h - 14], radius=12, fill="white")
        draw.text((32 + badge_w // 2, y + h - 28), badge, fill="#1f2937", font=badge_font, anchor="mm")
        # Arrow
        draw.text((40, y + 28), "<", fill="white", font=get_latin_font(26), anchor="lm")

    # Card 1: Athlete (green gradient)
    draw_card(
        y=235,
        h=125,
        title="ספורטאי",
        desc="האימונים, האתגרים, החברים וההישגים שלי",
        badge="מערכת ספורטאים",
        gradient_colors=((34, 197, 94), (22, 163, 74)),
    )

    # Card 2: Personal Trainer (blue gradient)
    draw_card(
        y=375,
        h=125,
        title="מאמן אישי",
        desc="מעקב אישי אחר מתאמנים ואתגרים אחד על אחד",
        badge="מערכת מאמנים",
        gradient_colors=((59, 130, 246), (37, 99, 235)),
    )

    # Card 3: Team Trainer (indigo gradient)
    draw_card(
        y=515,
        h=125,
        title="מאמן קבוצה",
        desc="ניהול קבוצות, ליגות, אתגרים וסטטיסטיקות",
        badge="מערכת מאמנים",
        gradient_colors=((99, 102, 241), (79, 70, 229)),
    )

    # Note
    note = "ניתן להיכנס גם כספורטאי וגם כמאמן, אך כל כניסה מחייבת בחירה בפתח. המעבר בין תפקידים מתבצע רק דרך יציאה ובחירה מחדש."
    words = note.split()
    lines = []
    line = ""
    for word in words:
        if len(line) + len(word) < 36:
            line += word + " "
        else:
            lines.append(line.strip())
            line = word + " "
    if line:
        lines.append(line.strip())
    y = 690
    for line in lines:
        draw.text((WIDTH // 2, y), line, fill="#9ca3af", font=note_font, anchor="mm")
        y += 20

    return img

def create_athlete_gate():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#f8faf9")
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, WIDTH, 80], fill="white")
    draw.text((WIDTH - 58, 40), "TriForce", fill="#16a34a", font=get_latin_font(24, bold=True), anchor="rm")
    draw.rounded_rectangle([20, 30, 88, 54], radius=12, fill="#dcfce7")
    draw.text((54, 42), "מתאמן", fill="#166534", font=get_font(13, bold=True), anchor="mm")
    draw.ellipse([340, 28, 374, 62], fill="#f3f4f6")
    draw.text((357, 45), "<", fill="#6b7280", font=get_latin_font(18), anchor="mm")

    y = 110
    draw.text((24, y), "בוקר טוב,", fill="#6b7280", font=get_font(20), anchor="lm")
    y += 42
    draw.text((24, y), "רון", fill="#1f2937", font=get_font(36, bold=True), anchor="lm")

    y += 65
    draw.rounded_rectangle([20, y, WIDTH - 20, y + 72], radius=20, fill="#dcfce7")
    draw.ellipse([42, y + 24, 66, y + 48], fill="#16a34a")
    draw.text((82, y + 36), "אתגר ריצת 5 קמ פעיל  •  קצב יעד 5:30 דק/קמ", fill="#166534", font=get_font(16), anchor="lm")

    y += 105
    draw.text((24, y), "המרחב שלי", fill="#9ca3af", font=get_font(16, bold=True), anchor="lm")

    cubes = [
        ("הבית שלי", "#22c55e"),
        ("חברים", "#3b82f6"),
        ("אתגרים", "#f97316"),
        ("השוואה", "#a855f7"),
        ("היסטוריה", "#ec4899"),
        ("קבוצות", "#14b8a6"),
        ("אירועים", "#eab308"),
        ("הודעות", "#22c55e"),
    ]

    start_y = y + 42
    gap = 14
    cube_w = (WIDTH - 48 - gap) // 2
    cube_h = cube_w
    cube_label_font = get_font(18, bold=True)

    for i, (label, c1) in enumerate(cubes):
        col = i % 2
        row = i // 2
        x = 24 + col * (cube_w + gap)
        cy = start_y + row * (cube_h + gap)
        draw.rounded_rectangle([x, cy, x + cube_w, cy + cube_h], radius=22, fill=c1)
        draw.text((x + 18, cy + cube_h - 18), label, fill="white", font=cube_label_font, anchor="lm")

    nav_y = HEIGHT - 76
    draw.rectangle([0, nav_y, WIDTH, HEIGHT], fill="white")
    draw.line([0, nav_y, WIDTH, nav_y], fill="#e5e7eb", width=1)
    nav_items = ["בית", "חברים", "היסטוריה", "אתגרים", "פרופיל"]
    step = WIDTH / len(nav_items)
    nav_label_font = get_font(13, bold=True)
    for i, label in enumerate(nav_items):
        cx = step * i + step / 2
        color = "#16a34a" if i == 0 else "#9ca3af"
        draw.text((cx, nav_y + 36), label, fill=color, font=nav_label_font, anchor="mm")

    return img

def create_coach_gate():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#f8faf9")
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, WIDTH, 80], fill="white")
    draw.text((WIDTH - 58, 40), "TriForce Coach", fill="#2563eb", font=get_latin_font(20, bold=True), anchor="rm")
    draw.rounded_rectangle([20, 30, 82, 54], radius=12, fill="#dbeafe")
    draw.text((51, 42), "מאמן", fill="#1e40af", font=get_font(13, bold=True), anchor="mm")
    draw.ellipse([340, 28, 374, 62], fill="#f3f4f6")
    draw.text((357, 45), "<", fill="#6b7280", font=get_latin_font(18), anchor="mm")

    y = 110
    draw.text((24, y), "בוקר טוב,", fill="#6b7280", font=get_font(20), anchor="lm")
    y += 42
    draw.text((24, y), "Coach Dan", fill="#1f2937", font=get_latin_font(32, bold=True), anchor="lm")

    y += 65
    stats = [("38", "מתאמנים"), ("4", "קבוצות"), ("2", "אתגרים פעילים")]
    card_w = (WIDTH - 48 - 24) // 3
    for i, (value, label) in enumerate(stats):
        x = 24 + i * (card_w + 12)
        draw.rounded_rectangle([x, y, x + card_w, y + 92], radius=20, fill="white")
        draw.text((x + card_w // 2, y + 34), value, fill="#2563eb", font=get_latin_font(30, bold=True), anchor="mm")
        draw.text((x + card_w // 2, y + 64), label, fill="#6b7280", font=get_font(14), anchor="mm")

    y += 120
    draw.text((24, y), "ניהול", fill="#9ca3af", font=get_font(16, bold=True), anchor="lm")

    cubes = [
        ("מתאמנים", "#3b82f6"),
        ("אתגרים", "#f97316"),
        ("הודעות", "#6366f1"),
        ("אירועים", "#a855f7"),
        ("סטטיסטיקות", "#ec4899"),
        ("קבוצות", "#14b8a6"),
        ("חברים", "#22c55e"),
        ("הגדרות", "#3b82f6"),
    ]

    start_y = y + 42
    gap = 14
    cube_w = (WIDTH - 48 - gap) // 2
    cube_h = cube_w
    cube_label_font = get_font(18, bold=True)

    for i, (label, c1) in enumerate(cubes):
        col = i % 2
        row = i // 2
        x = 24 + col * (cube_w + gap)
        cy = start_y + row * (cube_h + gap)
        draw.rounded_rectangle([x, cy, x + cube_w, cy + cube_h], radius=22, fill=c1)
        draw.text((x + 18, cy + cube_h - 18), label, fill="white", font=cube_label_font, anchor="lm")

    nav_y = HEIGHT - 76
    draw.rectangle([0, nav_y, WIDTH, HEIGHT], fill="white")
    draw.line([0, nav_y, WIDTH, nav_y], fill="#e5e7eb", width=1)
    nav_items = ["בית", "מתאמנים", "אתגרים", "קבוצות", "הגדרות"]
    step = WIDTH / len(nav_items)
    nav_label_font = get_font(13, bold=True)
    for i, label in enumerate(nav_items):
        cx = step * i + step / 2
        color = "#2563eb" if i == 0 else "#9ca3af"
        draw.text((cx, nav_y + 36), label, fill=color, font=nav_label_font, anchor="mm")

    return img

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    create_entry_gate().save(os.path.join(out_dir, "entry-gate.png"))
    create_athlete_gate().save(os.path.join(out_dir, "athlete-opening-gate.png"))
    create_coach_gate().save(os.path.join(out_dir, "coach-opening-gate.png"))
    print("Mockups generated:", out_dir)
