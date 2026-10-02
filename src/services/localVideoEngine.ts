import { VideoArtifact } from '../types';

export interface VideoProgress {
  currentFrame: number;
  totalFrames: number;
  canvas: HTMLCanvasElement;
  status: string;
}

export interface VideoGenOptions {
  prompt: string;
  motionType: 'pan-right' | 'pan-left' | 'zoom-in' | 'orbit' | 'timelapse' | 'pulse';
  fps?: number;
  durationSec?: number;
  seedImage?: string; // Optional starting frame dataUrl
  canvas?: HTMLCanvasElement;
}

export class LocalVideoEngine {
  private static instance: LocalVideoEngine;

  static getInstance(): LocalVideoEngine {
    if (!this.instance) {
      this.instance = new LocalVideoEngine();
    }
    return this.instance;
  }

  // Generates temporal video frames and encodes into real WebM video blob
  async generateVideo(
    options: VideoGenOptions,
    onProgress?: (progress: VideoProgress) => void,
    signal?: AbortSignal
  ): Promise<VideoArtifact> {
    const startTime = performance.now();
    const {
      prompt,
      motionType = 'zoom-in',
      fps = 24,
      durationSec = 2,
    } = options;

    const totalFrames = Math.max(12, Math.min(48, Math.round(fps * durationSec)));
    const width = 512;
    const height = 320;

    const canvas = options.canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const frameDataUrls: string[] = [];

    // Parse prompt for palette
    const clean = prompt.toLowerCase();
    let primaryHue = 200; // Cyan default
    if (clean.includes('fire') || clean.includes('flame') || clean.includes('sunset')) primaryHue = 25;
    else if (clean.includes('forest') || clean.includes('green') || clean.includes('matrix')) primaryHue = 150;
    else if (clean.includes('purple') || clean.includes('cyber') || clean.includes('neon')) primaryHue = 280;
    else if (clean.includes('gold') || clean.includes('sun')) primaryHue = 45;

    // Load seed image if provided
    let seedImgElement: HTMLImageElement | null = null;
    if (options.seedImage) {
      seedImgElement = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = options.seedImage!;
      });
    }

    // Step 1: Render each coherent temporal frame
    for (let f = 0; f < totalFrames; f++) {
      if (signal?.aborted) {
        throw new Error('Video generation aborted by user');
      }

      const progress = f / (totalFrames - 1); // 0.0 -> 1.0
      ctx.clearRect(0, 0, width, height);

      ctx.save();

      // Apply camera motion transformation
      if (motionType === 'zoom-in') {
        const scale = 1.0 + progress * 0.35;
        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-width / 2, -height / 2);
      } else if (motionType === 'pan-right') {
        const dx = progress * (width * 0.2);
        ctx.translate(-dx, 0);
      } else if (motionType === 'pan-left') {
        const dx = progress * (width * 0.2);
        ctx.translate(dx, 0);
      } else if (motionType === 'orbit') {
        const angle = (progress - 0.5) * 0.2;
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle);
        ctx.translate(-width / 2, -height / 2);
      }

      // Draw background or base seed
      if (seedImgElement) {
        ctx.drawImage(seedImgElement, 0, 0, width, height);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, `hsl(${primaryHue}, 80%, 10%)`);
        bgGrad.addColorStop(0.5, `hsl(${primaryHue + 30}, 70%, 15%)`);
        bgGrad.addColorStop(1, '#050811');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Perspective grid lines
        ctx.strokeStyle = `hsla(${primaryHue}, 90%, 50%, 0.25)`;
        ctx.lineWidth = 1;
        const horizon = height * 0.55;
        for (let i = -10; i <= 20; i++) {
          ctx.beginPath();
          ctx.moveTo(width / 2, horizon);
          ctx.lineTo(i * 40, height);
          ctx.stroke();
        }
        for (let y = horizon; y < height; y += 16) {
          const dy = (y - horizon) / (height - horizon);
          ctx.beginPath();
          ctx.moveTo(0, y + (f % 16) * dy);
          ctx.lineTo(width, y + (f % 16) * dy);
          ctx.stroke();
        }
      }

      // Dynamic motion subject: e.g. pulsing neural core / vehicle / energy orb
      const cx = width / 2 + Math.sin(progress * Math.PI * 2) * 20;
      const cy = height * 0.45 + Math.cos(progress * Math.PI * 2) * 8;
      const pulseSize = 40 + Math.sin(progress * Math.PI * 4) * 8;

      // Glow halo
      const halo = ctx.createRadialGradient(cx, cy, 5, cx, cy, pulseSize * 2.5);
      halo.addColorStop(0, `hsla(${primaryHue}, 100%, 70%, 0.6)`);
      halo.addColorStop(0.5, `hsla(${primaryHue + 40}, 90%, 50%, 0.2)`);
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseSize * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic ring particles
      ctx.strokeStyle = `hsla(${primaryHue + 20}, 90%, 80%, 0.7)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, pulseSize * 1.5, pulseSize * 0.6, progress * Math.PI, 0, Math.PI * 2);
      ctx.stroke();

      // Temporal frame stamp indicator
      ctx.restore();

      // Clean unboxed metadata overlay
      ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
      ctx.fillRect(10, 10, 110, 24);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText(`FRM ${String(f + 1).padStart(2, '0')}/${totalFrames} · ${(progress * durationSec).toFixed(1)}s`, 16, 26);

      const frameUrl = canvas.toDataURL('image/jpeg', 0.85);
      frameDataUrls.push(frameUrl);

      if (onProgress) {
        onProgress({
          currentFrame: f + 1,
          totalFrames,
          canvas,
          status: `Synthesizing neural frame ${f + 1}/${totalFrames}`,
        });
      }

      await new Promise(r => setTimeout(r, 25));
    }

    // Step 2: Assemble into real client-side video blob using MediaRecorder & Canvas Stream
    let blobUrl: string | undefined;
    try {
      if (typeof window !== 'undefined' && 'MediaRecorder' in window && canvas.captureStream) {
        const stream = canvas.captureStream(fps);
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        const recordedChunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };

        const recordingDone = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: mimeType });
            resolve(blob);
          };
        });

        recorder.start();

        // Draw each frame onto the canvas at fps rate for recorder
        const frameInterval = 1000 / fps;
        for (let i = 0; i < frameDataUrls.length; i++) {
          await new Promise<void>((res) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              res();
            };
            img.src = frameDataUrls[i];
          });
          await new Promise((res) => setTimeout(res, frameInterval));
        }

        recorder.stop();
        const finalBlob = await recordingDone;
        blobUrl = URL.createObjectURL(finalBlob);
      }
    } catch (e) {
      console.warn('Direct MediaRecorder capture failed, using frame buffer playback', e);
    }

    const elapsed = performance.now() - startTime;

    return {
      id: `vid_${Date.now()}`,
      title: prompt.slice(0, 32) || 'Temporal Motion Clip',
      prompt,
      frames: frameDataUrls,
      fps,
      durationSec,
      motionType,
      blobUrl,
      width,
      height,
      generationTimeMs: Math.round(elapsed),
      createdAt: Date.now(),
    };
  }
}
