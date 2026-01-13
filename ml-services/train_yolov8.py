# YOLOv8 Training Script for Solar Panel Defect Detection
# Run this script to train YOLOv8 on your solar panel dataset

from ultralytics import YOLO
import os

# Define your dataset structure
# Expected format:
# dataset/
#   train/
#     Bird-drop/
#     Clean/
#     Dusty/
#     Electrical-damage/
#     Physical-Damage/
#     Snow-Covered/
#   val/
#     Bird-drop/
#     Clean/
#     ... (same structure)

def train_yolov8_classifier():
    """
    Train YOLOv8 classification model on solar panel defect dataset
    """
    
    # Load pretrained YOLOv8 nano classification model
    model = YOLO('yolov8n-cls.pt')
    
    # Train the model
    # Update 'data' path to your dataset directory
    results = model.train(
        data='path/to/your/solar_panel_dataset',  # Update this path
        epochs=50,
        imgsz=224,
        batch=16,
        name='solar_panel_defect',
        patience=10,
        save=True,
        device=0  # Use GPU 0, or 'cpu' for CPU training
    )
    
    # Validate the model
    metrics = model.val()
    
    # Export the model
    model.export(format='pt')
    
    print("✅ Training completed!")
    print(f"Best model saved at: runs/classify/solar_panel_defect/weights/best.pt")
    print(f"Accuracy: {metrics.top1:.2f}%")
    
    return model

def test_model(model_path='runs/classify/solar_panel_defect/weights/best.pt'):
    """
    Test the trained model on sample images
    """
    model = YOLO(model_path)
    
    # Test on a sample image
    results = model('path/to/test/image.jpg')
    
    # Print results
    for r in results:
        print(f"Predicted class: {r.names[r.probs.top1]}")
        print(f"Confidence: {r.probs.top1conf:.2f}")

if __name__ == "__main__":
    print("🚀 Starting YOLOv8 training for solar panel defect detection...")
    print("\n⚠️ IMPORTANT: Update the dataset path in this script before running!")
    print("Expected dataset structure:")
    print("  dataset/")
    print("    train/")
    print("      Bird-drop/")
    print("      Clean/")
    print("      Dusty/")
    print("      Electrical-damage/")
    print("      Physical-Damage/")
    print("      Snow-Covered/")
    print("    val/")
    print("      (same structure)")
    print("\n")
    
    # Uncomment to train
    # model = train_yolov8_classifier()
    
    # Uncomment to test
    # test_model()
