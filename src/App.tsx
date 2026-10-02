/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AgentMode, HardwareInfo, CodeArtifact, ImageArtifact, VideoArtifact } from './types';
import { detectHardware } from './services/hardwareDetector';
import { TopBar } from './components/TopBar';
import { AgentStudio } from './components/AgentStudio';
import { CodeWorkspace } from './components/CodeWorkspace';
import { ImageWorkspace } from './components/ImageWorkspace';
import { VideoWorkspace } from './components/VideoWorkspace';
import { AudioWorkspace } from './components/AudioWorkspace';
import { MusicWorkspace } from './components/MusicWorkspace';
import { HardwareTelemetry } from './components/HardwareTelemetry';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AgentMode>('agent');
  const [hardware, setHardware] = useState<HardwareInfo>({
    webGpuSupported: false,
    adapterName: 'Detecting...',
    vendor: 'Probing...',
    architecture: 'Standard host',
    cores: 8,
    deviceMemoryGB: 8,
    wasmSimdSupported: true,
    storageUsedMB: 14.8,
    storageTotalMB: 4096,
    networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    activeRequestsCount: 0,
  });

  // Selected or generated artifacts to share across workspaces
  const [selectedCodeArtifact, setSelectedCodeArtifact] = useState<CodeArtifact | null>(null);
  const [selectedImageArtifact, setSelectedImageArtifact] = useState<ImageArtifact | null>(null);
  const [selectedVideoArtifact, setSelectedVideoArtifact] = useState<VideoArtifact | null>(null);
  const [seedImageForVideo, setSeedImageForVideo] = useState<string | null>(null);

  const refreshHardware = async () => {
    try {
      const info = await detectHardware();
      setHardware(info);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshHardware();
  }, []);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <TopBar
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        hardware={hardware}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentMode === 'agent' && (
          <AgentStudio
            onNavigateMode={(mode) => setCurrentMode(mode)}
            onSelectCode={(art) => {
              setSelectedCodeArtifact(art);
              setCurrentMode('code');
            }}
            onSelectImage={(art) => {
              setSelectedImageArtifact(art);
              setCurrentMode('image');
            }}
            onSelectVideo={(art) => {
              setSelectedVideoArtifact(art);
              setCurrentMode('video');
            }}
          />
        )}

        {currentMode === 'code' && (
          <CodeWorkspace
            initialArtifact={selectedCodeArtifact}
            onCodeGenerated={(art) => setSelectedCodeArtifact(art)}
          />
        )}

        {currentMode === 'image' && (
          <ImageWorkspace
            initialArtifact={selectedImageArtifact}
            onImageGenerated={(art) => setSelectedImageArtifact(art)}
            onSendToVideo={(dataUrl) => {
              setSeedImageForVideo(dataUrl);
              setCurrentMode('video');
            }}
          />
        )}

        {currentMode === 'video' && (
          <VideoWorkspace
            initialArtifact={selectedVideoArtifact}
            seedImage={seedImageForVideo}
            onVideoGenerated={(art) => setSelectedVideoArtifact(art)}
          />
        )}

        {currentMode === 'audio' && (
          <AudioWorkspace />
        )}

        {currentMode === 'music' && (
          <MusicWorkspace />
        )}

        {currentMode === 'telemetry' && (
          <HardwareTelemetry
            hardware={hardware}
            onRefreshHardware={refreshHardware}
          />
        )}
      </main>

      {/* Non-intrusive offline & status indicator */}
      <OfflineIndicator />
    </div>
  );
}
