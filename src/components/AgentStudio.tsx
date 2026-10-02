import React, { useState, useEffect } from 'react';
import { AgentSession, CodeArtifact, ImageArtifact, VideoArtifact, AgentMode } from '../types';
import { LocalTransformerEngine } from '../services/localTransformerEngine';
import { LocalDiffusionEngine } from '../services/localDiffusionEngine';
import { LocalVideoEngine } from '../services/localVideoEngine';
import { LocalStore } from '../services/storage';
import { SAMPLE_PROMPTS, avatarImage } from '../data/samples';
import {
  Sparkles,
  Bot,
  Play,
  CheckCircle2,
  Code2,
  Image as ImageIcon,
  Video,
  Download,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Cpu,
  Layers,
  Zap,
  Gauge,
  Sliders,
} from 'lucide-react';

interface AgentStudioProps {
  onNavigateMode: (mode: AgentMode) => void;
  onSelectCode: (artifact: CodeArtifact) => void;
  onSelectImage: (artifact: ImageArtifact) => void;
  onSelectVideo: (artifact: VideoArtifact) => void;
}

export type QuantizationType = 'q4_k' | 'q8_0' | 'fp16';

interface QuantizationOption {
  id: QuantizationType;
  label: string;
  shortLabel: string;
  bits: string;
  vramMB: number;
  speedTokPerSec: number;
  qualityScore: string;
  description: string;
}

const QUANTIZATION_PRESETS: QuantizationOption[] = [
  {
    id: 'q4_k',
    label: '4-Bit Quantized (Q4_K)',
    shortLabel: '4-bit (Q4_K)',
    bits: '4-bit',
    vramMB: 310,
    speedTokPerSec: 74.2,
    qualityScore: '92% Fidelity',
    description: 'Maximum throughput and lowest VRAM usage. Ideal for fast prototyping and battery power.',
  },
  {
    id: 'q8_0',
    label: '8-Bit Quantized (Q8_0)',
    shortLabel: '8-bit (Q8_0)',
    bits: '8-bit',
    vramMB: 580,
    speedTokPerSec: 48.5,
    qualityScore: '97% Fidelity',
    description: 'Optimal balance of reasoning fidelity, memory allocation, and token generation speed.',
  },
  {
    id: 'fp16',
    label: '16-Bit Half Precision (FP16)',
    shortLabel: 'FP16 (Half)',
    bits: '16-bit',
    vramMB: 1120,
    speedTokPerSec: 24.1,
    qualityScore: '99.8% Lossless',
    description: 'Uncompressed weight tensors for maximum mathematical accuracy and visual detail.',
  },
];

interface ModelFamily {
  id: string;
  name: string;
  parameters: string;
  contextWindow: string;
  role: string;
}

const MODEL_FAMILIES: ModelFamily[] = [
  {
    id: 'localmind-1.2b',
    name: 'LocalMind Orchestrator',
    parameters: '1.2B',
    contextWindow: '8k tokens',
    role: 'Autonomous multi-modal planner',
  },
  {
    id: 'nanocoder-0.5b',
    name: 'NanoCoder Core',
    parameters: '540M',
    contextWindow: '4k tokens',
    role: 'High-speed code & logic synthesis',
  },
  {
    id: 'neural-polymath-3b',
    name: 'Neural Polymath',
    parameters: '3.1B',
    contextWindow: '16k tokens',
    role: 'Deep reasoning & creative synthesis',
  },
];

