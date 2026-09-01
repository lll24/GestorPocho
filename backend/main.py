import base64
import io
import os
import sys
import tempfile
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlmodel import Session, select
from decimal import Decimal
from pydantic import BaseModel
from fpdf import FPDF
from PIL import Image

from database import engine, create_db_and_tables, get_session, DATABASE_FILE
from models import BusinessConfig, Product, Sale, SaleItem, Category, Subcategory, Customer, SalePayment, CashMovement

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

# --- Schemas ---
class BusinessConfigUpdate(BaseModel):
    name: str
    logo_base64: Optional[str] = None
    color_primary: str
    theme: str
    dollar_rate: Decimal

class CategoryCreate(BaseModel):
    name: str
    is_for_sale: bool = True

class SubcategoryCreate(BaseModel):
    name: str

class CustomerCreateUpdate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ProductCreateUpdate(BaseModel):
    name: str
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    category_name: Optional[str] = "Ropa"
    subcategory_name: Optional[str] = "Camisas"
    is_for_sale: bool = True
    cost_base: Decimal
    cost_iva: Decimal
    cost_shipping: Decimal
    sale_price: Decimal
    sale_extra: Decimal
    stock: int
    image_base64: Optional[str] = None

class SaleItemRequest(BaseModel):
    product_id: int
    quantity: int

class SalePaymentCreate(BaseModel):
    amount: Decimal
    payment_method: str = "divisas"
    payment_reference: Optional[str] = None
    notes: Optional[str] = None

class CashWithdrawalCreate(BaseModel):
    amount: Decimal
    notes: Optional[str] = None

class CashDepositCreate(BaseModel):
    amount: Decimal
    notes: Optional[str] = None

class SaleCreate(BaseModel):
    items: List[SaleItemRequest]
    customer_id: Optional[int] = None
    client_name: Optional[str] = None
    payment_method: str = "divisas"  # divisas, pagomovil, transferencia, binance
    payment_status: str = "pagado"   # pagado, parcial, fiao
    initial_payment: Decimal = Decimal("0.00")
    payment_reference: Optional[str] = None
    payment_capture_base64: Optional[str] = None
    delivery_cost: Decimal = Decimal("0.00")

# --- Image Optimization Helper ---
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

# --- API Endpoints ---

# 1. Configuración de Marca Blanca
@app.get("/api/config")
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
        "dollar_rate": float(config.dollar_rate)
    }

@app.put("/api/config")
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

# 2. Categorías y Subcategorías Dinámicas
@app.get("/api/categories")
def get_categories(session: Session = Depends(get_session)):
    categories = session.exec(select(Category).order_by(Category.id.asc())).all()
    result = []
    for cat in categories:
        result.append({
            "id": cat.id,
            "name": cat.name,
            "is_for_sale": cat.is_for_sale,
            "subcategories": [{"id": sub.id, "name": sub.name} for sub in cat.subcategories]
        })
    return result

@app.post("/api/categories")
def create_category(cat_data: CategoryCreate, session: Session = Depends(get_session)):
    cat = Category(name=cat_data.name.strip(), is_for_sale=cat_data.is_for_sale)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return {
        "id": cat.id,
        "name": cat.name,
        "is_for_sale": cat.is_for_sale,
        "subcategories": []
    }

@app.post("/api/categories/{category_id}/subcategories")
def create_subcategory(category_id: int, sub_data: SubcategoryCreate, session: Session = Depends(get_session)):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    sub = Subcategory(name=sub_data.name.strip(), category_id=category_id)
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return {"id": sub.id, "name": sub.name, "category_id": sub.category_id}

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session)):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    session.delete(cat)
    session.commit()
    return {"status": "success", "message": "Categoría eliminada"}

@app.delete("/api/subcategories/{subcategory_id}")
def delete_subcategory(subcategory_id: int, session: Session = Depends(get_session)):
    sub = session.get(Subcategory, subcategory_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
    session.delete(sub)
    session.commit()
    return {"status": "success", "message": "Subcategoría eliminada"}

# 3. CRUD Clientes y Cuentas por Cobrar
@app.get("/api/customers")
def get_customers(session: Session = Depends(get_session)):
    customers = session.exec(select(Customer).order_by(Customer.name.asc())).all()
    result = []
    for c in customers:
        sales = c.sales
        total_spent = sum((s.total_revenue for s in sales), Decimal("0.00"))
        total_debt = sum((s.amount_pending for s in sales), Decimal("0.00"))
        result.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "notes": c.notes,
            "created_at": c.created_at,
            "sales_count": len(sales),
            "total_spent": float(total_spent),
            "total_debt": float(total_debt)
        })
    return result

@app.post("/api/customers", response_model=Customer)
def create_customer(customer_data: CustomerCreateUpdate, session: Session = Depends(get_session)):
    customer = Customer(**customer_data.model_dump())
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer

