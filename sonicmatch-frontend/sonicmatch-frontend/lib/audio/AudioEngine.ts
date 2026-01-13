/**
 * AudioEngine - Web Audio API DSP Pipeline
 *
 * Provides real-time audio processing for the listening test feature.
 * Implements a parametric EQ chain with loudness compensation.
 *
 * Signal Chain:
 * AudioBufferSource → Filters (EQ) → Stereo Widener → Gain → Destination
 */

import type { DSPParameters, CompensationEQ } from '@/types/listeningTest';

interface FilterNodes {
  bassFilter: BiquadFilterNode;
  lowMidsFilter: BiquadFilterNode;
  midsFilter: BiquadFilterNode;
  upperMidsFilter: BiquadFilterNode;
  presenceFilter: BiquadFilterNode;
  trebleFilter: BiquadFilterNode;
  airFilter: BiquadFilterNode;
}

type AudioEngineEventType = 'statechange' | 'ended' | 'error' | 'load';
type AudioEngineEventCallback = (data?: unknown) => void;

export class AudioEngine {
  private context: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private inputGain: GainNode | null = null;
  private outputGain: GainNode | null = null;
  private filters: FilterNodes | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private audioBuffer: AudioBuffer | null = null;

  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pauseOffset = 0;
  private volume = 0.7;

  private currentParams: DSPParameters = {
    bass: 0.5,
    mids: 0.5,
    treble: 0.5,
    detail: 0.5,
    soundstage: 0.5,
  };

  private headphoneCompensation: CompensationEQ | null = null;
  private eventListeners: Map<AudioEngineEventType, Set<AudioEngineEventCallback>> = new Map();

  // Filter frequency constants (Hz)
  private static readonly FREQUENCIES = {
    BASS: 80,
    LOW_MIDS: 350,
    MIDS: 1500,
    UPPER_MIDS: 3000,
    PRESENCE: 4500,
    TREBLE: 8000,
    AIR: 12000,
  };

