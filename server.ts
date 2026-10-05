import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI client with standard aistudio-build telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ==========================================
// 1. Veo 3 Video Generation (veo-3.1-fast-generate-preview)
// ==========================================
app.post('/api/ai/video/generate', async (req, res) => {
  try {
    const { prompt, aspectRatio = '16:9', imageBytes, mimeType } = req.body;
    if (!prompt && !imageBytes) {
      return res.status(400).json({ error: 'Prompt or image is required for video generation' });
    }

    const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    const videoPayload: {
      model: string;
      prompt: string;
      image?: { imageBytes: string; mimeType: string };
      config: { numberOfVideos: number; aspectRatio: '16:9' | '9:16'; resolution: '720p' | '1080p' };
    } = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'A cinematic high definition scene',
      config: {
        numberOfVideos: 1,
        aspectRatio: validAspectRatio,
        resolution: '720p',
      },
    };

    if (imageBytes) {
      videoPayload.image = {
        imageBytes,
        mimeType: mimeType || 'image/png',
      };
    }

    const operation = await ai.models.generateVideos(videoPayload);
    res.json({ operationName: operation.name });
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : 'Video generation initiation failed';
    const isQuota = rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('Quota exceeded');
    console.error('[Veo 3 Generate Error]:', rawMsg);
    res.status(isQuota ? 429 : 500).json({
      error: isQuota
        ? 'Veo 3 Quota Limit: The current API key has no remaining free quota for veo-3.1-fast-generate-preview (requires a billing-enabled key). On-device temporal synthesis is available.'
        : rawMsg,
      isQuotaExceeded: isQuota,
      rawError: rawMsg,
    });
  }
});

app.post('/api/ai/video/status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({
      done: Boolean(updated.done),
      error: updated.error || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error polling video status';
    console.error('[Veo 3 Status Error]:', error);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/ai/video/download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Video URI not found in completed operation' });
    }

    const videoRes = await fetch(uri, {
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY || '',
      },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: 'Failed to stream video bytes from upstream' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error downloading video';
    console.error('[Veo 3 Download Error]:', error);
    res.status(500).json({ error: msg });
  }
});

// ==========================================
// 2. Audio Transcription (gemini-3.5-transcribe)
// ==========================================
app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'audioData base64 is required' });
    }

    // Strip data URL header if present
    const base64Audio = audioData.includes(',') ? audioData.split(',')[1] : audioData;

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe this spoken audio verbatim. Output the exact transcribed text clearly.' },
        ],
      },
    });

    res.json({ text: response.text || '' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Audio transcription failed';
    console.error('[Transcription Error]:', error);
    res.status(500).json({ error: msg });
  }
});

// ==========================================
// 3. Create & Edit Images (gemini-3.1-flash-image-preview)
// ==========================================
app.post('/api/ai/image/generate', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', imageBytes, mimeType } = req.body;
    if (!prompt && !imageBytes) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    // If existing image provided, this is an image editing request
    if (imageBytes) {
      const cleanBase64 = imageBytes.includes(',') ? imageBytes.split(',')[1] : imageBytes;
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || 'image/png',
        },
      });
    }

    if (prompt) {
      parts.push({ text: prompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
          imageSize: '1K',
        },
      },
    });

    let generatedImageUrl = '';
    let explanationText = '';

    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      } else if (part.text) {
        explanationText += part.text + ' ';
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({
        error: 'No image was returned by gemini-3.1-flash-image-preview',
        text: explanationText,
      });
    }

    res.json({
      imageUrl: generatedImageUrl,
      description: explanationText.trim(),
    });
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : 'Image generation/editing failed';
    const isQuota = rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('Quota exceeded');
    console.error('[Image Generate Error]:', rawMsg);

    res.status(isQuota ? 429 : 500).json({
      error: isQuota
        ? 'Gemini Cloud Quota Limit: The current API key has no remaining free quota for gemini-3.1-flash-image (requires a billing-enabled key). On-device neural generation is available.'
        : rawMsg,
      isQuotaExceeded: isQuota,
      rawError: rawMsg,
    });
  }
});

// ==========================================
// 4. Generate Music (lyria-3-clip-preview / lyria-3-pro-preview)
// ==========================================
app.post('/api/ai/music/generate', async (req, res) => {
  try {
    const { prompt, type = 'clip', imageBytes, mimeType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for music generation' });
    }

    const model = type === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    let contents: any = prompt;
    if (imageBytes) {
      const cleanBase64 = imageBytes.includes(',') ? imageBytes.split(',')[1] : imageBytes;
      contents = {
        parts: [
          { text: prompt },
          { inlineData: { data: cleanBase64, mimeType: mimeType || 'image/jpeg' } },
        ],
      };
    }

    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
    });

    let audioBase64 = '';
    let lyrics = '';
    let audioMimeType = 'audio/wav';

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            audioMimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      return res.status(500).json({ error: 'No audio data received from Lyria model' });
    }

    const audioDataUrl = `data:${audioMimeType};base64,${audioBase64}`;
    res.json({
      audioUrl: audioDataUrl,
      lyrics: lyrics.trim(),
      model,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Music generation failed';
    console.error('[Lyria Music Error]:', error);
    res.status(500).json({ error: msg });
  }
});

// ==========================================
// Vite Integration in Development & Production
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LocalMind Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
