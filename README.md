# CarbonSense AI 🌿

> Intelligent agent for tracking and reducing the carbon & water footprint of AI workloads across multi-cloud environments — powered by **NVIDIA Nemotron**.

![Dashboard Preview](docs/dashboard-preview.png)

---

## Architecture

```
carbonsense-ai/
├── backend/            ← Python FastAPI calculation engine + Nemotron agent
│   ├── main.py         ← FastAPI app entry point
│   ├── data/
│   │   └── regional_data.py     ← GPU catalogue + 12 cloud regions (India-first)
│   ├── models/
│   │   └── schemas.py           ← Pydantic request/response models
│   ├── services/
│   │   ├── calculator.py        ← Dual-metric engine (carbon + water)
│   │   └── nemotron_agent.py    ← NVIDIA Nemotron NIM integration
│   ├── routers/
│   │   ├── workloads.py         ← POST /workloads/analyze & /optimize
│   │   └── regions.py           ← GET /regions, /gpus
│   └── requirements.txt
│
└── frontend/           ← Next.js 14 dashboard
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── Sidebar.tsx          ← Dark navigation sidebar
    │   ├── Dashboard.tsx        ← Main orchestrator with state management
    │   ├── WorkloadInput.tsx    ← Workload description + form controls
    │   ├── KPICards.tsx         ← 4 live KPI cards (energy/carbon/water/trees)
    │   ├── AgentAnalysis.tsx    ← Nemotron ReAct trace with typewriter effect
    │   └── RegionTable.tsx      ← Carbon intensity leaderboard
    └── lib/
        ├── types.ts             ← Shared TypeScript interfaces
        ├── regionalData.ts      ← GPU specs + 12 region records
        ├── calculations.ts      ← Client-side calculation engine
        └── agentAnalysis.ts     ← Nemotron API + mock fallback
```

---

## Calculation Formula

| Metric | Formula |
|--------|---------|
| **Energy (kWh)** | `GPU_count × Power_W × Utilization% × Hours / 1000` |
| **Operational Carbon (kg CO₂e)** | `Energy_kWh × Grid_Intensity_gCO₂/kWh / 1000` |
| **Embodied Carbon (kg CO₂e)** | `GPU_embodied_kg × count × hours / GPU_lifetime_h` |
| **Total Carbon** | `Operational + Embodied` |
| **Water (L)** | `Energy_kWh × WUE_L/kWh` |
| **Trees to Offset** | `Total_Carbon / 21.77 kg_CO₂/tree/year` |

### Reference Verification

| Input | Value |
|-------|-------|
| 8× A100-SXM (400W), Virginia (320 gCO₂/kWh), 24h, 100% utilization | |
| **Energy** | `8 × 400 × 24 / 1000` = **76.8 kWh** ✓ |
| **Carbon** | `76.8 × 320 / 1000` = **24.58 kg CO₂e** ✓ |
| **Water** | `76.8 × 1.8` = **138.2 L** ✓ |
| **Trees** | `24.58 / 21.77` = **1.1 trees/yr** ✓ |

---

## Indian Regional Data

| Region | Provider | gCO₂/kWh | WUE | Rating |
|--------|----------|-----------|-----|--------|
| Chennai (GCP asia-south2) | GCP | 600 | 1.5 | **Best** |
| Bengaluru (GCP asia-south1) | GCP | 650 | 1.4 | **Best** |
| Hyderabad (Azure South India) | Azure | 700 | 1.5 | Med |
| Mumbai (AWS ap-south-1) | AWS | 750 | 1.8 | Med |
| Pune (Azure Central India) | Azure | 780 | 1.6 | Med |
| Delhi NCR | Various | 850 | 2.0 | Low |

---

## Quick Start

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your NVIDIA_API_KEY

# Run
uvicorn main:app --reload --port 8000
```

Swagger UI → http://localhost:8000/docs

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Dashboard → http://localhost:3000

---

## Environment Variables

### Backend (`.env`)
```
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxx
NVIDIA_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
CORS_ORIGINS=http://localhost:3000
```

> **Note:** If `NVIDIA_API_KEY` is not set, the backend automatically falls back to a rich deterministic mock analysis — the app is fully functional without an API key.

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/workloads/analyze` | Full footprint analysis + Nemotron recommendations |
| `POST` | `/api/v1/workloads/optimize` | What-If scenarios across all greener regions |
| `GET` | `/api/v1/regions` | All 12 supported cloud regions |
| `GET` | `/api/v1/regions/indian` | Indian data-center regions only |
| `GET` | `/api/v1/gpus` | All 7 supported GPU models |
| `GET` | `/health` | Health check |

---

## Tech Stack

- **Backend:** Python 3.11, FastAPI, Pydantic v2, Uvicorn
- **AI:** NVIDIA Nemotron-70B via NIM API (OpenAI-compatible)
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Charts/Icons:** Recharts, Lucide React
- **Data Sources:** IEA, CEEW (India), hyperscaler ESG reports (mock integration)
