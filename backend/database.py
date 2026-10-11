from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy import text, event
from decimal import Decimal
from datetime import datetime
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

# Rutas persistentes de almacenamiento de imágenes
UPLOADS_DIR = os.path.join(DATABASE_DIR, "uploads")
PRODUCTS_DIR = os.path.join(UPLOADS_DIR, "products")
CAPTURES_DIR = os.path.join(UPLOADS_DIR, "captures")
BRANDING_DIR = os.path.join(UPLOADS_DIR, "branding")

for folder in [UPLOADS_DIR, PRODUCTS_DIR, CAPTURES_DIR, BRANDING_DIR]:
    os.makedirs(folder, exist_ok=True)

# connect_args con timeout de 30s y check_same_thread=False
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False, "timeout": 30}
)

@event.listens_for(engine, "connect")
def configure_sqlite_connection(dbapi_connection, connection_record):
    """Configura cada conexión para modo WAL, timeout y velocidad óptima."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA synchronous = NORMAL;")
    cursor.execute("PRAGMA busy_timeout = 30000;")  # Espera hasta 30s si hay otra escritura en curso
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.close()

def run_migrations():
    """Verifica y añade de forma segura columnas a tablas SQLite existentes para evitar OperationalError."""
    with engine.connect() as conn:
        # Activar modo WAL (Write-Ahead Logging) para alta concurrencia
        try:
            conn.execute(text("PRAGMA journal_mode=WAL;"))
        except Exception:
            pass

        # 1. Columnas en tabla product
        product_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(product)")).fetchall()]
        if product_cols:
            if "category_id" not in product_cols:
                conn.execute(text("ALTER TABLE product ADD COLUMN category_id INTEGER"))
            if "subcategory_id" not in product_cols:
                conn.execute(text("ALTER TABLE product ADD COLUMN subcategory_id INTEGER"))
            if "category_name" not in product_cols:
                conn.execute(text("ALTER TABLE product ADD COLUMN category_name TEXT DEFAULT 'Ropa'"))
            if "subcategory_name" not in product_cols:
                conn.execute(text("ALTER TABLE product ADD COLUMN subcategory_name TEXT DEFAULT 'Camisas'"))
            if "is_for_sale" not in product_cols:
                conn.execute(text("ALTER TABLE product ADD COLUMN is_for_sale BOOLEAN DEFAULT 1"))
        
        # 2. Columnas en tabla sale
        sale_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(sale)")).fetchall()]
        if sale_cols:
            if "customer_id" not in sale_cols:
                conn.execute(text("ALTER TABLE sale ADD COLUMN customer_id INTEGER"))
            if "payment_status" not in sale_cols:
                conn.execute(text("ALTER TABLE sale ADD COLUMN payment_status TEXT DEFAULT 'pagado'"))
            if "amount_paid" not in sale_cols:
                conn.execute(text("ALTER TABLE sale ADD COLUMN amount_paid NUMERIC DEFAULT 0.00"))
                conn.execute(text("UPDATE sale SET amount_paid = total_revenue WHERE payment_status = 'pagado'"))
            if "amount_pending" not in sale_cols:
                conn.execute(text("ALTER TABLE sale ADD COLUMN amount_pending NUMERIC DEFAULT 0.00"))
            if "cancel_reason" not in sale_cols:
                conn.execute(text("ALTER TABLE sale ADD COLUMN cancel_reason TEXT"))
        
        # 3. Columnas en tabla cashmovement
        cash_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(cashmovement)")).fetchall()]
        if cash_cols:
            if "quantity" not in cash_cols:
                conn.execute(text("ALTER TABLE cashmovement ADD COLUMN quantity INTEGER"))
            if "unit_cost" not in cash_cols:
                conn.execute(text("ALTER TABLE cashmovement ADD COLUMN unit_cost NUMERIC"))
        
        conn.commit()

def migrate_base64_to_disk():
    """Migra imágenes Base64 heredadas en SQLite hacia archivos físicos en uploads y compacta la base."""
    from utils.images import save_base64_to_disk
    from models import Product, Sale, BusinessConfig
    
    has_changes = False
    with Session(engine) as session:
        # 1. Migrar productos
        products = session.exec(select(Product)).all()
        for prod in products:
            if prod.image_base64 and not prod.image_base64.startswith("/uploads/"):
                saved_path = save_base64_to_disk(prod.image_base64, PRODUCTS_DIR, prefix=f"prod_{prod.id}")
                if saved_path:
                    prod.image_base64 = saved_path
                    session.add(prod)
                    has_changes = True

        # 2. Migrar capturas de ventas
        sales = session.exec(select(Sale)).all()
        for sale in sales:
            if sale.payment_capture_base64 and not sale.payment_capture_base64.startswith("/uploads/"):
                saved_path = save_base64_to_disk(sale.payment_capture_base64, CAPTURES_DIR, prefix=f"sale_{sale.id}", max_size=(1200, 1200))
                if saved_path:
                    sale.payment_capture_base64 = saved_path
                    session.add(sale)
                    has_changes = True

        # 3. Migrar logo del negocio
        config = session.get(BusinessConfig, 1)
        if config and config.logo_base64 and not config.logo_base64.startswith("/uploads/"):
            saved_path = save_base64_to_disk(config.logo_base64, BRANDING_DIR, prefix="logo")
            if saved_path:
                config.logo_base64 = saved_path
                session.add(config)
                has_changes = True

        if has_changes:
            session.commit()
            print("[INFO] Migración de imágenes Base64 a archivos en disco completada exitosamente.")

    if has_changes:
        try:
            with engine.connect() as conn:
                conn.execute(text("VACUUM;"))
        except Exception:
            pass

def create_db_and_tables():
    from models import BusinessConfig, Category, Subcategory
    SQLModel.metadata.create_all(engine)
    run_migrations()
    
    with Session(engine) as session:
        # Seed default BusinessConfig if not present
        config = session.get(BusinessConfig, 1)
        if not config:
            default_config = BusinessConfig(id=1)
            session.add(default_config)
            session.commit()
            
        # Seed default Categories and Subcategories if table is empty
        existing_cat = session.exec(select(Category)).first()
        if not existing_cat:
            defaults = [
                ("Ropa", True, ["Camisas", "Pantalones", "Zapatos"]),
                ("Accesorios", True, ["Collares", "Pulseras", "Reloj", "Gorras"]),
                ("Gestión", False, ["Bolsas y Empaques", "Marketing y Contenido", "Papelería y Oficina"])
            ]
            for cat_name, is_sale, subs in defaults:
                cat = Category(name=cat_name, is_for_sale=is_sale)
                session.add(cat)
                session.commit()
                session.refresh(cat)
                for sub_name in subs:
                    sub = Subcategory(name=sub_name, category_id=cat.id)
                    session.add(sub)
            session.commit()

        # Backfill initial cash movements if CashMovement table is empty and products/sales exist
        from models import CashMovement, Product, Sale
        existing_movements = session.exec(select(CashMovement)).first()
        if not existing_movements:
            existing_products = session.exec(select(Product)).all()
            for prod in existing_products:
                if prod.stock > 0:
                    unit_cost = prod.cost_base * (Decimal("1") + prod.cost_iva / Decimal("100")) + prod.cost_shipping
                    total_purchase = prod.stock * unit_cost
                    if total_purchase > Decimal("0.00"):
                        session.add(CashMovement(
                            type="compra_inventario",
                            amount=total_purchase,
                            direction="out",
                            description=f"Inversión inicial: {prod.name} ({prod.stock} unid.)",
                            reference_id=prod.id,
                            date=datetime.now()
                        ))
            existing_sales = session.exec(select(Sale)).all()
            for sale in existing_sales:
                if sale.amount_paid > Decimal("0.00"):
                    session.add(CashMovement(
                        type="ingreso_venta",
                        amount=sale.amount_paid,
                        direction="in",
                        description=f"Cobro venta #{sale.id} ({sale.payment_method})",
                        reference_id=sale.id,
                        date=sale.date
                    ))
            session.commit()

    # Ejecutar migración de imágenes si existen Base64 heredados
    migrate_base64_to_disk()

def get_session():
    with Session(engine) as session:
        yield session

def checkpoint_wal():
    """Vuelca y compacta los registros de la bitacora WAL hacia el archivo principal de SQLite."""
    try:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA wal_checkpoint(TRUNCATE);"))
    except Exception:
        pass
