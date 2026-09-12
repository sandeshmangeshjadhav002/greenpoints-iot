import json as _json
from typing import Optional
import httpx
from config import settings


_ai_cache: dict[str, dict] = {}


def _client() -> Optional[httpx.Client]:
    if not settings.openai_api_key:
        return None
    return httpx.Client(
        base_url="https://api.openai.com/v1",
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        timeout=15.0,
    )


def classify_waste_short(image_hint: Optional[str] = None) -> dict:
    cache_key = f"cls:{(image_hint or '').strip().lower()[:60]}"
    if cache_key in _ai_cache:
        return _ai_cache[cache_key]

    if not settings.openai_api_key:
        fallback = {"type": "General", "confidence": 0.5}
        _ai_cache[cache_key] = fallback
        return fallback

    prompt = (
        f"Classify the waste described below into one of exactly: Recyclable, Organic, General, E-Waste.\n"
        f"Respond ONLY as JSON like {{\"type\":\"Recyclable\",\"confidence\":0.92}}. No extra text.\n"
        f"Description: {(image_hint or '')[:120]}"
    )

    c = _client()
    if c is None:
        return {"type": "General", "confidence": 0.5}
    try:
        r = c.post("/chat/completions", json={
            "model": settings.ai_model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 40,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
        })
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        parsed = _json.loads(content)
        result = {
            "type": str(parsed.get("type", "General")),
            "confidence": float(parsed.get("confidence", 0.5)),
        }
        _ai_cache[cache_key] = result
        return result
    except Exception:
        result = {"type": "General", "confidence": 0.5}
        _ai_cache[cache_key] = result
        return result
    finally:
        c.close()


def sustainability_tip(user_summary: dict) -> str:
    cache_key = "tip:" + str(sorted(user_summary.items()))
    if cache_key in _ai_cache:
        return _ai_cache[cache_key]  # type: ignore

    if not settings.openai_api_key:
        fallback = "Keep separating your recyclables — every kg helps reduce landfill waste!"
        _ai_cache[cache_key] = fallback  # type: ignore
        return fallback

    short = (
        f"Tokens: {user_summary.get('tokens', 0)}, "
        f"Waste kg: {user_summary.get('waste_kg', 0)}, "
        f"Streak: {user_summary.get('streak', 0)}d. "
    )
    prompt = (
        "Reply with ONE short (15 words max) specific sustainability tip for this user. No greeting.\n"
        + short
    )
    c = _client()
    if c is None:
        return "Keep up the great recycling habits!"
    try:
        r = c.post("/chat/completions", json={
            "model": settings.ai_model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 30,
            "temperature": 0.6,
        })
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"].strip().strip('"').strip("'")
        _ai_cache[cache_key] = text  # type: ignore
        return text
    except Exception:
        return "Every small recycling action adds up — keep going!"
    finally:
        c.close()
