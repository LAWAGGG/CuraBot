# PRODUCT REQUIREMENT DOCUMENT (PRD)
## CuraBot - Telegram AI Bot Platform

---

## 1. EXECUTIVE SUMMARY

**Project Name:** CuraBot - Telegram AI Bot Platform  
**Duration:** 8 weeks (2 months)  
**Status:** Development Phase  
**Target Users:** Small business owners, online sellers, service providers  
**Core Value:** Enable non-technical users to create AI-powered Telegram bots for customer service automation with order extraction & file context processing using Gemini API.

**Key Features:**
- Telegram-based platform (each bot = separate @botname)
- One bot = one Telegram bot token
- QR code generation on frontend
- Gemini API (Flash 3.6 primary, Flash 3.5 Lite fallback)
- No registration code needed (direct bot access via @botname)

---

## 2. PROJECT OVERVIEW

### 2.1 Problem Statement
- Small business owners need 24/7 customer service but can't afford hiring
- Manual Telegram responses are time-consuming
- Current solutions are expensive or require coding knowledge
- Need to track orders automatically from conversations
- Customers should have seamless Telegram experience (one-click access to bot)
- WhatsApp has limitations (one number, rate limiting, approval barriers)

### 2.2 Solution
A platform where:
- Users create custom AI bots with their own Gemini API keys
- Each bot gets separate Telegram bot (@botname_xxx)
- Users generate shareable Telegram link or QR code
- Bots handle conversations naturally (LLM-based with inline buttons)
- Auto-extract structured data (orders) → save to Excel
- Monitor conversations & analytics in dashboard

### 2.3 Success Metrics
- User can create & deploy bot within 5 minutes
- Bot correctly responds to 95% of natural language queries
- Order extraction accuracy ≥ 90%
- Platform response time < 2 seconds per message
- Telegram bot link/QR code shareable & accessible
- Customer experience: tap link/scan QR → Telegram opens → tap START → chat

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 User Authentication & Authorization
**ID:** FR-001

System must handle secure user registration, login, and session management.

**Requirements:**
- POST /api/auth/register: Email, password validation (min 8 chars)
- POST /api/auth/login: Email + password → JWT token (valid 30 days)
- POST /api/auth/logout: Invalidate JWT
- Password hashing using bcrypt
- JWT validation on every protected route

**Acceptance Criteria:**
- User successfully register with valid email & password
- User login with correct credentials
- Invalid credentials return 401 error
- Expired token returns 401 error

---

### 3.2 Bot Configuration Management
**ID:** FR-002

Users can create, edit, view, and delete custom AI bots with unique Telegram bot token.

**Requirements:**
- POST /api/bots/create: name, system_prompt, api_key (Gemini), telegram_token
- GET /api/bots/{bot_id}: Retrieve bot config
- GET /api/bots/list: List all bots for logged-in user
- PUT /api/bots/{bot_id}: Update bot config
- DELETE /api/bots/{bot_id}: Delete bot (deactivate Telegram webhook)
- Auto-generate unique bot_name (format: "curabot_{user_id}_{random_hex}")
- Auto-generate Telegram bot link: https://t.me/{bot_name}
- Encrypt Telegram token & Gemini API key before storing
- Validate system_prompt not empty (min 10 chars)
- Register webhook with Telegram Bot API: setWebhook

**Acceptance Criteria:**
- Bot created successfully with all fields
- Telegram token encrypted & cannot be viewed in plaintext
- Bot name unique per bot
- Telegram bot link valid & points to correct bot
- Webhook registered with Telegram
- Bot config can be updated without affecting active conversations
- Deleting bot deactivates webhook & soft-deletes from DB

---

### 3.3 File Upload & Management
**ID:** FR-003

Users can upload PDF/DOCX files to provide context for bot.

**Requirements:**
- POST /api/files/upload: Upload file (PDF, DOCX only)
- GET /api/files/{bot_id}: List uploaded files
- DELETE /api/files/{file_id}: Delete file
- File size limit: 25MB per file, max 10 files per bot
- File stored in `/uploads/{bot_id}/` folder
- Extract text from PDF & DOCX automatically