@app.get("/api/customers/{customer_id}")
def get_customer_detail(customer_id: int, session: Session = Depends(get_session)):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    sales_history = []
    total_spent = Decimal("0.00")
    total_debt = Decimal("0.00")
    
    for s in customer.sales:
        total_spent += s.total_revenue
        total_debt += s.amount_pending
        items = []
        for item in s.items:
            items.append({
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else "Producto Eliminado",
                "quantity": item.quantity,
                "unit_sale_price": float(item.unit_sale_price),
                "subtotal": float(item.quantity * item.unit_sale_price)
            })
        payments = []
        for p in s.payments:
            payments.append({
                "id": p.id,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_reference": p.payment_reference,
                "date": p.date,
                "notes": p.notes
            })
        sales_history.append({
            "id": s.id,
            "date": s.date,
            "total_revenue": float(s.total_revenue),
            "payment_status": s.payment_status,
            "amount_paid": float(s.amount_paid),
            "amount_pending": float(s.amount_pending),
            "payment_method": s.payment_method,
            "payment_reference": s.payment_reference,
            "dollar_rate": float(s.dollar_rate),
            "items": items,
            "payments": payments
        })
        
    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "notes": customer.notes,
            "created_at": customer.created_at
        },
        "metrics": {
            "total_spent": float(total_spent),
            "total_debt": float(total_debt),
            "sales_count": len(customer.sales)
        },
        "sales": sales_history
    }

@app.put("/api/customers/{customer_id}", response_model=Customer)
def update_customer(customer_id: int, customer_data: CustomerCreateUpdate, session: Session = Depends(get_session)):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for key, val in customer_data.model_dump().items():
        setattr(customer, key, val)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer

@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, session: Session = Depends(get_session)):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    session.delete(customer)
    session.commit()
    return {"status": "success", "message": "Cliente eliminado"}

