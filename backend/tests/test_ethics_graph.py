# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_full_lifecycle():
    case_data_1 = {
        "case_title": "Bias hiring tool",
        "domain": "bias",
        "system_description": "An automated resume screening tool.",
        "incident_summary": "The system downgraded female resumes.",
        "resolution": "Retrained the model with gender-neutral attributes.",
        "precedent_status": "active",
        "source": "https://example.com/bias-hiring"
      }
    response = client.post("/cases", json=case_data_1)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["case_title"] == "Bias hiring tool"
    assert res_json["cognee_node_ref"] is not None
    case_id_1 = res_json["id"]

    query_data = {
        "system_description": "We are building an automated applicant resume screening system."
    }
    response = client.post("/query-design", json=query_data)
    assert response.status_code == 200
    res_list = response.json()
    assert len(res_list) > 0
    assert any(c["id"] == case_id_1 for c in res_list)

    feedback_data = {
        "case_id": case_id_1,
        "relevant": True
    }
    response = client.post("/feedback", json=feedback_data)
    assert response.status_code == 200
    assert response.json()["relevance_score"] == 1

    case_data_2 = {
        "case_title": "Biometric face recognition system",
        "domain": "privacy",
        "system_description": "Facial analysis at building entrance.",
        "incident_summary": "Captured face templates without user consent.",
        "resolution": "Replaced with opt-in scan.",
        "precedent_status": "overturned",
        "source": "https://example.com/face-scan"
    }
    response = client.post("/cases", json=case_data_2)
    assert response.status_code == 200
    case_id_2 = response.json()["id"]

    response = client.post("/audit-precedents")
    assert response.status_code == 200
    pruned_list = response.json()
    assert any(c["id"] == case_id_2 for c in pruned_list)

    response = client.get("/cases")
    assert response.status_code == 200
    all_cases = response.json()
    case_2_updated = next(c for c in all_cases if c["id"] == case_id_2)
    assert case_2_updated["is_pruned"] is True
    assert case_2_updated["pruned_reason"] is not None

    query_data_2 = {
        "system_description": "We are setting up facial screening cameras at our corporate office."
    }
    response = client.post("/query-design", json=query_data_2)
    assert response.status_code == 200
    res_list_2 = response.json()
    assert not any(c["id"] == case_id_2 for c in res_list_2)

if __name__ == "__main__":
    test_full_lifecycle()
    print("All tests passed successfully!")
