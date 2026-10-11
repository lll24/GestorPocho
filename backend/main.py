import os
import sys
import threading
import webbrowser
import time as time_module
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from database import create_db_and_tables, UPLOADS_DIR, checkpoint_wal
from routers import (
    config as config_router,
    categories as categories_router,
    customers as customers_router,
    products as products_router,
    sales as sales_router,
    cash as cash_router,
    stats as stats_router,
    backup as backup_router
)

# FastAPI initialization
app = FastAPI(title="Gestor Pocho Backend")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits access from local network devices
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.on_event("shutdown")
def on_shutdown():
    checkpoint_wal()

# Register modular API routers
app.include_router(config_router.router)
app.include_router(categories_router.router)
app.include_router(customers_router.router)
app.include_router(products_router.router)
app.include_router(sales_router.router)
app.include_router(cash_router.router)
app.include_router(stats_router.router)
app.include_router(backup_router.router)

# --- Serve Static Uploads (Product photos, captures, branding) ---
if os.path.exists(UPLOADS_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- Serve Frontend Production Build ---
def resolve_frontend_dist():
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        bundle_dist = os.path.join(sys._MEIPASS, "frontend", "dist")
        if os.path.exists(bundle_dist):
            return bundle_dist

    parent_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
    if os.path.exists(parent_dist):
        return parent_dist

    cwd_dist = os.path.abspath(os.path.join("frontend", "dist"))
    if os.path.exists(cwd_dist):
        return cwd_dist

    return parent_dist

frontend_dist = resolve_frontend_dist()

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend build files missing. Please run 'npm run build'."}

if __name__ == "__main__":
    def open_browser():
        time_module.sleep(1.5)
        webbrowser.open("http://localhost:8000")

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8000)
