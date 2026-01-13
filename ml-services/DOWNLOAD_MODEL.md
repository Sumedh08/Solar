# Instructions to Download Pre-trained YOLOv8 Model from Kaggle

## Option 1: Download via Kaggle API (Recommended)

### Step 1: Set up Kaggle API
1. Go to https://www.kaggle.com/settings
2. Scroll to "API" section
3. Click "Create New API Token"
4. This downloads `kaggle.json`
5. Place it in: `C:\Users\Sumed\.kaggle\kaggle.json`

### Step 2: Install Kaggle CLI
```bash
pip install kaggle
```

### Step 3: Download the model
```bash
cd ml-services
kaggle kernels output sharifulislam021/yolov8-model-accuarcy-93-15 -p .
```

This will download the trained YOLOv8 model (93.15% accuracy) to the ml-services folder.

### Step 4: Rename the model file
Look for the `.pt` file in the downloaded files and rename it to:
```bash
mv best.pt solar_panel_yolov8.pt
```
(Or whatever the downloaded file is named)

---

## Option 2: Manual Download

1. Go to: https://www.kaggle.com/code/sharifulislam021/yolov8-model-accuarcy-93-15
2. Click "Output" tab on the right
3. Download the `.pt` model file
4. Save it as `solar_panel_yolov8.pt` in the `ml-services` folder

---

## Option 3: Use Your Existing MobileNetV2 Model (Instant)

If you want to start immediately without downloading:
1. The `solar_panel_classifier.pth` (9MB) is already in ml-services
2. I can revert the code to use it (30 seconds)
3. It works right now!

---

## After Getting the Model:

The app.py is already configured to use YOLOv8. Just run:
```bash
cd ml-services
pip install -r requirements.txt
python app.py
```

The model will be automatically loaded!
