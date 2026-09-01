from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship

class BusinessConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=1, primary_key=True)
    name: str = "Mi Emprendimiento"
    logo_base64: Optional[str] = None
    color_primary: str = "#6366f1"  # Color principal de marca
    theme: str = "dark"             # "dark" o "light"
    dollar_rate: Decimal = Field(default=Decimal("45.00"))

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    cost_base: Decimal = Field(default=Decimal("0.00"))
    cost_iva: Decimal = Field(default=Decimal("0.00"))       # Percentage, e.g. 16.00
    cost_shipping: Decimal = Field(default=Decimal("0.00"))
    sale_price: Decimal = Field(default=Decimal("0.00"))
    sale_extra: Decimal = Field(default=Decimal("0.00"))
    stock: int = 0
    image_base64: Optional[str] = None

    # Relationship to sale items (for history, optional)
    sale_items: List["SaleItem"] = Relationship(back_populates="product")

class SaleItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sale_id: int = Field(foreign_key="sale.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int = 1
    unit_cost: Decimal = Field(default=Decimal("0.00"))  # Saved at time of sale
    unit_sale_price: Decimal = Field(default=Decimal("0.00"))  # Saved at time of sale

    sale: "Sale" = Relationship(back_populates="items")
    product: Product = Relationship(back_populates="sale_items")

class Sale(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: datetime = Field(default_factory=datetime.now)
    payment_method: str = "divisas"  # divisas, pagomovil, transferencia, binance
    payment_reference: Optional[str] = None
    payment_capture_base64: Optional[str] = None
    client_name: Optional[str] = None
    delivery_cost: Decimal = Field(default=Decimal("0.00"))
    total_cost: Decimal = Field(default=Decimal("0.00"))
    total_revenue: Decimal = Field(default=Decimal("0.00"))
    total_profit: Decimal = Field(default=Decimal("0.00"))
    dollar_rate: Decimal = Field(default=Decimal("45.00"))  # The dollar rate saved at time of sale

    items: List[SaleItem] = Relationship(back_populates="sale")
