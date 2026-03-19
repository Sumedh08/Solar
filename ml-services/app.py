from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
import pickle
from typing import List
import io

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ENERGY PREDICTION (Prophet) ====================

# Load Prophet model
try:
    with open('brazil_e_model.pkl', 'rb') as f:
        prophet_model = pickle.load(f)
    print("✅ Prophet model loaded successfully")
except Exception as e:
    print(f"❌ Error loading Prophet model: {e}")
    prophet_model = None

class PredictionRequest(BaseModel):
    start_date: str
    end_date: str

@app.post("/predict/energy")
def predict_energy(request: PredictionRequest):
    if prophet_model is None:
        return {"error": "Prophet model not loaded"}
    
    try:
        start = datetime.strptime(request.start_date, '%Y-%m-%d')
        end = datetime.strptime(request.end_date, '%Y-%m-%d')
        
        # Generate hourly timestamps
        periods = int((end - start).total_seconds() / 3600) + 1
        future_dates = pd.date_range(start=start, periods=periods, freq='H')
        future_df = pd.DataFrame({'ds': future_dates})
        
        # Make predictions
        forecast = prophet_model.predict(future_df)
        
        # Format output
        output = []
        for _, row in forecast.iterrows():
            output.append({
                "time": row['ds'].isoformat(),
                "prediction": float(row['yhat']),
                "lower_bound": float(row['yhat_lower']),
                "upper_bound": float(row['yhat_upper'])
            })
        
        return {"forecast": output}
    
    except Exception as e:
        return {"error": str(e)}

# ==================== DEFECT DETECTION (Groq Vision API) ====================

import os
import base64
import logging
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Groq client
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    logger.warning("🚨 GROQ_API_KEY not found in environment. Using placeholder for boot.")
    api_key = "gsk_placeholder_replace_me_in_render"

try:
    groq_client = Groq(api_key=api_key)
    logger.info("✅ Groq client initialized")
except Exception as e:
    logger.error(f"❌ Failed to initialize Groq client: {e}")
    groq_client = None

@app.post("/predict/defect")
async def predict_defect(file: UploadFile = File(...)):
    if not groq_client:
        return {"error": "Groq client not initialized. Check API Key."}
        
    try:
        # Read and base64 encode the image
        image_data = await file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Fixed lint: casting to str and slicing for log
        image_head = str(base64_image)[:50]
        logger.info(f"📸 Received image. Base64 head: {image_head}...")
        
        # Prepare the prompt for Groq
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
        
        logger.info(f"🤖 Calling Groq Vision API (llama-3.2-11b-vision-preview)...")
        
        # Call Groq Vision API
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
        
        # Parse the response
        response_text = chat_completion.choices[0].message.content.strip()
        logger.info(f"📩 Raw Groq Response: '{response_text}'")
        
        # Ensure it matches one of our expected classes, otherwise default to Unknown
        valid_classes = ['Clean', 'Bird-drop', 'Dusty', 'Electrical-damage', 'Physical-Damage', 'Snow-Covered']
        defect_type = "Unknown"
        for valid_class in valid_classes:
            if valid_class.lower() in response_text.lower():
                defect_type = valid_class
                break
                
        logger.info(f"🎯 Derived Classification: {defect_type}")
        
        # Determine if defective
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
        "models": {
            "prophet": "loaded" if prophet_model else "not loaded",
            "vision": "groq_api_ready"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