**Acceptance Criteria:**
- PDF/DOCX uploaded successfully
- Text extracted within 5 seconds
- File list shows all uploaded files with size & upload date
- Delete removes file from disk & database

---

### 3.4 Telegram Bot Creation & Link Generation
**ID:** FR-004

Generate unique Telegram bot and shareable link for each bot.

**Requirements:**
- User provides Telegram bot token (created via @BotFather)
- Auto-generate bot_name (format: "curabot_{user_id}_{random_hex}")
- Generate Telegram bot link: https://t.me/{bot_name}
- Register webhook with Telegram Bot API
- Store bot_name & telegram_token_encrypted in database
- Link is shareable on Telegram, Instagram, TikTok, print (QR code), etc
- When customer taps link, Telegram opens with START option

**Acceptance Criteria:**
- Bot name unique per bot
- Telegram link valid & clickable
- Webhook successfully registered with Telegram
- Link opens Telegram app (mobile) or web version (desktop)
- Customer can START conversation with single tap

---

### 3.5 Telegram Webhook & Message Routing
**ID:** FR-005

Receive incoming Telegram messages, identify bot via webhook, process message.

**Requirements:**
- POST /api/telegram/webhook: Receive Telegram update events
- Telegram sends: update_id, message (from, chat, text, etc)
- Extract: user_id, chat_id, message_text from Telegram payload
- Route message to correct bot (via webhook URL path)
- Query bots table: SELECT bot_id WHERE telegram_token matches webhook
- Save conversation to database
- Reply via Telegram Bot API within 3 seconds

**Acceptance Criteria:**
- Webhook receives message from Telegram correctly
- Message routed to correct bot
- Conversation saved with user_id & chat_id
- Reply sent back via Telegram within SLA
- Webhook signature validation (optional, Telegram uses HTTPS)

---

### 3.6 AI Message Processing with Gemini API
**ID:** FR-006

Process user message using Gemini LLM with context from uploaded files.

**Requirements:**
- Load bot config: system_prompt, api_key (Gemini)
- Load uploaded files context (extracted text)
- Load message history (last 5 messages for context)
- Decrypt user's Gemini API key (charge to their account)
- Call Gemini API with:
  - model: "gemini-1.5-flash" (PRIMARY)
  - temperature: 0.7
  - max_output_tokens: 1024
  - timeout: 10 seconds
- If primary model fails → fallback to "gemini-1.5-flash-8b" (LITE)
- If both fail → return friendly message "Maaf, sedang ada gangguan"
- Track which model was used (flash-3.6 or flash-3.5-lite)
- Format response for Telegram (support markdown, inline buttons optional)

**Acceptance Criteria:**
- Bot understands intent from natural language
- Response uses context from uploaded files
- Primary model (Flash 3.6) succeeds 95% of time
- Fallback model (Flash 3.5 Lite) catches remaining errors
- Response time < 3 seconds
- Response formatted correctly for Telegram

---

### 3.7 Order Data Extraction
**ID:** FR-007

Auto-extract structured order data from conversations.

**Requirements:**
- Detect if message contains order intent
- Use AI extraction prompt to parse:
  - products: [{product_name, quantity, price}]
  - total_price: number
  - delivery_address: string
  - customer_phone: string
  - special_requests: string (optional)
- Return extraction as JSON
- Save extraction to extracted_orders table
- Mark status = 'pending' on create
- Validate extraction: if total_price missing, mark as 'incomplete'

**Acceptance Criteria:**
- Order correctly extracted from natural language
- All fields present (if available in message)
- Extraction saved to database
- Non-order messages don't trigger extraction

---

### 3.8 Excel File Generation & Management
**ID:** FR-008

Auto-generate & maintain orders.xlsx file for each bot.

**Requirements:**
- Auto-create `/uploads/{bot_id}/orders.xlsx` on first order
- Append row on each new order extraction
- Columns: timestamp, customer_name, customer_id, product_names, qty, total_price, address, status
- Update order status: pending → confirmed → shipped → completed
- Auto-backup (keep 5 recent versions)

