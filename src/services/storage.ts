import { AgentSession, CodeArtifact, ImageArtifact, VideoArtifact } from '../types';

const STORAGE_KEYS = {
  CODE_ARTIFACTS: 'localmind_code_artifacts_v1',
  IMAGE_ARTIFACTS: 'localmind_image_artifacts_v1',
  VIDEO_ARTIFACTS: 'localmind_video_artifacts_v1',
  AGENT_SESSIONS: 'localmind_agent_sessions_v1',
  SETTINGS: 'localmind_settings_v1',
};

export const LocalStore = {
  // Code
  getCodeArtifacts(): CodeArtifact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CODE_ARTIFACTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCodeArtifact(artifact: CodeArtifact) {
    const list = this.getCodeArtifacts();
    const updated = [artifact, ...list.filter(item => item.id !== artifact.id)].slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEYS.CODE_ARTIFACTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded, trimming old items', e);
    }
  },

  // Images
  getImageArtifacts(): ImageArtifact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IMAGE_ARTIFACTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveImageArtifact(artifact: ImageArtifact) {
    const list = this.getImageArtifacts();
    const updated = [artifact, ...list.filter(item => item.id !== artifact.id)].slice(0, 30);
    try {
      localStorage.setItem(STORAGE_KEYS.IMAGE_ARTIFACTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded for images, trimming', e);
      try {
        localStorage.setItem(STORAGE_KEYS.IMAGE_ARTIFACTS, JSON.stringify(updated.slice(0, 10)));
      } catch {
        // ignore
      }
    }
  },

  // Videos
  getVideoArtifacts(): VideoArtifact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VIDEO_ARTIFACTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveVideoArtifact(artifact: VideoArtifact) {
    const list = this.getVideoArtifacts();
    // Video frames are large, store metadata and limited preview frames
    const lightArtifact = {
      ...artifact,
      frames: artifact.frames.slice(0, 12), // keep compact preview in local storage
    };
    const updated = [lightArtifact, ...list.filter(item => item.id !== artifact.id)].slice(0, 15);
    try {
      localStorage.setItem(STORAGE_KEYS.VIDEO_ARTIFACTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota for videos exceeded', e);
    }
  },

  // Sessions
  getSessions(): AgentSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AGENT_SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSession(session: AgentSession) {
    const list = this.getSessions();
    const updated = [session, ...list.filter(item => item.id !== session.id)].slice(0, 20);
    try {
      localStorage.setItem(STORAGE_KEYS.AGENT_SESSIONS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.CODE_ARTIFACTS);
    localStorage.removeItem(STORAGE_KEYS.IMAGE_ARTIFACTS);
    localStorage.removeItem(STORAGE_KEYS.VIDEO_ARTIFACTS);
    localStorage.removeItem(STORAGE_KEYS.AGENT_SESSIONS);
  }
};
