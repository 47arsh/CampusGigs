import os
from pathlib import Path

from langchain.chains import LLMChain
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


class RAGRetriever:
    def __init__(
        self,
        persist_directory: str | os.PathLike[str],
        embedding_model: str = "models/text-embedding-004",
        llm_model: str = "gemini-1.5-flash",
    ):
        self.persist_directory = str(Path(persist_directory))
        self.embedding_model = embedding_model
        self.llm_model = llm_model
        self.embeddings = None
        if os.getenv("GEMINI_API_KEY"):
            self.embeddings = GoogleGenerativeAIEmbeddings(model=self.embedding_model)
        self.vector_store = (
            Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings,
                collection_name="campusgigs_kb",
            )
            if self.embeddings
            else None
        )

    def load_documents(self, knowledge_dir: str | os.PathLike[str]):
        docs = []
        for path in sorted(Path(knowledge_dir).glob("*.md")):
            text = path.read_text(encoding="utf-8")
            docs.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": path.name,
                        "document_name": path.stem,
                        "document_type": "markdown",
                    },
                )
            )
        return docs

    def split_documents(self, documents, chunk_size: int = 900, chunk_overlap: int = 150):
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        return splitter.split_documents(documents)

    def ingest(self, documents):
        if not self.embeddings or not self.vector_store:
            raise RuntimeError("GEMINI_API_KEY is required before ingesting documents.")

        chunks = self.split_documents(documents)
        for index, chunk in enumerate(chunks):
            chunk.metadata.setdefault("chunk_index", index)
            chunk.metadata.setdefault("section", f"chunk-{index + 1}")
            chunk.metadata.setdefault("document_name", chunk.metadata.get("document_name", "unknown"))
            chunk.metadata.setdefault("source", chunk.metadata.get("source", "unknown"))

        self.vector_store.add_documents(chunks)
        return len(chunks)

    def similarity_search(self, question: str, k: int = 4):
        if not self.vector_store:
            raise RuntimeError("The vector store is not available. Run ingestion with a valid Gemini API key.")

        results = self.vector_store.similarity_search_with_score(question, k=k)
        formatted = []
        for document, score in results:
            metadata = dict(document.metadata or {})
            formatted.append({
                "content": document.page_content,
                "score": score,
                "metadata": {
                    "source": metadata.get("source", "unknown"),
                    "section": metadata.get("section") or metadata.get("document_name") or "General",
                    "document_name": metadata.get("document_name", "unknown"),
                    "chunk_index": metadata.get("chunk_index"),
                },
            })
        return formatted

    def get_llm(self):
        if not os.getenv("GEMINI_API_KEY"):
            raise RuntimeError("GEMINI_API_KEY is required to generate answers.")
        return ChatGoogleGenerativeAI(model=self.llm_model, temperature=0.2)
