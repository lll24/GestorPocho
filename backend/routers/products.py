from datetime import datetime, time
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session, PRODUCTS_DIR, UPLOADS_DIR
from models import Product, Category, Subcategory, CashMovement
from schemas import ProductCreateUpdate, StockAddRequest
from utils.images import save_base64_to_disk, delete_disk_file

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    return session.exec(select(Product)).all()

@router.post("", response_model=Product)
def create_product(product_data: ProductCreateUpdate, session: Session = Depends(get_session)):
    product_dict = product_data.model_dump()
    if product_dict.get("image_base64"):
        product_dict["image_base64"] = save_base64_to_disk(
            product_dict["image_base64"],
            PRODUCTS_DIR,
            prefix="prod",
            max_size=(800, 800),
            quality=80
        )
    
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

    # Registrar salida de caja por inversión de inventario inicial solo si stock > 0
    if product.stock > 0:
        unit_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping
        total_inv = product.stock * unit_cost
        if total_inv > Decimal("0.00"):
            cash_mv = CashMovement(
                type="compra_inventario",
                amount=total_inv,
                direction="out",
                description=f"Entrada de stock: {product.name} ({product.stock} unid.)",
                reference_id=product.id,
                date=datetime.now(),
                quantity=product.stock,
                unit_cost=unit_cost
            )
            session.add(cash_mv)
            session.commit()

    return product

@router.put("/{product_id}", response_model=Product)
def update_product(product_id: int, product_data: ProductCreateUpdate, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    old_name = product.name
    old_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping
    old_stock = product.stock

    data = product_data.model_dump()
    if "image_base64" in data:
        new_img = data.get("image_base64")
        if new_img != product.image_base64:
            if product.image_base64 and product.image_base64.startswith("/uploads/"):
                delete_disk_file(product.image_base64, UPLOADS_DIR)
            if new_img:
                data["image_base64"] = save_base64_to_disk(
                    new_img,
                    PRODUCTS_DIR,
                    prefix="prod",
                    max_size=(800, 800),
                    quality=80
                )
            else:
                data["image_base64"] = None
        
    if data.get("category_id"):
        cat = session.get(Category, data["category_id"])
        if cat:
            data["category_name"] = cat.name
            data["is_for_sale"] = cat.is_for_sale
    if data.get("subcategory_id"):
        sub = session.get(Subcategory, data["subcategory_id"])
        if sub:
            data["subcategory_name"] = sub.name

    # Validación previa si se intenta reducir el stock
    new_stock = data.get("stock", old_stock)
    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    existing_mv = session.exec(
        select(CashMovement).where(
            CashMovement.type == "compra_inventario",
            CashMovement.reference_id == product.id,
            CashMovement.date >= today_start,
            CashMovement.date <= today_end
        ).order_by(CashMovement.date.desc())
    ).first()

    if new_stock < old_stock:
        reduce_units = old_stock - new_stock
        if not existing_mv or not existing_mv.quantity or existing_mv.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="No puedes reducir la cantidad de productos: hoy no hay entrada de este producto."
            )
        if reduce_units > existing_mv.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"No puedes reducir {reduce_units} unidades: hoy solo se registraron {existing_mv.quantity} unidades de entrada para este producto."
            )

    for key, value in data.items():
        setattr(product, key, value)
        
    session.add(product)
    session.commit()
    session.refresh(product)

    new_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping

    # Si cambió el nombre del producto, actualizar las descripciones de entradas de stock existentes
    if product.name != old_name:
        existing_mvs = session.exec(select(CashMovement).where(CashMovement.type == "compra_inventario", CashMovement.reference_id == product.id)).all()
        for mv in existing_mvs:
            if old_name in mv.description:
                mv.description = mv.description.replace(old_name, product.name)
                session.add(mv)
        session.commit()

    # Si cambió el stock en la edición (sea incremento o reducción de stock)
    if product.stock != old_stock:
        diff = product.stock - old_stock
        if diff > 0:
            total_added_inv = diff * new_cost
            if total_added_inv > Decimal("0.00"):
                if existing_mv:
                    current_qty = existing_mv.quantity if existing_mv.quantity is not None else 0
                    new_qty = current_qty + diff
                    existing_mv.quantity = new_qty
                    existing_mv.amount += total_added_inv
                    existing_mv.description = f"Entrada de stock: {product.name} ({new_qty} unid.)"
                    session.add(existing_mv)
                else:
                    cash_mv = CashMovement(
                        type="compra_inventario",
                        amount=total_added_inv,
                        direction="out",
                        description=f"Entrada de stock: {product.name} ({diff} unid.)",
                        reference_id=product.id,
                        date=datetime.now(),
                        quantity=diff,
                        unit_cost=new_cost
                    )
                    session.add(cash_mv)
        else:
            reduce_units = abs(diff)
            reduce_amount = reduce_units * new_cost
            if existing_mv:
                current_qty = existing_mv.quantity if existing_mv.quantity is not None else 0
                new_qty = current_qty - reduce_units
                if new_qty > 0:
                    existing_mv.quantity = new_qty
                    existing_mv.amount = max(Decimal("0.00"), existing_mv.amount - reduce_amount)
                    existing_mv.description = f"Entrada de stock: {product.name} ({new_qty} unid.)"
                    session.add(existing_mv)
                else:
                    session.delete(existing_mv)
        session.commit()
    elif new_cost != old_cost:
        # Si no cambió el stock pero se corrigió el costo y hay una entrada de HOY, sincronizarla
        today_start = datetime.combine(datetime.now().date(), time.min)
        today_end = datetime.combine(datetime.now().date(), time.max)
        today_mv = session.exec(
            select(CashMovement).where(
                CashMovement.type == "compra_inventario",
                CashMovement.reference_id == product.id,
                CashMovement.date >= today_start,
                CashMovement.date <= today_end
            ).order_by(CashMovement.date.desc())
        ).first()
        if today_mv and today_mv.quantity:
            today_mv.unit_cost = new_cost
            today_mv.amount = today_mv.quantity * new_cost
            session.add(today_mv)
            session.commit()

    return product

