import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.rag_service import RAGService

load_dotenv()

service = RAGService(
    knowledge_dir=os.path.join(os.path.dirname(__file__), "knowledge"),
    persist_directory=os.path.join(os.path.dirname(__file__), "chroma_db"),
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title="CampusGigs AI", version="1.0.0", lifespan=lifespan)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")

    try:
        result = service.generate_answer(message)
        return result
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive path
        raise HTTPException(status_code=500, detail="AI service error. Please try again later.") from exc
