from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BotCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    system_prompt: str = Field(min_length=10)
    api_key: str = Field(min_length=10)
    payment_info: Optional[str] = None
    cash_enabled: Optional[bool] = None


class BotUpdateIn(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    api_key: Optional[str] = None
    payment_info: Optional[str] = None
    cash_enabled: Optional[bool] = None

    @field_validator("system_prompt")
    @classmethod
    def prompt_len(cls, v):
        if v is not None and len(v) < 10:
            raise ValueError("system_prompt must be at least 10 characters")
        return v


class OrderStatusIn(BaseModel):
    status: str = Field(pattern="^(pending|incomplete|confirmed|shipped|completed|rejected)$")
    reason: Optional[str] = None


class OrderProductIn(BaseModel):
    product_name: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=1, ge=1, le=1000)
    price: float = Field(default=0, ge=0)
    note: Optional[str] = Field(default=None, max_length=500)


class OrderCreateIn(BaseModel):
    customer_name: str = Field(min_length=1, max_length=255)
    customer_phone: Optional[str] = Field(default=None, max_length=50)
    delivery_address: Optional[str] = None
    customer_user_id: Optional[str] = Field(default=None, max_length=50)
    products: List[OrderProductIn] = Field(min_length=1, max_length=100)
    total_price: Optional[float] = Field(default=None, ge=0)
    status: str = Field(default="pending", pattern="^(pending|incomplete|confirmed|shipped|completed|rejected)$")


class OrderUpdateIn(BaseModel):
    customer_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    customer_phone: Optional[str] = Field(default=None, max_length=50)
    delivery_address: Optional[str] = None
    customer_user_id: Optional[str] = Field(default=None, max_length=50)
    products: Optional[List[OrderProductIn]] = Field(default=None, max_length=100)
    total_price: Optional[float] = Field(default=None, ge=0)
    status: Optional[str] = Field(default=None, pattern="^(pending|incomplete|confirmed|shipped|completed|rejected)$")
    reason: Optional[str] = None


class ReplyIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    reply_to_bubble_id: Optional[str] = Field(default=None, max_length=50)

    @field_validator("text")
    @classmethod
    def text_not_blank(cls, v):
        if not v.strip():
            raise ValueError("Reply text empty")
        return v


class ModeIn(BaseModel):
    mode: str = Field(pattern="^(ai|manual)$")


class FileLabelIn(BaseModel):
    label: str = Field(min_length=1, max_length=255)

    @field_validator("label")
    @classmethod
    def label_not_blank(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("label cannot be blank")
        return v


class BulkIdsIn(BaseModel):
    ids: List[int] = Field(min_length=1, max_length=200)


class SourceCreateIn(BaseModel):
    kind: str = Field(pattern="^(sheet|drive_folder)$")
    url: str = Field(min_length=10, max_length=2000)
    tab: Optional[str] = Field(default=None, max_length=255)


class SourceMappingIn(BaseModel):
    name_col: Optional[int] = Field(default=None, ge=0, le=100)
    price_col: Optional[int] = Field(default=None, ge=0, le=100)
    stock_col: Optional[int] = Field(default=None, ge=0, le=100)
    image_col: Optional[int] = Field(default=None, ge=0, le=100)
    tab: Optional[str] = Field(default=None, max_length=255)
