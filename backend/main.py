import base64
import io
import os
import sys
import tempfile
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from decimal import Decimal
from pydantic import BaseModel
from fpdf import FPDF
from PIL import Image

from database import engine, create_db_and_tables, get_session, DATABASE_FILE
from models import BusinessConfig, Product, Sale, SaleItem

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

class ProductCreateUpdate(BaseModel):
    name: str
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

class SaleCreate(BaseModel):
    items: List[SaleItemRequest]
    payment_method: str  # divisas, pagomovil, transferencia, binance
    payment_reference: Optional[str] = None
    payment_capture_base64: Optional[str] = None
    client_name: Optional[str] = None
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
@app.get("/api/config", response_model=BusinessConfig)
def get_config(session: Session = Depends(get_session)):
    config = session.get(BusinessConfig, 1)
    if not config:
        config = BusinessConfig(id=1)
        session.add(config)
        session.commit()
        session.refresh(config)
    return config

@app.put("/api/config", response_model=BusinessConfig)
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
    return config

# 2. CRUD Productos / Inventario
@app.get("/api/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    return session.exec(select(Product)).all()

@app.post("/api/products", response_model=Product)
def create_product(product_data: ProductCreateUpdate, session: Session = Depends(get_session)):
    product_dict = product_data.model_dump()
    if product_dict.get("image_base64"):
        product_dict["image_base64"] = optimize_base64_image(product_dict["image_base64"], max_size=(600, 600), quality=75)
    product = Product(**product_dict)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@app.put("/api/products/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: ProductCreateUpdate, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    data = product_data.model_dump()
    if data.get("image_base64"):
        data["image_base64"] = optimize_base64_image(data["image_base64"], max_size=(600, 600), quality=75)
        
    for key, value in data.items():
        setattr(product, key, value)
        
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(product)
    session.commit()
    return {"status": "success", "message": "Product deleted"}

# 3. Ventas y Facturación
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
                "unit_cost": item.unit_cost,
                "unit_sale_price": item.unit_sale_price
            })
        sale_dict = sale.model_dump(exclude={"payment_capture_base64"})
        sale_dict["has_capture"] = bool(sale.payment_capture_base64)
        sale_dict["items"] = items
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
                raise HTTPException(status_code=404, detail=f"Product with ID {req_item.product_id} not found")
            if product.stock < req_item.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.name}. Stock actual: {product.stock}")
            
            # Deduct stock
            product.stock -= req_item.quantity
            session.add(product)
            
            # Cost is cost_base * (1 + cost_iva / 100) + cost_shipping
            unit_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping
            unit_sale_price = product.sale_price + product.sale_extra
            
            total_cost += unit_cost * req_item.quantity
            total_revenue += unit_sale_price * req_item.quantity
            
            # Create relation
            sale_item = SaleItem(
                product_id=product.id,
                quantity=req_item.quantity,
                unit_cost=unit_cost,
                unit_sale_price=unit_sale_price
            )
            db_items.append(sale_item)
        
        # Revenue is total sale price of products + delivery cost charged to customer
        total_revenue += sale_data.delivery_cost
        # Total profit = total_revenue - total_cost
        total_profit = total_revenue - total_cost

        config = session.get(BusinessConfig, 1)
        active_dollar_rate = config.dollar_rate if config else Decimal("45.00")
        
        # Comprimir comprobante de pago si existe para evitar inflar la base de datos
        optimized_capture = optimize_base64_image(sale_data.payment_capture_base64, max_size=(1200, 1200), quality=80)

        sale = Sale(
            payment_method=sale_data.payment_method,
            payment_reference=sale_data.payment_reference,
            payment_capture_base64=optimized_capture,
            client_name=sale_data.client_name,
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
        
        # Link items and save
        for item in db_items:
            item.sale_id = sale.id
            session.add(item)
        session.commit()
        session.refresh(sale)
        
        return sale
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar la venta: {str(e)}")

# Generar Factura en PDF
@app.get("/api/sales/{sale_id}/invoice")
def get_invoice_pdf(sale_id: int, session: Session = Depends(get_session)):
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    config = session.get(BusinessConfig, 1)
    if not config:
        config = BusinessConfig()
        
    # PDF Creation
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
            # Decode base64 image and save to temporary file
            header_str, base64_data = config.logo_base64.split(",") if "," in config.logo_base64 else ("", config.logo_base64)
            img_data = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(img_data))
            
            temp_dir = tempfile.gettempdir()
            logo_path = os.path.join(temp_dir, f"temp_logo_{sale_id}.png")
            image.save(logo_path)
            
            # Draw logo
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
    
    # Calculate Bolivares total based on the rate locked in this sale
    total_bs = sale.total_revenue * sale.dollar_rate
    pdf.cell(155, 8, f"TOTAL EN BOLIVARES (Tasa: {sale.dollar_rate:.2f} Bs./$)", border=1, align="R", fill=True)
    pdf.cell(35, 8, f"Bs. {total_bs:.2f}", border=1, align="R", fill=True)
    pdf.ln(12)
    
    # Payment info
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(100, 6, f"Metodo de Pago: {sale.payment_method.upper()}", ln=True)
    if sale.payment_reference:
        pdf.cell(100, 6, f"Referencia: {sale.payment_reference}", ln=True)
        
    # Embed capture screenshot if available
    capture_path = None
    if sale.payment_capture_base64:
        try:
            pdf.ln(10)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(100, 6, "Comprobante de Pago Adjunto:", ln=True)
            pdf.ln(2)
            
            header_str, base64_data = sale.payment_capture_base64.split(",") if "," in sale.payment_capture_base64 else ("", sale.payment_capture_base64)
            capture_data = base64.b64decode(base64_data)
            cap_img = Image.open(io.BytesIO(capture_data))
            
            # Compress image to prevent PDF from blowing up in size
            temp_dir = tempfile.gettempdir()
            capture_path = os.path.join(temp_dir, f"temp_capture_{sale_id}.png")
            cap_img.thumbnail((300, 300))
            cap_img.save(capture_path)
            
            # Place image in PDF
            pdf.image(capture_path, w=70) # Width of 70mm
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

