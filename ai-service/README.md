# CampusGigs AI Service

This service implements a small RAG pipeline for CampusGigs policy questions.

## Architecture

React -> Express -> FastAPI -> LangChain -> Gemini Embeddings -> Chroma -> retrieval -> Gemini LLM

## How it works

1. Knowledge documents are loaded from the `knowledge/` folder.
2. Documents are split into chunks with a recursive text splitter.
3. Each chunk is embedded with Gemini embeddings.
4. The vectors are stored in local Chroma persistent storage.
5. A new question is embedded with the same model and matched against Chroma.
6. The top relevant chunks are passed to the Gemini LLM with a prompt that requires grounded responses and source citation.

## Setup

1. Create a Python virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Add your Gemini API key in `.env` (copy from `.env.example`).
4. Run ingestion: `python rag/ingest.py`.
5. Start the service with `uvicorn main:app --reload --port 8000`.

## Ingestion

The ingestion script loads all markdown knowledge documents, chunks them, creates embeddings, and writes them into the local Chroma store.

## Notes

- MongoDB remains responsible for app data like users and tasks.
- Chroma is only used for semantic knowledge retrieval.
- The AI service does not expose the Gemini key to the frontend.
