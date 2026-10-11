import os
import io
import base64
import tempfile
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List
from fastapi import Response, HTTPException
from fpdf import FPDF
from PIL import Image

from database import DATABASE_DIR
from models import BusinessConfig, Sale, CashMovement

def resolve_image_path(img_ref: Optional[str], temp_prefix: str = "temp") -> tuple[Optional[str], bool]:
    """Retorna (ruta_archivo, es_temporal). Soporta archivos en uploads y Base64 heredado."""
    if not img_ref or not isinstance(img_ref, str):
        return None, False
    if img_ref.startswith("/uploads/"):
        rel_path = img_ref.lstrip("/\\")
        disk_path = os.path.join(DATABASE_DIR, rel_path)
        if os.path.exists(disk_path):
            return disk_path, False
    try:
        header_str, base64_data = img_ref.split(",", 1) if "," in img_ref else ("", img_ref)
        img_data = base64.b64decode(base64_data)
        image = Image.open(io.BytesIO(img_data))
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"{temp_prefix}.png")
        image.save(temp_path)
        return temp_path, True
    except Exception:
        return None, False

def generate_invoice_pdf_response(sale: Sale, config: Optional[BusinessConfig]) -> Response:
    if not config:
        config = BusinessConfig()
        
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    # Custom Brand Header
    pdf.set_fill_color(240, 240, 245)
    pdf.rect(0, 0, 210, 40, "F")
    
    # Check for custom logo
    logo_path, is_temp_logo = resolve_image_path(config.logo_base64, f"temp_logo_{sale.id}")
    if logo_path:
        try:
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
    
    pdf.ln(10)
    
    # Anulada Banner
    if sale.payment_status == "anulado":
        pdf.set_fill_color(254, 226, 226)
        pdf.rect(10, 42, 190, 8, "F")
        pdf.set_xy(10, 42)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(185, 28, 28)
        reason_txt = f" (Motivo: {sale.cancel_reason})" if sale.cancel_reason else ""
        pdf.cell(190, 8, f"*** VENTA ANULADA / DEVUELTA{reason_txt} ***", align="C", ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(4)
    else:
        pdf.ln(10)
    
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
    capture_path, is_temp_capture = None, False
    if sale.payment_capture_base64:
        try:
            pdf.ln(8)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(100, 6, "Comprobante de Pago Adjunto:", ln=True)
            pdf.ln(2)
            
            capture_path, is_temp_capture = resolve_image_path(sale.payment_capture_base64, f"temp_cap_{sale.id}")
            if capture_path:
                pdf.image(capture_path, w=70)
        except Exception as e:
            pdf.cell(100, 6, f"[Error al cargar comprobante: {str(e)}]", ln=True)
            
    # Clean up temp files only
    try:
        if is_temp_logo and logo_path and os.path.exists(logo_path):
            os.remove(logo_path)
        if is_temp_capture and capture_path and os.path.exists(capture_path):
            os.remove(capture_path)
    except Exception:
        pass
        
    pdf_bytes = bytes(pdf.output())
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=factura_{sale.id}.pdf"})


def generate_financial_report_pdf_response(
    sales: List[Sale],
    cash_movements: List[CashMovement],
    cash_balance: Decimal,
    config: Optional[BusinessConfig],
    days: int
) -> Response:
    if not config:
        config = BusinessConfig()
        
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    pdf.set_fill_color(240, 240, 245)
    pdf.rect(0, 0, 210, 40, "F")
    
    logo_path, is_temp_logo = resolve_image_path(config.logo_base64, "temp_logo_report")
    if logo_path:
        try:
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
        "ingreso_capital": "Aporte Capital",
        "devolucion_venta": "Devolución Venta"
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
        if is_temp_logo and logo_path and os.path.exists(logo_path):
            os.remove(logo_path)
    except Exception:
        pass
        
    pdf_bytes = bytes(pdf.output())
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename=reporte_financiero_{days}_dias.pdf"}
    )
