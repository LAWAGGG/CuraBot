import json
import os
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pypdf import PdfReader
from docx import Document
from openpyxl import load_workbook

from . import config, security, schemas, telegram_api, gemini_service, excel_service
from .database import get_db
from .models import User, Bot, UploadedFile, Message, ExtractedOrder, BotChat, ConversationRead

app = FastAPI(title="CuraBot API")
os.makedirs(config.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_origin_regex=config.CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_text_from_file(path: str, filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    try:
        if ext == ".pdf":
            reader = PdfReader(path)
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        if ext in (".docx", ".doc"):
            doc = Document(path)
            return "\n".join(p.text for p in doc.paragraphs)
        if ext == ".xlsx":
            wb = load_workbook(path, read_only=True, data_only=True)
            out = []
            for ws in wb.worksheets:
                out.append(f"[Sheet: {ws.title}]")
                for row in ws.iter_rows(values_only=True):
                    cells = ["" if c is None else str(c) for c in row]
                    if any(cells):
                        out.append(" | ".join(cells))
            wb.close()
            return "\n".join(out)
    except Exception:
        return ""
    return ""


def get_bot_or_404(db: Session, user_id: int, bot_id: int) -> Bot:
    bot = db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == user_id, Bot.status == "active").first()
    if not bot:
        raise HTTPException(404, "Bot not found")
    return bot


def public_bot(bot: Bot) -> dict:
    return {
        "id": bot.id,
        "name": bot.name,
        "system_prompt": bot.system_prompt,
        "telegram_bot_name": bot.telegram_bot_name,
        "telegram_link": bot.telegram_link,
        "payment_info": bot.payment_info,
        "qris_image_url": config.upload_url(bot.id, bot.qris_image_path),
        "status": bot.status,
        "created_at": str(bot.created_at),
    }


def order_to_dict(o: ExtractedOrder) -> dict:
    return {
        "id": o.id,
        "bot_id": o.bot_id,
        "message_id": o.message_id,
        "customer_user_id": o.customer_user_id,
        "customer_name": o.customer_name,
        "products": o.products,
        "total_price": float(o.total_price) if o.total_price is not None else None,
        "delivery_address": o.delivery_address,
        "customer_phone": o.customer_phone,
        "status": o.status,
        "rejection_reason": o.rejection_reason,
        "payment_proof_url": config.upload_url(o.bot_id, o.payment_proof_path),
        "created_at": str(o.created_at),
        "updated_at": str(o.updated_at),
    }


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = {}
    messages = []
    for e in exc.errors():
        field = ".".join(str(p) for p in e.get("loc", []) if p not in ("body", "query", "path"))
        msg = e.get("msg", "Invalid value")
        errors.setdefault(field or "request", []).append(msg)
        messages.append(f"The {field or 'request'} field: {msg}" if field else msg)
    first = messages[0] if messages else "Validation failed."
    summary = first if len(messages) == 1 else f"{first} (and {len(messages) - 1} more error{'s' if len(messages) > 2 else ''})"
    return JSONResponse(status_code=422, content={"message": summary, "errors": errors})


# ---------- AUTH ----------

@app.post("/api/auth/register", status_code=201)
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(409, "Email already registered")
    user = User(email=body.email, password_hash=security.hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}


@app.post("/api/auth/login")
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {
        "access_token": security.create_token(user.id),
        "token_type": "bearer",
        "expires_in": config.JWT_EXPIRE_DAYS * 86400,
    }


@app.post("/api/auth/logout")
def logout(user_id: int = Depends(security.get_current_user)):
    return {"ok": True}


# ---------- BOTS ----------

@app.post("/api/bots/create", status_code=201)
def create_bot(body: schemas.BotCreateIn, user_id: int = Depends(security.get_current_user),
               db: Session = Depends(get_db)):
    bot = Bot(
        user_id=user_id, name=body.name, system_prompt=body.system_prompt,
        api_key_encrypted=security.encrypt(body.api_key),
        payment_info=body.payment_info,
        telegram_bot_name=config.TELEGRAM_BOT_USERNAME,
        telegram_link="",
    )
    db.add(bot)
    db.commit()
    db.refresh(bot)
    bot.telegram_link = f"https://t.me/{config.TELEGRAM_BOT_USERNAME}?start=bot_{bot.id}"
    db.commit()
    db.refresh(bot)
    return public_bot(bot)


@app.get("/api/bots/list")
def list_bots(user_id: int = Depends(security.get_current_user), db: Session = Depends(get_db)):
    bots = (db.query(Bot).filter(Bot.user_id == user_id, Bot.status == "active")
            .order_by(desc(Bot.created_at)).all())
    return {"bots": [public_bot(b) for b in bots]}


@app.get("/api/bots/{bot_id}")
def get_bot_endpoint(bot_id: int, user_id: int = Depends(security.get_current_user),
                     db: Session = Depends(get_db)):
    return public_bot(get_bot_or_404(db, user_id, bot_id))


@app.put("/api/bots/{bot_id}")
def update_bot(bot_id: int, body: schemas.BotUpdateIn, user_id: int = Depends(security.get_current_user),
               db: Session = Depends(get_db)):
    bot = get_bot_or_404(db, user_id, bot_id)
    if body.name is not None:
        bot.name = body.name
    if body.system_prompt is not None:
        bot.system_prompt = body.system_prompt
    if body.api_key is not None:
        bot.api_key_encrypted = security.encrypt(body.api_key)
    if body.payment_info is not None:
        bot.payment_info = body.payment_info
    db.commit()
    db.refresh(bot)
    return public_bot(bot)


@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: int, user_id: int = Depends(security.get_current_user),
               db: Session = Depends(get_db)):
    bot = get_bot_or_404(db, user_id, bot_id)
    bot.status = "inactive"
    db.commit()
    return {"ok": True}


