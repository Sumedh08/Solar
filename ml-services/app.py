from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
import pickle
from typing import List
import io
from PIL import Image
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms

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

# ==================== DEFECT DETECTION (MobileNetV2) ====================

# Load MobileNetV2 model
device = 'cuda' if torch.cuda.is_available() else 'cpu'
defect_model = None

class_names = {
    0: 'Bird-drop',
    1: 'Clean',
    2: 'Dusty',
    3: 'Electrical-damage',
    4: 'Physical-Damage',
    5: 'Snow-Covered'
}

try:
    # Load MobileNetV2 architecture
    defect_model = models.mobilenet_v2(weights=None)
    num_classes = 6
    defect_model.classifier[1] = nn.Linear(defect_model.classifier[1].in_features, num_classes)
    
    # Load trained weights
    defect_model.load_state_dict(torch.load('solar_panel_classifier.pth', map_location=device, weights_only=True))
    defect_model.to(device)
    defect_model.eval()
    print(f"✅ MobileNetV2 defect model loaded successfully on {device}")
except Exception as e:
    print(f"❌ Error loading defect model: {e}")

# Image preprocessing
data_transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor()
])

@app.post("/predict/defect")
async def predict_defect(file: UploadFile = File(...)):
    if defect_model is None:
        return {"error": "Defect model not loaded"}
    
    try:
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Preprocess
        input_tensor = data_transform(image).unsqueeze(0).to(device)
        
        # Predict
        with torch.no_grad():
            prediction = defect_model(input_tensor)
            
        predicted_class_idx = torch.argmax(prediction).item()
        confidence = float(torch.max(torch.nn.functional.softmax(prediction, dim=1)).item())
        defect_type = class_names.get(predicted_class_idx, "Unknown")
        
        # Determine if defective
        is_defective = defect_type != 'Clean'
        
        return {
            "is_defective": is_defective,
            "defect_type": defect_type,
            "confidence": confidence
        }
    
    except Exception as e:
        return {"error": str(e)}

# ==================== HEALTH CHECK ====================

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "models": {
            "prophet": "loaded" if prophet_model else "not loaded",
            "mobilenetv2": "loaded" if defect_model else "not loaded"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
