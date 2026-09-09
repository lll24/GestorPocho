from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel

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
    cost_base: Decimal = Decimal("0.00")
    cost_iva: Decimal = Decimal("0.00")
    cost_shipping: Decimal = Decimal("0.00")
    sale_price: Decimal = Decimal("0.00")
    sale_extra: Decimal = Decimal("0.00")
    stock: int = 0
    image_base64: Optional[str] = None

class StockAddRequest(BaseModel):
    new_total_stock: Optional[int] = None
    quantity: Optional[int] = None
    unit_cost: Optional[Decimal] = None
    notes: Optional[str] = None

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