# 4. CRUD Productos / Inventario
@app.get("/api/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    return session.exec(select(Product)).all()

@app.post("/api/products", response_model=Product)
def create_product(product_data: ProductCreateUpdate, session: Session = Depends(get_session)):
    product_dict = product_data.model_dump()
    if product_dict.get("image_base64"):
        product_dict["image_base64"] = optimize_base64_image(product_dict["image_base64"], max_size=(600, 600), quality=75)
    
    # Auto fill category and subcategory names if IDs provided
    if product_dict.get("category_id"):
        cat = session.get(Category, product_dict["category_id"])
        if cat:
            product_dict["category_name"] = cat.name
            product_dict["is_for_sale"] = cat.is_for_sale
    if product_dict.get("subcategory_id"):
        sub = session.get(Subcategory, product_dict["subcategory_id"])
        if sub:
            product_dict["subcategory_name"] = sub.name

    product = Product(**product_dict)
    session.add(product)
    session.commit()
    session.refresh(product)

    # Registrar salida de caja por inversión de inventario inicial
    if product.stock > 0:
        unit_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping
        total_inv = product.stock * unit_cost
        if total_inv > Decimal("0.00"):
            cash_mv = CashMovement(
                type="compra_inventario",
                amount=total_inv,
                direction="out",
                description=f"Compra inicial: {product.name} ({product.stock} unid.)",
                reference_id=product.id,
                date=datetime.now()
            )
            session.add(cash_mv)
            session.commit()

    return product

@app.put("/api/products/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: ProductCreateUpdate, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    data = product_data.model_dump()
    if data.get("image_base64"):
        data["image_base64"] = optimize_base64_image(data["image_base64"], max_size=(600, 600), quality=75)
        
    if data.get("category_id"):
        cat = session.get(Category, data["category_id"])
        if cat:
            data["category_name"] = cat.name
            data["is_for_sale"] = cat.is_for_sale
    if data.get("subcategory_id"):
        sub = session.get(Subcategory, data["subcategory_id"])
        if sub:
            data["subcategory_name"] = sub.name

    old_stock = product.stock
    for key, value in data.items():
        setattr(product, key, value)
        
    session.add(product)
    session.commit()
    session.refresh(product)

    # Si se incrementó el stock, registrar salida de caja por reposición
    if product.stock > old_stock:
        added_units = product.stock - old_stock
        unit_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping
        total_added_inv = added_units * unit_cost
        if total_added_inv > Decimal("0.00"):
            cash_mv = CashMovement(
                type="compra_inventario",
                amount=total_added_inv,
                direction="out",
                description=f"Reposición de stock: {product.name} (+{added_units} unid.)",
                reference_id=product.id,
                date=datetime.now()
            )
            session.add(cash_mv)
            session.commit()

    return product

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(product)
    session.commit()
    return {"status": "success", "message": "Product deleted"}

# 5. Ventas, Facturación y Abonos
@app.get("/api/sales")
def get_sales(session: Session = Depends(get_session)):
    sales = session.exec(select(Sale).order_by(Sale.date.desc())).all()
    # Retornar ventas con items y excluir el string pesado de payment_capture_base64
    result = []
    for sale in sales:
        items = []
        for item in sale.items:
            items.append({
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else "Producto Eliminado",
                "quantity": item.quantity,
                "unit_cost": float(item.unit_cost),
                "unit_sale_price": float(item.unit_sale_price)
            })
        payments = []
        for p in sale.payments:
            payments.append({
                "id": p.id,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_reference": p.payment_reference,
                "date": p.date,
                "notes": p.notes
            })
        sale_dict = sale.model_dump(exclude={"payment_capture_base64"})
        sale_dict["has_capture"] = bool(sale.payment_capture_base64)
        sale_dict["items"] = items
        sale_dict["payments"] = payments
        result.append(sale_dict)
    return result

@app.get("/api/sales/{sale_id}/capture")
def get_sale_capture(sale_id: int, session: Session = Depends(get_session)):
    """Devuelve la captura de pago solo cuando el usuario la solicita en el frontend."""
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if not sale.payment_capture_base64:
        raise HTTPException(status_code=404, detail="Esta venta no tiene comprobante de pago adjunto")
    return {"capture": sale.payment_capture_base64}

@app.post("/api/sales", response_model=Sale)
def create_sale(sale_data: SaleCreate, session: Session = Depends(get_session)):
    try:
        total_cost = Decimal("0.00")
        total_revenue = Decimal("0.00")
        db_items = []
        
        # Process items and deduct stock
        for req_item in sale_data.items:
            product = session.get(Product, req_item.product_id)
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto con ID {req_item.product_id} no encontrado")
            if product.stock < req_item.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.name}. Stock actual: {product.stock}")
            
            # Deduct stock
            product.stock -= req_item.quantity
            session.add(product)
            
            unit_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping
            unit_sale_price = product.sale_price + product.sale_extra
            
            total_cost += unit_cost * req_item.quantity
            total_revenue += unit_sale_price * req_item.quantity
            
            sale_item = SaleItem(
                product_id=product.id,
                quantity=req_item.quantity,
                unit_cost=unit_cost,
                unit_sale_price=unit_sale_price
            )
            db_items.append(sale_item)
        
        total_revenue += sale_data.delivery_cost
        total_profit = total_revenue - total_cost

        config = session.get(BusinessConfig, 1)
        active_dollar_rate = config.dollar_rate if config else Decimal("45.00")
        
        # Resolver cliente si se seleccionó ID
        client_name = sale_data.client_name
        if sale_data.customer_id:
            customer = session.get(Customer, sale_data.customer_id)
            if customer:
                client_name = customer.name

        # Resolver estatus de pago y deudas
        payment_status = sale_data.payment_status  # "pagado", "parcial", "fiao"
        if payment_status == "fiao":
            amount_paid = Decimal("0.00")
            amount_pending = total_revenue
        elif payment_status == "parcial":
            amount_paid = min(sale_data.initial_payment, total_revenue)
            amount_pending = max(total_revenue - amount_paid, Decimal("0.00"))
            if amount_pending == Decimal("0.00"):
                payment_status = "pagado"
        else: # "pagado"
            amount_paid = total_revenue
            amount_pending = Decimal("0.00")
            payment_status = "pagado"

        optimized_capture = optimize_base64_image(sale_data.payment_capture_base64, max_size=(1200, 1200), quality=80)

        sale = Sale(
            customer_id=sale_data.customer_id,
            client_name=client_name,
            payment_method=sale_data.payment_method,
            payment_status=payment_status,
            amount_paid=amount_paid,
            amount_pending=amount_pending,
            payment_reference=sale_data.payment_reference,
            payment_capture_base64=optimized_capture,
            delivery_cost=sale_data.delivery_cost,
            total_cost=total_cost,
            total_revenue=total_revenue,
            total_profit=total_profit,
            dollar_rate=active_dollar_rate,
            date=datetime.now()
        )
        
        session.add(sale)
        session.commit()
        session.refresh(sale)
        
        # Link items
        for item in db_items:
            item.sale_id = sale.id
            session.add(item)
            
        # Si hubo abono inicial o pago de contado, registrar en SalePayment y en CashMovement
        if amount_paid > Decimal("0.00"):
            initial_payment = SalePayment(
                sale_id=sale.id,
                amount=amount_paid,
                payment_method=sale.payment_method,
                payment_reference=sale.payment_reference,
                notes="Abono inicial al registrar venta" if payment_status == "parcial" else "Pago de contado",
                date=datetime.now()
            )
            session.add(initial_payment)
            
            cash_mv = CashMovement(
                type="ingreso_venta",
                amount=amount_paid,
                direction="in",
                description=f"Cobro venta #{sale.id} ({sale.payment_method})",
                reference_id=sale.id,
                date=datetime.now()
            )
            session.add(cash_mv)
            
        session.commit()
        session.refresh(sale)
        
        return sale
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar la venta: {str(e)}")

# Registrar Abono a una Venta Pendiente / Fiao
@app.post("/api/sales/{sale_id}/payments")
def add_sale_payment(sale_id: int, payment_data: SalePaymentCreate, session: Session = Depends(get_session)):
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if sale.amount_pending <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Esta venta ya está totalmente pagada")
    if payment_data.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="El monto del abono debe ser mayor a 0")
    
    pay_amount = min(payment_data.amount, sale.amount_pending)
    payment = SalePayment(
        sale_id=sale.id,
        amount=pay_amount,
        payment_method=payment_data.payment_method,
        payment_reference=payment_data.payment_reference,
        notes=payment_data.notes,
        date=datetime.now()
    )
    session.add(payment)

    cash_mv = CashMovement(
        type="abono_fiao",
        amount=pay_amount,
        direction="in",
        description=f"Abono a venta #{sale.id} ({payment.payment_method})",
        reference_id=sale.id,
        notes=payment_data.notes,
        date=datetime.now()
    )
    session.add(cash_mv)
    
    sale.amount_paid += pay_amount
    sale.amount_pending = max(sale.total_revenue - sale.amount_paid, Decimal("0.00"))
    if sale.amount_pending <= Decimal("0.00"):
        sale.payment_status = "pagado"
    else:
        sale.payment_status = "parcial"
        
    session.add(sale)
    session.commit()
    session.refresh(sale)
    return {
        "status": "success",
        "sale": {
            "id": sale.id,
            "payment_status": sale.payment_status,
            "amount_paid": float(sale.amount_paid),
            "amount_pending": float(sale.amount_pending)
        },
        "payment": {
            "id": payment.id,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "date": payment.date
        }
    }

