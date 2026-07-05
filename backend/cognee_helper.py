import os
import uuid
import cognee
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"))

cognee.config.set_llm_provider(os.getenv("LLM_PROVIDER", "openai"))
cognee.config.set_llm_model(os.getenv("LLM_MODEL", "openai/meta-llama/llama-4-scout-17b-16e-instruct"))
cognee.config.set_llm_endpoint(os.getenv("LLM_ENDPOINT", "https://api.groq.com/openai/v1"))
cognee.config.set_llm_api_key(os.getenv("LLM_API_KEY"))

cognee.config.set_embedding_provider(os.getenv("EMBEDDING_PROVIDER", "fastembed"))
cognee.config.set_embedding_model(os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"))
cognee.config.set_embedding_dimensions(int(os.getenv("EMBEDDING_DIMENSIONS", "384")))

async def remember_case(
    case_id: str,
    case_title: str,
    domain: str,
    system_description: str,
    incident_summary: str,
    resolution: str,
    source: str
) -> dict:
    text_block = (
        f"Case ID: {case_id}\n"
        f"Case Title: {case_title}\n"
        f"Domain: {domain}\n"
        f"System Description: {system_description}\n"
        f"Incident Summary: {incident_summary}\n"
        f"Resolution: {resolution}\n"
        f"Source: {source}"
    )
    result = await cognee.remember(
        text_block,
        dataset_name="ethics_cases",
        node_set=["ethics_case", domain]
    )
    return {
        "node_ref": str(result.items[0]["id"]),
        "dataset_ref": str(result.dataset_id)
    }

async def recall_cases(query_text: str) -> str:
    results = await cognee.recall(query_text)
    if not results:
        return ""
    return "\n".join([r.text for r in results if hasattr(r, "text") and r.text])

async def improve_case(case_title: str) -> None:
    await cognee.improve(dataset="ethics_cases", node_name=[case_title])

async def forget_case(cognee_node_ref: str, cognee_dataset_ref: str) -> None:
    await cognee.forget(
        data_id=uuid.UUID(cognee_node_ref),
        dataset_id=uuid.UUID(cognee_dataset_ref)
    )