  // Q factors for filters
  private static readonly Q_VALUES = {
    SHELF: 0.707,
    WIDE: 0.8,
    MEDIUM: 1.2,
    NARROW: 2.5,
  };

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the audio context and DSP chain.
   * Must be called after a user gesture (click/tap) due to browser autoplay policies.
   */
  async initialize(): Promise<void> {
    if (this.context) {
      // Already initialized, just resume if suspended
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return;
    }

    try {
      // Create AudioContext (handle Safari prefix)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioContextClass();

      // Create input gain (for headphone compensation)
      this.inputGain = this.context.createGain();
      this.inputGain.gain.value = 1;

      // Create filter chain
      this.filters = this.createFilterChain();

      // Create stereo widener
      this.createStereoWidener();

      // Create output gain (for volume and loudness compensation)
      this.outputGain = this.context.createGain();
      this.outputGain.gain.value = this.volume;

      // Create analyser for visualization
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;

      // Connect the full DSP chain
      this.connectChain();

      this.emit('statechange', { initialized: true });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create the parametric EQ filter chain
   */
  private createFilterChain(): FilterNodes {
    const ctx = this.context!;

    // Bass (Low Shelf at 80Hz)
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = AudioEngine.FREQUENCIES.BASS;
    bassFilter.gain.value = 0;

    // Low Mids (Peaking at 350Hz)
    const lowMidsFilter = ctx.createBiquadFilter();
    lowMidsFilter.type = 'peaking';
    lowMidsFilter.frequency.value = AudioEngine.FREQUENCIES.LOW_MIDS;
    lowMidsFilter.Q.value = AudioEngine.Q_VALUES.WIDE;
    lowMidsFilter.gain.value = 0;

    // Mids (Peaking at 1.5kHz)
    const midsFilter = ctx.createBiquadFilter();
    midsFilter.type = 'peaking';
    midsFilter.frequency.value = AudioEngine.FREQUENCIES.MIDS;
    midsFilter.Q.value = AudioEngine.Q_VALUES.MEDIUM;
    midsFilter.gain.value = 0;

    // Upper Mids (Peaking at 3kHz)
    const upperMidsFilter = ctx.createBiquadFilter();
    upperMidsFilter.type = 'peaking';
    upperMidsFilter.frequency.value = AudioEngine.FREQUENCIES.UPPER_MIDS;
    upperMidsFilter.Q.value = AudioEngine.Q_VALUES.MEDIUM;
    upperMidsFilter.gain.value = 0;

    // Presence/Detail (Peaking at 4.5kHz, narrow Q for precision)
    const presenceFilter = ctx.createBiquadFilter();
    presenceFilter.type = 'peaking';
    presenceFilter.frequency.value = AudioEngine.FREQUENCIES.PRESENCE;
    presenceFilter.Q.value = AudioEngine.Q_VALUES.NARROW;
    presenceFilter.gain.value = 0;

    // Treble (High Shelf at 8kHz)
    const trebleFilter = ctx.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = AudioEngine.FREQUENCIES.TREBLE;
    trebleFilter.gain.value = 0;

    // Air (High Shelf at 12kHz for sparkle/extension)
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'highshelf';
    airFilter.frequency.value = AudioEngine.FREQUENCIES.AIR;
    airFilter.gain.value = 0;

    return {
      bassFilter,
      lowMidsFilter,
      midsFilter,
      upperMidsFilter,
      presenceFilter,
      trebleFilter,
      airFilter,
    };
  }

  /**
   * Create stereo width manipulation nodes
   */
  private createStereoWidener(): void {
    const ctx = this.context!;

    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);
    this.leftGain = ctx.createGain();
    this.rightGain = ctx.createGain();

    // Default stereo (1:1)
    this.leftGain.gain.value = 1;
    this.rightGain.gain.value = 1;
  }

  /**
   * Connect the full DSP signal chain
   */
  private connectChain(): void {
    if (!this.filters || !this.inputGain || !this.outputGain || !this.context) return;

    const {
      bassFilter,
      lowMidsFilter,
      midsFilter,
      upperMidsFilter,
      presenceFilter,
      trebleFilter,
      airFilter,
    } = this.filters;

    // Connect filter chain
    this.inputGain.connect(bassFilter);
    bassFilter.connect(lowMidsFilter);
    lowMidsFilter.connect(midsFilter);
    midsFilter.connect(upperMidsFilter);
    upperMidsFilter.connect(presenceFilter);
    presenceFilter.connect(trebleFilter);
    trebleFilter.connect(airFilter);

    // Connect through stereo widener
    if (this.splitter && this.merger && this.leftGain && this.rightGain) {
      airFilter.connect(this.splitter);
      this.splitter.connect(this.leftGain, 0);
      this.splitter.connect(this.rightGain, 1);
      this.leftGain.connect(this.merger, 0, 0);
      this.rightGain.connect(this.merger, 0, 1);
      this.merger.connect(this.outputGain);
    } else {
      airFilter.connect(this.outputGain);
    }

    // Connect to analyser and destination
    if (this.analyser) {
      this.outputGain.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    } else {
      this.outputGain.connect(this.context.destination);
    }
  }

  // ============================================================================
  // Audio Loading & Playback
  // ============================================================================

  /**
   * Load an audio file from URL
   */
  async loadAudio(url: string): Promise<void> {
    if (!this.context) await this.initialize();

    try {
      this.emit('statechange', { loading: true });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.context!.decodeAudioData(arrayBuffer);

      this.emit('load', { duration: this.audioBuffer.duration });
      this.emit('statechange', { loading: false });
    } catch (error) {
      this.emit('error', error);
      this.emit('statechange', { loading: false });
      throw error;
    }
  }

  /**
   * Start or resume playback
   */
  play(): void {
    if (!this.context || !this.audioBuffer || !this.inputGain) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    // If already playing, do nothing
    if (this.isPlaying && !this.isPaused) return;

    // Stop any existing source
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignore errors from already-stopped nodes
      }
    }

    // Create new source node
    this.sourceNode = this.context.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = true;

    // Handle playback end (won't fire for looping, but good practice)
    this.sourceNode.onended = () => {
      if (!this.sourceNode?.loop) {
        this.isPlaying = false;
        this.emit('ended');
        this.emit('statechange', { playing: false });
      }
    };

    // Connect to input of DSP chain
    this.sourceNode.connect(this.inputGain);

    // Start from pause position or beginning
    const offset = this.isPaused ? this.pauseOffset : 0;
    this.sourceNode.start(0, offset);

