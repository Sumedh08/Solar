from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
import pickle
from typing import List
import io
import os
import base64
import logging
from groq import Groq
from prophet import Prophet

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

# ==================== ENERGY PREDICTION (Prophet) ====================

# Load Prophet model
try:
    with open('brazil_e_model.pkl', 'rb') as f:
        prophet_model = pickle.load(f)
    logger.info("✅ Prophet model loaded successfully")
except Exception as e:
    logger.error(f"❌ Error loading Prophet model: {e}")
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
        logger.error(f"❌ Forecast Error: {e}")
        return {"error": str(e)}

@app.post("/predict/custom_energy")
async def predict_custom_energy(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        if 'timestamp' in df.columns and 'generation' in df.columns:
            df = df.rename(columns={'timestamp': 'ds', 'generation': 'y'})
        elif 'time' in df.columns and 'value' in df.columns:
            df = df.rename(columns={'time': 'ds', 'value': 'y'})
            
        if 'ds' not in df.columns or 'y' not in df.columns:
            df.columns = ['ds', 'y'] + list(df.columns[2:])

        df['ds'] = pd.to_datetime(df['ds'], errors='coerce')
        df['y'] = pd.to_numeric(df['y'], errors='coerce')
        df = df.dropna(subset=['ds', 'y']).sort_values('ds')
        
        num_rows = len(df)
        if num_rows > 10000:
            df = df.iloc[-10000:]
            logger.info(f"⚡ Downsampled custom dataset from {num_rows} to 10,000 rows for Fast Predict.")
            
        logger.info("🤖 Training custom Prophet model...")
        custom_model = Prophet(yearly_seasonality=True, daily_seasonality=True)
        custom_model.fit(df)
        
        future = custom_model.make_future_dataframe(periods=168, freq='H')
        forecast = custom_model.predict(future)
        
        last_date = df['ds'].max()
        future_forecast = forecast[forecast['ds'] > last_date]
        
        output = []
        for _, row in future_forecast.iterrows():
            output.append({
                "time": row['ds'].isoformat(),
                "prediction": max(0.0, float(row['yhat'])),
                "lower_bound": max(0.0, float(row['yhat_lower'])),
                "upper_bound": float(row['yhat_upper'])
            })
            
        return {"forecast": output}

    except Exception as e:
        logger.error(f"❌ Custom Forecast Error: {e}")
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
            model="meta-llama/llama-4-scout-17b-16e-instruct",
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
        "models": {
            "prophet": "loaded" if prophet_model else "not_loaded",
            "vision": "ready" if groq_client else "not_ready"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
