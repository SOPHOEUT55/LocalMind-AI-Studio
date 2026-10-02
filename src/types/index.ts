export type AgentMode = 'agent' | 'code' | 'image' | 'video' | 'audio' | 'music' | 'telemetry';

export interface HardwareInfo {
  webGpuSupported: boolean;
  adapterName: string;
  vendor: string;
  architecture: string;
  cores: number;
  deviceMemoryGB: number;
  wasmSimdSupported: boolean;
  storageUsedMB: number;
  storageTotalMB: number;
  networkOnline: boolean;
  activeRequestsCount: number;
}

export interface ModelPreset {
  id: string;
  name: string;
  type: 'code' | 'image' | 'video' | 'agent';
  parameters: string;
  quantization: 'q4_k' | 'q8_0' | 'fp16';
  sizeMB: number;
  contextWindow: number;
  speedTokPerSec: number;
  description: string;
  loaded: boolean;
}

export interface CodeArtifact {
  id: string;
  title: string;
  language: 'typescript' | 'javascript' | 'html' | 'python' | 'css' | 'wgsl';
  code: string;
  tokensGenerated: number;
  generationTimeMs: number;
  createdAt: number;
  prompt: string;
  explanation?: string;
}

export interface ImageArtifact {
  id: string;
  title: string;
  prompt: string;
  negativePrompt?: string;
  dataUrl: string;
  seed: number;
  steps: number;
  cfgScale: number;
  aspectRatio: '1:1' | '16:9' | '4:3' | '9:16';
  width: number;
  height: number;
  generationTimeMs: number;
  createdAt: number;
  style: string;
}

export interface VideoArtifact {
  id: string;
  title: string;
  prompt: string;
  frames: string[]; // array of base64 frame data URLs
  fps: number;
  durationSec: number;
  motionType: 'pan-right' | 'pan-left' | 'zoom-in' | 'orbit' | 'timelapse' | 'pulse';
  blobUrl?: string;
  width: number;
  height: number;
  generationTimeMs: number;
  createdAt: number;
}

export interface AgentTask {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: 'planning' | 'code' | 'image' | 'video';
  detail: string;
  progress: number;
  outputArtifactId?: string;
}

export interface AgentSession {
  id: string;
  userPrompt: string;
  createdAt: number;
  status: 'idle' | 'analyzing' | 'generating' | 'completed';
  thoughts: string[];
  tasks: AgentTask[];
  codeArtifact?: CodeArtifact;
  imageArtifact?: ImageArtifact;
  videoArtifact?: VideoArtifact;
}