# ---------- FILES ----------

@app.post("/api/files/upload", status_code=201)
def upload_file(bot_id: int = Form(...), file: UploadFile = File(...),
                user_id: int = Depends(security.get_current_user), db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    count = db.query(func.count(UploadedFile.id)).filter(UploadedFile.bot_id == bot_id).scalar()
    if count >= config.MAX_FILES_PER_BOT:
        raise HTTPException(400, f"Max {config.MAX_FILES_PER_BOT} files per bot")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".pdf", ".docx", ".doc", ".xlsx"):
        raise HTTPException(400, "Only PDF, DOCX, and XLSX allowed")
    data = file.file.read()
    if len(data) > config.MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 25MB)")
    dest_dir = os.path.join(config.UPLOAD_DIR, str(bot_id))
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, f"{int(time.time())}_{os.path.basename(file.filename)}")
    with open(dest, "wb") as f:
        f.write(data)
    text = get_text_from_file(dest, file.filename)
    row = UploadedFile(bot_id=bot_id, filename=file.filename, file_path=dest,
                       file_type=ext, file_size=len(data), extracted_text=text)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "filename": row.filename, "file_size": row.file_size, "extracted": bool(text)}


@app.post("/api/bots/{bot_id}/qris", status_code=201)
def upload_qris(bot_id: int, file: UploadFile = File(...),
                user_id: int = Depends(security.get_current_user), db: Session = Depends(get_db)):
    bot = get_bot_or_404(db, user_id, bot_id)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png"):
        raise HTTPException(400, "Only JPG/PNG allowed")
    data = file.file.read()
    if len(data) > config.MAX_FILE_SIZE:
        raise HTTPException(400, "File too large")
    dest_dir = os.path.join(config.UPLOAD_DIR, str(bot_id))
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, f"qris_{int(time.time())}{ext}")
    with open(dest, "wb") as f:
        f.write(data)
    bot.qris_image_path = dest
    db.commit()
    return {"ok": True, "qris_image_url": config.upload_url(bot_id, dest)}


