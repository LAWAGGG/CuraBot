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


class BotUpdateIn(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    api_key: Optional[str] = None
    payment_info: Optional[str] = None

    @field_validator("system_prompt")
    @classmethod
    def prompt_len(cls, v):
        if v is not None and len(v) < 10:
            raise ValueError("system_prompt must be at least 10 characters")
        return v


class OrderStatusIn(BaseModel):
    status: str = Field(pattern="^(pending|incomplete|confirmed|shipped|completed|rejected)$")
    reason: Optional[str] = None


class ReplyIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class ModeIn(BaseModel):
    mode: str = Field(pattern="^(ai|manual)$")


class FileLabelIn(BaseModel):
    label: str = Field(min_length=1, max_length=255)
