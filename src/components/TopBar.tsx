import React from 'react';
import { AgentMode, HardwareInfo } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  ShieldCheck,
  Cpu,
  Code2,
  Sparkles,
  Video,
  Bot,
  Mic,
  Music,
  HardDrive,
} from 'lucide-react';

interface TopBarProps {
  currentMode: AgentMode;
  onSelectMode: (mode: AgentMode) => void;
  hardware: HardwareInfo;
}

export const TopBar: React.FC<TopBarProps> = ({ currentMode, onSelectMode, hardware }) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectMode('agent');
          }}
          className="text-base font-bold tracking-tight text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <span>LocalMind Studio</span>
        </a>

        {/* Quiet status flag */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-emerald-400 pl-3 border-l border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-medium">On-Device & Gemini Hub</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400">Veo 3 · Lyria · Transcribe</span>
        </div>
      </div>

      {/* Zone 2: Navigation Links / Segmented Buttons */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80 overflow-x-auto max-w-xl">
        <button
          onClick={() => onSelectMode('agent')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            currentMode === 'agent'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent</span>
        </button>

        <button
          onClick={() => onSelectMode('code')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            currentMode === 'code'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code</span>
        </button>

        <button
          onClick={() => onSelectMode('image')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            currentMode === 'image'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Images</span>
        </button>

        <button
          onClick={() => onSelectMode('video')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            currentMode === 'video'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Veo 3 Video</span>
        </button>

        <button
          onClick={() => onSelectMode('audio')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            currentMode === 'audio'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Transcribe</span>
        </button>

        <button
          onClick={() => onSelectMode('music')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            currentMode === 'music'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Lyria Music</span>
        </button>

        <button
          onClick={() => onSelectMode('telemetry')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            currentMode === 'telemetry'
              ? 'bg-slate-800 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Hardware</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelectMode('telemetry')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800/60 transition-colors"
          title="Hardware Acceleration Status"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono tabular-nums">{hardware.cores} Cores</span>
        </button>

        <PWAInstallButton />
      </div>
    </header>
  );
};
