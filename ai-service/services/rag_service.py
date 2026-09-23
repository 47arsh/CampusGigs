import os
from pathlib import Path

from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI

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
            content = item.get("text") or item.get("content", "")
            metadata = item.get("metadata", {})
            source = item.get("source") or metadata.get("source") or "unknown"
            source_filename = item.get("source_filename") or metadata.get("source_filename") or source
            context_parts.append(
                f"Source: {source_filename}\nContent: {content}\n"
            )
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

        results = self.retriever.search(question, k=3)
        if not results:
            return {
                "answer": "The available CampusGigs knowledge does not provide the answer.",
                "sources": [],
            }

        prompt = self.build_prompt(question, results)
        llm = ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_GENERATION_MODEL", "gemini-3.6-flash"),
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0,
        )
        response = llm.invoke(prompt)
        content = getattr(response, "content", response)
        if isinstance(content, str):
            answer = content.strip()
        elif isinstance(content, list):
            text_parts = []
            for block in content:
                if isinstance(block, str):
                    text_parts.append(block)
                elif isinstance(block, dict) and isinstance(block.get("text"), str):
                    text_parts.append(block["text"])
                elif isinstance(getattr(block, "text", None), str):
                    text_parts.append(block.text)
            answer = "\n".join(text_parts).strip()
        else:
            answer = str(content).strip()

        if not answer:
            answer = "The available CampusGigs knowledge does not provide the answer."

        sources = [
            {
                "source": item["source_filename"],
                "source_filename": item["source_filename"],
                "distance": item["distance"],
            }
            for item in results
        ]
        return {"answer": answer, "sources": sources}


if __name__ == "__main__":
    from dotenv import load_dotenv

    ROOT = Path(__file__).resolve().parents[1]
    load_dotenv(ROOT / ".env")
    service = RAGService(persist_directory=ROOT / "chroma_db")

    for question in [
        "What happens if I cancel a gig?",
        "What are the rules for posting tasks?",
        "What should I do if I feel unsafe?",
    ]:
        result = service.generate_answer(question)
        print(f"\nQuestion: {question}")
        print(f"Answer: {result['answer']}")
        print("Sources:")
        for source in result["sources"]:
            print(f"- {source['source_filename']}")
