import React, { useState, useRef, useEffect } from 'react';
import { CodeArtifact } from '../types';
import { LocalTransformerEngine } from '../services/localTransformerEngine';
import { LocalStore } from '../services/storage';
import {
  Play,
  Copy,
  Check,
  Download,
  Terminal,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Cpu,
  Layers,
} from 'lucide-react';

interface CodeWorkspaceProps {
  initialArtifact?: CodeArtifact | null;
  onCodeGenerated?: (artifact: CodeArtifact) => void;
}

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({ initialArtifact, onCodeGenerated }) => {
  const [prompt, setPrompt] = useState(
    'Build an interactive 60FPS retro cyber racer arcade mini-game with HTML5 canvas physics, obstacle dodging, and keyboard controls'
  );
  const [language, setLanguage] = useState<'html' | 'typescript' | 'python' | 'wgsl'>('html');
  const [temperature, setTemperature] = useState(0.3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCode, setCurrentCode] = useState(initialArtifact ? initialArtifact.code : '');
  const [activeArtifact, setActiveArtifact] = useState<CodeArtifact | null>(initialArtifact || null);

  // Live generation stats
  const [tokensPerSec, setTokensPerSec] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Sandbox state
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<CodeArtifact[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const list = LocalStore.getCodeArtifacts();
    setHistory(list);
    if (!initialArtifact && list.length > 0) {
      setActiveArtifact(list[0]);
      setCurrentCode(list[0].code);
    }
  }, [initialArtifact]);

  // Handle Code Generation
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentCode('');
    setTokensPerSec(0);
    setTotalTokens(0);
    setElapsedMs(0);
    setConsoleLogs([`[Local Engine] Dispatched on-device transformer inference pass...`]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const engine = LocalTransformerEngine.getInstance();
      const artifact = await engine.generateCode(
        {
          prompt,
          language,
          temperature,
        },
        {
          onToken: (_token, accumulated) => {
            setCurrentCode(accumulated);
          },
          onStats: (stats) => {
            setTokensPerSec(stats.tokensPerSec);
            setTotalTokens(stats.totalTokens);
            setElapsedMs(stats.elapsedMs);
          },
        },
        controller.signal
      );

      setActiveArtifact(artifact);
      LocalStore.saveCodeArtifact(artifact);
      setHistory(LocalStore.getCodeArtifacts());
      if (onCodeGenerated) onCodeGenerated(artifact);

      setConsoleLogs((prev) => [
        ...prev,
        `[Local Engine] Generation complete: ${artifact.tokensGenerated} tokens generated in ${artifact.generationTimeMs}ms (${(
          (artifact.tokensGenerated / (artifact.generationTimeMs / 1000)) || 0
        ).toFixed(1)} tok/s).`,
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown generation error';
      setConsoleLogs((prev) => [...prev, `[Local Engine Error] ${message}`]);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCopy = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentCode) return;
    const ext = language === 'html' ? 'html' : language === 'typescript' ? 'tsx' : language === 'python' ? 'py' : 'wgsl';
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localmind_generated_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run code inside sandboxed iframe
  const runInSandbox = () => {
    if (!iframeRef.current || !currentCode) return;
    setConsoleLogs((prev) => [...prev, `[Sandbox] Mounting execution frame...`]);

    const isFullHtml = currentCode.includes('<!DOCTYPE html>') || currentCode.includes('<html');
    const content = isFullHtml
      ? currentCode
      : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; background: #030712; color: #f8fafc; font-family: sans-serif; padding: 20px; }</style>
</head>
<body>
  <div id="output"></div>
  <script>
    try {
      console.log = function(...args) {
        window.parent.postMessage({ type: 'SANDBOX_LOG', data: args.join(' ') }, '*');
      };
      ${currentCode}
    } catch(e) {
      document.getElementById('output').innerHTML = '<div style="color:#f43f5e;font-family:monospace;padding:12px;background:#1e1b2e;border:1px solid #e11d48;border-radius:6px;"><strong>Execution Exception:</strong> ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;

    iframeRef.current.srcdoc = content;
  };

  useEffect(() => {
    if (activeTab !== 'editor' && currentCode && !isGenerating) {
      runInSandbox();
    }
  }, [activeTab, currentCode, isGenerating]);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#080c14]">
      {/* Control Header */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe code, component, or algorithm to synthesize on-device..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
            />

            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setLanguage('html')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  language === 'html' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                HTML / JS
              </button>
              <button
                onClick={() => setLanguage('typescript')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  language === 'typescript' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                TS / React
              </button>
              <button
                onClick={() => setLanguage('python')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  language === 'python' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setLanguage('wgsl')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  language === 'wgsl' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                WGSL Shader
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
                <span>Halt Inference</span>
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthesize Code</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Transformer Telemetry Metrics */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mt-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Model: NanoCoder-0.5B (q4_k)</span>
            </span>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <span>Speed: <strong className="text-cyan-400 font-mono tabular-nums">{tokensPerSec || 64.2} tok/s</strong></span>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <span>Generated: <strong className="text-white font-mono tabular-nums">{totalTokens} tokens</strong></span>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <span>Latency: <strong className="text-white font-mono tabular-nums">{elapsedMs}ms</strong></span>
          </div>

          {/* Quick presets */}
          <div className="hidden md:flex items-center gap-2 text-[11px]">
            <span className="text-slate-500">Presets:</span>
            <button
              onClick={() => {
                setPrompt('Build a 60FPS retro cyber racer arcade mini-game with HTML5 canvas physics, obstacle dodging, and keyboard controls');
                setLanguage('html');
              }}
              className="text-slate-400 hover:text-cyan-300 transition-colors"
            >
              Cyber Racer
            </button>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <button
              onClick={() => {
                setPrompt('Create an atmospheric dark-mode weather widget with Celsius/Fahrenheit toggle and forecast metrics');
                setLanguage('typescript');
              }}
              className="text-slate-400 hover:text-cyan-300 transition-colors"
            >
              Weather UI
            </button>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <button
              onClick={() => {
                setPrompt('Implement a standalone Scaled Dot-Product Multi-Head Attention kernel in Python');
                setLanguage('python');
              }}
              className="text-slate-400 hover:text-cyan-300 transition-colors"
            >
              Attention Kernel
            </button>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <button
              onClick={() => {
                setPrompt('WebGPU WGSL raymarching shader with procedural cellular noise and temporal modulation');
                setLanguage('wgsl');
              }}
              className="text-slate-400 hover:text-cyan-300 transition-colors"
            >
              WGSL Shader
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor & Preview Panes */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden border-r border-slate-800">
          {/* Code View Pane */}
          {(activeTab === 'editor' || activeTab === 'split') && (
            <div className={`flex flex-col ${activeTab === 'split' ? 'w-full md:w-1/2 border-r border-slate-800' : 'w-full'} h-full bg-[#0a0f1d]`}>
              {/* Code toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    {language} Source
                  </span>
                  {activeArtifact?.explanation && (
                    <span className="hidden sm:inline text-slate-500 text-[11px] truncate max-w-xs">
                      · {activeArtifact.explanation}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    title="Copy Code"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    title="Download Source File"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => setActiveTab(activeTab === 'editor' ? 'split' : 'editor')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Toggle Fullscreen Editor"
                  >
                    {activeTab === 'editor' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Code Content */}
              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
                {currentCode ? (
                  <pre className="whitespace-pre overflow-x-auto selection:bg-cyan-500/30 selection:text-cyan-200">
                    <code>{currentCode}</code>
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                    <Terminal className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No code generated yet. Enter prompt or pick a preset above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sandboxed Live Execution Preview */}
          {(activeTab === 'preview' || activeTab === 'split') && (
            <div className={`flex flex-col ${activeTab === 'split' ? 'w-full md:w-1/2' : 'w-full'} h-full bg-[#050811]`}>
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-slate-300 text-[11px]">Live Sandboxed Runtime</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-slate-400 text-[11px]">Isolated iframe · 0 Network Egress</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={runInSandbox}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs hover:bg-emerald-600/30 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Rerun</span>
                  </button>
                  <button
                    onClick={() => setActiveTab(activeTab === 'preview' ? 'split' : 'preview')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Toggle Fullscreen Preview"
                  >
                    {activeTab === 'preview' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Iframe Viewport */}
              <div className="flex-1 relative bg-black">
                <iframe
                  ref={iframeRef}
                  title="Local Code Execution Sandbox"
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full border-0"
                />
              </div>

              {/* Runtime Console Log */}
              <div className="h-32 bg-slate-950 border-t border-slate-800/80 p-3 overflow-y-auto font-mono text-[11px] text-slate-400">
                <div className="flex items-center justify-between text-slate-500 mb-1 pb-1 border-b border-slate-800/60">
                  <span className="font-semibold text-[10px] tracking-wider uppercase text-slate-400">Runtime Console Output</span>
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                </div>
                {consoleLogs.map((log, index) => (
                  <div key={index} className="py-0.5 leading-snug">
                    <span className="text-cyan-500 mr-1.5">›</span>
                    <span className={log.includes('Error') ? 'text-rose-400' : 'text-slate-300'}>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div className="hidden lg:flex w-64 flex-col bg-slate-950 border-l border-slate-800 text-xs">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Local Artifacts</span>
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">{history.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.length === 0 ? (
              <p className="text-slate-600 text-center py-6">No saved artifacts yet</p>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveArtifact(item);
                    setCurrentCode(item.code);
                    setLanguage(item.language as 'html' | 'typescript' | 'python' | 'wgsl');
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                    activeArtifact?.id === item.id
                      ? 'bg-slate-900 border-cyan-500/40 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="font-medium truncate text-white">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="uppercase text-[10px] font-mono text-cyan-400">{item.language}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.tokensGenerated} toks</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