@router.post("/{product_id}/add-stock")
def add_product_stock(product_id: int, stock_data: StockAddRequest, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    old_stock = product.stock
    if stock_data.new_total_stock is not None:
        if stock_data.new_total_stock < 0:
            raise HTTPException(status_code=400, detail="El stock total no puede ser negativo.")
        diff = stock_data.new_total_stock - old_stock
        new_total = stock_data.new_total_stock
    elif stock_data.quantity is not None:
        diff = stock_data.quantity
        new_total = max(0, old_stock + diff)
    else:
        raise HTTPException(status_code=400, detail="Debe indicar el nuevo total de stock o la cantidad a ingresar.")
        
    if diff == 0:
        return {
            "status": "success",
            "message": f"El stock de {product.name} se mantiene en {product.stock}",
            "product": product,
            "movement": None
        }

    # Calcular costo unitario (usar el configurado en el producto)
    unit_cost = stock_data.unit_cost
    if unit_cost is None or unit_cost <= Decimal("0.00"):
        unit_cost = product.cost_base * (Decimal("1") + product.cost_iva / Decimal("100")) + product.cost_shipping

    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    
    existing_mv = session.exec(
        select(CashMovement).where(
            CashMovement.type == "compra_inventario",
            CashMovement.reference_id == product.id,
            CashMovement.date >= today_start,
            CashMovement.date <= today_end
        ).order_by(CashMovement.date.desc())
    ).first()

    movement_result = None

    if diff > 0:
        added_amount = diff * unit_cost
        if existing_mv:
            current_qty = existing_mv.quantity if existing_mv.quantity is not None else 0
            new_total_qty = current_qty + diff
            existing_mv.quantity = new_total_qty
            existing_mv.amount += added_amount
            existing_mv.unit_cost = unit_cost
            existing_mv.description = f"Entrada de stock: {product.name} ({new_total_qty} unid.)"
            existing_mv.date = datetime.now()
            if stock_data.notes:
                existing_mv.notes = f"{existing_mv.notes or ''}; {stock_data.notes}".strip("; ")
            session.add(existing_mv)
            movement_result = existing_mv
        else:
            new_mv = CashMovement(
                type="compra_inventario",
                amount=added_amount,
                direction="out",
                description=f"Entrada de stock: {product.name} ({diff} unid.)",
                reference_id=product.id,
                date=datetime.now(),
                quantity=diff,
                unit_cost=unit_cost,
                notes=stock_data.notes
            )
            session.add(new_mv)
            movement_result = new_mv
    else:
        reduce_units = abs(diff)
        if not existing_mv or not existing_mv.quantity or existing_mv.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="No puedes reducir la cantidad de productos: hoy no hay entrada de este producto."
            )
        if reduce_units > existing_mv.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"No puedes reducir {reduce_units} unidades: hoy solo se registraron {existing_mv.quantity} unidades de entrada para este producto."
            )

        reduce_amount = reduce_units * unit_cost
        current_qty = existing_mv.quantity
        new_qty = current_qty - reduce_units
        if new_qty > 0:
            existing_mv.quantity = new_qty
            existing_mv.amount = max(Decimal("0.00"), existing_mv.amount - reduce_amount)
            existing_mv.description = f"Entrada de stock: {product.name} ({new_qty} unid.)"
            session.add(existing_mv)
            movement_result = existing_mv
        else:
            session.delete(existing_mv)
            movement_result = None

    # Actualizar stock final del producto (PRESERVANDO cost_base, cost_iva y cost_shipping)
    product.stock = new_total
    session.add(product)
    session.commit()
    session.refresh(product)
    if movement_result:
        session.refresh(movement_result)

    return {
        "status": "success",
        "message": f"Stock de {product.name} actualizado a {product.stock} unidades ({'+' if diff > 0 else ''}{diff})",
        "product": product,
        "movement": {
            "id": movement_result.id,
            "quantity": movement_result.quantity,
            "amount": float(movement_result.amount),
            "description": movement_result.description,
            "date": movement_result.date
        } if movement_result else None
    }

@router.delete("/{product_id}")
def delete_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.image_base64 and product.image_base64.startswith("/uploads/"):
        delete_disk_file(product.image_base64, UPLOADS_DIR)
    session.delete(product)
    session.commit()
    return {"status": "success", "message": "Product deleted"}
