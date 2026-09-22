# CampusGigs AI Service

The CampusGigs AI service is a focused FastAPI RAG layer for answering questions about CampusGigs task policies, marketplace guidelines, and safety rules. It is separate from the Express/MongoDB application because Python provides the LangChain, Gemini, and Chroma integration, while Express remains the browser-facing API.

## Request flow

React -> Express POST /api/ai/chat -> FastAPI POST /chat
      -> retrieve from Chroma -> Gemini generation -> answer + sources

FastAPI never exposes the Gemini API key. React never calls FastAPI directly.

## Knowledge ingestion

1. `rag/ingest.py` loads the Markdown files in `knowledge/`.
2. The existing recursive splitter creates chunks with `chunk_size=900` and `chunk_overlap=150`.
3. Every chunk retains `source` and `source_filename` metadata.
4. Gemini Embedding 2 Preview (`gemini-embedding-2-preview`) embeds each chunk individually.
5. Vectors are persisted in Chroma's `campusgigs_kb` collection at `chroma_db/`.

The current knowledge base contains five documents and 21 indexed chunks. `chroma_db/` is generated locally and must not be committed.

## Retrieval and grounded generation

- `RAGRetriever.search(query, k=3)` embeds the question and retrieves the three nearest Chroma chunks.
- `RAGService` builds a context-only prompt with those chunks and calls Gemini 3.6 Flash.
- The prompt forbids inventing CampusGigs policies. When context is insufficient, the answer explicitly says the available CampusGigs knowledge does not provide the answer.
- The API returns an `answer` plus `sources` containing `source`, `source_filename`, and Chroma `distance`.

## Local setup

From `ai-service/`:

1. Create and activate a virtual environment.
2. Install pinned packages: `python -m pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Keep `GEMINI_EMBEDDING_MODEL=gemini-embedding-2-preview`.
4. Create or update the local vector store: `python rag/ingest.py`.
5. Start FastAPI: `python -m uvicorn main:app --reload --port 8000`.

The Express backend needs `AI_SERVICE_URL` pointing at this service, for example `http://localhost:8000` in local development.

## API

### `GET /health`

Returns `{"status":"ok"}`.

### `POST /chat`

Request:

    {"message":"What happens if I cancel a gig?"}

Response:

    {
      "answer": "...",
      "sources": [
        {
          "source": "...",
          "source_filename": "campus_gig_policy.md",
          "distance": 0.0
        }
      ]
    }

## Git hygiene

`.env`, `.venv/`, `__pycache__/`, `*.pyc`, and `chroma_db/` are ignored. Do not commit Gemini credentials or generated Chroma data.
