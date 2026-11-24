import os
import secrets
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from services.rag_service import RAGService

load_dotenv()

AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "").strip()

service = RAGService(
    knowledge_dir=os.path.join(os.path.dirname(__file__), "knowledge"),
    persist_directory=os.path.join(os.path.dirname(__file__), "chroma_db"),
)
logger = logging.getLogger(__name__)

if not AI_SERVICE_TOKEN:
    logger.warning(
        "AI_SERVICE_TOKEN is not set; /chat accepts unauthenticated requests. "
        "Set it in production so the endpoint is only reachable by the backend."
    )


def require_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    if not AI_SERVICE_TOKEN:
        return
    if not x_internal_token or not secrets.compare_digest(x_internal_token, AI_SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title="CampusGigs AI", version="1.0.0", lifespan=lifespan)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", dependencies=[Depends(require_internal_token)])
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")

    try:
        result = service.generate_answer(message)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("RAG service failure: %s", exc)
        raise HTTPException(status_code=500, detail="The CampusGigs knowledge service is unavailable.") from exc
    except Exception as exc:  # pragma: no cover - defensive path
        logger.exception("LLM request failed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="The AI provider could not process the request.") from exc
