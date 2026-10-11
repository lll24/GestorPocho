from datetime import datetime, timedelta, time
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from database import get_session
from models import Sale, SalePayment, Product, BusinessConfig, CashMovement

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("")
def get_stats(days: int = Query(default=30, description="Días hacia atrás para filtrar estadísticas"), session: Session = Depends(get_session)):
    start_date = datetime.now() - timedelta(days=days)
    sales = session.exec(
        select(Sale).where(Sale.date >= start_date, Sale.payment_status != "anulado")
    ).all()
    
    total_revenue = sum((s.total_revenue for s in sales), Decimal("0.00"))
    total_cost = sum((s.total_cost for s in sales), Decimal("0.00"))
    total_profit = sum((s.total_profit for s in sales), Decimal("0.00"))
    
    # Pagos y abonos reales recibidos en este periodo (Flujo de caja efectivo)
    period_payments_raw = session.exec(select(SalePayment).where(SalePayment.date >= start_date)).all()
    period_payments = [p for p in period_payments_raw if not p.sale or p.sale.payment_status != "anulado"]
    sales_with_payments = {p.sale_id for p in period_payments}
    legacy_collected = sum((s.amount_paid for s in sales if s.id not in sales_with_payments), Decimal("0.00"))
    total_collected_period = sum((p.amount for p in period_payments), Decimal("0.00")) + legacy_collected

    # Active investment = sum(stock * (cost_base * (1 + cost_iva / 100) + cost_shipping))
    products = session.exec(select(Product)).all()
    total_inventory_value = sum((p.stock * (p.cost_base * (Decimal("1") + p.cost_iva / Decimal("100")) + p.cost_shipping) for p in products), Decimal("0.00"))
    
    # Historical investment
    total_historical_value = Decimal("0.00")
    for p in products:
        sold_qty = sum((item.quantity for item in p.sale_items if not item.sale or item.sale.payment_status != "anulado"), 0)
        total_qty = p.stock + sold_qty
        total_historical_value += total_qty * (p.cost_base * (Decimal("1") + p.cost_iva / Decimal("100")) + p.cost_shipping)

    # Debt stats (Total pendiente en la calle)
    all_sales = session.exec(select(Sale).where(Sale.payment_status != "anulado")).all()
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
