from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session
from models import BusinessConfig
from schemas import BusinessConfigUpdate
from utils.network import get_local_ip

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
    config.logo_base64 = config_update.logo_base64
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
