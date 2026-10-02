import { ImageArtifact } from '../types';

export interface DiffusionProgress {
  step: number;
  totalSteps: number;
  sigma: number;
  canvas: HTMLCanvasElement;
  status: string;
}

export interface ImageGenOptions {
  prompt: string;
  negativePrompt?: string;
  style: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  aspectRatio: '1:1' | '16:9' | '4:3' | '9:16';
  canvas?: HTMLCanvasElement;
}

export class LocalDiffusionEngine {
  private static instance: LocalDiffusionEngine;

  static getInstance(): LocalDiffusionEngine {
    if (!this.instance) {
      this.instance = new LocalDiffusionEngine();
    }
    return this.instance;
  }

  // Multi-step latent diffusion simulator rendered directly to Canvas
  async generateImage(
    options: ImageGenOptions,
    onProgress?: (progress: DiffusionProgress) => void,
    signal?: AbortSignal
  ): Promise<ImageArtifact> {
    const startTime = performance.now();
    const {
      prompt,
      negativePrompt = 'low quality, blurry, deformed',
      style = 'Photorealistic',
      steps = 15,
      cfgScale = 7.5,
      aspectRatio = '16:9',
    } = options;

    const seed = options.seed !== undefined && options.seed >= 0 ? options.seed : Math.floor(Math.random() * 999999);

    // Dimensions based on aspect ratio
    let width = 640;
    let height = 360;
    if (aspectRatio === '1:1') {
      width = 512;
      height = 512;
    } else if (aspectRatio === '4:3') {
      width = 576;
      height = 432;
    } else if (aspectRatio === '9:16') {
      width = 360;
      height = 640;
    }

    const canvas = options.canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // Derive deterministic palette & geometry seeds from prompt and seed
    let hash = seed;
    for (let i = 0; i < prompt.length; i++) {
      hash = (hash << 5) - hash + prompt.charCodeAt(i);
      hash |= 0;
    }
    const rng = () => {
      hash = Math.sin(hash++) * 10000;
      return hash - Math.floor(hash);
    };

    // Color theme based on prompt keywords & style
    const clean = prompt.toLowerCase();
    let baseHues = [210, 190, 260]; // slate/cyan/indigo
    if (clean.includes('fire') || clean.includes('sunset') || clean.includes('amber') || clean.includes('gold')) {
      baseHues = [25, 45, 10];
    } else if (clean.includes('forest') || clean.includes('nature') || clean.includes('green') || clean.includes('plant')) {
      baseHues = [140, 165, 95];
    } else if (clean.includes('cyber') || clean.includes('neon') || clean.includes('synth')) {
      baseHues = [185, 310, 260];
    } else if (clean.includes('space') || clean.includes('galaxy') || clean.includes('star')) {
      baseHues = [260, 280, 210];
    }

    // Step 0: Fill with initial Gaussian / Uniform latent noise
    const imgData = ctx.createImageData(width, height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (rng() * 255) | 0;
      imgData.data[i] = n;
      imgData.data[i + 1] = n;
      imgData.data[i + 2] = n;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    // Progressive denoising steps
    for (let step = 1; step <= steps; step++) {
      if (signal?.aborted) {
        throw new Error('Image generation aborted by user');
      }

      const t = step / steps; // 0.0 -> 1.0 (denoising progress)
      const sigma = (1 - t) * 10;

      // Draw progressive latent layers onto canvas
      ctx.save();

      // Background atmospheric gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      const h1 = baseHues[0] + rng() * 20 - 10;
      const h2 = baseHues[1] + rng() * 20 - 10;
      const h3 = baseHues[2] + rng() * 20 - 10;
      grad.addColorStop(0, `hsl(${h1}, 75%, ${Math.min(50, 10 + t * 25)}%)`);
      grad.addColorStop(0.5, `hsl(${h2}, 80%, ${Math.min(45, 8 + t * 20)}%)`);
      grad.addColorStop(1, `hsl(${h3}, 90%, ${Math.min(30, 5 + t * 12)}%)`);

      ctx.globalAlpha = Math.min(1, t * 1.2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Procedural neural focal subject emerging
      const cx = width * (0.35 + rng() * 0.3);
      const cy = height * (0.4 + rng() * 0.25);
      const mainRadius = Math.min(width, height) * (0.25 + t * 0.1);

      // Radial luminescence
      const radGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, mainRadius * 1.8);
      radGrad.addColorStop(0, `hsla(${baseHues[0]}, 90%, 75%, ${0.3 * t})`);
      radGrad.addColorStop(0.6, `hsla(${baseHues[1]}, 80%, 45%, ${0.2 * t})`);
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      // Structural focal geometric forms
      if (t > 0.25) {
        ctx.strokeStyle = `hsla(${baseHues[0]}, 95%, 70%, ${t * 0.8})`;
        ctx.lineWidth = Math.max(1, 4 * (1 - t * 0.5));
        ctx.beginPath();
        // Central shape: polygon or layered arcs
        const points = 6;
        for (let p = 0; p < points; p++) {
          const angle = (p / points) * Math.PI * 2 - Math.PI / 2;
          const r = mainRadius * (0.8 + 0.2 * Math.sin(angle * 3 + seed));
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = `hsla(${baseHues[1]}, 90%, ${50 + t * 30}%, ${t * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx, cy, mainRadius * 0.45 * t, 0, Math.PI * 2);
        ctx.fill();

        // High frequency detail sparkles / particles
        if (t > 0.5) {
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 25; i++) {
            const px = cx + (rng() - 0.5) * mainRadius * 2.5;
            const py = cy + (rng() - 0.5) * mainRadius * 2.2;
            const size = rng() * 2.5 * t;
            ctx.globalAlpha = rng() * t;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Add controlled high-frequency noise overlay decreasing as sigma decays
      if (sigma > 0.5) {
        const noiseData = ctx.getImageData(0, 0, width, height);
        const noiseFactor = (sigma / 10) * 45;
        for (let idx = 0; idx < noiseData.data.length; idx += 8) {
          const offset = (rng() - 0.5) * noiseFactor;
          noiseData.data[idx] = Math.min(255, Math.max(0, noiseData.data[idx] + offset));
          noiseData.data[idx + 1] = Math.min(255, Math.max(0, noiseData.data[idx + 1] + offset));
          noiseData.data[idx + 2] = Math.min(255, Math.max(0, noiseData.data[idx + 2] + offset));
        }
        ctx.putImageData(noiseData, 0, 0);
      }

      ctx.restore();

      if (onProgress) {
        onProgress({
          step,
          totalSteps: steps,
          sigma: Math.round(sigma * 100) / 100,
          canvas,
          status: step < steps ? `Denoising step ${step}/${steps} · σ=${sigma.toFixed(1)}` : 'Finalizing latent upscale',
        });
      }

      // Yield time to simulate realistic on-device neural diffusion steps
      await new Promise(r => setTimeout(r, 60));
    }

    const elapsed = performance.now() - startTime;
    const dataUrl = canvas.toDataURL('image/png');

    return {
      id: `img_${Date.now()}`,
      title: prompt.slice(0, 32) || 'Synthesized Neural Image',
      prompt,
      negativePrompt,
      dataUrl,
      seed,
      steps,
      cfgScale,
      aspectRatio,
      width,
      height,
      generationTimeMs: Math.round(elapsed),
      createdAt: Date.now(),
      style,
    };
  }
}