# Generar Factura en PDF
@app.get("/api/sales/{sale_id}/invoice")
def get_invoice_pdf(sale_id: int, session: Session = Depends(get_session)):
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    config = session.get(BusinessConfig, 1)
    if not config:
        config = BusinessConfig()
        
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    # Custom Brand Header
    pdf.set_fill_color(240, 240, 245)
    pdf.rect(0, 0, 210, 40, "F")
    
    # Check for custom logo
    logo_path = None
    if config.logo_base64:
        try:
            header_str, base64_data = config.logo_base64.split(",") if "," in config.logo_base64 else ("", config.logo_base64)
            img_data = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(img_data))
            
            temp_dir = tempfile.gettempdir()
            logo_path = os.path.join(temp_dir, f"temp_logo_{sale_id}.png")
            image.save(logo_path)
            
            pdf.image(logo_path, x=10, y=8, w=24, h=24)
        except Exception:
            logo_path = None
            
    # Business name & title
    pdf.set_xy(40 if logo_path else 10, 10)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(100, 10, config.name.upper(), ln=False)
    
    pdf.set_xy(140, 10)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(60, 10, "FACTURA DE Venta", ln=True, align="R")
    
    pdf.set_xy(140, 18)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(60, 10, f"No: #{sale.id}", ln=True, align="R")
    pdf.set_xy(140, 24)
    pdf.cell(60, 10, f"Fecha: {sale.date.strftime('%d/%m/%Y %H:%M')}", ln=True, align="R")
    
    pdf.ln(20)
    
    # Client info
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(100, 6, "Cliente:", ln=True)
    pdf.set_font("Helvetica", size=11)
    pdf.cell(100, 6, sale.client_name if sale.client_name else "Consumidor Final", ln=True)
    
    pdf.ln(5)
    
    # Table Header
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(220, 220, 230)
    pdf.cell(90, 8, "Producto", border=1, fill=True)
    pdf.cell(30, 8, "Cant.", border=1, fill=True, align="C")
    pdf.cell(35, 8, "Precio Unit.", border=1, fill=True, align="R")
    pdf.cell(35, 8, "Subtotal", border=1, fill=True, align="R")
    pdf.ln()
    
    # Table Items
    pdf.set_font("Helvetica", size=10)
    for item in sale.items:
        prod_name = item.product.name if item.product else "Producto Eliminado"
        pdf.cell(90, 8, prod_name, border=1)
        pdf.cell(30, 8, str(item.quantity), border=1, align="C")
        pdf.cell(35, 8, f"${item.unit_sale_price:.2f}", border=1, align="R")
        pdf.cell(35, 8, f"${(item.quantity * item.unit_sale_price):.2f}", border=1, align="R")
        pdf.ln()
        
    # Totals
    pdf.set_font("Helvetica", "B", 10)
    if sale.delivery_cost > 0:
        pdf.cell(155, 8, "Delivery / Adicional", border=1, align="R")
        pdf.cell(35, 8, f"${sale.delivery_cost:.2f}", border=1, align="R")
        pdf.ln()
        
    pdf.set_fill_color(240, 240, 245)
    pdf.cell(155, 8, "TOTAL FACTURADO (USD)", border=1, align="R", fill=True)
    pdf.cell(35, 8, f"${sale.total_revenue:.2f}", border=1, align="R", fill=True)
    pdf.ln()
    
    total_bs = sale.total_revenue * sale.dollar_rate
    pdf.cell(155, 8, f"TOTAL EN BOLIVARES (Tasa: {sale.dollar_rate:.2f} Bs./$)", border=1, align="R", fill=True)
    pdf.cell(35, 8, f"Bs. {total_bs:.2f}", border=1, align="R", fill=True)
    pdf.ln(8)
    
    # Payment info & Debt Status
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(100, 6, f"Metodo de Pago: {sale.payment_method.upper()}", ln=True)
    if sale.payment_reference:
        pdf.cell(100, 6, f"Referencia: {sale.payment_reference}", ln=True)
        
    # Mostrar estado de crédito o deuda si aplica
    if sale.payment_status in ("fiao", "parcial"):
        pdf.set_text_color(180, 50, 50)
        status_label = "A CREDITO (FIAO)" if sale.payment_status == "fiao" else "PAGO PARCIAL"
        pdf.cell(100, 6, f"Condicion: {status_label}", ln=True)
        pdf.cell(100, 6, f"Pagado: ${sale.amount_paid:.2f} | Saldo Pendiente: ${sale.amount_pending:.2f} (Bs. {(sale.amount_pending * sale.dollar_rate):.2f})", ln=True)
        pdf.set_text_color(0, 0, 0)
        
    # Embed capture screenshot if available
    capture_path = None
    if sale.payment_capture_base64:
        try:
            pdf.ln(8)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(100, 6, "Comprobante de Pago Adjunto:", ln=True)
            pdf.ln(2)
            
            header_str, base64_data = sale.payment_capture_base64.split(",") if "," in sale.payment_capture_base64 else ("", sale.payment_capture_base64)
            capture_data = base64.b64decode(base64_data)
            cap_img = Image.open(io.BytesIO(capture_data))
            
            temp_dir = tempfile.gettempdir()
            capture_path = os.path.join(temp_dir, f"temp_capture_{sale_id}.png")
            cap_img.thumbnail((300, 300))
            cap_img.save(capture_path)
            
            pdf.image(capture_path, w=70)
        except Exception as e:
            pdf.cell(100, 6, f"[Error al cargar comprobante: {str(e)}]", ln=True)
            
    # Clean up temp files
    try:
        if logo_path and os.path.exists(logo_path):
            os.remove(logo_path)
        if capture_path and os.path.exists(capture_path):
            os.remove(capture_path)
    except Exception:
        pass
        
    pdf_bytes = bytes(pdf.output())
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=factura_{sale.id}.pdf"})

