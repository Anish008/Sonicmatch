# Audio Dataset for Listening Test

Place your WAV audio files in the following structure:

```
audio_dataset/
├── full_range/
│   └── balanced_fullrange_loop.wav    # Full-range reference track
├── bass/
│   └── nightfall-future-bass_loop.wav # Bass-heavy track for bass testing
├── mids/
│   └── vocal_mids_loop.wav            # Vocal-focused track for mids testing
├── mids_detail/
│   └── soft-piano-music_loop.wav      # Piano/acoustic for treble testing
├── ambient_detail/
│   └── beautiful-loop_loop.wav        # Ambient track for detail testing
└── soundstage/
    └── soft-background-music_loop.wav # Orchestral/wide track for soundstage
```

## Audio Requirements

- **Format**: WAV (44.1kHz or 48kHz, 16-bit or 24-bit)
- **Looping**: Files must be seamlessly loopable (no clicks at loop points)
- **Loudness**: Normalize all files to -14 LUFS for consistent perceived volume
- **Duration**: 10-30 seconds recommended for smooth looping
- **Content**: Each file should emphasize the frequency range it's testing

## File Purposes

| File | Frequency Focus | Testing Purpose |
|------|-----------------|-----------------|
| full_range | 20Hz-20kHz | Reference/calibration |
| bass | 20-250Hz | Low frequency preference |
| mids | 250Hz-4kHz | Vocal/midrange preference |
| treble (mids_detail) | 4-20kHz | High frequency preference |
| ambient_detail | 4-8kHz | Presence/detail preference |
| soundstage | N/A | Stereo width preference |