**Acceptance Criteria:**
- Excel file created on first order
- New orders appended correctly
- Status updates reflect in spreadsheet
- File not corrupted after 100+ rows

---

### 3.9 Conversation History & Logging
**ID:** FR-009

Log all conversations for audit trail & debugging.

**Requirements:**
- Every message saved to messages table
- Store: bot_id, user_id, chat_id, message_text, response_text, extracted_data (JSON), model_used, timestamp
- GET /api/messages/{bot_id}: Retrieve conversation history (paginated, 20 per page)
- Messages sorted by timestamp DESC
- Purge old messages after 90 days (configurable)

**Acceptance Criteria:**
- Every conversation logged
- Can view full conversation thread per user/bot
- Pagination works correctly

---

### 3.10 Dashboard & Analytics
**ID:** FR-010

Creator can monitor bot performance & conversations.

**Requirements:**
- GET /api/bots/{bot_id}/analytics: Return metrics
  - total_conversations
  - unique_users
  - avg_response_time
  - total_orders
  - orders_extracted
  - model_success_rate
- GET /api/bots/{bot_id}/orders: List all extracted orders with pagination
- Display on dashboard:
  - Bot status (active/inactive)
  - Telegram bot name & link
  - Real-time conversation count
  - Recent conversations (last 10)
  - Orders list with status

**Acceptance Criteria:**
- Analytics load within 2 seconds
- Numbers are accurate vs database
- Orders list sortable by date/status

---

## 4. TECHNICAL REQUIREMENTS

### 4.1 Architecture

```
Customer Telegram
        ↓
Telegram Bot API (One bot per @botname)
        ↓
FastAPI Webhook (/api/telegram/webhook)
├─ Parse Telegram update
├─ Route to correct bot
├─ Get bot config
        ↓
Gemini API Processing
├─ Primary: Flash 3.6
└─ Fallback: Flash 3.5 Lite
        ↓
MySQL Database
        ↓
Response via Telegram Bot API → Customer
```

### 4.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.x |
| Frontend Build | Vite | 5.x |
| Frontend Styling | Tailwind CSS | 3.x |
| Frontend QR | qrcode.react | 3.x |
| Backend | FastAPI | 0.104+ |
| Backend Server | Uvicorn | 0.24+ |
| Database | MySQL | 8.0+ |
| Database Driver | mysql-connector-python | 8.2+ |
| Validation | Pydantic | 2.5+ |
| File Processing | pypdf, python-docx | latest |
| Auth | PyJWT | 2.8+ |
| Encryption | cryptography | 41.0+ |
| AI API | google-generativeai | 0.4+ |
| Telegram | python-telegram-bot | 20.x |
| Environment | python-dotenv | 1.0+ |

### 4.3 Development Environment

**Backend:**
- Python 3.10+
- FastAPI framework
- MySQL 8.0 locally
- Postman for API testing

**Frontend:**
- Node.js 18+
- npm/yarn
- React DevTools

**Local Stack:**
```
Backend: http://localhost:8000
Frontend: http://localhost:5173
Database: localhost:3306
Telegram: Bot API (no local needed, direct HTTPS)
```

### 4.4 Security Requirements

- API key encryption using cryptography.Fernet
- JWT token with 30-day expiration
- CORS enabled only for frontend origin
- Password hashing with bcrypt (cost factor 10)
- Input validation on all endpoints (Pydantic)
- SQL injection prevention via parameterized queries
- Telegram token encryption & secure storage
- No sensitive data in logs

### 4.5 Performance Requirements

- API response time: < 2 seconds
- Dashboard load time: < 3 seconds
- File upload: < 5 seconds for 25MB file
- AI response: < 3 seconds
- Database query: < 500ms

---

## 5. DATABASE SCHEMA

### Tables

**users**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**bots**
```sql
CREATE TABLE bots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  system_prompt LONGTEXT NOT NULL,
  api_key_encrypted VARCHAR(500) NOT NULL,
  telegram_bot_name VARCHAR(100) UNIQUE NOT NULL,
  telegram_token_encrypted VARCHAR(500) NOT NULL,
  telegram_link VARCHAR(200) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_telegram_bot_name (telegram_bot_name)
);
```

