# Multi-Agent Debate Arena — Monorepo

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- pip / npm

### 1. AI Service (Terminal 1)
```bash
cd backend/ai-service
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### 2. Gateway (Terminal 2)
```bash
cd backend/gateway
npm install
npm run dev
# Runs on http://localhost:3001
```

### 3. Frontend (Terminal 3)
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## 📁 Project Structure
```
multiagent1/
├── backend/
│   ├── ai-service/     # Python FastAPI + LangGraph
│   └── gateway/        # Node.js Express + Socket.io
└── frontend/           # React TypeScript + Vite
```

## 🔧 Environment Variables
- `backend/ai-service/.env` — GEMINI_API_KEY
- `backend/gateway/.env` — MONGO_ATLAS_URI, JWT_SECRET, AI_SERVICE_URL
# multiagent
