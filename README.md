# RAG Chatbot (NestJS + MySQL)

Quick start (local with Docker)

1. Copy project files to a folder.
2. Create `.env` from `.env.example` and fill values.
3. Start MySQL and app container: `docker-compose up -d`
4. Install deps locally (if running without container): `npm install`
5. Run the server locally: `npm run start:dev` (or Docker container will run built app)

Usage

- Upload PDF: `POST /pdf/upload` (multipart form `file` + optional `docName`)
- Ask question: `POST /qa` with JSON `{ "question": "..." }`

Optional: Embeddings

Set `OPENAI_API_KEY` and run:

```
npm run generate:embeddings
```

This will populate `embedding` column for each chunk. After that QA endpoint will prefer embedding retrieval and (if key present) use OpenAI LLM for final answer.

Notes

- For production, replace `synchronize: true` with migrations and use a vector DB for scale.