**uploaded_files**
```sql
CREATE TABLE uploaded_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bot_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  extracted_text LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id),
  INDEX idx_bot_id (bot_id)
);
```

**messages**
```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bot_id INT NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  chat_id VARCHAR(50) NOT NULL,
  message_text TEXT NOT NULL,
  response_text LONGTEXT NOT NULL,
  extracted_data JSON,
  response_time FLOAT,
  model_used VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id),
  INDEX idx_bot_id (bot_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

**extracted_orders**
```sql
CREATE TABLE extracted_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bot_id INT NOT NULL,
  message_id INT,
  customer_user_id VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  products JSON NOT NULL,
  total_price DECIMAL(10, 2),
  delivery_address TEXT,
  special_requests TEXT,
  status ENUM('pending', 'incomplete', 'confirmed', 'shipped', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id),
  FOREIGN KEY (message_id) REFERENCES messages(id),
  INDEX idx_bot_id (bot_id),
  INDEX idx_status (status)
);
```

---

## 6. API SPECIFICATIONS

### Authentication

**Register**
```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Login**
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepass123"
}
Response: { "access_token": "...", "token_type": "bearer", "expires_in": 2592000 }
```

### Bot Management

**Create Bot**
```
POST /api/bots/create
Headers: Authorization: Bearer {token}
{
  "name": "Bot Toko Fashion A",
  "system_prompt": "Kamu adalah customer service...",
  "api_key": "AIzaSyD...",
  "telegram_token": "123456789:ABCDefGhIJklMNopQRstUVwxYZ..."
}
Response: {
  "id": 1,
  "telegram_bot_name": "curabot_1_a7k9x2l5",
  "telegram_link": "https://t.me/curabot_1_a7k9x2l5"
}
```

**List Bots**
```
GET /api/bots/list
Headers: Authorization: Bearer {token}
```

**Get Bot**
```
GET /api/bots/{bot_id}
Headers: Authorization: Bearer {token}
```

**Update Bot**
```
PUT /api/bots/{bot_id}
Headers: Authorization: Bearer {token}
{ "name": "Updated name", "system_prompt": "..." }
```

**Delete Bot**
```
DELETE /api/bots/{bot_id}
Headers: Authorization: Bearer {token}
```

### File Management

**Upload File**
```
POST /api/files/upload
Headers: Authorization: Bearer {token}
Form: bot_id, file (PDF/DOCX)
```

**List Files**
```
GET /api/files/{bot_id}
Headers: Authorization: Bearer {token}
```

**Delete File**
```
DELETE /api/files/{file_id}
Headers: Authorization: Bearer {token}
```

### Messages

**Telegram Webhook**
```
POST /api/telegram/webhook
Headers: Content-Type: application/json
Body: {
  "update_id": 123456,
  "message": {
    "message_id": 1,
    "from": { "id": 987654, "first_name": "John" },
    "chat": { "id": 987654, "type": "private" },
    "date": 1695123456,
    "text": "Halo, berapa harga barang A?"
  }
}
Process:
1. Parse message & user info
2. Identify bot (via webhook URL)
3. Route to correct bot
4. Call Gemini
5. Send response via Telegram Bot API
```

### Orders

**Get Orders**
```
GET /api/bots/{bot_id}/orders?page=1&limit=20&status=pending
Headers: Authorization: Bearer {token}
```

**Update Order Status**
```
PUT /api/bots/{bot_id}/orders/{order_id}
Headers: Authorization: Bearer {token}
{ "status": "confirmed" }
```

**Export Orders**
```
GET /api/bots/{bot_id}/orders/export
Headers: Authorization: Bearer {token}
Response: [Excel File]
```

### Analytics

**Get Analytics**
```
GET /api/bots/{bot_id}/analytics?range=7
Headers: Authorization: Bearer {token}
Response: {
  "total_conversations": 42,
  "unique_users": 18,
  "avg_response_time": 1.23,
  "total_orders": 12,
  "orders_extracted": 10,
  "model_success_rate": 95.5
}
```

---

## 7. USER INTERFACE REQUIREMENTS

### Pages

**Login / Register**
- Email & password input
- Validation & error messages
- Link to switch between login/register

**Dashboard**
- List of user's bots
- "Create New Bot" button
- Bot name, status, creation date
- Edit & Delete buttons

**Bot Setup**
- Bot name input
- System prompt textarea
- Gemini API key input
- Telegram bot token input
- Save & Cancel buttons
- Instructions: "Get token from @BotFather on Telegram"

**File Manager**
- Drag & drop upload area
- Uploaded files list
- Delete button per file
- File size indicator

**Bot Share**
- Telegram bot name display
- Telegram link display (copy button)
- QR code (generated on frontend)
- Download QR button
- Instructions: "Share link or scan QR to access bot on Telegram"

**Conversation History**
- User/chat filter
- Message search
- Conversation list (paginated)
- Expand to view full thread
- Model used indicator

**Orders**
- Status filter (pending, confirmed, shipped, completed)
- Orders table
- Status dropdown to update
- View details button
- Download Excel button

**Analytics**
- Date range selector (7d, 30d, all)
- Metric cards
- Line chart (conversations per day)
- Bar chart (orders per day)
- Model success rate display

### Design Standards
- Responsive (mobile, tablet, desktop)
- Professional & tech-forward color scheme
- Loading states on async operations
- Error toasts/alerts
- Success toasts
- Confirmation modals for destructive actions
- Accessibility (WCAG 2.1 AA level)

---

## 8. DEVELOPMENT TIMELINE

### Week 1-2: Foundation
- Database schema setup
- FastAPI main structure
- Auth endpoints (register, login, logout)
- React scaffold with Vite
- Login & Register pages

**Deliverables:** Working auth, user can register & login

### Week 2-3: Bot Management
- Bot CRUD endpoints
- Telegram bot token handling
- Auto-generate bot_name & telegram_link
- API key encryption
- Bot detail pages
- Database indexing

**Deliverables:** Users can create Telegram bots, links generated

### Week 3-4: File Upload & Share
- File upload endpoint
- PDF/DOCX text extraction
- File manager page
- Bot share page with QR code generation (frontend)
- Drag & drop upload UI

**Deliverables:** File upload working, QR code downloadable

### Week 4-5: Telegram Integration & Webhook
- Telegram webhook endpoint (/api/telegram/webhook)
- Telegram Bot API integration (setWebhook, sendMessage)
- Telegram update parsing
- Message routing
- Gemini API integration (Flash 3.6 + fallback)

**Deliverables:** Webhook working, bot responds via Telegram & Gemini

### Week 5-6: Order Extraction & Excel
- Order extraction logic
- Excel file generation (openpyxl)
- Auto-append orders
- Orders CRUD endpoints
- Orders page
- Export/download functionality

**Deliverables:** Orders extracted & saved to Excel

### Week 6-7: Dashboard & Analytics
- Analytics calculation
- Conversation history page
- Analytics page
- Charts integration
- Filter & pagination

**Deliverables:** Dashboard functional, analytics working

### Week 7-8: Testing & Polish
- End-to-end testing
- Error handling refinement
- Edge case testing
- UI refinement & bug fixes
- API documentation
- Security review
- Performance optimization

**Deliverables:** No critical bugs, ready for demo

---

## 9. TESTING & QA

### Unit Tests
- Auth service (password, JWT)
- File processing
- Order extraction logic
- Database queries

### Integration Tests
- Auth flow (register → login → use token)
- Bot creation → token handling → webhook registration
- File upload → message processing
- Webhook → parse message → route → Gemini
- Primary model → fallback logic
- Order extraction → Excel save

### End-to-End Tests
- Full user journey: signup → create bot → upload → share link → customer taps → order extracted
- Error scenarios: invalid API key, file too large, timeout, invalid token
- Edge cases: special characters, very long files
- Gemini fallback testing
- Multiple independent bots

### Manual Testing
- Telegram real phone testing
- QR code scanning
- Excel file integrity
- UI mobile responsiveness
- Login/logout flows

### Performance Testing
- Load: 100 concurrent messages
- File upload: 25MB
- Dashboard: 1000+ messages
- API timeout handling

---

## 10. DEPLOYMENT & ENVIRONMENT

### Development
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Database: localhost:3306
- Telegram: Bot API (direct HTTPS)

### Environment Variables (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=curabot

JWT_SECRET=super_secret_key_min_32_chars
ENCRYPTION_KEY=your_fernet_encryption_key

BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
```

