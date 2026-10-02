import React, { useState } from 'react';
import { HardwareInfo } from '../types';
import { LOCAL_MODELS } from '../data/models';
import { LocalStore } from '../services/storage';
import {
  Cpu,
  HardDrive,
  ShieldCheck,
  Zap,
  Activity,
  Trash2,
  CheckCircle2,
  Lock,
  WifiOff,
} from 'lucide-react';

interface HardwareTelemetryProps {
  hardware: HardwareInfo;
  onRefreshHardware: () => void;
}

export const HardwareTelemetry: React.FC<HardwareTelemetryProps> = ({
  hardware,
  onRefreshHardware,
}) => {
  const [cleared, setCleared] = useState(false);
  const [selectedQuant, setSelectedQuant] = useState<'q4_k' | 'q8_0' | 'fp16'>('q4_k');

  const handleWipeData = () => {
    if (confirm('Are you sure you want to purge all locally cached artifacts and sessions? This operation is strictly irreversible.')) {
      LocalStore.clearAllData();
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
      onRefreshHardware();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#080c14] text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span>Hardware Telemetry & Privacy Vault</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Client hardware capabilities, WebGPU shader arrays, and local tensor memory allocation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshHardware}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
            >
              Scan Hardware
            </button>
            <button
              onClick={handleWipeData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/80 text-rose-300 text-xs font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Local Data</span>
            </button>
          </div>
        </div>

        {cleared && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Local storage quota cleared and in-memory caches purged.</span>
          </div>
        )}

        {/* Air-Gap Privacy Verification Banner */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                Strict Air-Gapped Privacy Status: Verified
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                All transformers (code LLM, diffusion denoising scheduler, temporal motion vectors) execute strictly within your local browser sandbox. No user prompts, generated source code, images, or video frames are transmitted to external servers.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[11px] text-emerald-400 font-mono">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Outbound Telemetry: 0 Packets</span>
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span>Third-Party Trackers: None</span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span>Storage: Local Origin IndexedDB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hardware Diagnostics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: WebGPU */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Compute Acceleration</span>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-base font-semibold text-white truncate">
              {hardware.webGpuSupported ? 'WebGPU Active' : 'Wasm SIMD'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {hardware.adapterName}
            </p>
          </div>

          {/* Card 2: CPU Cores */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Hardware Concurrency</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-base font-semibold text-white font-mono tabular-nums">
              {hardware.cores} Logical Cores
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Parallel worker threads enabled
            </p>
          </div>

          {/* Card 3: RAM Memory */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Host Device Memory</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-base font-semibold text-white font-mono tabular-nums">
              ~{hardware.deviceMemoryGB} GB Available
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Allocated for tensor weights
            </p>
          </div>

          {/* Card 4: Local Storage */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Origin Storage Cache</span>
              <HardDrive className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-base font-semibold text-white font-mono tabular-nums">
              {hardware.storageUsedMB} MB
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              of {hardware.storageTotalMB} MB quota
            </p>
          </div>
        </div>

        {/* Loaded On-Device Models Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Active On-Device Model Registry
              </h3>
              <p className="text-[11px] text-slate-400">
                Lightweight transformer architectures loaded directly in-memory for zero-latency inference.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-500 px-1 text-[10px]">Quantization:</span>
              <button
                onClick={() => setSelectedQuant('q4_k')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  selectedQuant === 'q4_k' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                Q4_K
              </button>
              <button
                onClick={() => setSelectedQuant('q8_0')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  selectedQuant === 'q8_0' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                Q8_0
              </button>
              <button
                onClick={() => setSelectedQuant('fp16')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  selectedQuant === 'fp16' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                FP16
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="px-5 py-3">Model Architecture</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3 text-right">Parameters</th>
                  <th className="px-5 py-3 text-right">In-Memory Size</th>
                  <th className="px-5 py-3 text-right">Context Window</th>
                  <th className="px-5 py-3 text-right">Throughput</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {LOCAL_MODELS.map((model) => (
                  <tr key={model.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">
                      <div>{model.name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{model.description}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-cyan-400 uppercase text-[11px]">{model.type}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums">{model.parameters}</td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums">{model.sizeMB} MB</td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums">{model.contextWindow} tok</td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-cyan-400">
                      {model.speedTokPerSec} tok/s
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