# 4. Estadísticas del Dashboard y Gráficos
@app.get("/api/stats")
def get_stats(days: int = Query(default=30, description="Días hacia atrás para filtrar estadísticas"), session: Session = Depends(get_session)):
    start_date = datetime.now() - timedelta(days=days)
    
    # Overall sum
    sales = session.exec(select(Sale).where(Sale.date >= start_date)).all()
    
    total_revenue = sum((s.total_revenue for s in sales), Decimal("0.00"))
    total_cost = sum((s.total_cost for s in sales), Decimal("0.00"))
    total_profit = sum((s.total_profit for s in sales), Decimal("0.00"))
    
    # Active investment = sum(stock * (cost_base * (1 + cost_iva / 100) + cost_shipping))
    products = session.exec(select(Product)).all()
    total_inventory_value = sum((p.stock * (p.cost_base * (Decimal("1") + p.cost_iva / Decimal("100")) + p.cost_shipping) for p in products), Decimal("0.00"))
    
    # Historical investment = sum((stock + sold_quantity) * cost_total)
    total_historical_value = Decimal("0.00")
    for p in products:
        sold_qty = sum((item.quantity for item in p.sale_items), 0)
        total_qty = p.stock + sold_qty
        total_historical_value += total_qty * (p.cost_base * (Decimal("1") + p.cost_iva / Decimal("100")) + p.cost_shipping)

    # Chart data points grouping by date
    chart_dict = {}
    
    # Initialize days range
    for i in range(days):
        date_str = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        chart_dict[date_str] = {"fecha": date_str, "ingresos": Decimal("0.00"), "ganancias": Decimal("0.00")}
        
    for sale in sales:
        date_str = sale.date.strftime("%Y-%m-%d")
        if date_str in chart_dict:
            chart_dict[date_str]["ingresos"] += sale.total_revenue
            chart_dict[date_str]["ganancias"] += sale.total_profit
            
    # Convert to list and sort chronologically
    chart_data = list(chart_dict.values())
    chart_data.sort(key=lambda x: x["fecha"])
    
    return {
        "kpis": {
            "total_revenue": float(total_revenue),
            "total_investment": float(total_inventory_value),  # Current capital tied in inventory
            "total_historical_investment": float(total_historical_value), # Total capital ever invested
            "total_profit": float(total_profit),
            "profit_margin": float((total_profit / total_cost) * 100) if total_cost > 0 else 0.0
        },
        "chart": [
            {
                "fecha": item["fecha"],
                "ingresos": float(item["ingresos"]),
                "ganancias": float(item["ganancias"])
            } for item in chart_data
        ]
    }

