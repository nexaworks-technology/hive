import os
from typing import Optional, Dict, List, Any
import logging
from ddgs import DDGS
from tavily import TavilyClient
from googleapiclient.discovery import build
try:
    from googlesearch import search as free_google_search
except ImportError:
    free_google_search = None
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration & Environment --
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

class HydraTools:
    
    @staticmethod
    def _duckduckgo_search(query: str, max_results: int = 3) -> List[Dict[str, str]]:
        """
        Uses DuckDuckGo (No API Key) to find results.
        Best for unlimited, unrestricted searches.
        """
        try:
            logger.info(f"Attempting DuckDuckGo Search: {query}")
            results = []
            with DDGS() as ddgs:
                # Using text() method as per latest documentation
                gen = ddgs.text(query, max_results=max_results)
                for r in gen:
                    results.append({
                        "title": r.get('title'),
                        "link": r.get('href'),
                        "snippet": r.get('body')
                    })
            if not results:
                logger.warning("DuckDuckGo Search returned no results.")
            return results
        except Exception as e:
            logger.warning(f"DuckDuckGo Search failed: {e}")
            return []

    @staticmethod
    def _free_google_search(query: str, num: int = 3) -> List[Dict[str, str]]:
        """
        Fallback search using DuckDuckGo (acting as "free google").
        Googlesearch-python is unreliable.
        """
        logger.info(f"Attempting Fallback Search (DDG): {query}")
        results = []
        try:
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=num):
                    results.append({
                        "title": r.get('title'),
                        "link": r.get('href'),
                        "snippet": r.get('body')
                    })
        except Exception as e:
            logger.warning(f"Fallback Search failed: {e}")
        
        if not results:
             logger.warning("Fallback Search returned no results.")
             
        return results

    # Brave search would go here, skipping for now as no API key was provided.
    
    @staticmethod
    def _google_custom_search(query: str, num: int = 3) -> List[Dict[str, str]]:
        """
        Uses Google Custom Search JSON API.
        Best for high accuracy, hard-to-find leads.
        Limited quota (100/day free).
        """
        if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
            logger.warning("Google API Key or CSE ID missing. Skipping Google Search.")
            return HydraTools._free_google_search(query, num)
            
        try:
            logger.info(f"Attempting Google Search: {query}")
            service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)
            res = service.cse().list(q=query, cx=GOOGLE_CSE_ID, num=num).execute()
            
            clean_results = []
            if 'items' in res:
                for item in res['items']:
                    clean_results.append({
                        "title": item.get('title'),
                        "link": item.get('link'),
                        "snippet": item.get('snippet')
                    })
            else:
                 logger.warning(f"Google Search returned no items: {json.dumps(res)}")
                 return HydraTools._free_google_search(query, num)

            return clean_results
        except Exception as e:
            logger.error(f"Google Search failed: {e}")
            # Fallback to free search on error
            return HydraTools._free_google_search(query, num)

    @staticmethod
    def search_for_company(company_name: str) -> Dict[str, Any]:
        """
        Pillar 1: Multi-Dimensional Search Waterfall.
        Tries DDG first, then falls back to Google.
        """
        results = {}
        
        # 1. Search for LinkedIn
        query_linkedin = f"site:linkedin.com/company {company_name}"
        res_linkedin = HydraTools._duckduckgo_search(query_linkedin)
        
        if not res_linkedin:
            res_linkedin = HydraTools._google_custom_search(query_linkedin)
            
        if res_linkedin:
             results['linkedin_url'] = res_linkedin[0]['link']
             
        # 2. Search for Official Website
        query_site = f"{company_name} official site"
        res_site = HydraTools._duckduckgo_search(query_site)
        
        if not res_site:
            res_site = HydraTools._google_custom_search(query_site)
            
        if res_site:
            results['website_url'] = res_site[0]['link']
            results['title'] = res_site[0]['title']
            
        return results

    @staticmethod
    def check_hiring_signal(domain: str) -> Dict[str, Any]:
        """
        Pillar 2: Intent Verification.
        Checks for careers, jobs, hiring keywords.
        """
        query = f"site:{domain} (careers OR jobs OR hiring OR \"open positions\")"
        logger.info(f"Checking hiring signal for {domain}")
        
        # Use DDG for this scanning task
        res = HydraTools._duckduckgo_search(query, max_results=3)
        
        hiring_signal = False
        roles_detected = []
        
        if res:
            hiring_signal = True
            for r in res:
                roles_detected.append(r['title'])
                
        return {
            "is_hiring": hiring_signal,
            "signals": roles_detected
        }

    @staticmethod
    def get_page_context(url: str) -> Dict[str, Any]:
        """
        Pillar 3: The Humanizer.
        Uses Tavily to extract clean text for context.
        """
        if not TAVILY_API_KEY:
            logger.warning("Tavily API Key missing.")
            return {"error": "Tavily API Key missing"}
            
        try:
            logger.info(f"Extracting context from {url}")
            tavily = TavilyClient(api_key=TAVILY_API_KEY)
            response = tavily.extract(urls=[url])
            
            # The structure depends on Tavily's response, assuming basic extraction
            if response and 'results' in response:
                 # Clean or specific text would be parsed here
                 return {"content": response['results'][0].get('raw_content', '')[:5000]} # Limit for now
            return {"content": str(response)}
            
        except Exception as e:
            logger.error(f"Tavily extraction failed: {e}")
            return {"error": str(e)}

    @staticmethod
    def search_key_roles(domain: str) -> List[Dict[str, str]]:
        """
        Recursive Logic Helper.
        Finds CEO, VP Sales, etc.
        """
        targets = ["CEO", "VP of Sales", "Marketing Manager"]
        people = []
        
        for role in targets:
             query = f"site:linkedin.com/in {role} {domain}"
             res = HydraTools._duckduckgo_search(query, max_results=1)
             if res:
                 people.append({
                     "role": role,
                     "name": res[0]['title'].split("-")[0].strip(), # Simple heuristic
                     "profile_link": res[0]['link']
                 })
        return people
