"""Writes e2e/hum.wav: 4 s quiet room, then 3 × (9 s hum at 150 Hz with harmonics + 4 s quiet). Used as Chrome's fake mic."""
import math, random, struct, wave
SR = 48000; random.seed(1)
def seg(sec, hum):
    for i in range(int(sec * SR)):
        t = i / SR
        v = sum(a * math.sin(2 * math.pi * 150 * k * t) for k, a in [(1, .12), (2, .06), (3, .03)]) if hum else 0
        yield v + random.uniform(-.0008, .0008)
plan = [(4, False)] + [(9, True), (4, False)] * 3 + [(20, False)]
with wave.open("e2e/hum.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for s, h in plan for v in seg(s, h)))
