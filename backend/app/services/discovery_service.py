import asyncio
import json
from typing import List, Dict, Any
from playwright.async_api import async_playwright
from app.services.llm_service import llm_service
from app.core.config import settings

class DiscoveryService:
    """
    The 'Hydra' Engine: Discovers leads across multiple sources with 
    autonomous verification and enrichment.
    """

    async def discover_leads(self, target_audience: str, icp_data: Dict[str, Any], limit: int = 15) -> List[Dict[str, Any]]:
        """
        Uses Project Hydra (HydraTools) for multi-source discovery.
        """
        from app.hydra.tools import HydraTools

        # Hydra Head Queries
        queries = [
            f"site:linkedin.com/in/ \"{target_audience}\"",
            f"site:linkedin.com/company/ \"{target_audience}\"",
            f"\"{target_audience}\" startups funding 2024",
            f"\"{target_audience}\" hiring managers"
        ]

        all_findings = []
        
        for q in queries:
            print(f"Hydra Head: Searching {q}")
            # Use the robust fallback search from HydraTools
            # This handles DuckDuckGo and Google fallback automatically
            results = HydraTools._free_google_search(q, num=5)
            all_findings.extend(results)
            
            # Small delay to be polite
            await asyncio.sleep(2)

        if not all_findings:
            return []
            
        # --- Phase 2: Intelligence Merging (LLM Extraction) ---
        return await self._process_findings(all_findings, target_audience)

    async def _process_findings(self, findings: List[Dict], target_audience: str) -> List[Dict]:
        """
        Uses LLM to clean search noise into structured Lead records.
        """
        findings_text = "\n".join([f"Source: {f['link']}\nText: {f['title']} - {f['snippet']}" for f in findings])

        prompt = f"""
        You are a Lead Generation Specialist. I have a list of search results for the target audience: {target_audience}.
        
        Search Results:
        {findings_text}

        Your Task:
        1. Identify ACTUAL people or companies from these snippets.
        2. Extract: Name, Job Title, Company, LinkedIn URL (if present).
        3. Assign a 'Confidence Score' (0-10) based on how well they match the target.
        4. Provide a 'Conversation Starter' based on the snippet context.

        Return ONLY valid JSON in this format:
        {{"leads": [{{"name": "...", "title": "...", "company": "...", "linkedin": "...", "confidence": 10, "starter": "..."}}]}}
        """

        messages = [
            {"role": "system", "content": "You are a data extraction specialist that outputs JSON."},
            {"role": "user", "content": prompt}
        ]

        data = await llm_service._call_groq(messages, response_format={"type": "json_object"})
        
        if data:
            try:
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return parsed.get("leads", [])
            except:
                pass
        
        return []

discovery_service = DiscoveryService()