# 6. Estadísticas del Dashboard y Gráficos
@app.get("/api/stats")
def get_stats(days: int = Query(default=30, description="Días hacia atrás para filtrar estadísticas"), session: Session = Depends(get_session)):
    start_date = datetime.now() - timedelta(days=days)
    sales = session.exec(select(Sale).where(Sale.date >= start_date)).all()
    
    total_revenue = sum((s.total_revenue for s in sales), Decimal("0.00"))
    total_cost = sum((s.total_cost for s in sales), Decimal("0.00"))
    total_profit = sum((s.total_profit for s in sales), Decimal("0.00"))
    
    # Pagos y abonos reales recibidos en este periodo (Flujo de caja efectivo)
    period_payments = session.exec(select(SalePayment).where(SalePayment.date >= start_date)).all()
    sales_with_payments = {p.sale_id for p in period_payments}
    legacy_collected = sum((s.amount_paid for s in sales if s.id not in sales_with_payments), Decimal("0.00"))
    total_collected_period = sum((p.amount for p in period_payments), Decimal("0.00")) + legacy_collected

    # Active investment = sum(stock * (cost_base * (1 + cost_iva / 100) + cost_shipping))
    products = session.exec(select(Product)).all()
    total_inventory_value = sum((p.stock * (p.cost_base * (Decimal("1") + p.cost_iva / Decimal("100")) + p.cost_shipping) for p in products), Decimal("0.00"))
    
    # Historical investment
    total_historical_value = Decimal("0.00")
    for p in products:
        sold_qty = sum((item.quantity for item in p.sale_items), 0)
        total_qty = p.stock + sold_qty
        total_historical_value += total_qty * (p.cost_base * (Decimal("1") + p.cost_iva / Decimal("100")) + p.cost_shipping)

    # Debt stats (Total pendiente en la calle)
    all_sales = session.exec(select(Sale)).all()
    total_receivables = sum((s.amount_pending for s in all_sales if s.amount_pending > Decimal("0.00")), Decimal("0.00"))
    
    config = session.get(BusinessConfig, 1)
    dollar_rate = config.dollar_rate if config else Decimal("45.00")

    # Chart data points grouping by date
    chart_dict = {}
    for i in range(days):
        date_str = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        chart_dict[date_str] = {
            "fecha": date_str, 
            "facturado": Decimal("0.00"), 
            "cobrado": Decimal("0.00"), 
            "ganancias": Decimal("0.00")
        }
        
    for sale in sales:
        date_str = sale.date.strftime("%Y-%m-%d")
        if date_str in chart_dict:
            chart_dict[date_str]["facturado"] += sale.total_revenue
            chart_dict[date_str]["ganancias"] += sale.total_profit
            if not sale.payments:
                chart_dict[date_str]["cobrado"] += sale.amount_paid

    for payment in period_payments:
        date_str = payment.date.strftime("%Y-%m-%d")
        if date_str in chart_dict:
            chart_dict[date_str]["cobrado"] += payment.amount
            
    # Saldo real en caja actual y evolución histórica para la gráfica
    from datetime import time
    cash_movements = session.exec(select(CashMovement).order_by(CashMovement.date.asc())).all()
    total_cash_in = sum((m.amount for m in cash_movements if m.direction == "in"), Decimal("0.00"))
    total_cash_out = sum((m.amount for m in cash_movements if m.direction == "out"), Decimal("0.00"))
    cash_balance = total_cash_in - total_cash_out

    # Calcular el Saldo Real en Caja acumulado al final de cada día
    for item in chart_dict.values():
        dt_date = datetime.strptime(item["fecha"], "%Y-%m-%d").date()
        end_of_day = datetime.combine(dt_date, time.max)
        day_balance = Decimal("0.00")
        for m in cash_movements:
            if m.date <= end_of_day:
                if m.direction == "in":
                    day_balance += m.amount
                else:
                    day_balance -= m.amount
        item["caja"] = day_balance

    chart_data = list(chart_dict.values())
    chart_data.sort(key=lambda x: x["fecha"])

    return {
        "kpis": {
            "dollar_rate": float(dollar_rate),
            "cash_balance": float(cash_balance),
            "total_receivables": float(total_receivables),
            "total_collected": float(total_collected_period),
            "total_revenue": float(total_revenue),
            "total_investment": float(total_inventory_value),
            "total_historical_investment": float(total_historical_value),
            "total_profit": float(total_profit),
            "profit_margin": float((total_profit / total_cost) * 100) if total_cost > 0 else 0.0
        },
        "chart": [
            {
                "fecha": item["fecha"],
                "facturado": float(item["facturado"]),
                "caja": float(item.get("caja", Decimal("0.00"))),
                "ganancias": float(item["ganancias"])
            } for item in chart_data
        ]
    }

