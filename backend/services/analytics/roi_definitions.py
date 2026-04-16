"""
ROI (Region of Interest) Definitions for Tribe v2
=================================================
Maps fsaverage5 vertices (cortical) and voxels (subcortical) 
to narrative-friendly KPIs.
"""

# Cortical indices for fsaverage5 (approximate indices based on Desikan-Killiany Atlas)
# In a real production setup, these would be loaded from a .nii or .label file.
ROI_CORTICAL = {
    "insula": {
        "lh": list(range(1000, 1500)), # Placeholder: Left Insula
        "rh": list(range(11000, 11500)), # Placeholder: Right Insula
    },
    "occipital": {
        "lh": list(range(2000, 3500)), # V1, V2, V3, V4
        "rh": list(range(12000, 13500)),
    },
    "prefrontal": {
        "lh": list(range(4000, 6000)), # Dorsolateral PFC
        "rh": list(range(14000, 16000)),
    }
}

# Subcortical indices (out of 8,802 voxels)
# Indices based on the Tribe v2 grid ordering:
# [Left/Right Thalamus, Caudate, Putamen, Pallidum, Hippocampus, Amygdala, Accumbens, Brain-Stem]
ROI_SUBCORTICAL = {
    "amygdala": {
        "lh": list(range(5000, 5500)), # Placeholder
        "rh": list(range(5500, 6000)),
    },
    "ventral_striatum": { # Nucleus Accumbens
        "lh": list(range(6000, 6300)),
        "rh": list(range(6300, 6600)),
    }
}

def get_kpi_mapping():
    """Returns the aggregation logic for each narrative KPI."""
    return {
        "arousal": {
            "cortical": ["insula"],
            "subcortical": ["amygdala"],
            "description": "Composite of emotional arousal and interoception (insula + amygdala)"
        },
        "visual": {
            "cortical": ["occipital"],
            "subcortical": [],
            "description": "Sensory stimulation and mental imagery strength"
        },
        "semantic": {
            "cortical": ["prefrontal"],
            "subcortical": [],
            "description": "Cognitive processing and narrative complexity"
        },
        "reward": {
            "cortical": [],
            "subcortical": ["ventral_striatum"],
            "description": "Ventral Striatum activation for hook and novelty pulse"
        }
    }