@app.get("/api/files/{bot_id}")
def list_files(bot_id: int, user_id: int = Depends(security.get_current_user),
               db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    rows = (db.query(UploadedFile).filter(UploadedFile.bot_id == bot_id)
            .order_by(desc(UploadedFile.created_at)).all())
    return {"files": [{
        "id": r.id, "bot_id": r.bot_id, "filename": r.filename, "file_type": r.file_type,
        "file_size": r.file_size, "created_at": str(r.created_at),
    } for r in rows]}


@app.delete("/api/files/{file_id}")
def delete_file(file_id: int, user_id: int = Depends(security.get_current_user),
                db: Session = Depends(get_db)):
    row = (db.query(UploadedFile).join(Bot, Bot.id == UploadedFile.bot_id)
           .filter(UploadedFile.id == file_id, Bot.user_id == user_id).first())
    if not row:
        raise HTTPException(404, "File not found")
    try:
        resolved = config.resolve_upload_path(row.file_path)
        if resolved:
            os.remove(resolved)
    except OSError:
        pass
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------- MESSAGES ----------

@app.get("/api/messages/{bot_id}")
def get_messages(bot_id: int, page: int = Query(1, ge=1), limit: int = Query(20, le=100),
                 user_id: int = Depends(security.get_current_user), db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    q = db.query(Message).filter(Message.bot_id == bot_id).order_by(desc(Message.created_at))
    total = q.count()
    rows = q.offset((page - 1) * limit).limit(limit).all()
    return {"page": page, "limit": limit, "total": total, "messages": [
        {
            "id": r.id, "bot_id": r.bot_id, "user_id": r.user_id, "chat_id": r.chat_id,
            "message_text": r.message_text, "response_text": r.response_text,
            "extracted_data": r.extracted_data, "response_time": r.response_time,
            "model_used": r.model_used, "created_at": str(r.created_at),
        } for r in rows]}


def split_bubbles(r, bot_id):
    bubbles = []
    if r.message_text and r.message_text != "[admin]":
        bubbles.append({
            "id": f"{r.id}-u", "sender": "user", "text": r.message_text,
            "media_url": config.upload_url(bot_id, r.media_path),
            "created_at": str(r.created_at),
        })
    if r.response_text:
        bubbles.append({
            "id": f"{r.id}-b", "sender": r.sender if r.sender == "admin" else "bot",
            "text": r.response_text, "media_url": None,
            "created_at": str(r.created_at),
        })
    return bubbles


@app.get("/api/bots/{bot_id}/conversations")
def list_conversations(bot_id: int, q: str = Query("", max_length=100),
                       page: int = Query(1, ge=1), limit: int = Query(20, le=100),
                       user_id: int = Depends(security.get_current_user),
                       db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    sub = (db.query(Message.user_id, func.max(Message.created_at).label("last_at"))
           .filter(Message.bot_id == bot_id).group_by(Message.user_id)
           .subquery())
    rows = (db.query(Message).join(sub,
            (Message.user_id == sub.c.user_id) & (Message.created_at == sub.c.last_at))
            .filter(Message.bot_id == bot_id).order_by(desc(Message.created_at), desc(Message.id)).all())
    seen = set()
    unique_rows = []
    for r in rows:
        if r.user_id in seen:
            continue
        seen.add(r.user_id)
        unique_rows.append(r)
    items = []
    for r in unique_rows:
        order = (db.query(ExtractedOrder)
                 .filter(ExtractedOrder.bot_id == bot_id,
                         ExtractedOrder.customer_user_id == r.user_id,
                         ExtractedOrder.customer_name.isnot(None))
                 .order_by(desc(ExtractedOrder.created_at)).first())
        read = (db.query(ConversationRead)
                .filter(ConversationRead.bot_id == bot_id,
                        ConversationRead.user_id == r.user_id).first())
        unread = 0
        if read:
            unread = (db.query(func.count(Message.id)).filter(
                Message.bot_id == bot_id, Message.user_id == r.user_id,
                Message.created_at > read.last_read_at).scalar() or 0)
        else:
            unread = (db.query(func.count(Message.id)).filter(
                Message.bot_id == bot_id, Message.user_id == r.user_id).scalar() or 0)
        last = split_bubbles(r, bot_id)
        last_b = last[-1] if last else {"sender": "user", "text": r.message_text}
        items.append({
            "user_id": r.user_id,
            "customer_name": order.customer_name if order else None,
            "last_text": last_b.get("text") or "",
            "last_sender": last_b.get("sender") or "user",
            "last_created_at": str(r.created_at),
            "unread_count": unread,
        })
    needle = (q or "").strip().lower()
    if needle:
        items = [i for i in items
                 if needle in (i["customer_name"] or "").lower()
                 or needle in str(i["user_id"]).lower()
                 or needle in (i["last_text"] or "").lower()]
    total = len(items)
    start = (page - 1) * limit
    return {"total": total, "page": page, "limit": limit,
            "conversations": items[start:start + limit]}


@app.get("/api/bots/{bot_id}/conversations/{customer_id}/messages")
def get_thread(bot_id: int, customer_id: str, before_id: int = Query(0, ge=0),
               limit: int = Query(30, le=100),
               user_id: int = Depends(security.get_current_user),
               db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    q = db.query(Message).filter(Message.bot_id == bot_id, Message.user_id == customer_id)
    if before_id:
        q = q.filter(Message.id < before_id)
    rows = q.order_by(desc(Message.created_at), desc(Message.id)).limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    bubbles = []
    for r in reversed(rows):
        bubbles.extend(split_bubbles(r, bot_id))
    return {"bubbles": bubbles, "has_more": has_more}


@app.post("/api/bots/{bot_id}/conversations/{customer_id}/reply")
def reply_thread(bot_id: int, customer_id: str, body: schemas.ReplyIn,
                 user_id: int = Depends(security.get_current_user),
                 db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    latest = (db.query(Message).filter(Message.bot_id == bot_id, Message.user_id == customer_id)
              .order_by(desc(Message.created_at)).first())
    if not latest:
        raise HTTPException(404, "Customer chat not found")
    try:
        telegram_api.send_message(config.TELEGRAM_TOKEN, latest.chat_id, body.text.strip())
    except Exception as e:
        raise HTTPException(502, f"Failed to send Telegram message: {e}")
    msg = Message(bot_id=bot_id, user_id=customer_id, chat_id=latest.chat_id,
                  sender="admin", message_text="[admin]", response_text=body.text.strip())
    db.add(msg)
    db.commit()
    return {"ok": True}


@app.post("/api/bots/{bot_id}/conversations/{customer_id}/read")
def mark_read(bot_id: int, customer_id: str,
              user_id: int = Depends(security.get_current_user),
              db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    row = (db.query(ConversationRead).filter(ConversationRead.bot_id == bot_id,
           ConversationRead.user_id == customer_id).first())
    if not row:
        row = ConversationRead(bot_id=bot_id, user_id=customer_id)
        db.add(row)
    db.commit()
    return {"ok": True}


# ---------- ORDERS ----------

@app.get("/api/bots/{bot_id}/orders")
def get_orders(bot_id: int, page: int = Query(1, ge=1), limit: int = Query(20, le=100),
               status: Optional[str] = None, user_id: int = Depends(security.get_current_user),
               db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    q = db.query(ExtractedOrder).filter(ExtractedOrder.bot_id == bot_id)
    if status:
        q = q.filter(ExtractedOrder.status == status)
    total = q.count()
    rows = q.order_by(desc(ExtractedOrder.created_at)).offset((page - 1) * limit).limit(limit).all()
    return {"page": page, "limit": limit, "total": total, "orders": [order_to_dict(r) for r in rows]}


@app.put("/api/bots/{bot_id}/orders/{order_id}")
def update_order(bot_id: int, order_id: int, body: schemas.OrderStatusIn,
                 user_id: int = Depends(security.get_current_user), db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    order = db.query(ExtractedOrder).filter(ExtractedOrder.id == order_id,
                                            ExtractedOrder.bot_id == bot_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = body.status
    order.rejection_reason = body.reason if body.status == "rejected" else None
    db.commit()

    # webhook ke customer: kabari perubahan status order
    msg_row = db.query(Message).filter(Message.id == order.message_id).first() if order.message_id else None
    if msg_row and msg_row.chat_id:
        status_text = {
            "pending": "menunggu konfirmasi penjual",
            "incomplete": "menunggu kelengkapan data pesanan",
            "confirmed": "sudah dikonfirmasi dan sedang diproses",
            "shipped": "sudah dikirim",
            "completed": "sudah selesai",
            "rejected": "ditolak",
        }.get(body.status, body.status)
        note = f"Halo! Status pesanan Anda saat ini: {status_text}."
        if body.status == "rejected":
            note += f"\nAlasan: {body.reason or '-'}\nSilakan hubungi kami jika ingin memesan ulang."
        elif body.status == "pending":
            note += " Mohon tunggu, kami akan mengabari Anda lagi setelah ada update."
        elif body.status == "incomplete":
            missing = []
            if not order.customer_phone:
                missing.append("nomor handphone")
            if not order.delivery_address:
                missing.append("alamat pengiriman")
            if not (order.products or []):
                missing.append("daftar produk")
            detail = ", ".join(missing) if missing else "data pesanan"
            note += f"\nMohon lengkapi data berikut agar pesanan bisa diproses: {detail}."
        try:
            telegram_api.send_message(config.TELEGRAM_TOKEN, msg_row.chat_id, note)
        except Exception:
            pass
    return {"ok": True}


@app.post("/api/bots/{bot_id}/orders/{order_id}/remind")
def remind_payment(bot_id: int, order_id: int, user_id: int = Depends(security.get_current_user),
                   db: Session = Depends(get_db)):
    bot = get_bot_or_404(db, user_id, bot_id)
    order = db.query(ExtractedOrder).filter(ExtractedOrder.id == order_id,
                                            ExtractedOrder.bot_id == bot_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.payment_proof_path:
        raise HTTPException(400, "Payment proof already received")
    chat_id = None
    if order.message_id:
        msg = db.query(Message).filter(Message.id == order.message_id).first()
        if msg and msg.chat_id:
            chat_id = msg.chat_id
    if not chat_id:
        latest_msg = (db.query(Message)
                      .filter(Message.bot_id == bot_id, Message.user_id == order.customer_user_id)
                      .order_by(desc(Message.created_at)).first())
        if latest_msg and latest_msg.chat_id:
            chat_id = latest_msg.chat_id
    if not chat_id:
        raise HTTPException(404, "Customer chat not found")
    total = f"Rp{float(order.total_price):,.0f}".replace(",", ".") if order.total_price is not None else "-"
    text = (f"Halo {order.customer_name or 'Kak'}! Ini pengingat pembayaran untuk pesanan #{order.id} "
            f"sebesar {total}.\n")
    if bot.payment_info:
        text += f"{bot.payment_info}\n"
    text += "Mohon segera membayar dan kirimkan foto/screenshot bukti pembayaran di chat ini ya. Terima kasih!"
    try:
        telegram_api.send_message(config.TELEGRAM_TOKEN, chat_id, text)
    except Exception as e:
        raise HTTPException(502, f"Failed to send Telegram reminder: {e}")
    return {"ok": True}


@app.get("/api/bots/{bot_id}/orders/export")
def export_orders(bot_id: int, user_id: int = Depends(security.get_current_user),
                  db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    path = os.path.join(config.UPLOAD_DIR, str(bot_id), "orders.xlsx")
    if not os.path.exists(path):
        raise HTTPException(404, "No orders exported yet")
    return FileResponse(path, filename="orders.xlsx",
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ---------- ANALYTICS ----------

@app.get("/api/bots/{bot_id}/analytics")
def analytics(bot_id: int, range: int = Query(7, ge=1, le=365),
              user_id: int = Depends(security.get_current_user), db: Session = Depends(get_db)):
    get_bot_or_404(db, user_id, bot_id)
    since = datetime.utcnow() - timedelta(days=range)

    total_conv = db.query(func.count(Message.id)).filter(Message.bot_id == bot_id, Message.created_at >= since).scalar()
    unique_users = db.query(func.count(func.distinct(Message.user_id))).filter(Message.bot_id == bot_id, Message.created_at >= since).scalar()
    avg_rt = db.query(func.avg(Message.response_time)).filter(Message.bot_id == bot_id, Message.created_at >= since).scalar()
    total_orders = db.query(func.count(ExtractedOrder.id)).filter(ExtractedOrder.bot_id == bot_id, ExtractedOrder.created_at >= since).scalar()
    orders_extracted = db.query(func.count(ExtractedOrder.id)).filter(ExtractedOrder.bot_id == bot_id, ExtractedOrder.status != "incomplete", ExtractedOrder.created_at >= since).scalar()

    model_rows = (db.query(Message.model_used, func.count(Message.id))
                  .filter(Message.bot_id == bot_id, Message.created_at >= since)
                  .group_by(Message.model_used).all())
    total_m = sum(c for _, c in model_rows) or 1
    success = sum(c for m, c in model_rows if m in ("flash-3.6", "flash-3.5-lite"))

    per_day = (db.query(func.date(Message.created_at), func.count(Message.id))
               .filter(Message.bot_id == bot_id, Message.created_at >= since)
               .group_by(func.date(Message.created_at)).order_by(func.date(Message.created_at)).all())
    orders_day = (db.query(func.date(ExtractedOrder.created_at), func.count(ExtractedOrder.id))
                  .filter(ExtractedOrder.bot_id == bot_id, ExtractedOrder.created_at >= since)
                  .group_by(func.date(ExtractedOrder.created_at)).order_by(func.date(ExtractedOrder.created_at)).all())

    return {
        "total_conversations": total_conv,
        "unique_users": unique_users,
        "avg_response_time": round(float(avg_rt), 2) if avg_rt else 0,
        "total_orders": total_orders,
        "orders_extracted": orders_extracted,
        "model_success_rate": round(success / total_m * 100, 1),
        "conversations_per_day": [{"date": str(d), "count": c} for d, c in per_day],
        "orders_per_day": [{"date": str(d), "count": c} for d, c in orders_day],
    }


# ---------- TELEGRAM WEBHOOK ----------

@app.post("/api/telegram/webhook")
async def telegram_webhook(payload: dict, db: Session = Depends(get_db)):
    message = payload.get("message") or {}
    chat_id = message.get("chat", {}).get("id")
    # customer share contact -> isi otomatis customer_phone di order aktif/terakhir
    contact = message.get("contact")
    if contact and contact.get("phone_number"):
        binding = db.query(BotChat).filter(BotChat.chat_id == str(chat_id)).first()
        if binding:
            latest = (db.query(ExtractedOrder)
                      .join(Message, Message.id == ExtractedOrder.message_id)
                      .filter(ExtractedOrder.bot_id == binding.bot_id, Message.chat_id == str(chat_id))
                      .order_by(desc(ExtractedOrder.created_at)).first())
            if latest and not latest.customer_phone:
                latest.customer_phone = contact["phone_number"]
                db.commit()
        return {"ok": True}
    text = (message.get("text") or "").strip()
    # customer mengirim foto bukti pembayaran -> simpan & teruskan ke dashboard, status TIDAK diubah AI
    photos = message.get("photo") or []
    if photos:
        chat_id = message.get("chat", {}).get("id")
        binding = db.query(BotChat).filter(BotChat.chat_id == str(chat_id)).first()
        if binding:
            bot = db.query(Bot).filter(Bot.id == binding.bot_id, Bot.status == "active").first()
            if bot:
                try:
                    fid = photos[-1]["file_id"]
                    info = telegram_api.get_file(config.TELEGRAM_TOKEN, fid)
                    data = telegram_api.download_file(config.TELEGRAM_TOKEN, info["file_path"])
                    dest_dir = os.path.join(config.UPLOAD_DIR, str(bot.id))
                    os.makedirs(dest_dir, exist_ok=True)
                    dest = os.path.join(dest_dir, f"proof_{int(time.time())}.jpg")
                    with open(dest, "wb") as f:
                        f.write(data)
                    latest = (db.query(ExtractedOrder)
                              .join(Message, Message.id == ExtractedOrder.message_id)
                              .filter(ExtractedOrder.bot_id == bot.id, Message.chat_id == str(chat_id),
                                      ExtractedOrder.status.in_(["pending", "incomplete"]))
                              .order_by(desc(ExtractedOrder.created_at)).first())
                    if latest:
                        latest.payment_proof_path = dest
                        db.commit()
                    telegram_api.send_message(config.TELEGRAM_TOKEN, chat_id,
                                              "Terima kasih, bukti pembayaran sudah kami terima dan diteruskan ke penjual. Mohon tunggu konfirmasi ya.")
                except Exception:
                    telegram_api.send_message(config.TELEGRAM_TOKEN, chat_id,
                                              "Maaf, bukti tidak bisa kami proses. Coba kirim ulang ya.")
        return {"ok": True}
    if not text:
        return {"ok": True}
    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from", {})
    uid = str(from_user.get("id", ""))
    customer_name = " ".join(filter(None, [from_user.get("first_name"), from_user.get("last_name")])) or None
    token = config.TELEGRAM_TOKEN

    if text.lower().startswith("/start"):
        arg = text.split(maxsplit=1)[1] if len(text.split(maxsplit=1)) > 1 else ""
        if arg.startswith("bot_"):
            try:
                target_id = int(arg[4:])
            except ValueError:
                target_id = None
            bot = (db.query(Bot).filter(Bot.id == target_id, Bot.status == "active").first()
                   if target_id else None)
            if bot:
                existing = db.query(BotChat).filter(BotChat.chat_id == str(chat_id)).first()
                if existing:
                    existing.bot_id = bot.id
                else:
                    db.add(BotChat(bot_id=bot.id, chat_id=str(chat_id)))
                db.commit()
                try:
                    telegram_api.send_message(token, chat_id, f"Connected to {bot.name}. How can I help you?")
                except Exception:
                    pass
                return {"ok": True}
        try:
            telegram_api.send_message(token, chat_id, "Welcome! Please use a bot link shared by the business to start.")
        except Exception:
            pass
        return {"ok": True}

    binding = db.query(BotChat).filter(BotChat.chat_id == str(chat_id)).first()
    if not binding:
        try:
            telegram_api.send_message(token, chat_id, "Please start via a bot link shared by the business.")
        except Exception:
            pass
        return {"ok": True}
    bot = db.query(Bot).filter(Bot.id == binding.bot_id, Bot.status == "active").first()
    if not bot:
        return {"ok": True}
    bot_id = bot.id
    api_key = security.decrypt(bot.api_key_encrypted)

    history_rows = (db.query(Message)
                    .filter(Message.bot_id == bot_id, Message.chat_id == str(chat_id))
                    .order_by(desc(Message.created_at)).limit(5).all())
    history = []
    for r in reversed(history_rows):
        history.append({"role": "user", "text": r.message_text})
        history.append({"role": "model", "text": r.response_text})

    files = (db.query(UploadedFile)
             .filter(UploadedFile.bot_id == bot_id, UploadedFile.extracted_text != "").all())
    file_context = "\n\n".join((f.extracted_text or "")[:3000] for f in files)

    # status order terakhir untuk konteks jawaban AI
    latest_order = (db.query(ExtractedOrder)
                    .join(Message, Message.id == ExtractedOrder.message_id)
                    .filter(ExtractedOrder.bot_id == bot_id, Message.chat_id == str(chat_id))
                    .order_by(desc(ExtractedOrder.created_at)).first())
    system_prompt = bot.system_prompt
    if latest_order:
        guidance = {
            "pending": "katakan pesanan sedang menunggu konfirmasi penjual, minta customer menunggu, akan diinformasikan lagi.",
            "incomplete": "katakan data pesanan belum lengkap, minta customer melengkapi data yang kurang saja (lihat detail di bawah).",
            "confirmed": "katakan pesanan sudah dikonfirmasi dan sedang diproses.",
            "shipped": "katakan pesanan sudah dikirim.",
            "completed": "katakan pesanan sudah selesai, tawarkan belanja lagi.",
            "rejected": f"katakan pesanan ditolak. Alasan: {latest_order.rejection_reason or '-'}. Tawarkan pesan ulang.",
        }.get(latest_order.status, "")
        if latest_order.status == "incomplete":
            missing = []
            if not latest_order.customer_phone:
                missing.append("nomor handphone")
            # alamat hanya ditanya jika layanan delivery tersedia dan alamat belum diisi; jika "Onsite", jangan tanya
            if not latest_order.delivery_address:
                missing.append("alamat pengiriman (hanya untuk pengiriman/delivery; jika pesan di tempat, isi 'Onsite')")
            if not (latest_order.products or []):
                missing.append("daftar produk")
            if latest_order.delivery_address and latest_order.delivery_address.strip().lower() == "onsite":
                missing = [m for m in missing if not m.startswith("alamat")]
            guidance += f" Data yang masih kurang: {', '.join(missing) if missing else 'tidak ada — data sudah lengkap'}."
        system_prompt += f"\n\nINFO STATUS PESANAN CUSTOMER SAAT INI: status='{latest_order.status}'. Jika customer bertanya status pesanan, {guidance}"
        detail = {"products": latest_order.products, "total_price": float(latest_order.total_price) if latest_order.total_price else None,
                  "delivery_address": latest_order.delivery_address, "customer_phone": latest_order.customer_phone}
        system_prompt += (f"\n\nDETAIL PESANAN CUSTOMER: {detail}. Jika customer bertanya apa saja pesanannya, "
                          "makan di tempat atau tidak, harga, atau data pesanan lainnya, JAWAB LANGSUNG dari data ini, jangan hanya menyebutkan status.")
        if latest_order.status in ("rejected", "completed", "shipped"):
            system_prompt += ("\n\nPENTING: Jangan mencatat pesanan baru kecuali customer secara eksplisit menyebut produk yang ingin dipesan ulang. "
                              "Kalau customer hanya menanggapi/merespon pesan, balas singkat saja tanpa mencatat pesanan.")
    system_prompt += ("\n\nATURAN KONFIRMASI: Sebelum menyatakan pesanan sudah dicatat/diubah, SELALU ulangi ringkasan lengkap pesanan (produk, jumlah, harga, dan catatan/note per item masing-masing) dan minta konfirmasi customer (\"Benar, Kak?\"). "
                      "Baru setelah customer mengiyakan, katakan pesanan sudah tercatat/terupdate. "
                      "Kalau customer meralat, jawab ringkasan baru dan minta konfirmasi lagi.")
    addr_ok = bool((latest_order.delivery_address or "").strip()) if latest_order else False
    data_complete = bool(
        latest_order and latest_order.customer_name and latest_order.customer_phone
        and (latest_order.products or []) and latest_order.total_price is not None and addr_ok
    )
    if bot.payment_info and data_complete and latest_order.status in ("pending", "incomplete"):
        total_str = f"Rp{float(latest_order.total_price):,.0f}".replace(",", ".")
        system_prompt += ("\n\nTAHAP PEMBAYARAN: Data pesanan customer sudah lengkap. "
                          "Tegaskan dan ingatkan customer agar segera membayar sekarang. "
                          f"Total yang harus dibayar: {total_str}. "
                          "Sampaikan instruksi berikut persis dari penjual: " + bot.payment_info)
        if not latest_order.payment_proof_path:
            system_prompt += ("\n\nPENGINGAT BUKTI BAYAR: Customer belum mengirim bukti pembayaran. "
                              "Di setiap balasan, akhiri dengan ajakan tegas mengirimkan foto/screenshot "
                              "bukti pembayaran di chat ini sebelum pesanan diproses. "
                              "Ikuti gaya bahasa pada system prompt.")
    has_payment_info = bool((bot.payment_info or "").strip())
    has_qris = bool(bot.qris_image_path)
    pay_state = f"ada: {bot.payment_info.strip()}" if has_payment_info else "KOSONG (penjual belum mengisi info pembayaran)"
    qris_state = "TERSEDIA (gambar QRIS penjual sudah diupload)" if has_qris else "TIDAK TERSEDIA (penjual belum upload gambar QRIS)"
    system_prompt += (
        "\n\nINFO PEMBAYARAN (ground truth, prioritas tertinggi untuk topik bayar): "
        f"payment_info={pay_state}; qris_image={qris_state}."
        "\nATURAN PEMBAYARAN (wajib, kalahkan instruksi lain): "
        "1. Jawab bayar/transfer/rekening/nomor rekening/QRIS HANYA dari info di atas. "
        "2. DILARANG mengarang nomor rekening/bank/VA/QRIS. "
        "3. Tautan toko/website di system prompt BUKAN metode pembayaran — JANGAN sebut/arahkan ke link toko saat ditanya pembayaran, "
        "kecuali payment_info di atas eksplisit memuat link itu sebagai cara bayar. "
        "4. Ditanya rekening: payment_info ada -> kutip persis; kosong -> katakan info pembayaran belum diisi penjual, minta tunggu, jangan arahkan ke website. "
        "5. Ditanya QRIS: TERSEDIA -> katakan QRIS tersedia dan gambarnya menyusul tepat setelah pesan ini; "
        "TIDAK TERSEDIA -> katakan QRIS belum tersedia, tawarkan payment_info bila ada, bila kosong katakan tunggu info penjual. "
        "6. Setiap customer bertanya soal pembayaran/cara bayar (umum, bukan spesifik satu metode): "
        "sodorkan LANGSUNG semua metode yang ada tanpa menunggu diminta satu per satu. "
        "Keduanya ada -> tampilkan daftar: 1) nomor rekening (kutip persis payment_info) 2) QRIS (katakan gambarnya menyusul). "
        "Hanya satu yang ada -> tampilkan yang ada itu langsung dan lengkap. "
        "Keduanya kosong -> katakan info pembayaran belum diisi penjual, minta tunggu. "
        "Jangan pernah katakan 'belum tersedia' untuk hal yang ground truth sebut TERSEDIA/ada."
    )

    start = time.time()
    try:
        reply, model_used = gemini_service.chat_with_fallback(api_key, system_prompt, file_context, history, text)
    except Exception:
        reply, model_used = "Sorry, there is a temporary issue. Please try again in a moment.", "none"
    response_time = round(time.time() - start, 2)

    try:
        telegram_api.send_message(token, chat_id, reply)
    except Exception:
        pass

    # customer minta qris & ada gambar QRIS -> kirim gambarnya
    if bot.qris_image_path and "qris" in text.lower():
        try:
            telegram_api.send_photo(token, chat_id, config.resolve_upload_path(bot.qris_image_path), caption="QRIS pembayaran")
            try:
                telegram_api.send_message(token, chat_id, "Itu gambar QRIS resmi dari penjual di atas ya. Setelah membayar, kirimkan foto/screenshot bukti pembayaran di chat ini.")
            except Exception:
                pass
        except Exception:
            telegram_api.send_message(token, chat_id, "Maaf, gambar QRIS gagal dikirim. Coba minta lagi atau hubungi penjual ya.")

    # ponytail: sertakan "incomplete" -> order yang masih dilengkapi tidak dobel
    existing = (db.query(ExtractedOrder)
                .join(Message, Message.id == ExtractedOrder.message_id)
                .filter(ExtractedOrder.bot_id == bot_id, Message.chat_id == str(chat_id),
                        ExtractedOrder.status.in_(["pending", "incomplete"]))
                .order_by(desc(ExtractedOrder.created_at)).first())
    existing_summary = None
    if existing:
        existing_summary = {
            "products": existing.products, "total_price": float(existing.total_price) if existing.total_price else None,
            "delivery_address": existing.delivery_address, "customer_phone": existing.customer_phone,
        }
    try:
        order = gemini_service.extract_order(api_key, text, history, existing_summary, (file_context or "") + "\n" + (bot.system_prompt or ""))
    except Exception:
        order = None

    msg = Message(bot_id=bot_id, user_id=uid, chat_id=str(chat_id), message_text=text,
                  response_text=reply, extracted_data=order, response_time=response_time,
                  model_used=model_used)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # ponytail: hanya simpan/update order setelah customer mengonfirmasi ringkasan dari AI
    if order and existing and order.get("customer_confirmed"):
        # 1 chat 1 open order — selalu merge ke order yang sama, field null tidak menimpa isi lama
        new_products = order.get("products") or existing.products
        # ponytail: note per produk — bila AI menghilangkan note lama untuk produk yg sama, pulihkan
        try:
            old_notes = {str(p.get("product_name", "")).lower(): p.get("note") for p in (existing.products or [])}
            for p in new_products:
                if not p.get("note"):
                    old = old_notes.get(str(p.get("product_name", "")).lower())
                    if old:
                        p["note"] = old
        except Exception:
            pass
        existing.products = new_products
        existing.total_price = order.get("total_price") if order.get("total_price") is not None else existing.total_price
        existing.delivery_address = order.get("delivery_address") or existing.delivery_address
        existing.customer_phone = order.get("customer_phone") or existing.customer_phone
        if not existing.customer_name and order.get("customer_name"):
            existing.customer_name = order.get("customer_name")
        # ponytail: status TIDAK diubah dari sisi chat — hanya creator yang boleh mengubah status order
        db.commit()
    elif order and order.get("customer_confirmed"):
        status = "pending" if order.get("total_price") is not None else "incomplete"
        db.add(ExtractedOrder(
            bot_id=bot_id, message_id=msg.id, customer_user_id=uid,
            customer_name=order.get("customer_name") or customer_name,
            products=order["products"], total_price=order.get("total_price"),
            delivery_address=order.get("delivery_address"), customer_phone=order.get("customer_phone"),
        ))
        db.commit()
        try:
            excel_service.append_order(bot_id, order, uid, status)
        except Exception:
            pass

    return {"ok": True}


@app.on_event("startup")
def setup_webhook():
    if config.TELEGRAM_TOKEN and config.BASE_URL.startswith("https://"):
        try:
            telegram_api.set_webhook(config.TELEGRAM_TOKEN, f"{config.BASE_URL}/api/telegram/webhook")
        except Exception:
            pass
    if config.TELEGRAM_TOKEN and not config.TELEGRAM_BOT_USERNAME:
        try:
            config.TELEGRAM_BOT_USERNAME = telegram_api.get_me(config.TELEGRAM_TOKEN).get("username", "")
        except Exception:
            pass


@app.get("/api/health")
def health():
    return {"status": "ok"}