# 7. Gestión de Caja y Retiros del Dueño
@app.get("/api/cash/balance")
def get_cash_balance(session: Session = Depends(get_session)):
    movements = session.exec(select(CashMovement)).all()
    total_in = sum((m.amount for m in movements if m.direction == "in"), Decimal("0.00"))
    total_out = sum((m.amount for m in movements if m.direction == "out"), Decimal("0.00"))
    balance = total_in - total_out
    return {
        "balance": float(balance),
        "total_in": float(total_in),
        "total_out": float(total_out),
        "can_withdraw": bool(balance > Decimal("0.00"))
    }

@app.get("/api/cash/movements")
def get_cash_movements(limit: int = 50, session: Session = Depends(get_session)):
    movements = session.exec(select(CashMovement).order_by(CashMovement.date.desc()).limit(limit)).all()
    return [
        {
            "id": m.id,
            "type": m.type,
            "amount": float(m.amount),
            "direction": m.direction,
            "description": m.description,
            "date": m.date,
            "reference_id": m.reference_id,
            "notes": m.notes
        } for m in movements
    ]

@app.post("/api/cash/withdraw")
def withdraw_cash(data: CashWithdrawalCreate, session: Session = Depends(get_session)):
    if data.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="El monto a retirar debe ser mayor a 0.")
        
    movements = session.exec(select(CashMovement)).all()
    total_in = sum((m.amount for m in movements if m.direction == "in"), Decimal("0.00"))
    total_out = sum((m.amount for m in movements if m.direction == "out"), Decimal("0.00"))
    current_balance = total_in - total_out
    
    if current_balance <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail=f"No hay fondos disponibles en caja para retirar (Saldo actual: ${float(current_balance):.2f}). No se puede dejar la caja en negativo.")
        
    if data.amount > current_balance:
        raise HTTPException(status_code=400, detail=f"El monto a retirar (${float(data.amount):.2f}) supera el saldo disponible en caja (${float(current_balance):.2f}). No se puede dejar la caja en negativo.")
        
    movement = CashMovement(
        type="retiro_dueno",
        amount=data.amount,
        direction="out",
        description="Retiro de fondos por el dueño",
        notes=data.notes,
        date=datetime.now()
    )
    session.add(movement)
    session.commit()
    session.refresh(movement)
    
    new_balance = current_balance - data.amount
    return {
        "status": "success",
        "message": "Retiro registrado exitosamente",
        "withdrawn": float(data.amount),
        "new_balance": float(new_balance)
    }

