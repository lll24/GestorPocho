from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models import CashMovement
from schemas import CashWithdrawalCreate, CashDepositCreate

router = APIRouter(prefix="/api/cash", tags=["cash"])

@router.get("/balance")
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

@router.get("/movements")
def get_cash_movements(
    limit: Optional[int] = Query(default=None, ge=1, description="Límite de movimientos"),
    offset: int = Query(default=0, ge=0, description="Desplazamiento para paginación"),
    session: Session = Depends(get_session)
):
    query = select(CashMovement).order_by(CashMovement.date.desc())
    if limit is not None:
        query = query.offset(offset).limit(limit)
    movements = session.exec(query).all()
    return [
        {
            "id": m.id,
            "type": m.type,
            "amount": float(m.amount),
            "direction": m.direction,
            "description": m.description,
            "date": m.date,
            "reference_id": m.reference_id,
            "notes": m.notes,
            "quantity": m.quantity,
            "unit_cost": float(m.unit_cost) if m.unit_cost is not None else None
        } for m in movements
    ]

@router.post("/withdraw")
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

@router.post("/deposit")
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
