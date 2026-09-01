from sqlmodel import SQLModel, create_engine, Session
import os
import sys

def get_base_dir():
    # Si corre como ejecutable empaquetado (.exe de PyInstaller)
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    # Si corre como script normal de Python
    return os.path.dirname(os.path.abspath(__file__))

DATABASE_DIR = get_base_dir()
DATABASE_FILE = os.path.join(DATABASE_DIR, "gestor_pocho.db")
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

# connect_args={"check_same_thread": False} is required for SQLite and FastAPI async endpoints
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    # Seed default BusinessConfig if not present
    from models import BusinessConfig
    with Session(engine) as session:
        config = session.get(BusinessConfig, 1)
        if not config:
            default_config = BusinessConfig(id=1)
            session.add(default_config)
            session.commit()

def get_session():
    with Session(engine) as session:
        yield session
