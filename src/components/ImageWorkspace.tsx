import React, { useState, useRef, useEffect } from 'react';
import { ImageArtifact } from '../types';
import { LocalDiffusionEngine } from '../services/localDiffusionEngine';
import { GeminiApiService } from '../services/geminiService';
import { LocalStore } from '../services/storage';
import { SAMPLE_PROMPTS } from '../data/samples';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCcw,
  Image as ImageIcon,
  Send,
  Cpu,
  Layers,
  Upload,
  Wand2,
  Trash2,
} from 'lucide-react';

interface ImageWorkspaceProps {
  initialArtifact?: ImageArtifact | null;
  onImageGenerated?: (artifact: ImageArtifact) => void;
  onSendToVideo?: (dataUrl: string) => void;
}

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({
  initialArtifact,
  onImageGenerated,
  onSendToVideo,
}) => {
  const [prompt, setPrompt] = useState(
    'Bioluminescent mushroom forest with soft spore particles floating in midnight atmosphere, macro botanical photography, 8k depth of field'
  );
  const [engineType, setEngineType] = useState<'gemini' | 'local'>('gemini');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '9:16' | '3:4'>('1:1');
  const [steps, setSteps] = useState(16);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [seed, setSeed] = useState(428190);
  const [isGenerating, setIsGenerating] = useState(false);

  // Image editing state
  const [baseEditImage, setBaseEditImage] = useState<string | null>(null);

  // Live status
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSigma, setCurrentSigma] = useState(0);
  const [statusText, setStatusText] = useState('Create or edit images with gemini-3.1-flash-image-preview or on-device diffusion.');

  const [activeArtifact, setActiveArtifact] = useState<ImageArtifact | null>(initialArtifact || null);
  const [history, setHistory] = useState<ImageArtifact[]>([]);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const list = LocalStore.getImageArtifacts();
    setHistory(list);
    if (!initialArtifact && list.length > 0) {
      setActiveArtifact(list[0]);
    }
  }, [initialArtifact]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);

    if (engineType === 'gemini') {
      setStatusText(
        baseEditImage
          ? 'Editing image with model gemini-3.1-flash-image-preview...'
          : 'Creating image with model gemini-3.1-flash-image-preview...'
      );

      try {
        const result = await GeminiApiService.createOrEditImage(
          prompt,
          aspectRatio as '1:1' | '16:9' | '4:3' | '9:16',
          baseEditImage || undefined
        );

        const artifact: ImageArtifact = {
          id: `img_gemini_${Date.now()}`,
          title: prompt.slice(0, 32) || 'Gemini 3.1 Flash Image',
          prompt,
          dataUrl: result.imageUrl,
          seed: Math.floor(Math.random() * 999999),
          steps: 1,
          cfgScale: 7.0,
          aspectRatio: aspectRatio as '1:1' | '16:9' | '4:3' | '9:16',
          width: 1024,
          height: 1024,
          generationTimeMs: 3500,
          createdAt: Date.now(),
          style: 'Gemini 3.1 Flash Image',
        };

        setActiveArtifact(artifact);
        LocalStore.saveImageArtifact(artifact);
        setHistory(LocalStore.getImageArtifacts());
        if (onImageGenerated) onImageGenerated(artifact);

        // Draw onto canvas
        if (canvasRef.current) {
          const img = new Image();
          img.onload = () => {
            if (canvasRef.current) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              const ctx = canvasRef.current.getContext('2d');
              ctx?.drawImage(img, 0, 0);
            }
          };
          img.src = result.imageUrl;
        }

        setStatusText(`Successfully synthesized with gemini-3.1-flash-image-preview: ${result.description || '1K image ready.'}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gemini image generation failed';
        setStatusText(`Gemini Image Error: ${msg}`);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Local Denoising
      setCurrentStep(0);
      setStatusText('Initializing on-device latent noise tensor...');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const engine = LocalDiffusionEngine.getInstance();
        const artifact = await engine.generateImage(
          {
            prompt,
            style: 'Photorealistic',
            aspectRatio: aspectRatio as '1:1' | '16:9' | '4:3' | '9:16',
            steps,
            cfgScale,
            seed,
            canvas: canvasRef.current || undefined,
          },
          (progress) => {
            setCurrentStep(progress.step);
            setCurrentSigma(progress.sigma);
            setStatusText(progress.status);
          },
          controller.signal
        );

        setActiveArtifact(artifact);
        LocalStore.saveImageArtifact(artifact);
        setHistory(LocalStore.getImageArtifacts());
        if (onImageGenerated) onImageGenerated(artifact);
        setStatusText(`Synthesis completed in ${artifact.generationTimeMs}ms on local WebGPU/CPU.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error generating image';
        setStatusText(`Generation stopped: ${msg}`);
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBaseEditImage(reader.result as string);
      setEngineType('gemini'); // Gemini 3.1 Flash Image excels at image editing!
      setStatusText(`Image loaded for editing. Type prompt changes (e.g. "Add sunglasses", "Make it vintage") and click Edit.`);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const targetUrl = activeArtifact ? activeArtifact.dataUrl : canvasRef.current?.toDataURL('image/png');
    if (!targetUrl) return;
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = `image_${engineType}_${Date.now()}.png`;
    a.click();
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#080c14] text-slate-100">
      {/* Top Config Bar */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                baseEditImage
                  ? "Describe image edits (e.g. 'Add glowing cyber visor and holographic HUD')..."
                  : "Enter image prompt (e.g. 'A futuristic robot artisan sculpting crystal in amber light')..."
              }
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
            />

            {/* Engine Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setEngineType('gemini')}
                className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  engineType === 'gemini'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Gemini 3.1 Flash Image</span>
              </button>
              <button
                onClick={() => setEngineType('local')}
                className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  engineType === 'local'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>On-Device Diffusion</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGenerating ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Halt Render</span>
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-sm transition-colors"
              >
                {baseEditImage ? <Wand2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>
                  {baseEditImage
                    ? 'Edit Image'
                    : engineType === 'gemini'
                    ? 'Create with Gemini'
                    : 'Synthesize Locally'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Parameter and Aspect Ratio Controls */}
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 mt-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Model: {engineType === 'gemini' ? 'gemini-3.1-flash-image-preview' : 'MicroDiffusion-Turbo'}
              </span>
            </span>

            <span className="text-slate-700" aria-hidden="true">·</span>

            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Aspect:</span>
              {(['1:1', '16:9', '4:3', '9:16', '3:4'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* Edit Image Attachment Affordance */}
            <span className="text-slate-700" aria-hidden="true">·</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {baseEditImage ? (
              <span className="flex items-center gap-1.5 text-cyan-300 font-medium bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                <Wand2 className="w-3 h-3 text-cyan-400" />
                <span>Base Image Attached for Editing</span>
                <button
                  onClick={() => setBaseEditImage(null)}
                  className="text-slate-400 hover:text-rose-400 text-[10px] ml-1"
                >
                  (Remove)
                </button>
              </span>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                <Upload className="w-3 h-3 text-cyan-400" />
                <span>Upload to Edit</span>
              </button>
            )}

            {engineType === 'local' && (
              <>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <label className="flex items-center gap-1 text-slate-300">
                  <span>Steps:</span>
                  <input
                    type="number"
                    min="8"
                    max="30"
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 font-mono text-center text-cyan-400"
                  />
                </label>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Presets:</span>
            {SAMPLE_PROMPTS.filter((p) => p.category === 'image').map((p) => (
              <button
                key={p.id}
                onClick={() => setPrompt(p.prompt)}
                className="text-slate-400 hover:text-cyan-300 transition-colors truncate max-w-[130px]"
                title={p.title}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Visualizer Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#040711] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

          {/* Canvas Wrapper */}
          <div className="relative z-10 max-w-full max-h-[75vh] flex flex-col items-center shadow-2xl rounded-xl border border-slate-800/80 bg-slate-950/80 p-3">
            {activeArtifact?.dataUrl && engineType === 'gemini' ? (
              <img
                src={activeArtifact.dataUrl}
                alt={activeArtifact.title}
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-800"
              />
            )}

            {/* Denoise Progress Bar for local engine */}
            {isGenerating && engineType === 'local' && (
              <div className="w-full mt-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-mono text-cyan-400">Step {currentStep}/{steps}</span>
                  <span className="font-mono text-slate-400">σ = {currentSigma}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-150"
                    style={{ width: `${(currentStep / steps) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="w-full flex items-center justify-between mt-3 text-xs">
              <span className="text-slate-400 truncate max-w-md font-mono text-[11px]">
                {statusText}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Image</span>
                </button>
                {activeArtifact && (
                  <button
                    onClick={() => {
                      setBaseEditImage(activeArtifact.dataUrl);
                      setEngineType('gemini');
                      setStatusText('Current image loaded as base for editing with gemini-3.1-flash-image-preview.');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Edit this Image</span>
                  </button>
                )}
                {onSendToVideo && (
                  <button
                    onClick={() => {
                      const url = activeArtifact?.dataUrl || canvasRef.current?.toDataURL('image/png');
                      if (url) onSendToVideo(url);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 text-xs transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Video</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Sidebar */}
        <div className="hidden lg:flex w-72 flex-col bg-slate-950 border-l border-slate-800 text-xs">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Image Library</span>
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">{history.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {history.length === 0 ? (
              <p className="text-slate-600 text-center py-6">No images generated yet</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveArtifact(item);
                    setPrompt(item.prompt);
                    if (item.id.includes('gemini')) {
                      setEngineType('gemini');
                    } else {
                      setEngineType('local');
                      if (canvasRef.current) {
                        const img = new Image();
                        img.onload = () => {
                          const ctx = canvasRef.current?.getContext('2d');
                          if (canvasRef.current && ctx) {
                            canvasRef.current.width = item.width;
                            canvasRef.current.height = item.height;
                            ctx.drawImage(img, 0, 0);
                          }
                        };
                        img.src = item.dataUrl;
                      }
                    }
                  }}
                  className={`group cursor-pointer rounded-lg border overflow-hidden transition-all ${
                    activeArtifact?.id === item.id
                      ? 'border-cyan-500 ring-1 ring-cyan-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={item.dataUrl}
                    alt={item.title}
                    className="w-full h-32 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-2 bg-slate-900/90">
                    <div className="font-medium text-slate-200 truncate">{item.title}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{item.id.includes('gemini') ? 'Gemini 3.1 Flash' : 'Local Diffusion'}</span>
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
