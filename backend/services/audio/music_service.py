import logging

logger = logging.getLogger("nolan.audio.music")

# Mock registry of ambient tracks
# In a real scenario, these would be paths to MP3 files in public/audio/ambient/
MOOD_TRACKS = {
    "Dramatic": "/audio/ambient/dramatic_tension.mp3",
    "Melancholy": "/audio/ambient/soft_piano.mp3",
    "Tense": "/audio/ambient/dark_ambient.mp3",
    "Action": "/audio/ambient/cinematic_percussion.mp3",
    "Hopeful": "/audio/ambient/ethereal_strings.mp3",
    "Neutral": "/audio/ambient/gentle_hum.mp3",
}

class MusicService:
    @staticmethod
    def get_track_for_mood(mood: str):
        """Returns a background track URL based on the dominant emotion."""
        return MOOD_TRACKS.get(mood, MOOD_TRACKS["Neutral"])

    @staticmethod
    def list_tracks():
        return MOOD_TRACKS

# Dependency injection style helper
async def get_music_service():
    return MusicService()
