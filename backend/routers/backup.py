import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlmodel import Session
from sqlalchemy import text

from database import engine, get_session, DATABASE_FILE, create_db_and_tables, run_migrations

router = APIRouter(prefix="/api", tags=["backup"])

@router.get("/backup")
def get_backup():
    db_path = DATABASE_FILE
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail=f"Database file not found at {db_path}")
    return FileResponse(db_path, filename="gestor_pocho_backup.db", media_type="application/x-sqlite3")

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
        with open(db_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir la base de datos: {str(e)}")

    # Ejecutar de inmediato la creación de tablas y migraciones sobre la base restaurada
    try:
        create_db_and_tables()
        run_migrations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al migrar la base de datos restaurada: {str(e)}")
        
    return {"message": "Base de datos restaurada y actualizada exitosamente"}

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
