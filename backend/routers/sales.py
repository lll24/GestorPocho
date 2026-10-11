from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session, CAPTURES_DIR
from models import Sale, SaleItem, SalePayment, Product, Customer, BusinessConfig, CashMovement
from schemas import SaleCreate, SalePaymentCreate, SaleVoidRequest
from utils.images import save_base64_to_disk
from utils.pdf import generate_invoice_pdf_response, generate_financial_report_pdf_response

router = APIRouter(prefix="/api/sales", tags=["sales"])

@router.get("")
def get_sales(
    limit: Optional[int] = Query(default=None, ge=1, description="Límite de ventas"),
    offset: int = Query(default=0, ge=0, description="Desplazamiento para paginación"),
    session: Session = Depends(get_session)
):
    query = select(Sale).order_by(Sale.date.desc())
    if limit is not None:
        query = query.offset(offset).limit(limit)
    sales = session.exec(query).all()
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

@router.get("/report")
def get_global_report(days: int = Query(default=30), session: Session = Depends(get_session)):
    start_date = datetime.now() - timedelta(days=days)
    sales = session.exec(
        select(Sale).where(Sale.date >= start_date, Sale.payment_status != "anulado").order_by(Sale.date.desc())
    ).all()
    cash_movements = session.exec(
        select(CashMovement).where(CashMovement.date >= start_date).order_by(CashMovement.date.desc())
    ).all()
    all_cash = session.exec(select(CashMovement)).all()
    total_cash_in = sum((m.amount for m in all_cash if m.direction == "in"), Decimal("0.00"))
    total_cash_out = sum((m.amount for m in all_cash if m.direction == "out"), Decimal("0.00"))
    cash_balance = total_cash_in - total_cash_out

    config = session.get(BusinessConfig, 1)
    return generate_financial_report_pdf_response(sales, cash_movements, cash_balance, config, days)

@router.get("/{sale_id}/capture")
def get_sale_capture(sale_id: int, session: Session = Depends(get_session)):
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if not sale.payment_capture_base64:
        raise HTTPException(status_code=404, detail="Esta venta no tiene comprobante de pago adjunto")
    return {"capture": sale.payment_capture_base64}

@router.post("", response_model=Sale)
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
        else:  # "pagado"
            amount_paid = total_revenue
            amount_pending = Decimal("0.00")
            payment_status = "pagado"

        optimized_capture = save_base64_to_disk(
            sale_data.payment_capture_base64,
            CAPTURES_DIR,
            prefix="sale",
            max_size=(1200, 1200),
            quality=80
        )

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

@router.post("/{sale_id}/payments")
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

@router.post("/{sale_id}/void")
def void_sale(sale_id: int, void_data: Optional[SaleVoidRequest] = None, session: Session = Depends(get_session)):
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if sale.payment_status == "anulado":
        raise HTTPException(status_code=400, detail="Esta venta ya ha sido anulada previamente")
    
    if void_data is None:
        void_data = SaleVoidRequest()

    reason = (void_data.reason or "").strip() or "Anulación de venta"
    restore_stock = void_data.restore_stock

    # 1. Devolver productos al stock si se solicitó
    restored_items_count = 0
    if restore_stock:
        for item in sale.items:
            product = session.get(Product, item.product_id)
            if product:
                product.stock += item.quantity
                session.add(product)
                restored_items_count += item.quantity

    # 2. Registrar egreso en caja por devolución si se había cobrado dinero
    refunded_amount = sale.amount_paid
    if refunded_amount > Decimal("0.00"):
        refund_mv = CashMovement(
            type="devolucion_venta",
            amount=refunded_amount,
            direction="out",
            description=f"Devolución por anulación Venta #{sale.id}",
            reference_id=sale.id,
            notes=reason,
            date=datetime.now()
        )
        session.add(refund_mv)

    # 3. Marcar la venta como anulada y resetear deuda pendiente
    sale.payment_status = "anulado"
    sale.cancel_reason = reason
    sale.amount_pending = Decimal("0.00")

    session.add(sale)
    session.commit()
    session.refresh(sale)

    return {
        "status": "success",
        "message": f"Venta #{sale.id} anulada exitosamente",
        "sale_id": sale.id,
        "payment_status": sale.payment_status,
        "cancel_reason": sale.cancel_reason,
        "stock_restored": restore_stock,
        "restored_units": restored_items_count,
        "refunded_amount": float(refunded_amount)
    }

@router.get("/{sale_id}/invoice")
def get_invoice_pdf(sale_id: int, session: Session = Depends(get_session)):
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    config = session.get(BusinessConfig, 1)
    return generate_invoice_pdf_response(sale, config)
