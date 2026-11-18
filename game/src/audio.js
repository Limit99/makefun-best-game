// All sound is synthesised with WebAudio — no audio files. Short oscillator
// blips cover shooting, hits, explosions, pickups and level-ups; a quiet
// two-oscillator bass-and-arp loop plays underneath as music. The context is
// created lazily on the first user gesture, as browsers require, and every
// call is a no-op until then (and forever in screenshot mode).

export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = 0;
  let musicStep = 0;
  let muted = false;

  function unlock() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
  }

  function tone(frequency, seconds, type, volume, slideTo) {
    if (context === null || muted) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  function noise(seconds, volume) {
    if (context === null || muted) return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  // A minor-key arp pattern, one note per eighth at 132 BPM, over a soft bass.
  const ARP = [220, 261.63, 329.63, 440, 329.63, 261.63, 196, 246.94];
  const BASS = [55, 55, 65.41, 49];

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    shoot() { tone(880, 0.07, 'square', 0.05, 320); },
    enemyHit() { tone(300, 0.05, 'sawtooth', 0.04, 180); },
    explosion(big) {
      noise(big ? 0.5 : 0.22, big ? 0.4 : 0.18);
      tone(big ? 120 : 160, big ? 0.5 : 0.25, 'triangle', 0.25, 40);
    },
    playerHurt() { tone(140, 0.25, 'sawtooth', 0.22, 60); noise(0.15, 0.12); },
    pickup() { tone(1240, 0.08, 'sine', 0.07, 1860); },
    levelUp() {
      tone(523.25, 0.12, 'triangle', 0.16);
      setTimeout(() => tone(783.99, 0.16, 'triangle', 0.16), 70);
      setTimeout(() => tone(1046.5, 0.24, 'triangle', 0.16), 140);
    },
    waveClear() { tone(659.25, 0.14, 'triangle', 0.14, 987.77); },
    victory() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.16), i * 120));
    },
    gameOver() {
      [392, 329.63, 261.63, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.16), i * 140));
    },
    /** Advance the music loop; call once per frame with the frame's seconds. */
    updateMusic(dt, playing) {
      if (context === null || muted || !playing) return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      musicTimer = 60 / 132 / 2;
      const step = musicStep;
      musicStep += 1;
      tone(ARP[step % ARP.length], 0.16, 'triangle', 0.045);
      if (step % 8 === 0) tone(BASS[(step / 8) % BASS.length], 0.8, 'sine', 0.11);
    },
  };
}
