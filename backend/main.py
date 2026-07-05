import uuid
import json
import re
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from openai import OpenAI
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"))

from database import engine, Base, get_db
from models import EthicsCase
from cognee_helper import remember_case, recall_cases, improve_case, forget_case

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/healthz")
async def health_check():
    return {"status": "healthy"}

class CaseCreate(BaseModel):
    case_title: str
    domain: str
    system_description: str
    incident_summary: str
    resolution: str
    precedent_status: str
    source: str

class QueryDesign(BaseModel):
    system_description: str

class FeedbackRequest(BaseModel):
    case_id: str
    relevant: bool

def case_to_dict(case):
    return {
        "id": case.id,
        "case_title": case.case_title,
        "domain": case.domain,
        "system_description": case.system_description,
        "incident_summary": case.incident_summary,
        "resolution": case.resolution,
        "precedent_status": case.precedent_status,
        "source": case.source,
        "timestamp": case.timestamp.isoformat() if case.timestamp else None,
        "cognee_node_ref": case.cognee_node_ref,
        "cognee_dataset_ref": case.cognee_dataset_ref,
        "relevance_score": case.relevance_score,
        "is_pruned": case.is_pruned,
        "pruned_reason": case.pruned_reason
    }

@app.post("/cases")
async def create_case(case_data: CaseCreate, db: Session = Depends(get_db)):
    try:
        case_id = str(uuid.uuid4())
        db_case = EthicsCase(
            id=case_id,
            case_title=case_data.case_title,
            domain=case_data.domain,
            system_description=case_data.system_description,
            incident_summary=case_data.incident_summary,
            resolution=case_data.resolution,
            precedent_status=case_data.precedent_status,
            source=case_data.source,
            is_pruned=False
        )
        db.add(db_case)
        db.commit()
        db.refresh(db_case)
        
        ref_info = await remember_case(
            case_id=case_id,
            case_title=db_case.case_title,
            domain=db_case.domain,
            system_description=db_case.system_description,
            incident_summary=db_case.incident_summary,
            resolution=db_case.resolution,
            source=db_case.source
        )
        
        db_case.cognee_node_ref = ref_info["node_ref"]
        db_case.cognee_dataset_ref = ref_info["dataset_ref"]
        db.commit()
        db.refresh(db_case)
        
        return case_to_dict(db_case)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query-design")
async def query_design(query: QueryDesign, db: Session = Depends(get_db)):
    try:
        recalled_text = await recall_cases(query.system_description)
        if not recalled_text:
            return []
            
        active_cases = db.query(EthicsCase).filter(
            EthicsCase.is_pruned == False,
            EthicsCase.precedent_status == "active"
        ).all()
        
        if not active_cases:
            return []
            
        cases_info = []
        for c in active_cases:
            cases_info.append(
                f"Case ID: {c.id}\n"
                f"Case Title: {c.case_title}\n"
                f"System Description: {c.system_description}\n"
                f"Incident Summary: {c.incident_summary}\n"
            )
        cases_formatted = "\n\n".join(cases_info)
        
        prompt = (
            f"You are an AI ethics reasoning assistant. We recalled the following semantic context from our ethics graph:\n"
            f"--- RECALLED CONTEXT ---\n{recalled_text}\n"
            f"------------------------\n\n"
            f"Here is a list of ethics cases from our database:\n"
            f"{cases_formatted}\n\n"
            f"Identify which cases in the list are structurally or semantically analogous to the recalled context. "
            f"Return ONLY a JSON array of matched case IDs. Do not include any other text, explanations, or markdown codeblocks. Example: [\"uuid-1\", \"uuid-2\"]"
        )
        
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("LLM_API_KEY")
        )
        
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        
        llm_output = response.choices[0].message.content.strip()
        
        matched_ids = []
        try:
            cleaned = re.sub(r"```[a-zA-Z]*", "", llm_output).strip()
            matched_ids = json.loads(cleaned)
        except Exception:
            for c in active_cases:
                if c.id in llm_output or (c.case_title.lower() in recalled_text.lower()):
                    matched_ids.append(c.id)
                    
        if not isinstance(matched_ids, list):
            matched_ids = []
            
        matched_cases = db.query(EthicsCase).filter(EthicsCase.id.in_(matched_ids)).all()
        return [case_to_dict(c) for c in matched_cases if not c.is_pruned]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
async def update_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    try:
        case = db.query(EthicsCase).filter(EthicsCase.id == req.case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
            
        if req.relevant:
            case.relevance_score += 1
        else:
            case.relevance_score -= 1
            
        db.commit()
        db.refresh(case)
        
        await improve_case(case.case_title)
        
        return {"status": "success", "relevance_score": case.relevance_score}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/audit-precedents")
async def audit_precedents(db: Session = Depends(get_db)):
    try:
        cases_to_prune = db.query(EthicsCase).filter(
            EthicsCase.precedent_status.in_(["overturned", "superseded"]),
            EthicsCase.is_pruned == False
        ).all()
        
        pruned_cases = []
        for case in cases_to_prune:
            if case.cognee_node_ref and case.cognee_dataset_ref:
                try:
                    await forget_case(case.cognee_node_ref, case.cognee_dataset_ref)
                except Exception:
                    pass
                    
            case.is_pruned = True
            case.pruned_reason = f"Precedent status is {case.precedent_status}"
            db.commit()
            db.refresh(case)
            pruned_cases.append(case_to_dict(case))
            
        return pruned_cases
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cases")
async def get_all_cases(db: Session = Depends(get_db)):
    try:
        cases = db.query(EthicsCase).all()
        return [case_to_dict(c) for c in cases]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
