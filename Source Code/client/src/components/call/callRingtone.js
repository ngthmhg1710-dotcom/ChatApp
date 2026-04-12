export function callRingtoneEnabled() {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('callRingSound') !== 'false';
}

export function scheduleDualToneBeep(ctx, startTime, duration = 0.32, volume = 0.12) {
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();

  o1.connect(g);
  o2.connect(g);
  g.connect(ctx.destination);

  o1.frequency.value = 440;
  o2.frequency.value = 480;
  o1.type = 'sine';
  o2.type = 'sine';

  const t1 = startTime + duration;
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(volume, startTime + 0.03);
  g.gain.linearRampToValueAtTime(0, t1);

  o1.start(startTime);
  o2.start(startTime);
  o1.stop(t1 + 0.02);
  o2.stop(t1 + 0.02);
}