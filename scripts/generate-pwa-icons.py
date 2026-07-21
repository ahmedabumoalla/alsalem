from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "public" / "icons"
ICONS.mkdir(parents=True, exist_ok=True)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def create_icon(size: int, maskable: bool = False) -> Image.Image:
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGB", (canvas_size, canvas_size), "#183B36")
    draw = ImageDraw.Draw(image)
    inset = int(canvas_size * (0.18 if maskable else 0.11))
    radius = int(canvas_size * 0.16)
    draw.rounded_rectangle(
        (inset, inset, canvas_size - inset, canvas_size - inset),
        radius=radius,
        fill="#2D665C",
        outline="#D9A441",
        width=max(2, int(canvas_size * 0.025)),
    )
    block_w = int(canvas_size * 0.16)
    block_h = int(canvas_size * 0.09)
    start_x = int(canvas_size * 0.27)
    start_y = int(canvas_size * 0.25)
    for row in range(2):
        for column in range(3):
            x = start_x + column * int(block_w * 0.92) + (row * block_w // 3)
            y = start_y + row * int(block_h * 1.15)
            draw.rounded_rectangle(
                (x, y, x + block_w, y + block_h),
                radius=max(2, block_h // 5),
                fill="#F7F8F5",
            )
    text = "FS"
    text_font = font(int(canvas_size * 0.24))
    box = draw.textbbox((0, 0), text, font=text_font)
    text_w = box[2] - box[0]
    draw.text(
        ((canvas_size - text_w) / 2, canvas_size * 0.49),
        text,
        font=text_font,
        fill="#FFFFFF",
    )
    return image.resize((size, size), Image.Resampling.LANCZOS)


create_icon(192).save(ICONS / "icon-192.png", optimize=True)
create_icon(512).save(ICONS / "icon-512.png", optimize=True)
create_icon(512, maskable=True).save(ICONS / "icon-maskable-512.png", optimize=True)
create_icon(180).save(ROOT / "public" / "apple-touch-icon.png", optimize=True)
