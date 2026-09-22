import sys
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from rag.retriever import RAGRetriever

load_dotenv(ROOT / ".env")

KNOWLEDGE_DIR = ROOT / "knowledge"
CHROMA_DIR = ROOT / "chroma_db"


def load_documents():
    loader = DirectoryLoader(
        str(KNOWLEDGE_DIR),
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
        show_progress=False,
    )
    documents = sorted(loader.load(), key=lambda document: document.metadata.get("source", ""))
    for document in documents:
        source_path = Path(document.metadata["source"])
        document.metadata["source_filename"] = source_path.name
    return documents


def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_documents(documents)


def main():
    documents = load_documents()
    chunks = split_documents(documents)
    retriever = RAGRetriever(persist_directory=CHROMA_DIR)
    indexed_count = retriever.index_documents(chunks)

    print(f"Loaded {len(documents)} documents from {KNOWLEDGE_DIR}.")
    print(f"Created {len(chunks)} chunks.")
    print(f"Indexed {indexed_count} chunks in {CHROMA_DIR}.")


if __name__ == "__main__":
    main()
