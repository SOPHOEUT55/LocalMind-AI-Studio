import React, { useState, useRef } from 'react';
import { GeminiApiService, MusicResult } from '../services/geminiService';
import {
  Music,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Volume2,
  FileText,
} from 'lucide-react';

export const MusicWorkspace: React.FC = () => {
  const [prompt, setPrompt] = useState(
    'A cinematic neo-classical orchestral track with sweeping strings, analog synths, and driving percussion'
  );
  const [modelType, setModelType] = useState<'clip' | 'pro'>('clip');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [musicResult, setMusicResult] = useState<MusicResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Select Lyria Clip (up to 30s) or Lyria Pro (full tracks).');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setStatusMessage(`Generating music with ${modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}...`);

    try {
      const result = await GeminiApiService.generateMusic(
        prompt,
        modelType,
        referenceImage || undefined
      );

      setMusicResult(result);
      setIsPlaying(false);
      setStatusMessage(`Track synthesized successfully with ${result.model}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Music generation failed';
      setStatusMessage(`Generation Error: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownloadWav = () => {
    if (!musicResult) return;
    const a = document.createElement('a');
    a.href = musicResult.audioUrl;
    a.download = `lyria_music_${modelType}_${Date.now()}.wav`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#080c14] text-slate-100">
      {/* Header Bar */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Music className="w-4 h-4 text-cyan-400" />
              <span>Music Studio</span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                Lyria Models
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate original audio tracks from text prompts and visual artwork with Lyria Clip & Pro.
            </p>
          </div>

          {/* Model Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setModelType('clip')}
              className={`px-3 py-1 rounded transition ${
                modelType === 'clip'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lyria Clip (30s)
            </button>
            <button
              onClick={() => setModelType('pro')}
              className={`px-3 py-1 rounded transition ${
                modelType === 'pro'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lyria Pro (Full Track)
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl mx-auto w-full p-6 gap-6">
        {/* Left Column: Music Generation Controls */}
        <div className="w-full md:w-1/2 flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Prompt & Arrangement
          </h2>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe music genre, tempo, instruments, and mood..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition resize-none"
          />

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs">
            <span className="text-slate-500 text-[11px]">Presets:</span>
            {[
              'Cyberpunk synthwave 120bpm',
              'Lo-fi ambient piano with vinyl crackle',
              'Epic cinematic battle anthem',
              'Uplifting corporate acoustic folk',
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => setPrompt(p)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Optional Reference Image Inspiration */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {referenceImage ? (
                <img
                  src={referenceImage}
                  alt="Inspiration"
                  className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-white">Visual Track Inspiration</div>
                <div className="text-[11px] text-slate-400">
                  {referenceImage ? 'Image attached as soundtrack reference' : 'Optional artwork to influence melody'}
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 transition"
              >
                {referenceImage ? 'Change' : 'Attach'}
              </button>
              {referenceImage && (
                <button
                  onClick={() => setReferenceImage(null)}
                  className="text-xs text-slate-500 hover:text-rose-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-5">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs disabled:opacity-40 transition shadow-sm"
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing track with {modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Music Track</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Audio Playback & Lyrics */}
        <div className="w-full md:w-1/2 flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Synthesized Music Player
              </span>
            </div>

            {musicResult && (
              <button
                onClick={handleDownloadWav}
                className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save WAV</span>
              </button>
            )}
          </div>

          {/* Audio Visualizer & Player Card */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 my-4 bg-slate-950 rounded-xl border border-slate-800/80">
            {musicResult ? (
              <div className="w-full flex flex-col items-center">
                {/* Waveform graphic bars */}
                <div className="flex items-end justify-center gap-1.5 h-20 w-full mb-6">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 rounded-full transition-all duration-300 ${
                        isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.sin(i * 0.5) * 35 + 40}%` : '25%',
                        animationDelay: `${i * 45}ms`,
                      }}
                    />
                  ))}
                </div>

                <audio
                  ref={audioRef}
                  src={musicResult.audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  controls
                  className="w-full h-10 accent-cyan-400"
                />

                <div className="mt-4 flex items-center justify-between w-full text-xs text-slate-400">
                  <span className="font-mono text-cyan-400 uppercase text-[11px]">{musicResult.model}</span>
                  <span>Audio format: PCM/WAV</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 text-xs">
                <Music className="w-10 h-10 opacity-30 mb-2" />
                <p>No track generated yet</p>
                <p className="text-slate-600 text-[11px] mt-0.5">Configure your prompt and click Generate</p>
              </div>
            )}
          </div>

          {/* Lyrics / Metadata Section */}
          {musicResult?.lyrics && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-slate-300">Generated Lyrics & Structure</span>
              </div>
              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                {musicResult.lyrics}
              </p>
            </div>
          )}

          <div className="text-xs text-slate-500 mt-2 font-mono truncate">
            Status: {statusMessage}
          </div>
        </div>
      </div>
    </div>
  );
};
