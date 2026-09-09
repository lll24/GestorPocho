import base64
import io
from typing import Optional
from PIL import Image

def optimize_base64_image(base64_str: Optional[str], max_size=(1000, 1000), quality=75) -> Optional[str]:
    """Comprime y redimensiona imágenes Base64 antes de persistirlas en SQLite."""
    if not base64_str:
        return None
    try:
        header, data = base64_str.split(",", 1) if "," in base64_str else ("", base64_str)
        img_bytes = base64.b64decode(data)
        img = Image.open(io.BytesIO(img_bytes))
        
        # Convertir imágenes con transparencias o paletas a RGB con fondo blanco para JPEG
        if img.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            mask = img.split()[-1] if "A" in img.getbands() else None
            bg.paste(img, mask=mask)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
            
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        optimized_bytes = buffer.getvalue()
        
        if len(optimized_bytes) < len(img_bytes):
            return f"data:image/jpeg;base64,{base64.b64encode(optimized_bytes).decode('utf-8')}"
        return base64_str
    except Exception:
        return base64_str
