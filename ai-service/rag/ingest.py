import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from rag.retriever import RAGRetriever

load_dotenv(dotenv_path=ROOT / ".env")


def main():
    knowledge_dir = ROOT / "knowledge"
    persist_directory = ROOT / "chroma_db"

    retriever = RAGRetriever(persist_directory=persist_directory)
    docs = retriever.load_documents(knowledge_dir)
    chunk_count = retriever.ingest(docs)
    print(f"Indexed {chunk_count} chunks from {len(docs)} documents into Chroma.")


if __name__ == "__main__":
    main()
