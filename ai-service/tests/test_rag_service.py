import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.rag_service import RAGService


def test_build_context_uses_sources_and_hints():
    service = RAGService(knowledge_dir=ROOT / "knowledge")
    docs = service.load_documents()
    assert docs
    assert any(doc.metadata.get("source") for doc in docs)

    context = service.format_context([
        {"content": "Users can cancel accepted gigs when necessary.", "metadata": {"source": "campus_gig_policy.md", "section": "Task Cancellation"}},
        {"content": "Students can create tasks as long as the gig is legal and safe.", "metadata": {"source": "campus_marketplace_guidelines.md", "section": "Posting rules"}},
    ])

    assert "campus_gig_policy.md" in context
    assert "Task Cancellation" in context
    assert "Users can cancel accepted gigs when necessary." in context
