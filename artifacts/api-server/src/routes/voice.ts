import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

const FEMALE_RUSSIAN_VOICE = "EXAVITQu4vr4xnSDxMaL";

router.get("/voices", async (req, res) => {
  try {
    if (!ELEVENLABS_API_KEY) {
      res.json({ voices: [] });
      return;
    }
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });
    if (!response.ok) {
      res.json({ voices: [] });
      return;
    }
    const data = await response.json();
    const voices = (data.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      labels: v.labels,
      preview_url: v.preview_url,
    }));
    res.json({ voices });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch voices");
    res.json({ voices: [] });
  }
});

router.post("/synthesize", async (req, res) => {
  try {
    const { text, voiceId, speed } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    if (!ELEVENLABS_API_KEY) {
      res.status(500).json({ error: "ElevenLabs API key not configured", audioUrl: "" });
      return;
    }

    const voice = voiceId || FEMALE_RUSSIAN_VOICE;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
          speed: speed || 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error({ status: response.status, error: errorText }, "ElevenLabs error");
      res.status(500).json({ error: "Voice synthesis failed", audioUrl: "" });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    res.json({ audioUrl, duration: 0 });
  } catch (err) {
    req.log.error({ err }, "Voice synthesis error");
    res.status(500).json({ error: "Voice synthesis failed", audioUrl: "" });
  }
});

export default router;
