import json
import asyncio
from typing import Dict, Any, List, Optional
import requests
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.3-70b-versatile"

    async def _call_groq(self, messages: List[Dict[str, str]], temperature: float = 0.5, response_format: Optional[Dict] = None) -> Optional[Dict]:
        """
        Calls Groq API with OpenAI-compatible chat completions endpoint.
        """
        if not self.api_key:
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        
        if response_format:
            payload["response_format"] = response_format

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: requests.post(self.base_url, headers=headers, json=payload, timeout=30))
            
            if response.status_code != 200:
                print(f"Groq API Error: {response.status_code} - {response.text}")
                return None

            return response.json()
        except Exception as e:
            print(f"Groq Request error: {e}")
            return None

    async def generate_icp(self, target_audience: str, additional_context: str = "") -> Dict[str, Any]:
        """
        Generates a high-fidelity Ideal Customer Profile (ICP) using a two-pass Strategist-Optimizer loop.
        """
        # --- Pass 1: The Strategist ---
        strategist_prompt = f"""
        You are a World-Class Growth Strategist. Develop a deep-dive ICP for:
        Audience: {target_audience}
        Context: {additional_context}

        Focus on unconventional niches and high-probability conversion triggers.
        Return JSON with: traits, marketInsights, competitiveAnalysis, painPoints, strategicAngles.
        """

        messages_p1 = [
            {"role": "system", "content": "You are a strategic AI that outputs JSON."},
            {"role": "user", "content": strategist_prompt}
        ]

        p1_data = await self._call_groq(messages_p1, response_format={"type": "json_object"})
        p1_content = p1_data["choices"][0]["message"]["content"] if p1_data else "{}"

        # --- Pass 2: The Optimizer (Critique & Refine) ---
        optimizer_prompt = f"""
        You are the Head of Revenue Operations. Review and improve this drafted ICP.
        
        Original Query: {target_audience}
        Drafted ICP: {p1_content}

        Your Task:
        1. Identify 2 generic or 'fluffy' points and replace them with hyper-specific, data-driven ideas.
        2. Identify the 'Hidden Objections' this persona might have.
        3. Determine the 'Winning Outreach Channels' (LinkedIn, Cold Email, Twitter, etc.).
        
        Return the FINAL, optimized ICP in this JSON format:
        {{
            "traits": ["Trait 1", ...],
            "marketInsights": ["Insight 1", ...],
            "competitiveAnalysis": ["Analysis 1", ...],
            "painPoints": ["Pain point 1", ...],
            "strategicAngles": ["How to pitch them 1", ...],
            "objections": ["Hidden Objection 1", ...],
            "recommendedChannels": ["Channel 1", ...]
        }}
        """

        messages_p2 = [
            {"role": "system", "content": "You are a rigorous Optimizer that outputs high-value JSON."},
            {"role": "user", "content": optimizer_prompt}
        ]

        final_data = await self._call_groq(messages_p2, temperature=0.3, response_format={"type": "json_object"})
        
        if final_data:
            try:
                content = final_data["choices"][0]["message"]["content"]
                return json.loads(content)
            except (KeyError, json.JSONDecodeError) as e:
                print(f"Error parsing Final Optimized ICP: {e}")

        # Fallback to P1 if P2 fails, or mock
        try:
            return json.loads(p1_content) if p1_content != "{}" else self._get_mock_icp(target_audience)
        except:
            return self._get_mock_icp(target_audience)

    def _get_mock_icp(self, target_audience: str) -> Dict[str, Any]:
        return {
            "traits": [
                "B2B SaaS Decision Makers",
                "Revenue Range: $2M-50M ARR",
                f"Industry focus: {target_audience}",
                "Growth-focused companies",
                "Proven Lead Generation investment"
            ],
            "marketInsights": [
                "Market size: Growing 15% YoY",
                "Average contract value: $10k-50k",
                "Decision cycle: 30-60 days",
                "Key seasonality: Q1 & Q4 budgets"
            ],
            "competitiveAnalysis": [
                "High fragmentation in the market",
                "Competitors focus on enterprise, leaving SMB gap",
                "Price sensitivity is moderate",
                "Integration capabilities are a key differentiator"
            ],
            "painPoints": [
                "Inefficient manual processes",
                "Lack of data visibility",
                "High customer acquisition costs",
                "Difficulty scaling outreach"
            ]
        }

    async def generate_drafts(self, leads: List[Dict], target_audience: str, additional_context: str) -> List[Dict]:
        """
        Project Gungnir: Generates 3 ultra-personalized email variants per lead.
        """
        all_drafts = []
        
        for lead in leads:
            context = lead.get('summary') or lead.get('reasoning') or "No deep context available."
            talking_points = ", ".join(lead.get('talkingPoints') or [])
            
            prompt = f"""
            You are a Master Copywriter. Architect 3 distinct outreach variants for this lead.
            
            Lead Details:
            Name: {lead.get('name')}
            Title: {lead.get('title')}
            Company: {lead.get('company')}
            Hydra Reasoning: {lead.get('reasoning')}
            Discovery Context: {lead.get('summary')}
            
            Campaign Strategy:
            Audience: {target_audience}
            Context: {additional_context}

            The Varieties:
            1. 'The Sniper': Extremely short (2-3 sentences). No fluff. Direct value.
            2. 'The Consultant': Value-heavy. Reference the 'Hydra Reasoning' directly. Soft ask.
            3. 'The Human': Casual, lowercase elements, sent-from-phone vibe. Authentic.

            Rules:
            - Return ONLY valid JSON.
            - JSON structure: 
            {{
                "variants": [
                    {{"type": "Sniper", "subject": "...", "body": "..."}},
                    {{"type": "Consultant", "subject": "...", "body": "..."}},
                    {{"type": "Human", "subject": "...", "body": "..."}}
                ]
            }}
            """

            messages = [
                {"role": "system", "content": "You are a world-class persuasion architect that outputs JSON."},
                {"role": "user", "content": prompt}
            ]

            data = await self._call_groq(messages, temperature=0.7, response_format={"type": "json_object"})
            
            if data:
                try:
                    content = json.loads(data["choices"][0]["message"]["content"])
                    all_drafts.append({
                        "id": lead.get("id"),
                        "variants": content.get("variants", [])
                    })
                except:
                    print(f"Failed to generate Gungnir variants for lead {lead.get('id')}")
        
        return all_drafts

llm_service = LLMService()
