import React, { useState, useRef, useEffect } from 'react';
import { GeminiApiService } from '../services/geminiService';
import {
  Mic,
  Square,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  FileAudio,
  Volume2,
  Trash2,
  Download,
} from 'lucide-react';

export const AudioWorkspace: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Record with your microphone or upload audio to transcribe.');
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up audio blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  // Start Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setStatusMessage('Audio recorded. Ready to transcribe with gemini-3.5-transcribe.');
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setStatusMessage('Recording audio from microphone...');

      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setStatusMessage(`Microphone Error: ${msg}`);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioBlob(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    setStatusMessage(`Uploaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready to transcribe.`);
  };

  // Trigger Transcription via gemini-3.5-transcribe
  const handleTranscribe = async () => {
    if (!audioBlob || isTranscribing) return;

    setIsTranscribing(true);
    setStatusMessage('Transcribing with model gemini-3.5-transcribe...');

    try {
      const text = await GeminiApiService.transcribeAudio(audioBlob);
      setTranscription(text);
      setStatusMessage('Transcription completed successfully with gemini-3.5-transcribe.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setStatusMessage(`Transcription Error: ${msg}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = () => {
    if (!transcription) return;
    const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#080c14] text-slate-100">
      {/* Header */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Audio Transcription Studio</span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                gemini-3.5-transcribe
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Record live speech with your microphone or upload audio files for speech-to-text transcription.
            </p>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Model: <strong className="text-white">gemini-3.5-transcribe</strong>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl mx-auto w-full p-6 gap-6">
        {/* Left Column: Recording Controls & Audio Player */}
        <div className="w-full md:w-1/2 flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Audio Input
          </h2>

          {/* Microphone Card */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="relative mb-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-500/30'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                }`}
              >
                {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <div className="text-center">
              <div className="font-mono text-lg font-bold text-white tabular-nums">
                {isRecording ? formatTime(recordingDuration) : audioBlob ? 'Audio Ready' : 'Ready to Record'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isRecording ? 'Click to stop recording' : 'Click microphone to begin speech capture'}
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 transition"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Audio File</span>
              </button>

              {audioBlob && (
                <button
                  onClick={() => {
                    setAudioBlob(null);
                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setStatusMessage('Audio cleared.');
                  }}
                  className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                  title="Clear Audio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Audio Playback Preview</span>
              </div>
              <audio controls src={audioUrl} className="w-full h-9 accent-cyan-400" />
            </div>
          )}

          {/* Transcribe Trigger Button */}
          <div className="mt-4">
            <button
              onClick={handleTranscribe}
              disabled={!audioBlob || isTranscribing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs disabled:opacity-40 transition shadow-sm"
            >
              {isTranscribing ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Transcribing with gemini-3.5-transcribe...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Transcribe Spoken Audio</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Transcription Output */}
        <div className="w-full md:w-1/2 flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Verbatim Transcription
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                disabled={!transcription}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs disabled:opacity-40 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadText}
                disabled={!transcription}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs disabled:opacity-40 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .txt</span>
              </button>
            </div>
          </div>

          <div className="flex-1 my-4 bg-slate-950 rounded-xl border border-slate-800/80 p-4 overflow-y-auto">
            {transcription ? (
              <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap font-sans selection:bg-cyan-500/20">
                {transcription}
              </p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <FileAudio className="w-8 h-8 opacity-30 mb-2" />
                <p>No transcription yet</p>
                <p className="text-slate-600 text-[11px] mt-0.5">Record speech or upload audio on the left</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-mono">
            <span>Status: {statusMessage}</span>
            {transcription && (
              <span className="tabular-nums">
                {transcription.split(/\s+/).filter(Boolean).length} words
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
