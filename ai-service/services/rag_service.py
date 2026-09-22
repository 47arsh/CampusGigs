import os
from pathlib import Path

from langchain_core.documents import Document

from rag.prompts import SYSTEM_PROMPT
from rag.retriever import RAGRetriever


class RAGService:
    def __init__(self, knowledge_dir: str | os.PathLike[str] = "./knowledge", persist_directory: str | os.PathLike[str] = "./chroma_db"):
        self.knowledge_dir = Path(knowledge_dir)
        self.persist_directory = Path(persist_directory)
        self.retriever = RAGRetriever(persist_directory=self.persist_directory)

    def load_documents(self):
        docs = []
        for file_path in sorted(self.knowledge_dir.glob("*.md")):
            text = file_path.read_text(encoding="utf-8")
            docs.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": file_path.name,
                        "document_name": file_path.stem,
                        "document_type": "markdown",
                    },
                )
            )
        return docs

    def format_context(self, retrieved_context):
        context_parts = []
        for item in retrieved_context:
            content = item.get("content", "")
            metadata = item.get("metadata", {})
            source = metadata.get("source") or "unknown"
            section = metadata.get("section") or metadata.get("document_name") or "context"
            context_parts.append(f"Source: {source}\nSection: {section}\nContent: {content}\n")
        return "\n---\n".join(context_parts)

    def build_prompt(self, question: str, retrieved_context):
        formatted_context = self.format_context(retrieved_context)
        return SYSTEM_PROMPT.format(context=formatted_context, question=question)

    def _as_context_items(self, results):
        items = []
        seen = set()
        for result in results:
            metadata = result.get("metadata", {})
            source = metadata.get("source", "unknown")
            section = metadata.get("section") or metadata.get("document_name") or "General"
            key = (source, section)
            if key in seen:
                continue
            seen.add(key)
            items.append({
                "content": result.get("content", ""),
                "metadata": {
                    "source": source,
                    "section": section,
                },
            })
        return items

    def generate_answer(self, question: str):
        question = (question or "").strip()
        if not question:
            raise ValueError("Question is required.")

        if not os.getenv("GEMINI_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to your AI service environment before asking questions.")

        results = self.retriever.similarity_search(question, k=4)
        if not results:
            return {
                "answer": "I couldn't find enough information about that in the CampusGigs knowledge base.",
                "sources": [],
            }

        ranked_context = self._as_context_items(results)
        prompt = self.build_prompt(question, ranked_context)
        llm = self.retriever.get_llm()
        response = llm.invoke(prompt)
        answer = getattr(response, "content", str(response)).strip()
        if not answer:
            answer = "I couldn't find enough information about that in the CampusGigs knowledge base."

        sources = [
            {
                "source": item["metadata"].get("source", "unknown"),
                "section": item["metadata"].get("section", "General"),
            }
            for item in ranked_context
        ]
        return {"answer": answer, "sources": sources}
