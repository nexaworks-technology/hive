from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from app.hydra.tools import HydraTools

# --- State Definition ---
class HydraState(TypedDict):
    company_name: str
    domain: Optional[str]
    website_url: Optional[str]
    linkedin_url: Optional[str]
    key_people: List[Dict[str, str]]
    is_hiring: bool
    hiring_signals: List[str]
    context: Dict[str, Any] # Pain points, wins, raw content
    error: Optional[str]

# --- Nodes ---

def scout_node(state: HydraState) -> HydraState:
    """
    The Scout: Finds domain, LinkedIn, and key people.
    """
    company_name = state.get("company_name")
    print(f"--- SCOUT: Searching for {company_name} ---")
    
    # 1. Basic Company Search (Waterfall)
    results = HydraTools.search_for_company(company_name)
    
    domain = ""
    if results.get("website_url"):
        # Simple extraction of domain from URL
        from urllib.parse import urlparse
        parsed = urlparse(results["website_url"])
        domain = parsed.netloc.replace("www.", "")
    
    # 2. Key People Search (Recursive Logic)
    people = []
    if domain:
        people = HydraTools.search_key_roles(domain)
        
    return {
        **state,
        "domain": domain,
        "website_url": results.get("website_url"),
        "linkedin_url": results.get("linkedin_url"),
        "key_people": people
    }

def verifier_node(state: HydraState) -> HydraState:
    """
    The Verifier: Checks for hiring signals.
    """
    domain = state.get("domain")
    if not domain:
        return state # Cannot verify without domain
        
    print(f"--- VERIFIER: Checking signals for {domain} ---")
    
    verification = HydraTools.check_hiring_signal(domain)
    
    return {
        **state,
        "is_hiring": verification.get("is_hiring", False),
        "hiring_signals": verification.get("signals", [])
    }

def profiler_node(state: HydraState) -> HydraState:
    """
    The Profiler: Enriches with context using Tavily.
    """
    url = state.get("website_url")
    if not url:
        return state
        
    print(f"--- PROFILER: Enriching context for {url} ---")
    
    context_data = HydraTools.get_page_context(url)
    
    # Future: Use an LLM here to parse context_data['content'] into "pain_points"
    
    return {
        **state,
        "context": context_data
    }

# --- Graph Construction ---

def create_hydra_graph():
    workflow = StateGraph(HydraState)
    
    # Add Nodes
    workflow.add_node("scout", scout_node)
    workflow.add_node("verifier", verifier_node)
    workflow.add_node("profiler", profiler_node)
    
    # Add Edges (Linear Flow for MVP)
    workflow.set_entry_point("scout")
    workflow.add_edge("scout", "verifier")
    workflow.add_edge("verifier", "profiler")
    workflow.add_edge("profiler", END)
    
    return workflow.compile()

# Example Usage (can be called from main.py or worker.py)
if __name__ == "__main__":
    app = create_hydra_graph()
    initial_state = {
        "company_name": "Anthropic",
        "key_people": [],
        "hiring_signals": [],
        "context": {}
    }
    result = app.invoke(initial_state)
    import json
    print(json.dumps(result, indent=2))
