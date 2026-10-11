import os
import io
import zipfile
import tempfile
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlmodel import Session
from sqlalchemy import text

from database import engine, get_session, DATABASE_FILE, UPLOADS_DIR, create_db_and_tables, run_migrations

router = APIRouter(prefix="/api", tags=["backup"])

@router.get("/backup")
def get_backup():
    db_path = DATABASE_FILE
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail=f"Database file not found at {db_path}")

    # Forzar volcado del WAL a la base de datos para asegurar integridad
    try:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA wal_checkpoint(FULL);"))
    except Exception:
        pass

    temp_dir = tempfile.gettempdir()
    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_path = os.path.join(temp_dir, f"gestor_pocho_backup_{date_str}.zip")

    try:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            # 1. Guardar la base de datos SQLite
            zf.write(db_path, arcname="gestor_pocho.db")
            # 2. Guardar todas las imágenes en uploads si existen
            if os.path.exists(UPLOADS_DIR):
                parent_dir = os.path.dirname(UPLOADS_DIR)
                for root, _, files in os.walk(UPLOADS_DIR):
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, parent_dir)
                        zf.write(full_p, arcname=rel_p)

        return FileResponse(
            zip_path, 
            filename=f"gestor_pocho_backup_{date_str}.zip", 
            media_type="application/zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar respaldo completo: {str(e)}")

@router.post("/restore")
def restore_backup(file: UploadFile = File(...), session: Session = Depends(get_session)):
    db_path = DATABASE_FILE
    try:
        content = file.file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo de respaldo: {str(e)}")
        
    session.close()
    engine.dispose()

    # Eliminar posibles archivos de journaling/WAL antiguos para evitar corrupción
    for ext in ["-wal", "-shm"]:
        wal_file = db_path + ext
        if os.path.exists(wal_file):
            try:
                os.remove(wal_file)
            except Exception:
                pass

    try:
        # Detectar si el archivo es un ZIP
        is_zip = content.startswith(b"PK\x03\x04") or (file.filename and file.filename.lower().endswith(".zip"))
        if is_zip:
            with zipfile.ZipFile(io.BytesIO(content), "r") as zf:
                parent_dir = os.path.dirname(UPLOADS_DIR)
                for member in zf.namelist():
                    # Extraer base de datos
                    if member.endswith("gestor_pocho.db"):
                        with open(db_path, "wb") as f:
                            f.write(zf.read(member))
                    # Extraer imágenes a uploads
                    elif "uploads/" in member or "uploads\\" in member:
                        if not member.endswith("/"):
                            clean_rel = member.replace("\\", "/")
                            target_file = os.path.join(parent_dir, clean_rel)
                            os.makedirs(os.path.dirname(target_file), exist_ok=True)
                            with open(target_file, "wb") as f:
                                f.write(zf.read(member))
        else:
            # Archivo SQLite directo (.db legado)
            with open(db_path, "wb") as f:
                f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al restaurar los archivos: {str(e)}")

    # Ejecutar de inmediato la creación de tablas y migraciones sobre la base restaurada
    try:
        create_db_and_tables()
        run_migrations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al migrar la base de datos restaurada: {str(e)}")
        
    return {"message": "Copia de seguridad restaurada exitosamente con base de datos e imágenes."}

@router.post("/maintenance/reset-stock-and-history")
def reset_stock_and_history(session: Session = Depends(get_session)):
    try:
        # 1. Vaciar historial de movimientos de caja
        session.exec(text("DELETE FROM cashmovement"))
        # 2. Vaciar ventas y pagos para arrancar limpios
        session.exec(text("DELETE FROM saleitem"))
        session.exec(text("DELETE FROM salepayment"))
        session.exec(text("DELETE FROM sale"))
        # 3. Poner el stock de todos los productos en 0 (conservando nombres, precios, fotos, categorías)
        session.exec(text("UPDATE product SET stock = 0"))
        session.commit()
        return {
            "status": "success",
            "message": "Historial y ventas eliminados correctamente. El stock de todos los productos se ha establecido en 0."
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al reiniciar historial y stock: {str(e)}")