### Production (Future)
- Cloud database (AWS RDS)
- Backend hosting (AWS EC2 or Railway)
- Frontend hosting (Vercel or Netlify)
- S3 for file storage

---

## 11. CONSTRAINTS & ASSUMPTIONS

### Constraints
- 2-month timeline
- Single developer (with AI agent)
- Development only (no production)
- Telegram API (free tier, unlimited)
- MySQL local instance
- Local file storage (no S3)
- Gemini API (Flash 3.6 primary, Flash 3.5 Lite fallback)
- QR generation on frontend only

### Assumptions
- Users have Gemini API key
- Users have Telegram bot token (from @BotFather)
- MySQL installed locally
- Stable internet connectivity
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Customers have Telegram installed

---

## 12. FUTURE ENHANCEMENTS

### Phase 2
- Vector database (RAG)
- Google Sheets sync
- Zapier/Make integration
- Advanced analytics
- Multi-language support
- Email notifications
- Scheduled messages
- Rate limiting per user

### Phase 3
- WhatsApp integration (secondary channel)
- Mobile apps (iOS/Android)
- Instagram DM integration
- Inventory tracking
- CRM integration
- Payment integration
- Team collaboration

---

## 13. DEFINITION OF DONE

A feature is DONE when:
1. Code written & reviewed
2. All acceptance criteria met
3. Unit tests written & passing
4. Integration tested
5. Manual testing completed
6. Error handling implemented
7. UI responsive on mobile
8. Documentation updated
9. No console errors/warnings
10. Performance meets SLA

