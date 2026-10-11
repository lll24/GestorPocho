from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session, BRANDING_DIR, UPLOADS_DIR
from models import BusinessConfig
from schemas import BusinessConfigUpdate
from utils.network import get_local_ip
from utils.images import save_base64_to_disk, delete_disk_file

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("")
def get_config(session: Session = Depends(get_session)):
    config = session.get(BusinessConfig, 1)
    if not config:
        config = BusinessConfig(id=1)
        session.add(config)
        session.commit()
        session.refresh(config)
    return {
        "id": config.id,
        "name": config.name,
        "logo_base64": config.logo_base64,
        "color_primary": config.color_primary,
        "theme": config.theme,
        "dollar_rate": float(config.dollar_rate),
        "local_ip": get_local_ip()
    }

@router.put("")
def update_config(config_update: BusinessConfigUpdate, session: Session = Depends(get_session)):
    config = session.get(BusinessConfig, 1)
    if not config:
        config = BusinessConfig(id=1)
    config.name = config_update.name
    
    # Manejar cambio de logo
    if config_update.logo_base64 != config.logo_base64:
        if config.logo_base64 and config.logo_base64.startswith("/uploads/"):
            delete_disk_file(config.logo_base64, UPLOADS_DIR)
        if config_update.logo_base64:
            config.logo_base64 = save_base64_to_disk(
                config_update.logo_base64,
                BRANDING_DIR,
                prefix="logo",
                max_size=(600, 600),
                quality=85
            )
        else:
            config.logo_base64 = None

    config.color_primary = config_update.color_primary
    config.theme = config_update.theme
    config.dollar_rate = config_update.dollar_rate
    session.add(config)
    session.commit()
    session.refresh(config)
    return {
        "id": config.id,
        "name": config.name,
        "logo_base64": config.logo_base64,
        "color_primary": config.color_primary,
        "theme": config.theme,
        "dollar_rate": float(config.dollar_rate)
    }
