import os
from pathlib import Path

from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2-preview"
COLLECTION_NAME = "campusgigs_kb"


class RAGRetriever:
    def __init__(
        self,
        persist_directory: str | os.PathLike[str],
        embedding_model: str | None = None,
    ):
        self.persist_directory = str(Path(persist_directory))
        self.embedding_model = embedding_model or os.getenv(
            "GEMINI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL
        )
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is required before indexing documents.")

        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=self.embedding_model,
            google_api_key=api_key,
        )
        self.vector_store = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings,
            collection_name=COLLECTION_NAME,
        )

    def index_documents(self, chunks, reset=True):
        if reset:
            self.vector_store.delete_collection()
            self.vector_store = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings,
                collection_name=COLLECTION_NAME,
            )

        for index, chunk in enumerate(chunks):
            chunk.metadata.setdefault("chunk_index", index)
            chunk.metadata.setdefault("source_filename", Path(chunk.metadata["source"]).name)

        ids = [f"chunk-{index}" for index in range(len(chunks))]
        texts = [chunk.page_content for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]

        # Gemini Embedding 2 aggregates a list of plain strings into one vector.
        # Embed every chunk independently so Chroma receives one vector per ID.
        embeddings = [self.embeddings.embed_query(text) for text in texts]

        if len(embeddings) != len(chunks):
            raise RuntimeError(
                "Expected one embedding per chunk, "
                f"but received {len(embeddings)} embeddings for {len(chunks)} chunks."
            )

        self.vector_store._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
        return self.vector_store._collection.count()

    def search(self, query: str, k: int = 3):
        query_embedding = self.embeddings.embed_query(query)
        results = self.vector_store._collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]

        return [
            {
                "text": document,
                "source": metadata.get("source", "unknown"),
                "source_filename": metadata.get("source_filename", "unknown"),
                "distance": distance,
            }
            for document, metadata, distance in zip(documents, metadatas, distances)
        ]

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


if __name__ == "__main__":
    from dotenv import load_dotenv

    ROOT = Path(__file__).resolve().parents[1]
    load_dotenv(ROOT / ".env")
    retriever = RAGRetriever(persist_directory=ROOT / "chroma_db")

    for query in [
        "What happens if I cancel a gig?",
        "What are the rules for posting tasks?",
        "What should I do if I feel unsafe?",
    ]:
        print(f"\nQuery: {query}")
        for index, result in enumerate(retriever.search(query), start=1):
            print(f"\n{index}. {result['source_filename']} (distance: {result['distance']})")
            print(result["text"])

