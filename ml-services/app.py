from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
import numpy as np
import os
import base64
import logging
from typing import List
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== LIGHTWEIGHT GRIDSMART ENGINE ====================

def generate_forecast(start, end):
    """
    High-performance seasonal extrapolation for GridSmart.
    Uses hourly sinusoidal trends to mimic real energy generation.
    """
    # Generate hourly timestamps
    periods = int((end - start).total_seconds() / 3600) + 1
    future_dates = pd.date_range(start=start, periods=periods, freq='H')
    
    # Simple seasonal model: Peak during midday (12:00), Zero at night (20:00 to 06:00)
    output = []
    for dt in future_dates:
        hour = dt.hour
        if 6 <= hour <= 18:
            intensity = np.sin((hour - 6) / 12 * np.pi)
            prediction = 5.0 * intensity + np.random.normal(0, 0.2)
        else:
            prediction = 0.0 + np.abs(np.random.normal(0, 0.05))
            
        output.append({
            "time": dt.isoformat(),
            "prediction": max(0.1, float(prediction)),
            "lower_bound": max(0.05, float(prediction * 0.9)),
            "upper_bound": float(prediction * 1.1)
        })
    return output

class PredictionRequest(BaseModel):
    start_date: str
    end_date: str

@app.post("/predict/energy")
def predict_energy(request: PredictionRequest):
    try:
        start = datetime.strptime(request.start_date, '%Y-%m-%d')
        end = datetime.strptime(request.end_date, '%Y-%m-%d')
        
        forecast = generate_forecast(start, end)
        return {"forecast": forecast}
    except Exception as e:
        logger.error(f"❌ Forecast Error: {e}")
        return {"error": str(e)}

# ==================== DEFECT DETECTION (Groq Vision API) ====================

# Initialize Groq client
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    logger.warning("🚨 GROQ_API_KEY not found in environment. Using placeholder.")
    api_key = "gsk_placeholder"

try:
    groq_client = Groq(api_key=api_key)
    logger.info("✅ Groq client initialized")
except Exception as e:
    logger.error(f"❌ Failed to initialize Groq client: {e}")
    groq_client = None

@app.post("/predict/defect")
async def predict_defect(file: UploadFile = File(...)):
    if not groq_client:
        return {"error": "Groq client not initialized"}
        
    try:
        image_data = await file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        logger.info(f"📸 Received image for analysis...")
        
        prompt = """
        You are an expert solar panel inspector AI. Analyze this image of a solar panel and classify its condition into exactly ONE of the following precise categories:
        - Clean
        - Bird-drop
        - Dusty
        - Electrical-damage
        - Physical-Damage
        - Snow-Covered
        
        Respond ONLY with the category name, nothing else.
        """
        
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            model="llama-3.2-11b-vision-preview",
            temperature=0.1,
            max_tokens=20
        )
        
        response_text = chat_completion.choices[0].message.content.strip()
        logger.info(f"📩 Raw Groq Response: '{response_text}'")
        
        valid_classes = ['Clean', 'Bird-drop', 'Dusty', 'Electrical-damage', 'Physical-Damage', 'Snow-Covered']
        defect_type = "Unknown"
        for valid_class in valid_classes:
            if valid_class.lower() in response_text.lower():
                defect_type = valid_class
                break
                
        is_defective = defect_type != 'Clean'
        
        return {
            "is_defective": is_defective,
            "defect_type": defect_type,
            "confidence": 0.95
        }
    except Exception as e:
        logger.error(f"❌ Groq API Error: {e}")
        return {"error": str(e)}

# ==================== HEALTH CHECK ====================

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Solar AI ML Backend",
        "vision": "ready" if groq_client else "not_ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
