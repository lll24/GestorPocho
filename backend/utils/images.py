import os
import io
import uuid
import base64
from typing import Optional
from PIL import Image

def save_base64_to_disk(
    base64_str: Optional[str],
    target_folder: str,
    prefix: str = "img",
    max_size=(800, 800),
    quality=80
) -> Optional[str]:
    """
    Recibe un string Base64 (o una URL ya existente).
    - Si es nulo o vacío: retorna None.
    - Si ya es una ruta relativa (/uploads/...) o URL externa: la retorna tal cual.
    - Si es Base64: lo optimiza, lo guarda en target_folder como archivo .jpg y retorna '/uploads/<folder>/<filename>'.
    """
    if not base64_str or not isinstance(base64_str, str):
        return None
    
    # Si ya es una ruta web existente, no reprocesar
    if base64_str.startswith("/uploads/") or base64_str.startswith("http://") or base64_str.startswith("https://"):
        return base64_str

    try:
        header, data = base64_str.split(",", 1) if "," in base64_str else ("", base64_str)
        img_bytes = base64.b64decode(data)
        img = Image.open(io.BytesIO(img_bytes))

        # Manejo de transparencias / modos de color
        is_transparent = img.mode in ("RGBA", "LA", "P")
        if prefix.startswith("logo") and is_transparent:
            # Para logos podemos conservar formato PNG si tiene transparencia
            format_ext = "png"
            save_format = "PNG"
            if img.mode == "P":
                img = img.convert("RGBA")
        else:
            format_ext = "jpg"
            save_format = "JPEG"
            if is_transparent:
                bg = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                mask = img.split()[-1] if "A" in img.getbands() else None
                bg.paste(img, mask=mask)
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")

        # Redimensionar conservando proporción si excede max_size
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Generar nombre de archivo único
        unique_suffix = uuid.uuid4().hex[:10]
        filename = f"{prefix}_{unique_suffix}.{format_ext}"
        os.makedirs(target_folder, exist_ok=True)
        file_path = os.path.join(target_folder, filename)

        # Guardar en disco
        if save_format == "JPEG":
            img.save(file_path, format=save_format, quality=quality, optimize=True)
        else:
            img.save(file_path, format=save_format, optimize=True)

        # Construir URL relativa servida por FastAPI
        folder_name = os.path.basename(os.path.normpath(target_folder))
        return f"/uploads/{folder_name}/{filename}"

    except Exception as e:
        print(f"[ERROR] Error al guardar imagen en disco: {e}")
        return None

def delete_disk_file(relative_path: Optional[str], base_uploads_dir: str):
    """Elimina del disco un archivo dentro de la carpeta uploads si existe."""
    if not relative_path or not isinstance(relative_path, str) or not relative_path.startswith("/uploads/"):
        return
    try:
        clean_rel = relative_path.replace("/uploads/", "").replace("/", os.sep)
        full_path = os.path.join(base_uploads_dir, clean_rel)
        if os.path.exists(full_path):
            os.remove(full_path)
    except Exception as e:
        print(f"[WARN] No se pudo eliminar archivo {relative_path}: {e}")

def optimize_base64_image(base64_str: Optional[str], max_size=(1000, 1000), quality=75) -> Optional[str]:
    """Compatibilidad hacia atrás por si se requiere compresión directa en memoria."""
    if not base64_str:
        return None
    try:
        header, data = base64_str.split(",", 1) if "," in base64_str else ("", base64_str)
        img_bytes = base64.b64decode(data)
        img = Image.open(io.BytesIO(img_bytes))
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
