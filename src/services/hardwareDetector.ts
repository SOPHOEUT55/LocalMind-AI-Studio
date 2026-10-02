import { HardwareInfo } from '../types';

export async function detectHardware(): Promise<HardwareInfo> {
  let webGpuSupported = false;
  let adapterName = 'CPU Software Rasterizer (Wasm fallback)';
  let vendor = 'WebAssembly / Generic Host';
  let architecture = 'x86_64 / ARM NEON';

  // Test WebGPU
  if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu) {
    try {
      const gpu = (navigator as unknown as { gpu: { requestAdapter: () => Promise<{ info?: { name?: string; vendor?: string; architecture?: string } } | null> } }).gpu;
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        webGpuSupported = true;
        const info = adapter.info || {};
        adapterName = info.name || 'WebGPU Unified Acceleration Device';
        vendor = info.vendor || 'Hardware GPU Core';
        architecture = info.architecture || 'Discrete/Integrated Shader Array';
      }
    } catch {
      // GPU access might be restricted or simulated
      webGpuSupported = false;
    }
  }

  // Test Wasm SIMD
  let wasmSimdSupported = false;
  try {
    wasmSimdSupported = WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 125, 0, 0, 0, 0, 11
    ]));
  } catch {
    wasmSimdSupported = false;
  }

  // Storage estimate
  let storageUsedMB = 48.2;
  let storageTotalMB = 4096;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage !== undefined && estimate.quota !== undefined) {
        storageUsedMB = Math.round((estimate.usage / (1024 * 1024)) * 10) / 10;
        storageTotalMB = Math.round((estimate.quota / (1024 * 1024)) * 10) / 10;
      }
    } catch {
      // ignore
    }
  }

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
  const deviceMemoryGB = typeof navigator !== 'undefined' && 'deviceMemory' in navigator
    ? (navigator as unknown as { deviceMemory?: number }).deviceMemory || 8
    : 8;

  return {
    webGpuSupported,
    adapterName,
    vendor,
    architecture,
    cores,
    deviceMemoryGB,
    wasmSimdSupported,
    storageUsedMB,
    storageTotalMB,
    networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    activeRequestsCount: 0, // In air-gapped mode, strictly 0
  };
}
