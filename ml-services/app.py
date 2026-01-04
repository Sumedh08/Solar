import warnings
warnings.filterwarnings("ignore")

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import pickle
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import io
import os
from datetime import datetime

# --- App Initialization ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Model Paths ---
# Assuming these files are in the same directory as app.py or the current CWD
MODEL_DIR = os.getcwd() # Or specific path like r"C:\Users\Sumed\Downloads\solar.ai\solar-ai-platform\ml-services"
PROPHET_MODEL_PATH = os.path.join(MODEL_DIR, "brazil_e_model.pkl")
DEFECT_MODEL_PATH = os.path.join(MODEL_DIR, "solar_panel_classifier.pth")

# --- Load Prophet Model (Solar Grid) ---
prophet_model = None
try:
    with open(PROPHET_MODEL_PATH, 'rb') as f:
        prophet_model = pickle.load(f)
    print("✅ Prophet Model (Solar Grid) Loaded Successfully!")
except Exception as e:
    print(f"❌ Error loading Prophet Model: {e}")

# --- Load Defect Detection Model (PanelGuard) ---
defect_model = None
device = 'cuda' if torch.cuda.is_available() else 'cpu'
class_names = {
    0: 'Bird-drop',
    1: 'Clean',
    2: 'Dusty',
    3: 'Electrical-damage',
    4: 'Physical-Damage',
    5: 'Snow-Covered'
}

try:
    # Recreate the model architecture (MobileNetV2)
    defect_model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    num_classes = 6
    # Modify the classifier to match the saved model
    defect_model.classifier[1] = nn.Linear(defect_model.classifier[1].in_features, num_classes)
    
    # Load weights
    defect_model.load_state_dict(torch.load(DEFECT_MODEL_PATH, map_location=device, weights_only=True))
    defect_model.to(device)
    defect_model.eval()
    print("✅ Defect Detection Model (PanelGuard) Loaded Successfully!")
except Exception as e:
    print(f"❌ Error loading Defect Model: {e}")

# --- Helper: Image Transform ---
data_transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor()
])

# --- API Models ---
class PredictionRequest(BaseModel):
    start_date: str
    end_date: str

# --- Routes ---

@app.get("/")
def home():
    return {"message": "Solar AI ML Services Running"}

@app.post("/predict/energy")
def predict_energy(request: PredictionRequest):
    if not prophet_model:
        raise HTTPException(status_code=500, detail="Prophet model not loaded.")
    
    try:
        start_date = pd.to_datetime(request.start_date)
        end_date = pd.to_datetime(request.end_date)
        
        print(f"🔮 Predicting Energy from {start_date} to {end_date}")

        # Generate future dataframe (hourly freq as per BrazGrid.py)
        future_dates = pd.DataFrame({'ds': pd.date_range(start=start_date, end=end_date, freq='H')})
        
        # Predict
        forecast = prophet_model.predict(future_dates)
        
        # Extract relevant fields
        result = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        
        # Convert to JSON friendly format
        output = []
        for index, row in result.iterrows():
            output.append({
                "time": row['ds'].strftime('%Y-%m-%d %H:%M:%S'),
                "prediction": float(row['yhat']),
                "lower_bound": float(row['yhat_lower']),
                "upper_bound": float(row['yhat_upper'])
            })
            
        return {"forecast": output}

    except Exception as e:
        print(f"Error in prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/defect")
async def predict_defect(file: UploadFile = File(...)):
    if not defect_model:
        raise HTTPException(status_code=500, detail="Defect model not loaded.")

    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Preprocess
        input_tensor = data_transform(image).unsqueeze(0).to(device)
        
        # Predict
        with torch.no_grad():
            prediction = defect_model(input_tensor)
            
        predicted_class_idx = torch.argmax(prediction).item()
        confidence = float(torch.max(torch.nn.functional.softmax(prediction, dim=1)).item())
        class_name = class_names.get(predicted_class_idx, "Unknown")
        
        # Determine if defective (Anything other than 'Clean')
        is_defective = class_name != 'Clean'
        
        return {
            "is_defective": is_defective,
            "defect_type": class_name,
            "confidence": confidence
        }

    except Exception as e:
        print(f"Error in defect detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
