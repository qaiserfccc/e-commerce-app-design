# Chatbot knowledge source

`GET /api/chatbot/knowledge` provides a public, read-only grounding source for a future storefront assistant. It returns the same FAQ content shown on `/faq`, plus a bounded set of active product matches when called with a search term:

```text
GET /api/chatbot/knowledge?q=blue
```

The response contains FAQ answers, selected public product facts and URLs, and behavioral guidance. It excludes customer/order data, unpublished products, source-import payloads, and internal admin data. Product facts are read from Neon at request time; cache lifetime is 60 seconds. Keep answers grounded in the returned facts, and do not have the assistant provide lens-fitting or eye-health advice.

This prepares a retrieval-augmented chatbot; it does not train a model or store chat transcripts. Connect the endpoint to a future assistant server through the configured AI provider, and keep model credentials and any customer/order tools server-side.

## InstantDB MCP boundary

The linked [`@instantdb/mcp`](https://github.com/instantdb/instant/tree/main/client/packages/mcp) package is an MCP server for managing InstantDB applications and schemas, and for issuing InstantDB admin queries/transactions. It is not a website database SDK, chatbot runtime, or training pipeline. The storefront currently uses Neon as its source of truth, so this endpoint reads Neon and does not send store data to InstantDB. Do not expose InstantDB admin tools to an unauthenticated public chatbot. Adding an InstantDB-backed chatbot store would be a separate architecture decision requiring an Instant app and credentials.
