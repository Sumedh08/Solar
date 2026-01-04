# Solar AI Platform

An AI-powered solar energy platform for India, featuring solar ROI calculation, energy prediction, and panel defect detection.

## 🌟 Features

### 1. **SunCalc** - Solar ROI Calculator
- Calculate solar energy potential for your location
- Estimate annual savings and breakeven period
- Powered by NREL PVWatts API
- Location-specific analysis for India

### 2. **GridSmart** - Energy Prediction
- AI-powered energy demand forecasting
- Prophet-based time series prediction
- Interactive visualization with Recharts
- Hourly prediction granularity

### 3. **PanelGuard** - Defect Detection
- Deep learning-based defect classification
- Detects 6 types of panel defects:
  - Clean
  - Bird-drop
  - Dusty
  - Snow-Covered
  - Electrical-damage
  - Physical-Damage
- MobileNetV2 architecture
- Real-time image analysis

## 🏗️ Architecture

```
solar-ai-platform/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Java Spring Boot
└── ml-services/       # Python FastAPI + ML Models
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Java 17+
- Python 3.8+
- Maven

### Frontend Setup
```bash
cd solar-ai-platform/frontend
npm install
npm run dev
```
Access at: `http://localhost:5173`

### Backend Setup
```bash
cd solar-ai-platform/backend
mvn spring-boot:run
```
Access at: `http://localhost:8081`

### ML Services Setup
```bash
cd solar-ai-platform/ml-services
pip install -r requirements.txt
python app.py
```
Access at: `http://localhost:5000`

## 📊 Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Recharts
- Axios

### Backend
- Java 17
- Spring Boot
- Spring WebFlux
- Maven

### ML Services
- Python
- FastAPI
- PyTorch
- Prophet
- Pillow

## 🌍 India Solar Market Context

Based on CEEW research:
- **Technical Potential**: 637 GW
- **Economic Potential**: 102 GW
- **Market Potential**: 11 GW (~5.5 million households)

## 📝 API Endpoints

### Solar Calculator
```
POST http://localhost:8081/api/calculator/calculate
```

### Energy Prediction
```
POST http://localhost:5000/predict/energy
Body: { "start_date": "2024-01-01", "end_date": "2024-01-07" }
```

### Defect Detection
```
POST http://localhost:5000/predict/defect
Body: FormData with 'file' field
```

## 🎨 Design Philosophy

Inspired by Tesla's minimalist design:
- Clean, light theme
- Full-screen scrollable sections
- Smooth scroll-snap animations
- Minimal overlays on hero images
- Professional typography

## 📄 License

MIT License

## 👨‍💻 Author

Built with ❤️ for sustainable energy in India
