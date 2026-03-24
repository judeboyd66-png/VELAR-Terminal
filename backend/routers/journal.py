"""
journal.py — AI trade screenshot analysis via Groq vision
"""
import os, base64, json, re
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()


def _clean_json(text: str) -> str:
    """Strip markdown fences and extract the first JSON object."""
    text = text.strip()
    # Remove ```json ... ``` fences
    text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    # Pull out first {...}
    m = re.search(r"\{.*\}", text, re.DOTALL)
    return m.group(0) if m else text


@router.post("/analyze-screenshot")
async def analyze_screenshot(file: UploadFile = File(...)):
    """
    Accept a chart screenshot, send to Groq vision, return extracted trade data.
    """
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise HTTPException(503, "GROQ_API_KEY not configured")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(400, "Image too large (max 10 MB)")

    mime = file.content_type or "image/png"
    b64  = base64.b64encode(image_bytes).decode()

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        resp = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                        {
                            "type": "text",
                            "text": (
                                "You are a trading assistant. Analyze this trading chart or trade screenshot "
                                "and extract the trade details. Look for: instrument name, direction (long/short, "
                                "buy/sell), entry price, stop loss, take profit, risk/reward ratio, timeframe, "
                                "risk percentage, and any P&L or notes visible.\n\n"
                                "Return ONLY a JSON object with these exact keys (null if not found):\n"
                                "{\n"
                                '  "pair": string,       // e.g. "BTCUSD", "EURUSD", "NAS100"\n'
                                '  "direction": string,  // "Long" or "Short"\n'
                                '  "entry": number,      // entry price\n'
                                '  "sl": number,         // stop loss price\n'
                                '  "tp": number,         // take profit price\n'
                                '  "rrPlanned": number,  // risk/reward ratio e.g. 5.15\n'
                                '  "riskPct": number,    // risk % of account e.g. 1.0\n'
                                '  "timeframe": string,  // "1M","5M","15M","1H","4H","D","W"\n'
                                '  "notes": string       // 1-sentence description, max 120 chars\n'
                                "}\n\n"
                                "Return ONLY the JSON, no explanation, no markdown."
                            ),
                        },
                    ],
                }
            ],
            max_tokens=400,
            temperature=0.1,
        )

        raw  = resp.choices[0].message.content or ""
        data = json.loads(_clean_json(raw))

        # Normalise direction
        direction = str(data.get("direction") or "").strip()
        if direction.lower() in ("buy", "long"):
            data["direction"] = "Long"
        elif direction.lower() in ("sell", "short"):
            data["direction"] = "Short"
        else:
            data["direction"] = None

        # Coerce numbers
        for field in ("entry", "sl", "tp", "rrPlanned", "riskPct"):
            v = data.get(field)
            try:
                data[field] = float(v) if v is not None else None
            except (TypeError, ValueError):
                data[field] = None

        return {"ok": True, "data": data}

    except json.JSONDecodeError:
        raise HTTPException(422, "Could not parse AI response as JSON")
    except Exception as e:
        raise HTTPException(500, str(e))
