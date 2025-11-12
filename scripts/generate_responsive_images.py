#!/usr/bin/env python3
"""Gera versões webp otimizadas das fotos principais."""
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = BASE_DIR / "images" / "Images"
OUTPUT_DIR = BASE_DIR / "images" / "optimized"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET_WIDTHS = [480, 960, 1440]
QUALITY = 82

for source_path in sorted(SOURCE_DIR.glob("photo-*.jpg")):
    image = Image.open(source_path).convert("RGB")
    src_width, src_height = image.size
    base_name = source_path.stem

    for width in TARGET_WIDTHS:
        if src_width <= width:
            target = image.copy()
        else:
            ratio = width / float(src_width)
            height = int(src_height * ratio)
            target = image.resize((width, height), Image.LANCZOS)
        output_path = OUTPUT_DIR / f"{base_name}-{width}.webp"
        target.save(output_path, format="WEBP", quality=QUALITY, method=6)
        target.close()
        print(f"Gerado {output_path.relative_to(BASE_DIR)}")

    image.close()
