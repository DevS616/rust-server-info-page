import { useEffect, useRef } from 'react';

const ChristmasGarland = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    window.addEventListener('resize', resizeCanvas);

    const lights: Array<{
      x: number;
      y: number;
      color: string;
      brightness: number;
      phase: number;
      speed: number;
    }> = [];

    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF4500'];
    
    const numLights = Math.floor(canvas.width / 50);
    for (let i = 0; i < numLights; i++) {
      const x = (i / (numLights - 1)) * canvas.width;
      const y = 15 + Math.sin(i * 0.6) * 8;
      lights.push({
        x,
        y,
        color: colors[i % colors.length],
        brightness: Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
      });
    }

    const drawWire = () => {
      ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, lights[0].y);
      
      for (let i = 0; i < lights.length; i++) {
        ctx.lineTo(lights[i].x, lights[i].y);
      }
      ctx.stroke();
    };

    const drawLight = (light: typeof lights[0]) => {
      const glowSize = 20 + light.brightness * 15;
      
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, glowSize);
      gradient.addColorStop(0, `${light.color}${Math.floor(light.brightness * 180 + 75).toString(16)}`);
      gradient.addColorStop(0.4, `${light.color}44`);
      gradient.addColorStop(1, `${light.color}00`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(light.x - glowSize, light.y - glowSize, glowSize * 2, glowSize * 2);
      
      ctx.fillStyle = light.color;
      ctx.globalAlpha = light.brightness * 0.8 + 0.2;
      ctx.beginPath();
      ctx.ellipse(light.x, light.y, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(light.x - 2, light.y - 3, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    };

    let lastFrame = 0;
    const frameDelay = 1000 / 30;
    
    const animate = (timestamp: number) => {
      if (timestamp - lastFrame < frameDelay) {
        requestAnimationFrame(animate);
        return;
      }
      
      lastFrame = timestamp;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawWire();
      
      lights.forEach((light) => {
        light.brightness = (Math.sin(light.phase) + 1) / 2;
        light.phase += light.speed;
        drawLight(light);
      });
      
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9999]">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ 
          height: '50px',
          mixBlendMode: 'screen'
        }}
      />
    </div>
  );
};

export default ChristmasGarland;