export interface VeoVideoResult {
  videoUrl: string;
  operationName: string;
  aspectRatio: '16:9' | '9:16';
}

export interface ImageResult {
  imageUrl: string;
  description: string;
}

export interface MusicResult {
  audioUrl: string;
  lyrics: string;
  model: string;
}

export const GeminiApiService = {
  /**
   * 1. Veo 3 Video Generation (veo-3.1-fast-generate-preview)
   * Aspect ratio must be '16:9' or '9:16'
   */
  async generateVeoVideo(
    prompt: string,
    aspectRatio: '16:9' | '9:16' = '16:9',
    onProgress?: (message: string) => void
  ): Promise<VeoVideoResult> {
    if (onProgress) onProgress('Initiating Veo 3 generation with model veo-3.1-fast-generate-preview...');

    const startRes = await fetch('/api/ai/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio }),
    });

    if (!startRes.ok) {
      const err = await startRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start video generation');
    }

    const { operationName } = await startRes.json();
    if (!operationName) throw new Error('No operation received from server');

    if (onProgress) onProgress('Veo 3 rendering temporal frames in high definition...');

    // Polling loop
    let isDone = false;
    let attempts = 0;
    const maxAttempts = 60; // Up to ~3-4 minutes

    while (!isDone && attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 4000));

      const statusRes = await fetch('/api/ai/video/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      if (statusData.error) {
        throw new Error(`Veo 3 generation failed: ${JSON.stringify(statusData.error)}`);
      }

      if (statusData.done) {
        isDone = true;
        break;
      }

      if (onProgress) {
        const messages = [
          'Synthesizing cinematic motion and camera path...',
          'Refining lighting, textures, and fluid dynamics...',
          'Rendering coherent temporal latent vectors...',
          'Encoding final MP4 video stream...',
        ];
        onProgress(messages[attempts % messages.length]);
      }
    }

    if (!isDone) {
      throw new Error('Video generation timed out. Please try again.');
    }

    if (onProgress) onProgress('Downloading completed Veo 3 video stream...');

    const downloadRes = await fetch('/api/ai/video/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName }),
    });

    if (!downloadRes.ok) {
      throw new Error('Failed to retrieve video stream from server');
    }

    const videoBlob = await downloadRes.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    return {
      videoUrl,
      operationName,
      aspectRatio,
    };
  },

  /**
   * 2. Audio Transcription (gemini-3.5-transcribe)
   * Users input audio with their microphone or upload audio file
   */
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const reader = new FileReader();
    const base64Audio = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData: base64Audio,
        mimeType: audioBlob.type || 'audio/webm',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to transcribe audio');
    }

    const data = await res.json();
    return data.text || '';
  },

  /**
   * 3. Create & Edit Images (gemini-3.1-flash-image-preview)
   * Text prompts to create or edit images
   */
  async createOrEditImage(
    prompt: string,
    aspectRatio: '1:1' | '16:9' | '4:3' | '9:16' = '1:1',
    existingImageBase64?: string
  ): Promise<ImageResult> {
    const res = await fetch('/api/ai/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        imageBytes: existingImageBase64,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate/edit image');
    }

    return await res.json();
  },

  /**
   * 4. Generate Music (lyria-3-clip-preview / lyria-3-pro-preview)
   * Short clips (up to 30s) or full-length tracks
   */
  async generateMusic(
    prompt: string,
    type: 'clip' | 'pro' = 'clip',
    optionalImageBase64?: string
  ): Promise<MusicResult> {
    const res = await fetch('/api/ai/music/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        type,
        imageBytes: optionalImageBase64,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate music');
    }

    return await res.json();
  },
};
