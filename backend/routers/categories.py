from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Category, Subcategory
from schemas import CategoryCreate, SubcategoryCreate

router = APIRouter(prefix="/api", tags=["categories"])

@router.get("/categories")
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

@router.post("/categories")
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

@router.post("/categories/{category_id}/subcategories")
def create_subcategory(category_id: int, sub_data: SubcategoryCreate, session: Session = Depends(get_session)):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    sub = Subcategory(name=sub_data.name.strip(), category_id=category_id)
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return {"id": sub.id, "name": sub.name, "category_id": sub.category_id}

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session)):
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    session.delete(cat)
    session.commit()
    return {"status": "success", "message": "Categoría eliminada"}

@router.delete("/subcategories/{subcategory_id}")
def delete_subcategory(subcategory_id: int, session: Session = Depends(get_session)):
    sub = session.get(Subcategory, subcategory_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
    session.delete(sub)
    session.commit()
    return {"status": "success", "message": "Subcategoría eliminada"}
