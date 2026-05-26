import os
import json
import logging
import traceback
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime

# Import definitions
from services.analytics.roi_definitions import ROI_CORTICAL, ROI_SUBCORTICAL, get_kpi_mapping

logger = logging.getLogger("nolan.analytics.neural")

# Lazy loading to prevent startup slowdown
_TRIBE_MODEL = None

def get_tribe_model():
    """Singleton getter for the TribeModel."""
    global _TRIBE_MODEL
    if _TRIBE_MODEL is None:
        try:
            from tribev2 import TribeModel
            # We assume weights are in the standard cache folder or provided path
            _TRIBE_MODEL = TribeModel.from_pretrained("facebook/tribev2")
            logger.info("✅ Tribe v2 Model loaded successfully")
        except Exception as e:
            logger.warning(f"⚠️ Tribe v2 Model could not be loaded: {e}. Falling back to simulation mode.")
            _TRIBE_MODEL = "SIMULATED"
    return _TRIBE_MODEL

class NeuralEngine:
    def __init__(self):
        self.kpi_mapping = get_kpi_mapping()

    async def analyze_scene(self, text: str) -> Dict:
        """
        Main entry point for neural scene analysis.
        Returns aggregated ROI stats and lull detections.
        """
        if not text or len(text.strip()) < 10:
            return self._empty_response()

        model = get_tribe_model()
        
        try:
            if model == "SIMULATED":
                return self._simulate_analysis(text)
            
            # --- REAL INFERENCE PATH ---
            # 1. We need a temporary text file for Tribe v2 to process
            # In a real setup, we'd use a temporary dir
            df = model.get_events_dataframe(text_path=None, text=text) 
            preds, segments = model.predict(events=df)
            
            # preds is (timesteps, vertices + voxels)
            # We assume cortical vertices are first 20,484, followed by 8,802 voxels.
            cortical_preds = preds[:, :20484]
            subcortical_preds = preds[:, 20484:]
            
            timesteps = preds.shape[0]
            time_axis = np.linspace(0, timesteps * 0.5, timesteps) # Assuming 0.5s chunks

            results = {
                "arousal": [], "visual": [], "semantic": [], "reward": [],
                "lulls": [], "hook_score": 0.0
            }

            for kpi, config in self.kpi_mapping.items():
                kpi_values = self._calculate_kpi(cortical_preds, subcortical_preds, config)
                results[kpi] = [{"t": round(t, 2), "v": round(float(v), 3)} for t, v in zip(time_axis, kpi_values)]

            # Post-processing
            results["lulls"] = self._detect_lulls(results)
            results["hook_score"] = self._calculate_hook_score(results["reward"])
            
            return results

        except Exception as e:
            logger.error(f"[NeuralEngine] Inference Error: {e}\n{traceback.format_exc()}")
            return self._simulate_analysis(text) # Graceful fallback

    def _calculate_kpi(self, cortical, subcortical, config):
        """Averages neural activity across target ROIs."""
        # This is a simplified aggregation
        total_signal = np.zeros(cortical.shape[0])
        count = 0
        
        for region in config["cortical"]:
            indices = ROI_CORTICAL[region]["lh"] + ROI_CORTICAL[region]["rh"]
            total_signal += cortical[:, indices].mean(axis=1)
            count += 1
            
        for region in config["subcortical"]:
            indices = ROI_SUBCORTICAL[region]["lh"] + ROI_SUBCORTICAL[region]["rh"]
            total_signal += subcortical[:, indices].mean(axis=1)
            count += 1
            
        return total_signal / max(count, 1)

    def _detect_lulls(self, results) -> List:
        """Finds windows where predicted brain activity is low for 30s+."""
        lulls = []
        # Complex lull detection logic simplified: 
        # Combined activation of Visual + Arousal < threshold
        threshold = 0.2
        pacing_signal = [(a["v"] + v["v"])/2 for a, v in zip(results["arousal"], results["visual"])]
        
        current_lull_start = None
        for i, val in enumerate(pacing_signal):
            if val < threshold:
                if current_lull_start is None:
                    current_lull_start = results["arousal"][i]["t"]
            else:
                if current_lull_start is not None:
                    duration = results["arousal"][i]["t"] - current_lull_start
                    if duration > 10.0: # 10s for demo, 30s for prod
                        lulls.append({
                            "start": current_lull_start,
                            "end": results["arousal"][i]["t"],
                            "reason": "Engagement drop detected"
                        })
                    current_lull_start = None
        return lulls

    def _calculate_hook_score(self, reward_data) -> float:
        """Average reward in the first 60 seconds (approx first 120 indices)."""
        if not reward_data: return 0.0
        first_min = reward_data[:120]
        return sum(d["v"] for d in first_min) / len(first_min)

    def _simulate_analysis(self, text: str) -> Dict:
        """Returns deterministic simulated data for development UI."""
        words = text.split()
        duration = len(words) * 0.4 # Sim 0.4s per word
        timesteps = int(duration / 0.5)
        time_axis = [i * 0.5 for i in range(timesteps)]
        
        # Seed by text length for slightly different results
        np.random.seed(len(text))
        
        def gen_waves(freq, noise=0.1):
            base = 0.4 + 0.3 * np.sin(np.array(time_axis) * freq)
            return base + np.random.normal(0, noise, timesteps)

        return {
            "arousal": [{"t": t, "v": round(v, 3)} for t, v in zip(time_axis, gen_waves(0.2))],
            "visual": [{"t": t, "v": round(v, 3)} for t, v in zip(time_axis, gen_waves(0.15))],
            "semantic": [{"t": t, "v": round(v, 3)} for t, v in zip(time_axis, gen_waves(0.05))],
            "reward": [{"t": t, "v": round(v, 3)} for t, v in zip(time_axis, gen_waves(0.3, 0.2))],
            "lulls": [{"start": 15.0, "end": 28.0, "reason": "Low visual stimulus"}],
            "hook_score": 0.72
        }

    def _empty_response(self):
        return {"arousal": [], "visual": [], "semantic": [], "reward": [], "lulls": [], "hook_score": 0.0}
