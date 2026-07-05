import { useState, useEffect } from 'react';
import { 
  Shield, 
  PlusCircle, 
  GitPullRequest, 
  Database, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  AlertTriangle, 
  Globe, 
  CheckCircle,
  FileText
} from 'lucide-react';

export default function App() {
  const [cases, setCases] = useState([]);
  const [designDescription, setDesignDescription] = useState('');
  const [matchedCases, setMatchedCases] = useState([]);
  
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingPrune, setLoadingPrune] = useState(false);
  const [submittingCase, setSubmittingCase] = useState(false);
  
  const [feedbackState, setFeedbackState] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [prunedCount, setPrunedCount] = useState(null);

  const [form, setForm] = useState({
    case_title: '',
    domain: 'bias',
    system_description: '',
    incident_summary: '',
    resolution: '',
    precedent_status: 'active',
    source: ''
  });

  const API_URL = 'http://localhost:8000';

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const res = await fetch(`${API_URL}/cases`);
      const data = await res.json();
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmittingCase(true);
    setSubmitSuccess(false);
    try {
      const res = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({
          case_title: '',
          domain: 'bias',
          system_description: '',
          incident_summary: '',
          resolution: '',
          precedent_status: 'active',
          source: ''
        });
        setSubmitSuccess(true);
        await fetchCases();
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleQueryDesign = async () => {
    if (!designDescription.trim()) return;
    setLoadingQuery(true);
    setMatchedCases([]);
    try {
      const res = await fetch(`${API_URL}/query-design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_description: designDescription })
      });
      const data = await res.json();
      setMatchedCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuery(false);
    }
  };

  const handleFeedback = async (caseId, isRelevant) => {
    setFeedbackState(prev => ({ ...prev, [caseId]: isRelevant ? 'yes' : 'no' }));
    try {
      await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, relevant: isRelevant })
      });
      await fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuditPrecedents = async () => {
    setLoadingPrune(true);
    setPrunedCount(null);
    try {
      const res = await fetch(`${API_URL}/audit-precedents`, {
        method: 'POST'
      });
      const data = await res.json();
      setPrunedCount(data.length);
      await fetchCases();
      setTimeout(() => setPrunedCount(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrune(false);
    }
  };

  const activeCasesList = cases.filter(c => !c.is_pruned);
  const prunedCasesList = cases.filter(c => c.is_pruned);

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="brand-title">
            <Shield size={28} /> EthicsGraph
          </h1>
          <p className="brand-subtitle">AI Ethics Case-Law Graph Memory & Recall System</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="relevance-score">
            <Database size={16} />
            <span>Active Cases: {activeCasesList.length}</span>
          </div>
          <div className="relevance-score" style={{ color: '#ef4444' }}>
            <AlertTriangle size={16} />
            <span>Pruned: {prunedCasesList.length}</span>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <PlusCircle size={20} style={{ color: '#c084fc' }} />
            <h2 className="panel-title">Log Case</h2>
          </div>
          <form className="panel-body" onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label className="form-label">Case Title</label>
              <input 
                type="text" 
                name="case_title"
                value={form.case_title}
                onChange={handleInputChange}
                required
                className="form-input" 
                placeholder="e.g. Hiring Engine Bias"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Domain</label>
              <select 
                name="domain"
                value={form.domain}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="bias">Bias</option>
                <option value="privacy">Privacy</option>
                <option value="misuse">Misuse</option>
                <option value="safety">Safety</option>
                <option value="misinformation">Misinformation</option>
                <option value="labor_displacement">Labor Displacement</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">System Description</label>
              <textarea 
                name="system_description"
                value={form.system_description}
                onChange={handleInputChange}
                required
                className="form-textarea" 
                placeholder="Describe the target system's architecture and intent..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Incident Summary</label>
              <textarea 
                name="incident_summary"
                value={form.incident_summary}
                onChange={handleInputChange}
                required
                className="form-textarea" 
                placeholder="What ethical incident occurred?"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Resolution</label>
              <textarea 
                name="resolution"
                value={form.resolution}
                onChange={handleInputChange}
                required
                className="form-textarea" 
                placeholder="How was it resolved or mitigated?"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Precedent Status</label>
              <select 
                name="precedent_status"
                value={form.precedent_status}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="active">Active</option>
                <option value="overturned">Overturned</option>
                <option value="superseded">Superseded</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Source Reference</label>
              <input 
                type="text" 
                name="source"
                value={form.source}
                onChange={handleInputChange}
                required
                className="form-input" 
                placeholder="e.g. arXiv ID, URL, or report name"
              />
            </div>

            <button 
              type="submit" 
              disabled={submittingCase}
              className="btn-primary"
            >
              {submittingCase ? <RefreshCw className="loader" size={16} /> : <FileText size={16} />}
              <span>{submittingCase ? 'Ingesting Case...' : 'Ingest Precedent'}</span>
            </button>

            {submitSuccess && (
              <div style={{ display: 'flex', gap: '0.5rem', color: '#4ade80', justifyContent: 'center', fontSize: '0.875rem' }}>
                <CheckCircle size={16} />
                <span>Ingested & Graph Synced Successfully!</span>
              </div>
            )}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <GitPullRequest size={20} style={{ color: '#a78bfa' }} />
            <h2 className="panel-title">Design Review</h2>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">Describe Your AI System Design</label>
              <textarea 
                value={designDescription}
                onChange={(e) => setDesignDescription(e.target.value)}
                className="form-textarea"
                style={{ minHeight: '120px' }}
                placeholder="Detail the target design, input parameters, intended domain, and decisions the system will automate..."
              />
            </div>
            
            <button 
              onClick={handleQueryDesign} 
              disabled={loadingQuery || !designDescription.trim()}
              className="btn-primary"
            >
              {loadingQuery ? <RefreshCw className="loader" size={16} /> : <GitPullRequest size={16} />}
              <span>{loadingQuery ? 'Recalling Graph Memory...' : 'Evaluate Design Precedents'}</span>
            </button>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem' }}>
              <h3 className="form-label" style={{ marginBottom: '1rem' }}>Matched Ethical Precedents</h3>
              
              {loadingQuery && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <RefreshCw className="loader" size={32} />
                </div>
              )}

              {!loadingQuery && matchedCases.length === 0 && (
                <div className="empty-state">
                  <Database className="empty-state-icon" />
                  <div>No analogous cases surfaced. Try adding more context or system descriptions.</div>
                </div>
              )}

              {!loadingQuery && matchedCases.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {matchedCases.map(c => (
                    <div key={c.id} className="case-card">
                      <div className="case-card-header">
                        <span className="case-card-title">{c.case_title}</span>
                        <span className="badge badge-domain">{c.domain}</span>
                      </div>
                      
                      <div className="case-card-body">
                        <div className="case-detail-block">
                          <div className="case-detail-label">Incident Summary</div>
                          <div>{c.incident_summary}</div>
                        </div>
                        <div className="case-detail-block">
                          <div className="case-detail-label">Resolution</div>
                          <div>{c.resolution}</div>
                        </div>
                      </div>

                      <div className="case-card-footer">
                        <div className="relevance-score">
                          <span>Relevance: {c.relevance_score}</span>
                        </div>
                        <div className="feedback-buttons">
                          <button 
                            onClick={() => handleFeedback(c.id, true)}
                            className={`btn-feedback ${feedbackState[c.id] === 'yes' ? 'active-yes' : ''}`}
                          >
                            <ThumbsUp size={14} /> Yes
                          </button>
                          <button 
                            onClick={() => handleFeedback(c.id, false)}
                            className={`btn-feedback ${feedbackState[c.id] === 'no' ? 'active-no' : ''}`}
                          >
                            <ThumbsDown size={14} /> No
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            <h2 className="panel-title">Precedent Audit</h2>
          </div>
          <div className="panel-body">
            <div className="audit-action-bar">
              <div className="audit-meta">
                <span className="audit-meta-title">Sync Active Memory</span>
                <span className="audit-meta-desc">Forget overturned or superseded precedents</span>
              </div>
              <button 
                onClick={handleAuditPrecedents}
                disabled={loadingPrune}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                {loadingPrune ? <RefreshCw className="loader" size={14} /> : <AlertTriangle size={14} />}
                <span>Audit</span>
              </button>
            </div>

            {prunedCount !== null && (
              <div style={{ display: 'flex', gap: '0.5rem', color: '#f87171', justifyContent: 'center', fontSize: '0.875rem', margin: '0.5rem 0' }}>
                <CheckCircle size={16} style={{ color: '#ef4444' }} />
                <span>Audited & Pruned {prunedCount} Precedents!</span>
              </div>
            )}

            <div style={{ marginTop: '0.5rem' }}>
              <h3 className="form-label" style={{ marginBottom: '1rem', color: '#ef4444' }}>Forgotten Precedents</h3>
              
              {loadingPrune && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <RefreshCw className="loader" size={32} />
                </div>
              )}

              {!loadingPrune && prunedCasesList.length === 0 && (
                <div className="empty-state">
                  <CheckCircle className="empty-state-icon" style={{ color: '#22c55e' }} />
                  <div>All active database items are currently active graph precedents.</div>
                </div>
              )}

              {!loadingPrune && prunedCasesList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {prunedCasesList.map(c => (
                    <div key={c.id} className="case-card" style={{ borderLeft: '3px solid #ef4444' }}>
                      <div className="case-card-header">
                        <span className="case-card-title">{c.case_title}</span>
                        <span className="badge badge-status-pruned">Pruned</span>
                      </div>
                      
                      <div className="case-card-body">
                        <div className="case-detail-block" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                          <div className="case-detail-label" style={{ color: '#f87171' }}>Reason Forgotten</div>
                          <div>{c.pruned_reason}</div>
                        </div>
                      </div>

                      <div className="case-card-footer">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Globe size={12} /> {c.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
