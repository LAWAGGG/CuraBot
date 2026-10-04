from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float,
    ForeignKey, Enum, JSON, Numeric, Index, func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    bots = relationship("Bot", back_populates="user")


class Bot(Base):
    __tablename__ = "bots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    system_prompt = Column(Text, nullable=False)
    api_key_encrypted = Column(String(500), nullable=False)
    telegram_bot_name = Column(String(100), nullable=False, index=True)
    telegram_link = Column(String(200), nullable=False)
    status = Column(Enum("active", "inactive"), default="active")
    payment_info = Column(Text)
    qris_image_path = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="bots")
    files = relationship("UploadedFile", back_populates="bot")
    messages = relationship("Message", back_populates="bot")
    orders = relationship("ExtractedOrder", back_populates="bot")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True, autoincrement=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    extracted_text = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    bot = relationship("Bot", back_populates="files")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    chat_id = Column(String(50), nullable=False)
    message_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    extracted_data = Column(JSON)
    response_time = Column(Float)
    model_used = Column(String(50))
    created_at = Column(DateTime, server_default=func.now(), index=True)
    bot = relationship("Bot", back_populates="messages")


class ExtractedOrder(Base):
    __tablename__ = "extracted_orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    customer_user_id = Column(String(50), nullable=False)
    customer_name = Column(String(255))
    products = Column(JSON, nullable=False)
    total_price = Column(Numeric(10, 2))
    delivery_address = Column(Text)
    customer_phone = Column(String(50))
    status = Column(
        Enum("pending", "incomplete", "confirmed", "shipped", "completed", "rejected"),
        default="pending", index=True,
    )
    rejection_reason = Column(Text)
    payment_proof_path = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    bot = relationship("Bot", back_populates="orders")


class BotChat(Base):
    __tablename__ = "bot_chats"
    id = Column(Integer, primary_key=True, autoincrement=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=False, index=True)
    chat_id = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