    this.startTime = this.context.currentTime - offset;
    this.isPlaying = true;
    this.isPaused = false;

    this.emit('statechange', { playing: true });
  }

  /**
   * Pause playback (can resume)
   */
  pause(): void {
    if (!this.isPlaying || this.isPaused || !this.sourceNode || !this.context) return;

    // Calculate current position for resume
    const elapsed = this.context.currentTime - this.startTime;
    this.pauseOffset = elapsed % (this.audioBuffer?.duration || 1);

    try {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    } catch {
      // Ignore
    }

    this.sourceNode = null;
    this.isPaused = true;

    this.emit('statechange', { playing: false, paused: true });
  }

  /**
   * Stop playback (resets to beginning)
   */
  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignore
      }
      this.sourceNode = null;
    }

    this.isPlaying = false;
    this.isPaused = false;
    this.pauseOffset = 0;

    this.emit('statechange', { playing: false, paused: false });
  }

  /**
   * Toggle play/pause
   */
  toggle(): void {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else {
      this.play();
    }
  }

  // ============================================================================
  // DSP Parameter Control
  // ============================================================================

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.outputGain && this.context) {
      // Smooth transition to avoid clicks
      this.outputGain.gain.setTargetAtTime(
        this.volume * this.getLoudnessCompensation(),
        this.context.currentTime,
        0.02
      );
    }
  }

  /**
   * Set headphone compensation EQ (inverse of headphone FR)
   */
  setHeadphoneCompensation(compensation: CompensationEQ | null): void {
    this.headphoneCompensation = compensation;
    this.updateFilters();
  }

  /**
   * Update DSP parameters (sliders)
   */
  setParameters(params: Partial<DSPParameters>): void {
    this.currentParams = { ...this.currentParams, ...params };
    this.updateFilters();
  }

  /**
   * Set a single parameter
   */
  setParameter(key: keyof DSPParameters, value: number): void {
    this.currentParams[key] = Math.max(0, Math.min(1, value));
    this.updateFilters();
  }

  /**
   * Apply all filter changes with smooth transitions
   */
  private updateFilters(): void {
    if (!this.filters || !this.context) return;

    const now = this.context.currentTime;
    const rampTime = 0.03; // 30ms for smooth, responsive transitions

    // Get headphone compensation (or zeros if none)
    const comp = this.headphoneCompensation || {
      bassGain: 0,
      lowMidsGain: 0,
      midsGain: 0,
      upperMidsGain: 0,
      trebleGain: 0,
      airinessGain: 0,
    };

    // Convert 0-1 slider values to dB
    // Range: -12dB to +12dB (24dB total range)
    const sliderToDb = (value: number, range = 24): number => (value - 0.5) * range;

    // Bass filter
    const bassDb = sliderToDb(this.currentParams.bass) + comp.bassGain;
    this.filters.bassFilter.gain.setTargetAtTime(bassDb, now, rampTime);

    // Low mids (secondary influence from mids slider)
    const lowMidsDb = sliderToDb(this.currentParams.mids) * 0.4 + comp.lowMidsGain;
    this.filters.lowMidsFilter.gain.setTargetAtTime(lowMidsDb, now, rampTime);

    // Mids filter
    const midsDb = sliderToDb(this.currentParams.mids) + comp.midsGain;
    this.filters.midsFilter.gain.setTargetAtTime(midsDb, now, rampTime);

    // Upper mids (secondary influence from mids slider)
    const upperMidsDb = sliderToDb(this.currentParams.mids) * 0.3 + comp.upperMidsGain;
    this.filters.upperMidsFilter.gain.setTargetAtTime(upperMidsDb, now, rampTime);

    // Presence/Detail filter (narrower range for precision)
    const presenceDb = sliderToDb(this.currentParams.detail, 16); // -8 to +8dB
    this.filters.presenceFilter.gain.setTargetAtTime(presenceDb, now, rampTime);

    // Treble filter
    const trebleDb = sliderToDb(this.currentParams.treble) + comp.trebleGain;
    this.filters.trebleFilter.gain.setTargetAtTime(trebleDb, now, rampTime);

    // Air filter (follows treble with reduced intensity)
    const airDb = sliderToDb(this.currentParams.treble) * 0.5 + comp.airinessGain;
    this.filters.airFilter.gain.setTargetAtTime(airDb, now, rampTime);

    // Update stereo width
    this.updateStereoWidth(this.currentParams.soundstage);

    // Apply loudness compensation
    if (this.outputGain) {
      const compensation = this.getLoudnessCompensation();
      this.outputGain.gain.setTargetAtTime(this.volume * compensation, now, rampTime);
    }
  }

  /**
   * Update stereo width using gain differential
   */
  private updateStereoWidth(width: number): void {
    if (!this.leftGain || !this.rightGain || !this.context) return;

    const now = this.context.currentTime;
    const rampTime = 0.05;

    // Width mapping:
    // 0 = narrow/intimate (reduced separation)
    // 0.5 = natural stereo
    // 1 = enhanced width

    if (width <= 0.5) {
      // Narrow toward mono
      // At 0: both channels at 0.7 (partial mono blend)
      // At 0.5: both channels at 1.0 (normal stereo)
      const factor = 0.7 + width * 0.6;
      this.leftGain.gain.setTargetAtTime(factor, now, rampTime);
      this.rightGain.gain.setTargetAtTime(factor, now, rampTime);
    } else {
      // Enhance width
      // At 0.5: 1.0
      // At 1.0: 1.25 (enhanced separation)
      const factor = 1 + (width - 0.5) * 0.5;
      this.leftGain.gain.setTargetAtTime(factor, now, rampTime);
      this.rightGain.gain.setTargetAtTime(factor, now, rampTime);
    }
  }

  /**
   * Calculate loudness compensation factor
   * Reduces volume when EQ boosts are applied to maintain consistent loudness
   */
  private getLoudnessCompensation(): number {
    // Calculate total positive gain from all filters
    const bassBoost = Math.max(0, (this.currentParams.bass - 0.5) * 24);
    const midsBoost = Math.max(0, (this.currentParams.mids - 0.5) * 24);
    const trebleBoost = Math.max(0, (this.currentParams.treble - 0.5) * 24);
    const detailBoost = Math.max(0, (this.currentParams.detail - 0.5) * 16);

    // Weight by perceptual loudness contribution
    // Bass contributes most to perceived loudness
    const totalBoost = bassBoost * 0.4 + midsBoost * 0.35 + trebleBoost * 0.15 + detailBoost * 0.1;

    // Convert to compensation factor
    // Every 6dB of boost roughly doubles perceived loudness
    // We apply partial compensation to keep it musical
    const compensation = 1 / (1 + totalBoost / 30);

    return Math.max(0.5, Math.min(1, compensation));
  }

  // ============================================================================
  // Analyser / Visualization
  // ============================================================================

  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Get time domain data for waveform visualization
   */
  getTimeDomainData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to engine events
   */
  on(event: AudioEngineEventType, callback: AudioEngineEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from engine events
   */
  off(event: AudioEngineEventType, callback: AudioEngineEventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event
   */
  private emit(event: AudioEngineEventType, data?: unknown): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(data));
  }

  // ============================================================================
  // State & Cleanup
  // ============================================================================

  /**
   * Get current playback state
   */
  getState() {
    return {
      isInitialized: !!this.context,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      volume: this.volume,
      parameters: { ...this.currentParams },
      hasAudio: !!this.audioBuffer,
      duration: this.audioBuffer?.duration || 0,
    };
  }

  /**
   * Get current playback position
   */
  getCurrentTime(): number {
    if (!this.context || !this.isPlaying) return this.pauseOffset;
    const elapsed = this.context.currentTime - this.startTime;
    return elapsed % (this.audioBuffer?.duration || 1);
  }

  /**
   * Clean up and release resources
   */
  dispose(): void {
    this.stop();

    if (this.context) {
      this.context.close();
      this.context = null;
    }

    this.filters = null;
    this.inputGain = null;
    this.outputGain = null;
    this.splitter = null;
    this.merger = null;
    this.leftGain = null;
    this.rightGain = null;
    this.analyser = null;
    this.audioBuffer = null;

    this.eventListeners.clear();
  }
}

// Singleton instance for easy access
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

export function disposeAudioEngine(): void {
  if (audioEngineInstance) {
    audioEngineInstance.dispose();
    audioEngineInstance = null;
  }
}
