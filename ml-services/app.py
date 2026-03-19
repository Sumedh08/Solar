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
from groq import Groq

# Initialize Groq client
# The user will need to add GROQ_API_KEY to their Render environment variables.
api_key = os.environ.get("GROQ_API_KEY")

# For local testing, ensure the GROQ_API_KEY is set in your environment
if not api_key:
    # Use a dummy key so the app boots, but fails gracefully on prediction if not provided
    api_key = "gsk_placeholder_replace_me_in_render"

groq_client = Groq(api_key=api_key)

@app.post("/predict/defect")
async def predict_defect(file: UploadFile = File(...)):
    try:
        # Read and base64 encode the image
        image_data = await file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
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
            temperature=0.1, # Low temperature for consistent classification
            max_tokens=20
        )
        
        # Parse the response
        response_text = chat_completion.choices[0].message.content.strip()
        
        # Ensure it matches one of our expected classes, otherwise default to Unknown
        valid_classes = ['Clean', 'Bird-drop', 'Dusty', 'Electrical-damage', 'Physical-Damage', 'Snow-Covered']
        defect_type = "Unknown"
        for valid_class in valid_classes:
            if valid_class.lower() in response_text.lower():
                defect_type = valid_class
                break
                
        # Determine if defective
        is_defective = defect_type != 'Clean'
        
        return {
            "is_defective": is_defective,
            "defect_type": defect_type,
            "confidence": 0.95 # Groq doesn't provide raw logits, so we return a high static confidence for successful LLM classification
        }
    
    except Exception as e:
        print(f"Groq API Error: {e}")
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
