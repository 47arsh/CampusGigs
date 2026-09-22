# CampusGigs AI Assistant FAQ

## What is CampusGigs AI?

CampusGigs AI is an AI-powered knowledge assistant that answers questions using information available in the CampusGigs knowledge base.

---

## How does CampusGigs AI answer questions?

The assistant uses a Retrieval-Augmented Generation pipeline.

The general process is:

1. The knowledge documents are divided into smaller chunks.
2. Each chunk is converted into an embedding.
3. The embeddings are stored in a vector database.
4. A user's question is converted into an embedding.
5. The system retrieves semantically relevant document chunks.
6. The retrieved context is provided to a generative language model.
7. The model generates an answer based on that context.

---

## Does the AI know everything about the university?

No.

The AI only has access to the information included in its configured knowledge base and any other explicitly connected sources.

It should not assume that information outside the knowledge base is correct.

---

## Can the AI make up a university rule?

It should not.

If the required information cannot be found in the available knowledge base, the assistant should say that sufficient information was not found.

Users should consult official university sources for authoritative institutional decisions.

---

## Why does the AI show sources?

Sources help users understand which knowledge-base documents contributed to an answer.

Source attribution also makes it easier to verify important information.

---

## What is an embedding?

An embedding is a numerical vector representation of text that captures semantic information.

Texts with similar meanings can have similar vector representations.

The system uses embeddings to perform semantic retrieval.

---

## What is a vector database?

A vector database stores vector representations and allows the system to find vectors that are semantically similar to a query.

CampusGigs uses Chroma for this purpose.

---

## Why not just send every document to the language model?

Sending every document with every question is inefficient and can exceed context limits as the knowledge base grows.

Retrieval allows the system to provide the model with a smaller set of relevant information.

---

## What is RAG?

RAG stands for Retrieval-Augmented Generation.

Instead of relying only on information learned during model training, the application retrieves relevant external information and supplies it to the language model as context before generating an answer.

---

## Is RAG the same as fine-tuning?

No.

RAG retrieves external information at query time.

Fine-tuning changes model behavior by training or adapting model parameters.

The CampusGigs AI assistant uses RAG rather than fine-tuning.

---

## What happens if the knowledge base does not contain an answer?

The assistant should acknowledge that it could not find enough relevant information.

It should not confidently invent an answer.

---

## Is an AI answer an official university decision?

No.

The CampusGigs AI assistant is an informational tool.

Official university rules, examination decisions, disciplinary decisions and institutional policies should be verified against authoritative university sources.