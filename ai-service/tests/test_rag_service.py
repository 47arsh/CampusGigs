import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import services.rag_service as rag_service_module
from services.rag_service import RAGService


class FakeRetriever:
    def __init__(self, results):
        self.results = results
        self.queries = []

    def search(self, query, k=3):
        self.queries.append((query, k))
        return self.results


class FakeLLM:
    def __init__(self, content="Answer from the model.", **kwargs):
        self.content = content
        self.kwargs = kwargs

    def invoke(self, prompt):
        self.prompt = prompt
        return SimpleNamespace(content=self.content)


def make_service(results):
    service = RAGService(knowledge_dir=ROOT / "knowledge")
    service._retriever = FakeRetriever(results)
    return service


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


def test_format_context_accepts_flat_retriever_items():
    service = RAGService(knowledge_dir=ROOT / "knowledge")

    context = service.format_context([
        {"text": "Cancel before work starts.", "source_filename": "policy.md", "section": "Cancellation"},
        {"text": "No section here.", "source_filename": "faq.md"},
    ])

    assert "Source: policy.md" in context
    assert "Section: Cancellation" in context
    assert "Source: faq.md" in context


def test_build_prompt_includes_context_and_question():
    service = RAGService(knowledge_dir=ROOT / "knowledge")

    prompt = service.build_prompt(
        "How do I cancel?",
        [{"text": "Cancellation is allowed.", "source_filename": "policy.md"}],
    )

    assert "Cancellation is allowed." in prompt
    assert "How do I cancel?" in prompt


def test_generate_answer_requires_question():
    service = RAGService(knowledge_dir=ROOT / "knowledge")

    with pytest.raises(ValueError):
        service.generate_answer("   ")


def test_generate_answer_requires_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = make_service([])

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        service.generate_answer("How do I cancel?")


def test_generate_answer_returns_answer_and_sources(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(rag_service_module, "ChatGoogleGenerativeAI", FakeLLM)

    service = make_service([
        {"text": "Cancellation policy text.", "source": "policy.md", "source_filename": "policy.md", "distance": 0.1},
        {"text": "Safety guidance.", "source": "safety.md", "source_filename": "safety.md", "distance": 0.4},
    ])

    result = service.generate_answer("  How do I cancel?  ")

    assert result["answer"] == "Answer from the model."
    assert result["sources"] == [
        {"source": "policy.md", "source_filename": "policy.md", "distance": 0.1},
        {"source": "safety.md", "source_filename": "safety.md", "distance": 0.4},
    ]
    assert service._retriever.queries == [("How do I cancel?", 3)]


def test_generate_answer_joins_content_blocks(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        rag_service_module,
        "ChatGoogleGenerativeAI",
        lambda **kwargs: FakeLLM(content=[{"text": "Part one."}, {"text": "Part two."}]),
    )

    service = make_service([
        {"text": "Context.", "source_filename": "policy.md", "distance": 0.2},
    ])

    result = service.generate_answer("Tell me the rules")

    assert result["answer"] == "Part one.\nPart two."


def test_generate_answer_without_context_skips_the_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def fail_if_called(**kwargs):
        raise AssertionError("the model must not be called without context")

    monkeypatch.setattr(rag_service_module, "ChatGoogleGenerativeAI", fail_if_called)

    result = make_service([]).generate_answer("Unknown topic")

    assert result["sources"] == []
    assert "does not provide the answer" in result["answer"]