export const AgentStudio: React.FC<AgentStudioProps> = ({
  onNavigateMode,
  onSelectCode,
  onSelectImage,
  onSelectVideo,
}) => {
  const [prompt, setPrompt] = useState(
    'Build an interactive 60FPS retro cyber racer arcade mini-game with HTML5 canvas physics, synthesize the racing ship sprite texture, and generate a 24-frame high-speed warp teaser video.'
  );
  const [selectedModelId, setSelectedModelId] = useState<string>('localmind-1.2b');
  const [quantization, setQuantization] = useState<QuantizationType>('q4_k');
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [currentSession, setCurrentSession] = useState<AgentSession | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [streamingThought, setStreamingThought] = useState<string>('');
  const [history, setHistory] = useState<AgentSession[]>([]);

  const activeQuantInfo = QUANTIZATION_PRESETS.find((q) => q.id === quantization) || QUANTIZATION_PRESETS[0];
  const activeModelInfo = MODEL_FAMILIES.find((m) => m.id === selectedModelId) || MODEL_FAMILIES[0];

  useEffect(() => {
    const list = LocalStore.getSessions();
    setHistory(list);
    if (list.length > 0 && !currentSession) {
      setCurrentSession(list[0]);
    }
  }, []);

  // Orchestrate Autonomous Multi-Modal Agent Run
  const handleRunAgent = async () => {
    if (!prompt.trim() || isOrchestrating) return;

    setIsOrchestrating(true);
    setActiveStepIndex(0);
    setStreamingThought(
      `[Model Runtime] Initializing ${activeModelInfo.name} (${activeModelInfo.parameters}) with ${activeQuantInfo.label}...`
    );

    const transformerEngine = LocalTransformerEngine.getInstance();
    const diffusionEngine = LocalDiffusionEngine.getInstance();
    const videoEngine = LocalVideoEngine.getInstance();

    const plan = transformerEngine.decomposePrompt(prompt);

    // Prepend quantization telemetry to plan reasoning
    const enrichedReasoning = [
      `Active Model: ${activeModelInfo.name} (${activeModelInfo.parameters}) · Quantization: ${activeQuantInfo.bits} (${activeQuantInfo.id})`,
      `VRAM Allocation: ~${activeQuantInfo.vramMB} MB · Estimated Inference Speed: ~${activeQuantInfo.speedTokPerSec} tok/s`,
      `Quality Target: ${activeQuantInfo.qualityScore} (${activeQuantInfo.description})`,
      ...plan.reasoning,
    ];

    const session: AgentSession = {
      id: `session_${Date.now()}`,
      userPrompt: prompt,
      createdAt: Date.now(),
      status: 'analyzing',
      thoughts: enrichedReasoning,
      tasks: plan.tasks.map((t) => ({
        ...t,
        status: 'pending',
        progress: 0,
      })),
    };

    setCurrentSession(session);

    try {
      // Step 1: Code Generation
      setActiveStepIndex(1);
      setStreamingThought(
        `Invoking ${activeModelInfo.name} [${activeQuantInfo.bits}]: Synthesizing executable logic @ ~${activeQuantInfo.speedTokPerSec} tok/s...`
      );
      session.tasks[0].status = 'running';
      session.tasks[0].progress = 30;
      setCurrentSession({ ...session });

      const codeArtifact = await transformerEngine.generateCode({
        prompt: session.userPrompt,
        language: prompt.toLowerCase().includes('python') ? 'python' : 'html',
      });

      session.tasks[0].status = 'completed';
      session.tasks[0].progress = 100;
      session.codeArtifact = codeArtifact;
      LocalStore.saveCodeArtifact(codeArtifact);
      setCurrentSession({ ...session });

      // Step 2: Image Generation
      setActiveStepIndex(2);
      const denoiseSteps = quantization === 'fp16' ? 20 : quantization === 'q8_0' ? 15 : 10;
      setStreamingThought(
        `Invoking MicroDiffusion-Turbo [${activeQuantInfo.bits}]: Executing ${denoiseSteps}-step latent denoising pass...`
      );
      session.tasks[1].status = 'running';
      session.tasks[1].progress = 30;
      setCurrentSession({ ...session });

      const imgArtifact = await diffusionEngine.generateImage({
        prompt: `Sleek futuristic cyber craft asset, glowing neon conduits, volumetric cinematic lighting, 4k render`,
        aspectRatio: '16:9',
        steps: denoiseSteps,
        style: 'Cyberpunk',
      });

      session.tasks[1].status = 'completed';
      session.tasks[1].progress = 100;
      session.imageArtifact = imgArtifact;
      LocalStore.saveImageArtifact(imgArtifact);
      setCurrentSession({ ...session });

      // Step 3: Video Motion Synthesis
      setActiveStepIndex(3);
      const frameCount = quantization === 'fp16' ? 28 : 20;
      setStreamingThought(
        `Invoking ChronosTemporal-Lite [${activeQuantInfo.bits}]: Synthesizing ${frameCount} coherent motion frames...`
      );
      session.tasks[2].status = 'running';
      session.tasks[2].progress = 30;
      setCurrentSession({ ...session });

      const vidArtifact = await videoEngine.generateVideo({
        prompt: `High-speed hyperspace warp tunnel with accelerating neon lines and orbiting speed particles`,
        motionType: 'zoom-in',
        fps: 24,
        durationSec: 1.5,
        seedImage: imgArtifact.dataUrl,
      });

      session.tasks[2].status = 'completed';
      session.tasks[2].progress = 100;
      session.videoArtifact = vidArtifact;
      LocalStore.saveVideoArtifact(vidArtifact);

      session.status = 'completed';
      setCurrentSession({ ...session });
      LocalStore.saveSession(session);
      setHistory(LocalStore.getSessions());
      setStreamingThought(
        `All multi-modal tasks synthesized locally using ${activeQuantInfo.label} with ${activeQuantInfo.qualityScore}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing agent plan';
      setStreamingThought(`Agent stopped: ${msg}`);
      if (session) {
        session.status = 'idle';
        setCurrentSession({ ...session });
      }
    } finally {
      setIsOrchestrating(false);
    }
  };

  const handleExportProjectJson = () => {
    if (!currentSession) return;
    const blob = new Blob([JSON.stringify(currentSession, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localmind_project_${currentSession.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#080c14] text-slate-100">
      {/* Hero / Orchestrator Input Bar */}
      <div className="p-5 bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-500/40 shadow-lg">
                <img src={avatarImage} alt="Local Agent" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <span>Autonomous Local-First Agent</span>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                    On-Device Neural Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Decomposes high-level prompts into on-device source code, neural textures, and temporal motion clips.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Air-Gapped Privacy Verified</span>
            </div>
          </div>

          {/* Model & Quantization Selector Control Panel */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Model Family Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Model Architecture:</span>
              </span>

              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500"
              >
                {MODEL_FAMILIES.map((mf) => (
                  <option key={mf.id} value={mf.id}>
                    {mf.name} ({mf.parameters})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantization Selector (4-bit, 8-bit, FP16) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quantization:</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {QUANTIZATION_PRESETS.map((q) => {
                  const isSelected = quantization === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setQuantization(q.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-mono transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                      title={q.description}
                    >
                      <Zap className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-cyan-400'}`} />
                      <span>{q.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Telemetry Specs for Selected Quantization */}
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono border-t lg:border-t-0 lg:border-l border-slate-800 pt-2 lg:pt-0 lg:pl-3">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">VRAM:</span>
                <span className="text-white font-semibold tabular-nums">{activeQuantInfo.vramMB} MB</span>
              </div>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Speed:</span>
                <span className="text-cyan-400 font-semibold tabular-nums">~{activeQuantInfo.speedTokPerSec} tok/s</span>
              </div>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <div className="flex items-center gap-1">
                <span className="text-emerald-400 font-medium">{activeQuantInfo.qualityScore}</span>
              </div>
            </div>
          </div>

          {/* Unified Prompt Input */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Give the Agent an end-to-end task (e.g. Build an arcade mini-game with code, art assets, and video teaser)..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center sm:items-start">
              {isOrchestrating ? (
                <button
                  disabled
                  className="w-full sm:w-auto h-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 text-slate-950 font-semibold text-xs opacity-75 cursor-wait"
                >
                  <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Synthesizing...</span>
                </button>
              ) : (
                <button
                  onClick={handleRunAgent}
                  className="w-full sm:w-auto h-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Run Agent</span>
                </button>
              )}
            </div>
          </div>

          {/* Preset Prompts */}
          <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 text-slate-400">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">Suggested Workflows:</span>
            {SAMPLE_PROMPTS.map((sp) => (
              <button
                key={sp.id}
                onClick={() => setPrompt(sp.prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60 transition"
              >
                {sp.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Agent Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Execution Stepper & Reasoning Feed */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col bg-slate-950 border-r border-slate-800 overflow-y-auto">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Agent Execution Pipeline
              </span>
              <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {activeQuantInfo.shortLabel}
              </span>
            </div>

            {streamingThought && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400 leading-snug flex items-start gap-2">
                <Terminal className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{streamingThought}</span>
              </div>
            )}
          </div>

          {/* Stepper Tasks */}
          <div className="p-4 space-y-3 flex-1">
            {currentSession?.tasks ? (
              currentSession.tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    task.status === 'completed'
                      ? 'bg-slate-900/90 border-emerald-500/30'
                      : task.status === 'running'
                      ? 'bg-slate-900 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : task.status === 'running' ? (
                        <RotateCcw className="w-4 h-4 text-cyan-400 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                          {idx + 1}
                        </div>
                      )}
                      <span className="font-medium text-slate-200">{task.title}</span>
                    </div>

                    <span className="text-[10px] font-mono uppercase text-slate-500">
                      {task.type}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                    {task.detail}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-600 text-xs">
                Select your model quantization above and click "Run Agent" to initiate on-device execution.
              </div>
            )}
          </div>

          {/* Past Sessions List */}
          {history.length > 0 && (
            <div className="p-3 border-t border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-500 px-1">
                Recent Agent Runs ({history.length})
              </span>
              <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                {history.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSession(s)}
                    className={`w-full text-left p-2 rounded text-xs transition ${
                      currentSession?.id === s.id
                        ? 'bg-slate-900 text-cyan-300 font-medium'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="truncate">{s.userPrompt}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {new Date(s.createdAt).toLocaleTimeString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Output Project Bundle Showcase */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#050811]">
          {currentSession ? (
            <div className="max-w-5xl mx-auto w-full space-y-6">
              {/* Bundle Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-semibold text-white">Synthesized Project Artifacts</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Multi-modal bundle generated entirely within your browser sandbox ({activeQuantInfo.label}).
                  </p>
                </div>

                <button
                  onClick={handleExportProjectJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Bundle (JSON)</span>
                </button>
              </div>

              {/* Grid of the 3 Multi-Modal Artifacts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 1. Code Artifact Card */}
                <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-xs text-white">Source Code</span>
                    </div>
                    {currentSession.codeArtifact && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {currentSession.codeArtifact.tokensGenerated} tokens
                      </span>
                    )}
                  </div>

                  <div className="flex-1 my-3 bg-black/60 rounded-lg p-3 font-mono text-[11px] text-slate-300 overflow-hidden max-h-48 border border-slate-800/80">
                    {currentSession.codeArtifact ? (
                      <pre className="whitespace-pre-wrap truncate line-clamp-8">
                        {currentSession.codeArtifact.code}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600">
                        Pending synthesis...
                      </div>
                    )}
                  </div>

                  {currentSession.codeArtifact && (
                    <button
                      onClick={() => {
                        onSelectCode(currentSession.codeArtifact!);
                        onNavigateMode('code');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium transition"
                    >
                      <span>Open in Code Sandbox</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. Image Texture Artifact Card */}
                <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-xs text-white">Neural Asset</span>
                    </div>
                    {currentSession.imageArtifact && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {currentSession.imageArtifact.steps} steps · Euler-A
                      </span>
                    )}
                  </div>

                  <div className="flex-1 my-3 rounded-lg overflow-hidden border border-slate-800/80 bg-black flex items-center justify-center min-h-[140px]">
                    {currentSession.imageArtifact ? (
                      <img
                        src={currentSession.imageArtifact.dataUrl}
                        alt="Neural Asset"
                        className="w-full h-40 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-slate-600 text-xs">Pending synthesis...</div>
                    )}
                  </div>

                  {currentSession.imageArtifact && (
                    <button
                      onClick={() => {
                        onSelectImage(currentSession.imageArtifact!);
                        onNavigateMode('image');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium transition"
                    >
                      <span>Inspect in Image Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 3. Video Teaser Artifact Card */}
                <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-xs text-white">Motion Clip</span>
                    </div>
                    {currentSession.videoArtifact && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {currentSession.videoArtifact.frames.length} frames · {currentSession.videoArtifact.fps}fps
                      </span>
                    )}
                  </div>

                  <div className="flex-1 my-3 rounded-lg overflow-hidden border border-slate-800/80 bg-black flex items-center justify-center min-h-[140px]">
                    {currentSession.videoArtifact && currentSession.videoArtifact.frames[0] ? (
                      <img
                        src={currentSession.videoArtifact.frames[0]}
                        alt="Video Thumbnail"
                        className="w-full h-40 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-slate-600 text-xs">Pending synthesis...</div>
                    )}
                  </div>

                  {currentSession.videoArtifact && (
                    <button
                      onClick={() => {
                        onSelectVideo(currentSession.videoArtifact!);
                        onNavigateMode('video');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium transition"
                    >
                      <span>Scrub in Video Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Bot className="w-12 h-12 opacity-30 mb-3" />
              <p className="text-sm font-medium text-slate-400">Autonomous Local AI Workspace</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm text-center">
                Configure your quantization precision ({activeQuantInfo.shortLabel}) above and submit a task to observe real-time local model execution.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
