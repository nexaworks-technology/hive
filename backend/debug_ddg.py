from duckduckgo_search import DDGS
import json

print("Testing DDGS...")
try:
    results = []
    with DDGS() as ddgs:
        # keywords argument was deprecated in some versions, using text() method
        gen = ddgs.text("OpenAI", max_results=3)
        for r in gen:
            results.append(r)
    
    print(json.dumps(results, indent=2))
except Exception as e:
    print(f"Error: {e}")
