import { useEffect, useRef, memo } from 'react';

const COLORS = ['#FFD700', '#FFA500', '#FF6347', '#FF4500'];

/* Deterministic seed-based pseudo-random (no Math.random in render/init) */
const seededValue = (i: number, offset: number) => ((Math.sin(i * 7.3 + offset) + 1) / 2);

const ChristmasGarland = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = 50;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    type Light = { x: number; y: number; color: string; brightness: number; phase: number; speed: number };
    let lights: Light[] = [];

    const buildLights = () => {
      const num = Math.floor(canvas.width / 50);
      lights = Array.from({ length: num }, (_, i) => ({
        x: num > 1 ? (i / (num - 1)) * canvas.width : canvas.width / 2,
        y: 15 + Math.sin(i * 0.6) * 8,
        color: COLORS[i % COLORS.length],
        brightness: seededValue(i, 0),
        phase: seededValue(i, 1) * Math.PI * 2,
        speed: 0.02 + seededValue(i, 2) * 0.03,
      }));
    };
    buildLights();

    const drawWire = () => {
      if (!lights.length) return;
      ctx.strokeStyle = 'rgba(101,67,33,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lights[0].x, lights[0].y);
      lights.forEach(l => ctx.lineTo(l.x, l.y));
      ctx.stroke();
    };

    const drawLight = (l: Light) => {
      const glowSize = 20 + l.brightness * 15;
      const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, glowSize);
      grad.addColorStop(0, `${l.color}${Math.floor(l.brightness * 180 + 75).toString(16).padStart(2, '0')}`);
      grad.addColorStop(0.4, `${l.color}44`);
      grad.addColorStop(1, `${l.color}00`);
      ctx.fillStyle = grad;
      ctx.fillRect(l.x - glowSize, l.y - glowSize, glowSize * 2, glowSize * 2);

      ctx.fillStyle = l.color;
      ctx.globalAlpha = l.brightness * 0.8 + 0.2;
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(l.x - 2, l.y - 3, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    let lastFrame = 0;
    const FRAME_DELAY = 1000 / 30;

    const animate = (ts: number) => {
      if (ts - lastFrame >= FRAME_DELAY) {
        lastFrame = ts;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawWire();
        lights.forEach(l => {
          l.brightness = (Math.sin(l.phase) + 1) / 2;
          l.phase += l.speed;
          drawLight(l);
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    const handleResize = () => { resizeCanvas(); buildLights(); };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9999]">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: '50px', mixBlendMode: 'screen' }}
      />
    </div>
  );
};

export default memo(ChristmasGarland);