# --- Backup Database ---
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
        
    # Close active engine connections to release lock on gestor_pocho.db
    session.close()
    engine.dispose()
    
    try:
        with open(db_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir la base de datos: {str(e)}")
        
    return {"message": "Database restored successfully"}

# --- Global Sales Report PDF ---
@app.get("/api/sales/report")
def get_global_report(days: int = Query(default=30), session: Session = Depends(get_session)):
    start_date = datetime.now() - timedelta(days=days)
    sales = session.exec(select(Sale).where(Sale.date >= start_date)).all()
    config = session.get(BusinessConfig, 1)
    if not config:
        config = BusinessConfig()
        
    # PDF Creation
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
            logo_path = os.path.join(temp_dir, f"temp_logo_report.png")
            image.save(logo_path)
            pdf.image(logo_path, x=10, y=8, w=24, h=24)
        except Exception:
            logo_path = None
            
    # Business name & title
    pdf.set_xy(40 if logo_path else 10, 10)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(100, 10, config.name.upper(), ln=False)
    
    pdf.set_xy(100, 10)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(100, 10, "REPORTE GLOBAL DE VENTAS", ln=True, align="R")
    
    pdf.set_xy(100, 18)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(100, 10, f"Rango: Ultimos {days} dias", ln=True, align="R")
    pdf.set_xy(100, 24)
    pdf.cell(100, 10, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="R")
    
    pdf.ln(20)
    
    # Calculations
    total_rev_usd = sum((s.total_revenue for s in sales), Decimal("0.00"))
    total_rev_bs = sum((s.total_revenue * s.dollar_rate for s in sales), Decimal("0.00"))
    total_prof_usd = sum((s.total_profit for s in sales), Decimal("0.00"))
    total_prof_bs = sum((s.total_profit * s.dollar_rate for s in sales), Decimal("0.00"))
    
    # KPI Blocks
    pdf.set_fill_color(245, 245, 250)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(190, 8, "RESUMEN DE METRICAS", border=1, ln=True, fill=True, align="C")
    
    pdf.set_font("Helvetica", size=10)
    pdf.cell(95, 8, f" Cantidad de Ventas: {len(sales)}", border=1)
    pdf.cell(95, 8, f" Margen de Ganancia: {float((total_prof_usd/total_rev_usd*100)) if total_rev_usd > 0 else 0.0:.1f}%", border=1, ln=True)
    
    pdf.cell(95, 8, f" Ingresos USD: ${total_rev_usd:.2f}", border=1)
    pdf.cell(95, 8, f" Ingresos VES: Bs. {total_rev_bs:.2f}", border=1, ln=True)
    
    pdf.cell(95, 8, f" Ganancias USD: ${total_prof_usd:.2f}", border=1)
    pdf.cell(95, 8, f" Ganancias VES: Bs. {total_prof_bs:.2f}", border=1, ln=True)
    
    pdf.ln(10)
    
    # Sales Table Header
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(220, 220, 230)
    pdf.cell(20, 8, "Venta", border=1, fill=True, align="C")
    pdf.cell(30, 8, "Fecha", border=1, fill=True)
    pdf.cell(45, 8, "Cliente", border=1, fill=True)
    pdf.cell(30, 8, "Metodo", border=1, fill=True, align="C")
    pdf.cell(32, 8, "Total (USD)", border=1, fill=True, align="R")
    pdf.cell(33, 8, "Total (VES)", border=1, fill=True, align="R")
    pdf.ln()
    
    # Sales Table Rows
    pdf.set_font("Helvetica", size=9)
    for sale in sales:
        pdf.cell(20, 8, f"#{sale.id}", border=1, align="C")
        pdf.cell(30, 8, sale.date.strftime("%d/%m/%Y"), border=1)
        pdf.cell(45, 8, (sale.client_name[:20] + "..") if sale.client_name and len(sale.client_name) > 20 else (sale.client_name or "Consumidor Final"), border=1)
        pdf.cell(30, 8, sale.payment_method.upper(), border=1, align="C")
        pdf.cell(32, 8, f"${sale.total_revenue:.2f}", border=1, align="R")
        pdf.cell(33, 8, f"Bs. {(sale.total_revenue * sale.dollar_rate):.2f}", border=1, align="R")
        pdf.ln()
        
    # Clean up temp logo
    try:
        if logo_path and os.path.exists(logo_path):
            os.remove(logo_path)
    except Exception:
        pass
        
    pdf_bytes = bytes(pdf.output())
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename=reporte_ventas_{days}_dias.pdf"}
    )

# --- Serve Frontend Production Build ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check if front-end production build folder exists (support dev, Docker and PyInstaller)
def resolve_frontend_dist():
    # 1. PyInstaller bundled executable (_MEIPASS)
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        bundle_dist = os.path.join(sys._MEIPASS, "frontend", "dist")
        if os.path.exists(bundle_dist):
            return bundle_dist

    # 2. Standard project structure (parent directory / frontend / dist)
    parent_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
    if os.path.exists(parent_dist):
        return parent_dist

    # 3. Direct relative path from current working directory
    cwd_dist = os.path.abspath(os.path.join("frontend", "dist"))
    if os.path.exists(cwd_dist):
        return cwd_dist

    return parent_dist

frontend_dist = resolve_frontend_dist()

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        # Fallback to index.html for React routing
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

    # Iniciar hilo en segundo plano para abrir el navegador automáticamente al iniciar
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8000)

