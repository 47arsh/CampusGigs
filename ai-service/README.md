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

1. Create and activate a virtual environment (Python 3.10).
2. Install pinned packages: `python -m pip install -r requirements-dev.txt` (`requirements-dev.txt` includes the runtime pins plus pytest and httpx).
3. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `AI_SERVICE_TOKEN`. Keep `GEMINI_EMBEDDING_MODEL=gemini-embedding-2-preview`. Leave `APP_ENV=development` locally.
4. Create or update the local vector store: `python rag/ingest.py`.
5. Start FastAPI: `python -m uvicorn main:app --reload --port 8000`.

The Express backend needs `AI_SERVICE_URL` pointing at this service, for example `http://localhost:8000` in local development, and must send the same `AI_SERVICE_TOKEN` it was configured with.

## Internal authentication

`POST /chat` requires an `X-Internal-Token` header matching `AI_SERVICE_TOKEN`. In development a missing token only logs a warning and accepts unauthenticated requests so local setup keeps working. With `APP_ENV=production` the service refuses to start unless `AI_SERVICE_TOKEN` is set, so a deployed service is never exposed without service-to-service authentication. `GET /health` stays public for platform health checks.

The retriever, embeddings client, and vector store are created lazily on the first question, so the process can start and serve `/health` without a Gemini key or an ingested Chroma store.

## Testing

```bash
.venv/Scripts/python.exe -m pytest tests -q   # source .venv/bin/activate on macOS/Linux
```

Tests mock the generation layer and do not call Gemini, so they run without API credits. CI installs `requirements-dev.txt` and runs the same command on every push and pull request.


## API

### `GET /health`

Returns `{"status":"ok"}`.

### `POST /chat`

Requires `X-Internal-Token` (when `AI_SERVICE_TOKEN` is set); returns `401` otherwise.

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

## Deployment

Deploy with `uvicorn main:app --host 0.0.0.0 --port $PORT`. Chroma data is not committed, so run `python rag/ingest.py` once in the target environment (or mount a persistent volume for `chroma_db/`) before serving questions. Set `GEMINI_API_KEY`, `AI_SERVICE_TOKEN`, and `APP_ENV=production` as platform variables, and configure the backend with the same token plus an `AI_SERVICE_URL` reachable from the API host. The backend also refuses to start in production if one of that pair is set without the other.

## Git hygiene

`.env`, `.venv/`, `__pycache__/`, `*.pyc`, and `chroma_db/` are ignored. Do not commit Gemini credentials or generated Chroma data.
