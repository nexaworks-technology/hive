import sys
import os

# Add backend directory to sys.path so we can resolve specific modules
from dotenv import load_dotenv
current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.abspath(os.path.join(current, "../.."))
sys.path.append(parent)
load_dotenv(os.path.join(parent, ".env"))

try:
    from app.hydra.hydra_core import create_hydra_graph
    print("SUCCESS: Successfully imported create_hydra_graph")
    
    # Run the Agent
    print("\n--- Running Hydra Agent for 'OpenAI' ---")
    app = create_hydra_graph()
    result = app.invoke({"company_name": "OpenAI", "key_people": [], "hiring_signals": [], "context": {}})
    import json
    print(json.dumps(result, indent=2))
    print("\nSUCCESS: Agent execution completed")

except ImportError as e:
    print(f"ERROR: Import failed: {e}")
except Exception as e:
    print(f"ERROR: Unexpected error: {e}")