---

## 14. SUCCESS CRITERIA

Project successful when:
1. All features implemented
2. Bot created & deployed in < 5 minutes
3. Bot response < 2 seconds
4. Order extraction accuracy ≥ 90%
5. Dashboard loads < 3 seconds
6. Telegram link shareable & QR scans correctly
7. Zero critical bugs
8. Code documented & readable
9. Gemini fallback tested
10. All tests passing

---

## 15. GLOSSARY

| Term | Definition |
|------|-----------|
| **Bot** | AI-powered Telegram chatbot |
| **Creator** | User who creates & manages bot |
| **System Prompt** | Instructions to guide bot behavior |
| **API Key** | Gemini API credentials (encrypted) |
| **Telegram Token** | Bot token from @BotFather (encrypted) |
| **Bot Name** | Unique Telegram bot identifier (@botname) |
| **Telegram Link** | URL to access bot (https://t.me/botname) |
| **Extraction** | Auto-parsing order data |
| **Webhook** | Telegram → FastAPI endpoint |
| **JWT** | JSON Web Token |
| **Fernet** | Symmetric encryption |
| **Telegram Bot API** | Official Telegram bot interface |
| **Gemini** | Google's LLM |
| **QR Code** | Machine-readable code to Telegram bot |

---

## 16. APPROVALS

**Project Lead:** AI Agent  
**Requirements Owner:** Lawa (Ahmad Faqih Arrifa'i)  
**Technical Lead:** Lawa  
**Timeline:** Week 1-8 (2026-09-25 start)

**Sign-off:**
- [ ] Requirements approved
- [ ] Architecture approved
- [ ] Timeline feasible
- [ ] Resources available

---

**Document Version:** 3.0 (Updated: Telegram + CuraBot)  
**Last Updated:** 2026-09-26  
**Status:** APPROVED FOR DEVELOPMENT
