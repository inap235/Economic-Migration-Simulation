# Economic Migration Simulation

This project implements an agent-based mathematical model for economic migration and provides a React dashboard for visualization.

## What Is Implemented

The implementation follows your model structure:

- Agent states: `S`, `I`, `M`, `R`
- Utility-based migration decision: `U_mig - U_stay`
- Social network influence `N_i(t)` with weighted ties (relatives, Facebook, TikTok)
- Diaspora and media influence
- Cognitive bias components: survivorship bias and optimism bias
- Logistic transition probabilities:
	- `S -> I`
	- `I -> M`
	- `M -> R`
- Macro diffusion reference model `m(t)` for comparison with the agent simulation

## Project Structure

```
backend/
	api.py
	simulation.py
	requirements.txt
frontend/
	package.json
	vite.config.js
	index.html
	src/
		App.jsx
		main.jsx
		styles.css
README.md
```

## Backend (Python + FastAPI)

### 1. Create and activate a Python environment (recommended)

Windows PowerShell example:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Run API

```powershell
uvicorn api:app --reload --port 8000
```

API endpoints:

- `GET /health`
- `POST /simulate`

## Frontend (React + Vite)

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and calls the backend at `http://localhost:8000/simulate`.

## Using the Dashboard

1. Start backend and frontend.
2. Adjust model parameters (agents, wages, costs, network density, media, optimism bias, initial fractions).
3. Click `Run simulation`.
4. Review charts:
	 - State trajectories (`S`, `I`, `M`, `R`)
	 - Final state composition
	 - Agent-model `m(t)` versus macro diffusion `m(t)`

## Notes

- The simulator uses random generation with a configurable `seed` for reproducibility.
- Coefficients are exposed in code and can be calibrated further with empirical data.
- This setup is intentionally simple and designed for experimentation and extension.
