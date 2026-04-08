# KOS2 Capability Map

## V1 core capabilities

| Capability             | Target                      | Bootstrap status   | Notes                                              |
| ---------------------- | --------------------------- | ------------------ | -------------------------------------------------- |
| Local chat             | Ollama local                | Ready              | Default model path wired to Ollama                 |
| Local embeddings       | Ollama local                | Ready              | Default embedding path wired to `bge-m3:latest`    |
| Vault retrieval        | Local                       | Reused             | Needs KOS-oriented tuning and command surfaces     |
| Edit preview           | Local                       | Reused             | Apply/diff preview exists upstream                 |
| Web search             | Ollama Cloud                | Ready in bootstrap | Uses Ollama Cloud `web_search`                     |
| URL fetch              | Direct + Ollama agent usage | Ready in bootstrap | HTML converted to Markdown                         |
| PDF ingest             | Local/self-host             | Gap                | Needs parser strategy                              |
| EPUB ingest            | Local/self-host             | Gap                | Needs parser strategy                              |
| Office/docs ingest     | Local/self-host             | Gap                | Needs parser strategy                              |
| YouTube transcript     | Dedicated provider          | Gap                | Provider decision still needed                     |
| KOS workflow commands  | Local                       | Gap                | To be designed in BMAD stories                     |
| Self-host service mode | Local                       | Partial            | Settings/runtime path exists, still upstream-heavy |

## KOS workflow targets

- `/organise`
- `/next-steps`
- `/decision`
- `/review`
- inbox processing
- meeting/note synthesis
- context gathering across vault
- action extraction
- memory capture into KOS structures

## Performance priorities

1. local model responsiveness
2. low-latency retrieval and indexing
3. low-overhead document ingest
4. aggressive caching where safe
5. minimal network dependency outside Ollama Cloud web tools

## Candidate future optimization layers

- Rust sidecar for heavy document ingest
- Rust sidecar for index build/search acceleration
- model routing by task class
- vault chunking tuned for KOS note structures
