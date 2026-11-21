import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  active: boolean;
  speaker?: 'caller' | 'ai-decoy' | 'idle';
  intensity?: number;
}

export function AudioWaveform({ active, speaker = 'idle', intensity = 0.7 }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId = 0;
    let phase = 0;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const gap = 3;
      const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);

      for (let i = 0; i < barCount; i++) {
        const norm = i / barCount;
        const envelope = Math.sin(norm * Math.PI);
        const wave = active
          ? Math.abs(Math.sin(phase + i * 0.42) * Math.cos(phase * 0.6 + i * 0.21))
          : 0.08;
        const amp = active ? Math.max(0.12, wave * envelope * intensity) : 0.08 * envelope + 0.04;
        const barH = Math.max(3, amp * (height - 8));
        const x = i * (barWidth + gap);
        const y = (height - barH) / 2;

        if (!active) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
        } else if (speaker === 'caller') {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
        } else if (speaker === 'ai-decoy') {
          ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
        } else {
          ctx.fillStyle = 'rgba(99, 102, 241, 0.85)';
        }

        ctx.fillRect(x, y, barWidth, barH);
      }

      if (active && !prefersReduced) {
        phase += 0.11;
        frameId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [active, speaker, intensity]);

  return (
    <div className="w-full rounded-lg bg-[#080E1B] border border-slate-800/80 px-3 py-2">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
        <span>
          {active
            ? speaker === 'ai-decoy'
              ? 'Simulated Audio Channel · AI Decoy Speaking'
              : 'Simulated Audio Channel · Caller Stream'
            : 'Audio Channel Idle (Simulated Demo Adapter)'}
        </span>
        <span className="font-mono tabular-nums text-slate-500">16 kHz PCM Sim</span>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={48}
        data-testid="audio-waveform-canvas"
        aria-label="Simulated call audio waveform"
        className="w-full h-12 block"
      />
    </div>
  );
}
