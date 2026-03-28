from pathlib import Path
import numpy as np
import soundfile as sf


src = Path(r"c:\Users\shaun\Downloads\Opre\Calm in the Clouds.mp3")
out = Path(r"c:\Users\shaun\Downloads\Opre\Calm in the Clouds Loop.wav")

data, sr = sf.read(src)
fade_sec = 3.5
fade = int(sr * fade_sec)
fade = min(fade, len(data) // 4)

result = data.copy()
curve = np.linspace(0.0, 1.0, fade, dtype=np.float64)[:, None]
result[-fade:] = data[-fade:] * (1.0 - curve) + data[:fade] * curve

sf.write(out, result, sr, format="WAV")
print({
    "written": str(out),
    "sample_rate": sr,
    "samples": len(result),
    "fade_seconds": fade / sr,
})
