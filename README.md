# 🔬 ResearchMind AI

> AI-Powered Research Assistant using Retrieval-Augmented Generation (RAG)

ResearchMind AI is a modern AI-powered research assistant that allows users to upload PDF documents, create vector embeddings, perform semantic search, and chat with their documents using Large Language Models (LLMs).

It combines FastAPI, ChromaDB, Sentence Transformers, and Ollama to provide fast, accurate, and context-aware responses.

---

# ✨ Features

- 📄 Upload PDF Documents
- 🤖 AI Chat with Documents
- 🔍 Semantic Search
- 🧠 RAG (Retrieval-Augmented Generation)
- ⚡ FastAPI Backend
- 🗂 ChromaDB Vector Database
- 📚 Sentence Transformers Embeddings
- 💬 Ollama LLM Integration
- 🌙 Dark & Light Theme
- 📱 Responsive UI
- 📊 Research Dashboard
- 📝 Chat History
- 📂 Research Library
- 📈 Real-time Upload Status

---

# 🛠 Tech Stack

## Frontend

- HTML5
- CSS3
- JavaScript (ES6)

## Backend

- FastAPI
- SQLAlchemy
- SQLite
- Alembic

## AI Stack

- Ollama
- Llama 3.2
- Sentence Transformers
- ChromaDB

## Utilities

- PyMuPDF
- NumPy
- Requests
- Python Dotenv

---

# 📂 Project Structure

```
ResearchMind-AI/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── manifest.json
│   ├── robots.txt
│   ├── sitemap.xml
│   └── vercel.json
│
├── backend/
│   ├── app/
│   ├── uploads/
│   ├── chroma_db/
│   ├── database/
│   ├── alembic/
│   ├── .env
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── Procfile
│
├── README.md
├── LICENSE
└── .gitignore
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ResearchMind-AI.git
```

```bash
cd ResearchMind-AI
```

---

# Create Virtual Environment

Windows

```bash
python -m venv venv
```

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
python3 -m venv venv
```

```bash
source venv/bin/activate
```

---

# Install Dependencies

```bash
cd backend
```

```bash
pip install -r requirements.txt
```

---

# Install Ollama

Download:

https://ollama.com/download

Pull model

```bash
ollama pull llama3.2
```

Start Ollama

```bash
ollama serve
```

---

# Run Backend

```bash
cd backend
```

```bash
uvicorn app.main:app --reload
```

Backend

```
http://127.0.0.1:8000
```

Swagger Docs

```
http://127.0.0.1:8000/docs
```

---

# Run Frontend

```bash
cd frontend
```

Python Server

```bash
python -m http.server 5500
```

Open

```
http://127.0.0.1:5500
```

---

# Environment Variables

Create a `.env` file inside the backend folder.

Example:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

DATABASE_URL=sqlite:///database/researchmind.db

CHROMA_DB_PATH=./chroma_db

EMBEDDING_MODEL=all-MiniLM-L6-v2
```

---

# API Endpoints

## Upload

```
POST /upload
```

## Chat

```
POST /chat
```

## Documents

```
GET /documents
```

## Delete Document

```
DELETE /documents/{id}
```

## Health

```
GET /health
```

---

# Screenshots

Add screenshots here after deployment.

```
screenshots/
```

---

# Deployment

Frontend

- Vercel
- Netlify

Backend

- Render
- Railway
- Docker
- Azure

---

# Future Improvements

- Multi-document chat
- Streaming responses
- Authentication
- User accounts
- Cloud storage
- Citation highlighting
- Markdown rendering
- PDF page previews
- Conversation export

---

# Author

Manish Pawar

---

# License

This project is licensed under the MIT License.

See the LICENSE file for details.