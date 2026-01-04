import torch
from torch import nn
import torchvision.models as models
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import torchvision.transforms as transforms
import io

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load the model
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
num_classes = 6  # Update this based on your classes
model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
model.load_state_dict(torch.load(r"C:\Users\Sumed\Downloads\solar_panel_classifier.pth", map_location=device, weights_only=True))
model.eval()

# Define the class names
class_names = {
    0: 'Bird-drop',
    1: 'Clean',
    2: 'Dusty',
    3: 'Electrical-damage',
    4: 'Physical-Damage',
    5: 'Snow-Covered'
}

# Define the image transformation
data_transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor()
])

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    image = Image.open(io.BytesIO(file.read()))

    # Preprocess the image
    image = data_transform(image).unsqueeze(0).to(device)

    # Make prediction
    with torch.no_grad():
        prediction = model(image)
    
    predicted_class = torch.argmax(prediction).item()
    class_name = class_names[predicted_class]

    # Determine if the panel is defective
    defective = class_name != 'Clean'

    return jsonify({
        'defective': defective,
        'defect_type': class_name
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)