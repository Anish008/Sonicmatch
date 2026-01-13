/**
 * ReferenceAudioPlayer
 *
 * Simplified Web Audio API player for pre-rendered reference tracks.
 * No DSP processing - just clean playback with instant switching support.
 *
 * Features:
 * - Preload audio files for instant playback
 * - Switch between tracks seamlessly
 * - Loop playback for continuous listening
 * - Event system for state changes
 * - Analyser node for visualization (optional)
 */

type EventType = 'play' | 'pause' | 'stop' | 'ended' | 'load' | 'error' | 'switch';

interface AudioPlayerEvents {
  play: { url: string };
  pause: { url: string; currentTime: number };
  stop: { url: string };
  ended: { url: string };
  load: { url: string; duration: number };
  error: { url: string; error: string };
  switch: { fromUrl: string | null; toUrl: string };
}

type EventCallback<T extends EventType> = (data: AudioPlayerEvents[T]) => void;

export class ReferenceAudioPlayer {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

  private currentTrackUrl: string | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;

  private eventListeners: Map<EventType, Set<EventCallback<EventType>>> = new Map();

  /**
   * Initialize the audio context
   * Must be called after a user interaction (browser autoplay policy)
   */
  async initialize(): Promise<void> {
    if (this.context) return;

    try {
      this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Create gain node (fixed volume for loudness-matched audio)
      this.gainNode = this.context.createGain();
      this.gainNode.gain.value = 1.0;

      // Create analyser for visualization
      this.analyserNode = this.context.createAnalyser();
      this.analyserNode.fftSize = 256;

      // Connect: gain -> analyser -> destination
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.context.destination);

      // Resume context if suspended
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
    } catch (error) {
      throw new Error(`Failed to initialize audio context: ${error}`);
    }
  }

  /**
   * Preload an audio file
   */
  async preloadTrack(url: string): Promise<void> {
    if (this.audioBuffers.has(url)) return;

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      await this.loadingPromises.get(url);
      return;
    }

    const loadPromise = this.loadAudioBuffer(url);
    this.loadingPromises.set(url, loadPromise);

    try {
      const buffer = await loadPromise;
      this.audioBuffers.set(url, buffer);
      this.emit('load', { url, duration: buffer.duration });
    } catch (error) {
      this.emit('error', { url, error: String(error) });
      throw error;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Preload multiple tracks
   */
  async preloadAll(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.preloadTrack(url)));
  }

  /**
   * Load audio buffer from URL
   */
  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    if (!this.context) {
      await this.initialize();
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return await this.context!.decodeAudioData(arrayBuffer);
  }

  /**
   * Play a track (or switch to it if another is playing)
   */
  play(url: string): void {
    if (!this.context || !this.gainNode) {
      console.error('Audio player not initialized');
      return;
    }

    // If already playing this track, do nothing
    if (this.currentTrackUrl === url && this.isPlaying) {
      return;
    }

    const previousUrl = this.currentTrackUrl;

    // Stop current playback if any
    this.stopCurrentSource();

    // Get buffer
    const buffer = this.audioBuffers.get(url);
    if (!buffer) {
      console.error(`Audio not preloaded: ${url}`);
      this.emit('error', { url, error: 'Audio not preloaded' });
      return;
    }

    // Create new source
    this.currentSource = this.context.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.loop = true;
    this.currentSource.connect(this.gainNode);

    // Handle ended event
    this.currentSource.onended = () => {
      if (this.currentTrackUrl === url) {
        this.isPlaying = false;
        this.emit('ended', { url });
      }
    };

    // Start playback
    this.currentSource.start(0, this.pauseOffset % buffer.duration);
    this.startTime = this.context.currentTime - this.pauseOffset;
    this.currentTrackUrl = url;
    this.isPlaying = true;
    this.pauseOffset = 0;

    if (previousUrl !== url) {
      this.emit('switch', { fromUrl: previousUrl, toUrl: url });
    }
    this.emit('play', { url });
  }

  /**
   * Pause current playback
   */
  pause(): void {
    if (!this.isPlaying || !this.currentTrackUrl) return;

    const currentTime = this.getCurrentTime();
    this.stopCurrentSource();
    this.pauseOffset = currentTime;
    this.isPlaying = false;

    this.emit('pause', { url: this.currentTrackUrl, currentTime });
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    if (!this.currentTrackUrl) return;

    const url = this.currentTrackUrl;
    this.stopCurrentSource();
    this.pauseOffset = 0;
    this.currentTrackUrl = null;
    this.isPlaying = false;

    this.emit('stop', { url });
  }

  /**
   * Toggle play/pause
   */
  toggle(url?: string): void {
    if (url && url !== this.currentTrackUrl) {
      this.play(url);
    } else if (this.isPlaying) {
      this.pause();
    } else if (this.currentTrackUrl) {
      this.play(this.currentTrackUrl);
    } else if (url) {
      this.play(url);
    }
  }

  /**
   * Switch to a different track
   */
  switchTo(url: string): void {
    // Reset pause offset when switching tracks
    if (url !== this.currentTrackUrl) {
      this.pauseOffset = 0;
    }
    this.play(url);
  }

  /**
   * Stop current audio source
   */
  private stopCurrentSource(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Ignore errors from stopping already stopped source
      }
      this.currentSource = null;
    }
  }

  /**
   * Get current playback time in seconds
   */
  getCurrentTime(): number {
    if (!this.context || !this.isPlaying) {
      return this.pauseOffset;
    }
    return this.context.currentTime - this.startTime;
  }

  /**
   * Get duration of a loaded track
   */
  getDuration(url: string): number {
    const buffer = this.audioBuffers.get(url);
    return buffer ? buffer.duration : 0;
  }

  /**
   * Get playback state
   */
  getState(): {
    isPlaying: boolean;
    currentTrackUrl: string | null;
    currentTime: number;
  } {
    return {
      isPlaying: this.isPlaying,
      currentTrackUrl: this.currentTrackUrl,
      currentTime: this.getCurrentTime(),
    };
  }

  /**
   * Check if a track is loaded
   */
  isLoaded(url: string): boolean {
    return this.audioBuffers.has(url);
  }

  /**
   * Check if a track is currently loading
   */
  isLoading(url: string): boolean {
    return this.loadingPromises.has(url);
  }

  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(0);
    }
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  /**
   * Get time domain data for visualization
   */
  getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(0);
    }
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);
    return data;
  }

  /**
   * Add event listener
   */
  on<T extends EventType>(event: T, callback: EventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as EventCallback<EventType>);
  }

  /**
   * Remove event listener
   */
  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback as EventCallback<EventType>);
    }
  }

  /**
   * Emit event
   */
  private emit<T extends EventType>(event: T, data: AudioPlayerEvents[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopCurrentSource();

    if (this.context) {
      this.context.close();
      this.context = null;
    }

    this.gainNode = null;
    this.analyserNode = null;
    this.audioBuffers.clear();
    this.loadingPromises.clear();
    this.eventListeners.clear();
    this.currentTrackUrl = null;
    this.isPlaying = false;
    this.pauseOffset = 0;
  }
}

// Singleton instance for the application
let playerInstance: ReferenceAudioPlayer | null = null;

export function getReferenceAudioPlayer(): ReferenceAudioPlayer {
  if (!playerInstance) {
    playerInstance = new ReferenceAudioPlayer();
  }
  return playerInstance;
}

export function disposeReferenceAudioPlayer(): void {
  if (playerInstance) {
    playerInstance.dispose();
    playerInstance = null;
  }
}
