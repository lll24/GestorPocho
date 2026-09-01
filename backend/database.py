from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy import text
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

# connect_args={"check_same_thread": False} is required for SQLite and FastAPI async endpoints
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def run_migrations():
    """Verifica y añade de forma segura columnas a tablas SQLite existentes para evitar OperationalError."""
    with engine.connect() as conn:
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
        
        conn.commit()

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

def get_session():
    with Session(engine) as session:
        yield session
