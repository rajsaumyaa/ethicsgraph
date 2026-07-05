# EthicsGraph: AI Ethics Case-Law Graph Memory & Recall System

EthicsGraph is an AI ethics incident log, design reviewer, and memory audit tool. It leverages a semantic knowledge graph to store historical ethics incidents and retrieve analogous precedents during the design phase of new AI systems.

EthicsGraph is built using Python (FastAPI), React (Vite), and Cognee for memory graph orchestration.

---

## Architecture Design & Rationale

### Shared Dataset Pattern
EthicsGraph utilizes a single, shared Cognee dataset (`ethics_cases`) for all ingested precedents rather than isolated per-case datasets. 
- **Rejected Alternative**: Storing each ethics case in a separate dataset. This silos the data, preventing Cognee's internal entity-linking pipeline from recognizing cross-cutting connections (e.g., a bias case and a privacy case sharing a root cause).
- **Our Pattern**: Ingestion is done into one unified dataset (`ethics_cases`). Grouping and routing are managed using `node_set=["ethics_case", domain]` tags. This allows structural relationships to organically form across cases.

### Relational + Graph Hybrid Storage
- **Metadata SQLite Database (`ethics_cases.db`)**: Holds structured records (timestamps, domains, resolutions, pruning state) for fast indexing, status checks, and filtering.
- **Cognee Graph & Vector DB**: Indexes semantic content and relational links. Nodes are mapped back to SQLite records using the ingested node UUID (`cognee_node_ref`).

---

## Cognee Lifecycle API Operations

EthicsGraph implements the complete high-level Cognee lifecycle API:

### 1. Remember (`POST /cases`)
When an ethics incident is logged, it is formatted as a structured text block and sent to `cognee.remember()` with tags corresponding to the case domain.
- **Why**: Places the incident's semantic details into the permanent knowledge graph and vector store.
- **Usage**:
  ```python
  result = await cognee.remember(text_block, dataset_name="ethics_cases", node_set=["ethics_case", domain])
  ```
- **Node Tracking**: The returned `result.items[0]["id"]` is captured as a UUID and stored as `cognee_node_ref` in our database.

### 2. Recall (`POST /query-design`)
When a system description of a new AI model is submitted, the text is queried against Cognee's memory graph.
- **Why**: Evaluates and extracts analogous precedents from historical incident records.
- **Usage**:
  ```python
  recalled_text = await cognee.recall(system_description)
  ```
- **Mapping**: The recalled semantic context is matched back to specific database records via an LLM mapping prompt, returning detailed case structures.

### 3. Improve (`POST /feedback`)
When a user marks a matched precedent as relevant or not, the feedback is logged in SQLite, and `cognee.improve()` is executed.
- **Why**: Dynamically reweights and refines connection weights in the graph database to optimize future retrieval quality.
- **Usage**:
  ```python
  await cognee.improve(dataset="ethics_cases", node_name=[case_title])
  ```

### 4. Forget (`POST /audit-precedents`)
When a precedent is marked as overturned or superseded, we run a memory audit to delete it from active retrieval.
- **Why**: Keeps the ethics memory graph current and relevant, preventing retired precedents from polluting system design evaluations.
- **Usage**:
  ```python
  await cognee.forget(data_id=uuid.UUID(cognee_node_ref), dataset_id=uuid.UUID(cognee_dataset_ref))
  ```

---

## Memory Pruning Verification

- **Pruning Achievement**: It is confirmed that the installed version of Cognee supports item-level pruning. Calling `cognee.forget(data_id=data_id, dataset_id=dataset_id)` successfully deletes the individual node-level record from active graph-vector memory without wiping the entire `ethics_cases` dataset.
- **Validation**: Our test suite verifies that after calling `forget` on a specific case, subsequent `recall` calls no longer return the deleted case context.
- **Database Alignment**: SQLite marks `is_pruned = True` and sets the `pruned_reason` to mirror this action at the database layer.

---

## Disclosures

- **AI Coding Assistance**: This project was developed with AI pair-programming assistance (specifically Google DeepMind's Antigravity assistant) in accordance with the hackathon submission guidelines.
- **Code Comments**: Per specifications, there are absolutely zero code comments or docstrings present in the codebase.
