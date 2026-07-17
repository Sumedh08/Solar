# Solar.ai Platform

Agentic solar energy platform for India: **SunCalc** (ROI), **GridSmart** (forecast), **PanelGuard** (defects).

Built with **LangGraph** + **LangChain-compatible tools** — one shared agent routes to feature tools. **No separate heavy ML model per feature.**

## Architecture

```
User (React)
    │
    ▼
FastAPI  ── LangGraph agent
    │           ├── calculator tool  → NREL PVWatts + India ROI math
    │           ├── grid tool        → lightweight oneshot forecast
    │           └── defect tool      → vision LLM (Groq → OpenRouter)
```

| Feature | How it works | Hosting notes |
|--------|----------------|---------------|
| **SunCalc** | NREL generation + PM Surya Ghar subsidy + net-metering ROI | API only, tiny |
| **GridSmart** | Diurnal/seasonal profile or CSV oneshot (hour+trend) | **No Prophet/pickle** — free Render OK |
| **PanelGuard** | Groq vision primary; OpenRouter if Groq fails | Needs API keys |

### Why not one ML model per feature?

- Local CNNs / Prophet pickles are large, slow to cold-start, and often exceed free Render RAM.
- One vision LLM + one oneshot numeric engine covers all three products cleanly.
- A heavier grid model can be **added later** behind the same `/api/prediction/*` API.

## Project layout

```
solar-ai-platform/
├── frontend/          # React + Vite + Tailwind
└── ml-services/       # FastAPI + LangGraph backend
    ├── app.py
    ├── agent/         # graph, state, LLM clients
    └── tools/         # calculator, defect, grid
```

## Quick start

### 1. Backend

```bash
cd solar-ai-platform/ml-services
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# edit .env → GROQ_API_KEY, OPENROUTER_API_KEY (fallback), NREL_API_KEY
uvicorn app:app --reload --port 5000
```

### 2. Frontend

```bash
cd solar-ai-platform/frontend
npm install
# optional: echo VITE_API_URL=http://localhost:5000 > .env
npm run dev
```

Or run `start_solar_ai.bat` from the repo root.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health + config flags |
| POST | `/api/calculator/calculate` | Generation + optional full ROI |
| POST | `/api/prediction/generate` | Date-range solar forecast |
| POST | `/api/prediction/custom` | CSV oneshot forecast |
| POST | `/api/maintenance/detect` | Panel image classification |
| POST | `/api/agent` | LangGraph multi-intent agent |

### Vision models (defaults)

- **Groq (primary):** `meta-llama/llama-4-scout-17b-16e-instruct`
- **OpenRouter (fallback):** `google/gemma-3-27b-it:free`

Override with `GROQ_VISION_MODEL` / `OPENROUTER_VISION_MODEL`.

### Grid model — ship now vs later

**Now (included):** `diurnal_seasonal_v1` + `seasonal_hour_trend_v1` (numpy/pandas only).

**Later (optional):** train a compact model (e.g. small sklearn / ONNX &lt; 50MB), load via env `FORECAST_MODEL_PATH`, keep the same response shape `{ forecast: [{ time, prediction, lower_bound, upper_bound }] }`. Do **not** bring back multi-GB Prophet pickles on free Render.

## Deploy (Render)

`render.yaml` deploys `ml-services` as one free Python web service. Set secrets:

- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `NREL_API_KEY` (free from [NREL Developer Network](https://developer.nrel.gov/signup/))

Frontend: set `VITE_API_URL` to the Render URL when building.

## License

MIT