@app.post("/api/cash/deposit")
def deposit_cash(data: CashDepositCreate, session: Session = Depends(get_session)):
    if data.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="El monto a ingresar debe ser mayor a 0.")
        
    movement = CashMovement(
        type="ingreso_capital",
        amount=data.amount,
        direction="in",
        description="Aporte de capital / Fondo de caja",
        notes=data.notes,
        date=datetime.now()
    )
    session.add(movement)
    session.commit()
    session.refresh(movement)
    
    movements = session.exec(select(CashMovement)).all()
    total_in = sum((m.amount for m in movements if m.direction == "in"), Decimal("0.00"))
    total_out = sum((m.amount for m in movements if m.direction == "out"), Decimal("0.00"))
    new_balance = total_in - total_out
    
    return {
        "status": "success",
        "message": "Aporte de capital registrado exitosamente",
        "deposited": float(data.amount),
        "new_balance": float(new_balance)
    }

# 8. Backup y Restaurar Base de Datos
@app.get("/api/backup")
def get_backup():
    db_path = DATABASE_FILE
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail=f"Database file not found at {db_path}")
    return FileResponse(db_path, filename="gestor_pocho_backup.db", media_type="application/x-sqlite3")

@app.post("/api/restore")
def restore_backup(file: UploadFile = File(...), session: Session = Depends(get_session)):
    db_path = DATABASE_FILE
    try:
        content = file.file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo de respaldo: {str(e)}")
        
    session.close()
    engine.dispose()
    
    try:
        with open(db_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir la base de datos: {str(e)}")
        
    return {"message": "Database restored successfully"}

# 8. Reporte Global de Ventas y Caja en PDF
@app.get("/api/sales/report")
def get_global_report(days: int = Query(default=30), session: Session = Depends(get_session)):
    start_date = datetime.now() - timedelta(days=days)
    sales = session.exec(select(Sale).where(Sale.date >= start_date).order_by(Sale.date.desc())).all()
    cash_movements = session.exec(
        select(CashMovement).where(CashMovement.date >= start_date).order_by(CashMovement.date.desc())
    ).all()
    all_cash = session.exec(select(CashMovement)).all()
    total_cash_in = sum((m.amount for m in all_cash if m.direction == "in"), Decimal("0.00"))
    total_cash_out = sum((m.amount for m in all_cash if m.direction == "out"), Decimal("0.00"))
    cash_balance = total_cash_in - total_cash_out

    config = session.get(BusinessConfig, 1)
    if not config:
        config = BusinessConfig()
        
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    pdf.set_fill_color(240, 240, 245)
    pdf.rect(0, 0, 210, 40, "F")
    
    logo_path = None
    if config.logo_base64:
        try:
            header_str, base64_data = config.logo_base64.split(",") if "," in config.logo_base64 else ("", config.logo_base64)
            img_data = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(img_data))
            temp_dir = tempfile.gettempdir()
            logo_path = os.path.join(temp_dir, f"temp_logo_report.png")
            image.save(logo_path)
            pdf.image(logo_path, x=10, y=8, w=24, h=24)
        except Exception:
            logo_path = None
            
    pdf.set_xy(40 if logo_path else 10, 10)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(100, 10, config.name.upper(), ln=False)
    
    pdf.set_xy(100, 10)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(100, 10, "REPORTE FINANCIERO Y CAJA", ln=True, align="R")
    
    pdf.set_xy(100, 18)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(100, 10, f"Rango: Ultimos {days} dias", ln=True, align="R")
    pdf.set_xy(100, 24)
    pdf.cell(100, 10, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="R")
    
    pdf.ln(20)
    
    total_rev_usd = sum((s.total_revenue for s in sales), Decimal("0.00"))
    total_rev_bs = sum((s.total_revenue * s.dollar_rate for s in sales), Decimal("0.00"))
    total_prof_usd = sum((s.total_profit for s in sales), Decimal("0.00"))
    total_prof_bs = sum((s.total_profit * s.dollar_rate for s in sales), Decimal("0.00"))
    
    pdf.set_fill_color(245, 245, 250)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(190, 8, "RESUMEN DE METRICAS DEL NEGOCIO", border=1, ln=True, fill=True, align="C")
    
    pdf.set_font("Helvetica", size=10)
    pdf.cell(95, 8, f" Cantidad de Ventas: {len(sales)}", border=1)
    pdf.cell(95, 8, f" Margen s/ Costo: {float((total_prof_usd/(total_rev_usd - total_prof_usd)*100)) if (total_rev_usd - total_prof_usd) > 0 else 0.0:.1f}%", border=1, ln=True)
    
    pdf.cell(95, 8, f" Total Facturado USD: ${total_rev_usd:.2f}", border=1)
    pdf.cell(95, 8, f" Total Facturado VES: Bs. {total_rev_bs:.2f}", border=1, ln=True)
    
    pdf.cell(95, 8, f" Ganancias Limpias USD: ${total_prof_usd:.2f}", border=1)
    pdf.cell(95, 8, f" Ganancias Limpias VES: Bs. {total_prof_bs:.2f}", border=1, ln=True)

    pdf.cell(95, 8, f" Saldo Disponible en Caja: ${cash_balance:.2f} USD", border=1)
    pdf.cell(95, 8, f" Equivalente Caja en Bs: Bs. {cash_balance * config.dollar_rate:.2f}", border=1, ln=True)
    
    pdf.ln(8)
    
    # 1. TABLA DE VENTAS
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(220, 220, 230)
    pdf.cell(190, 7, "DETALLE DE VENTAS DEL PERIODO", border=1, ln=True, fill=True, align="C")
    pdf.cell(18, 7, "Venta", border=1, fill=True, align="C")
    pdf.cell(24, 7, "Fecha", border=1, fill=True)
    pdf.cell(40, 7, "Cliente", border=1, fill=True)
    pdf.cell(26, 7, "Estado", border=1, fill=True, align="C")
    pdf.cell(26, 7, "Metodo", border=1, fill=True, align="C")
    pdf.cell(28, 7, "Total USD", border=1, fill=True, align="R")
    pdf.cell(28, 7, "Pendiente", border=1, fill=True, align="R")
    pdf.ln()
    
    pdf.set_font("Helvetica", size=9)
    for sale in sales:
        pdf.cell(18, 7, f"#{sale.id}", border=1, align="C")
        pdf.cell(24, 7, sale.date.strftime("%d/%m/%Y"), border=1)
        client_str = sale.client_name or "Consumidor Final"
        pdf.cell(40, 7, (client_str[:18] + "..") if len(client_str) > 18 else client_str, border=1)
        pdf.cell(26, 7, sale.payment_status.upper(), border=1, align="C")
        pdf.cell(26, 7, sale.payment_method.upper(), border=1, align="C")
        pdf.cell(28, 7, f"${sale.total_revenue:.2f}", border=1, align="R")
        pdf.cell(28, 7, f"${sale.amount_pending:.2f}", border=1, align="R")
        pdf.ln()

    # 2. TABLA DE MOVIMIENTOS DE CAJA
    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(220, 220, 230)
    pdf.cell(190, 7, "HISTORIAL Y AUDITORIA DE MOVIMIENTOS DE CAJA", border=1, ln=True, fill=True, align="C")

    period_in = sum((m.amount for m in cash_movements if m.direction == "in"), Decimal("0.00"))
    period_out = sum((m.amount for m in cash_movements if m.direction == "out"), Decimal("0.00"))
    pdf.set_font("Helvetica", size=9)
    pdf.cell(95, 7, f" Entradas Caja (Cobros/Aportes): +${period_in:.2f}", border=1)
    pdf.cell(95, 7, f" Salidas Caja (Compras/Retiros): -${period_out:.2f}", border=1, ln=True)

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(220, 220, 230)
    pdf.cell(32, 7, "Fecha", border=1, fill=True)
    pdf.cell(38, 7, "Tipo", border=1, fill=True)
    pdf.cell(82, 7, "Concepto / Descripcion", border=1, fill=True)
    pdf.cell(38, 7, "Monto USD", border=1, fill=True, align="R")
    pdf.ln()

    type_names = {
        "compra_inventario": "Compra Stock",
        "ingreso_venta": "Cobro Venta",
        "abono_fiao": "Abono a Fiao",
        "retiro_dueno": "Retiro Dueno",
        "ingreso_capital": "Aporte Capital"
    }

    pdf.set_font("Helvetica", size=8)
    for m in cash_movements:
        sign = "+" if m.direction == "in" else "-"
        t_name = type_names.get(m.type, m.type)
        desc = m.description or ""
        if m.notes:
            desc += f" ({m.notes})"
        if len(desc) > 48:
            desc = desc[:45] + ".."
        
        pdf.cell(32, 6, m.date.strftime("%d/%m/%Y %H:%M"), border=1)
        pdf.cell(38, 6, t_name, border=1)
        pdf.cell(82, 6, desc, border=1)
        pdf.cell(38, 6, f"{sign}${m.amount:.2f}", border=1, align="R")
        pdf.ln()
        
    try:
        if logo_path and os.path.exists(logo_path):
            os.remove(logo_path)
    except Exception:
        pass
        
    pdf_bytes = bytes(pdf.output())
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename=reporte_financiero_{days}_dias.pdf"}
    )

# --- Serve Frontend Production Build ---
from fastapi.staticfiles import StaticFiles

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
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend build files missing. Please run 'npm run build'."}

if __name__ == "__main__":
    import uvicorn
    import webbrowser
    import threading
    import time

    def open_browser():
        time.sleep(1.5)
        webbrowser.open("http://localhost:8000")

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8000)
