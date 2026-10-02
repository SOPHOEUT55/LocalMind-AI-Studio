import React, { useState, useRef, useEffect } from 'react';
import { VideoArtifact } from '../types';
import { LocalVideoEngine } from '../services/localVideoEngine';
import { GeminiApiService } from '../services/geminiService';
import { LocalStore } from '../services/storage';
import {
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Film,
  SkipForward,
  SkipBack,
  Repeat,
  Layers,
  Cpu,
  Video,
} from 'lucide-react';

interface VideoWorkspaceProps {
  initialArtifact?: VideoArtifact | null;
  seedImage?: string | null;
  onVideoGenerated?: (artifact: VideoArtifact) => void;
}

export const VideoWorkspace: React.FC<VideoWorkspaceProps> = ({
  initialArtifact,
  seedImage,
  onVideoGenerated,
}) => {
  const [prompt, setPrompt] = useState(
    'A neon hologram of a cybernetic vehicle accelerating through a rainy futuristic city, cinematic volumetric lighting'
  );
  const [engineType, setEngineType] = useState<'veo' | 'local'>('veo');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [motionType, setMotionType] = useState<'pan-right' | 'pan-left' | 'zoom-in' | 'orbit' | 'timelapse' | 'pulse'>('zoom-in');
  const [fps, setFps] = useState(24);
  const [durationSec, setDurationSec] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSeedImage, setActiveSeedImage] = useState<string | null>(seedImage || null);

  // Playback state
  const [activeArtifact, setActiveArtifact] = useState<VideoArtifact | null>(initialArtifact || null);
  const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [statusText, setStatusText] = useState('Select Veo 3 Fast (veo-3.1-fast-generate-preview) or Local Engine.');
  const [history, setHistory] = useState<VideoArtifact[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElemRef = useRef<HTMLVideoElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const animationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const list = LocalStore.getVideoArtifacts();
    setHistory(list);
    if (!initialArtifact && list.length > 0) {
      setActiveArtifact(list[0]);
    }
  }, [initialArtifact]);

  useEffect(() => {
    if (seedImage) {
      setActiveSeedImage(seedImage);
    }
  }, [seedImage]);

  // Handle Video Generation
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setIsPlaying(false);

    if (engineType === 'veo') {
      setStatusText('Connecting to Veo 3 (veo-3.1-fast-generate-preview)...');
      try {
        const result = await GeminiApiService.generateVeoVideo(
          prompt,
          aspectRatio,
          (msg) => setStatusText(msg)
        );

        setVeoVideoUrl(result.videoUrl);
        setStatusText(`Veo 3 generation completed (${result.aspectRatio}) using veo-3.1-fast-generate-preview!`);

        const artifact: VideoArtifact = {
          id: `vid_veo_${Date.now()}`,
          title: prompt.slice(0, 32) || 'Veo 3 Video',
          prompt,
          frames: [],
          fps: 24,
          durationSec: 5,
          motionType: 'zoom-in',
          blobUrl: result.videoUrl,
          width: aspectRatio === '16:9' ? 1280 : 720,
          height: aspectRatio === '16:9' ? 720 : 1280,
          generationTimeMs: 15000,
          createdAt: Date.now(),
        };

        setActiveArtifact(artifact);
        LocalStore.saveVideoArtifact(artifact);
        setHistory(LocalStore.getVideoArtifacts());
        if (onVideoGenerated) onVideoGenerated(artifact);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Veo 3 generation error';
        setStatusText(`Veo 3 Error: ${msg}`);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Local Engine
      setCurrentFrameIndex(0);
      setStatusText('Allocating temporal motion vectors...');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const engine = LocalVideoEngine.getInstance();
        const artifact = await engine.generateVideo(
          {
            prompt,
            motionType,
            fps,
            durationSec,
            seedImage: activeSeedImage || undefined,
            canvas: canvasRef.current || undefined,
          },
          (progress) => {
            setCurrentFrameIndex(progress.currentFrame - 1);
            setStatusText(progress.status);
          },
          controller.signal
        );

        setVeoVideoUrl(artifact.blobUrl || null);
        setActiveArtifact(artifact);
        LocalStore.saveVideoArtifact(artifact);
        setHistory(LocalStore.getVideoArtifacts());
        if (onVideoGenerated) onVideoGenerated(artifact);

        setStatusText(`Generated ${artifact.frames.length} coherent frames (${artifact.durationSec}s @ ${artifact.fps}fps) in ${artifact.generationTimeMs}ms.`);
        setIsPlaying(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error generating video';
        setStatusText(`Synthesis aborted: ${msg}`);
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

  // Playback Loop for local frames
  useEffect(() => {
    if (!isPlaying || !activeArtifact || activeArtifact.frames.length === 0 || veoVideoUrl) {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      return;
    }

    const interval = 1000 / (activeArtifact.fps || 24);
    animationTimerRef.current = window.setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev + 1 >= activeArtifact.frames.length) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [isPlaying, activeArtifact, isLooping, veoVideoUrl]);

  // Render current local frame to canvas
  useEffect(() => {
    if (veoVideoUrl || !activeArtifact || !activeArtifact.frames[currentFrameIndex] || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      if (canvasRef.current) {
        canvasRef.current.width = activeArtifact.width || 512;
        canvasRef.current.height = activeArtifact.height || 320;
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = activeArtifact.frames[currentFrameIndex];
  }, [currentFrameIndex, activeArtifact, veoVideoUrl]);

  const handleDownloadVideo = () => {
    const targetUrl = veoVideoUrl || activeArtifact?.blobUrl;
    if (targetUrl) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = `video_${engineType}_${Date.now()}.mp4`;
      a.click();
    } else if (activeArtifact && activeArtifact.frames.length > 0) {
      const a = document.createElement('a');
      a.href = activeArtifact.frames[currentFrameIndex];
      a.download = `video_frame_${currentFrameIndex + 1}.jpg`;
      a.click();
    }
  };

  const totalFrames = activeArtifact?.frames?.length || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#080c14] text-slate-100">
      {/* Header & Controls */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe video scene (e.g. A neon hologram of a cyber vehicle driving at top speed)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
            />

            {/* Engine Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setEngineType('veo')}
                className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  engineType === 'veo'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>Veo 3 Fast</span>
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
                <span>On-Device Wasm</span>
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
                <span>Cancel Render</span>
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{engineType === 'veo' ? 'Generate with Veo 3' : 'Synthesize Locally'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Model Settings Bar */}
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 mt-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Model: {engineType === 'veo' ? 'veo-3.1-fast-generate-preview' : 'ChronosTemporal-Lite'}
              </span>
            </span>

            {/* Veo 3 Aspect Ratio: 16:9 or 9:16 strictly */}
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Aspect Ratio:</span>
              <button
                onClick={() => setAspectRatio('16:9')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  aspectRatio === '16:9'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                16:9 (Landscape)
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  aspectRatio === '9:16'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                9:16 (Portrait)
              </button>
            </div>

            {engineType === 'local' && (
              <>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <label className="flex items-center gap-1 text-slate-300">
                  <span>Motion:</span>
                  <select
                    value={motionType}
                    onChange={(e) => setMotionType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-cyan-400 font-mono text-[11px]"
                  >
                    <option value="zoom-in">Zoom In</option>
                    <option value="pan-right">Pan Right</option>
                    <option value="pan-left">Pan Left</option>
                    <option value="orbit">Orbit</option>
                  </select>
                </label>
              </>
            )}

            {activeSeedImage && (
              <>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Film className="w-3 h-3" />
                  <span>Seed Image Attached</span>
                  <button
                    onClick={() => setActiveSeedImage(null)}
                    className="text-slate-500 hover:text-slate-300 text-[10px]"
                  >
                    (Remove)
                  </button>
                </span>
              </>
            )}
          </div>

          <div className="text-slate-500 text-[11px] font-mono">
            {engineType === 'veo'
              ? 'veo-3.1-fast-generate-preview · HD 720p/1080p'
              : 'On-device temporal frame synthesis'}
          </div>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#040711] relative">
          <div className="relative z-10 max-w-full flex flex-col items-center shadow-2xl rounded-xl border border-slate-800/80 bg-slate-950/80 p-4">
            {/* Display either Veo 3 Video Element OR Canvas for local temporal frames */}
            {veoVideoUrl ? (
              <video
                ref={videoElemRef}
                src={veoVideoUrl}
                controls
                autoPlay
                loop={isLooping}
                className={`max-w-full rounded-lg border border-slate-800 bg-black ${
                  aspectRatio === '9:16' ? 'max-h-[60vh] aspect-[9/16]' : 'max-h-[55vh] aspect-[16/9]'
                }`}
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={512}
                height={320}
                className="max-w-full max-h-[55vh] object-contain rounded-lg border border-slate-800 bg-black"
              />
            )}

            {/* Video Controls Bar */}
            <div className="w-full mt-4 flex flex-col gap-2.5">
              {!veoVideoUrl && totalFrames > 0 && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, totalFrames - 1)}
                    value={currentFrameIndex}
                    disabled={totalFrames <= 1}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentFrameIndex(Number(e.target.value));
                    }}
                    className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-xs text-cyan-400 tabular-nums min-w-[70px] text-right">
                    {currentFrameIndex + 1} / {totalFrames}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2">
                  {!veoVideoUrl && (
                    <>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={totalFrames === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold disabled:opacity-40 transition"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
                        }}
                        disabled={totalFrames === 0}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                        title="Previous Frame"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
                        }}
                        disabled={totalFrames === 0}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                        title="Next Frame"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-1.5 rounded-lg border transition ${
                      isLooping
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="Toggle Looping"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-sm">
                    {statusText}
                  </span>

                  {(veoVideoUrl || activeArtifact?.blobUrl) && (
                    <button
                      onClick={handleDownloadVideo}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save MP4</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Gallery Sidebar */}
        <div className="hidden lg:flex w-72 flex-col bg-slate-950 border-l border-slate-800 text-xs">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Video Library</span>
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">{history.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {history.length === 0 ? (
              <p className="text-slate-600 text-center py-6">No videos generated yet</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveArtifact(item);
                    if (item.blobUrl) {
                      setVeoVideoUrl(item.blobUrl);
                    } else {
                      setVeoVideoUrl(null);
                      setCurrentFrameIndex(0);
                      setIsPlaying(true);
                    }
                  }}
                  className={`group cursor-pointer rounded-lg border overflow-hidden transition-all ${
                    activeArtifact?.id === item.id
                      ? 'border-cyan-500 ring-1 ring-cyan-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {item.frames?.[0] ? (
                    <img
                      src={item.frames[0]}
                      alt={item.title}
                      className="w-full h-28 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-28 bg-slate-900 flex items-center justify-center text-slate-500">
                      <Film className="w-6 h-6" />
                    </div>
                  )}
                  <div className="p-2 bg-slate-900/90">
                    <div className="font-medium text-slate-200 truncate">{item.title}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{item.id.includes('veo') ? 'Veo 3 Fast' : 'Local Wasm'}</span>
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
