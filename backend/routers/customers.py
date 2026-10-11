from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Customer
from schemas import CustomerCreateUpdate

router = APIRouter(prefix="/api/customers", tags=["customers"])

@router.get("")
def get_customers(session: Session = Depends(get_session)):
    customers = session.exec(select(Customer).order_by(Customer.name.asc())).all()
    result = []
    for c in customers:
        valid_sales = [s for s in c.sales if s.payment_status != "anulado"]
        total_spent = sum((s.total_revenue for s in valid_sales), Decimal("0.00"))
        total_debt = sum((s.amount_pending for s in valid_sales), Decimal("0.00"))
        result.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "notes": c.notes,
            "created_at": c.created_at,
            "sales_count": len(valid_sales),
            "total_spent": float(total_spent),
            "total_debt": float(total_debt)
        })
    return result

@router.post("", response_model=Customer)
def create_customer(customer_data: CustomerCreateUpdate, session: Session = Depends(get_session)):
    customer = Customer(**customer_data.model_dump())
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer

@router.get("/{customer_id}")
def get_customer_detail(customer_id: int, session: Session = Depends(get_session)):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    sales_history = []
    total_spent = Decimal("0.00")
    total_debt = Decimal("0.00")
    valid_sales_count = 0
    
    for s in customer.sales:
        if s.payment_status != "anulado":
            total_spent += s.total_revenue
            total_debt += s.amount_pending
            valid_sales_count += 1

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
            "cancel_reason": s.cancel_reason,
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
            "sales_count": valid_sales_count
        },
        "sales": sales_history
    }

@router.put("/{customer_id}", response_model=Customer)
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

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, session: Session = Depends(get_session)):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    session.delete(customer)
    session.commit()
    return {"status": "success", "message": "Cliente eliminado"}
