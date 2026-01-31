from googlesearch import search
import time

print("Testing googlesearch-python...")
try:
    # Basic search
    query = "OpenAI official site"
    print(f"Searching for: {query}")
    
    count = 0
    for url in search(query, num_results=3):
        print(f"Result: {url}")
        count += 1
    
    if count == 0:
        print("No results found.")

except Exception as e:
    print(f"Error: {e}")
