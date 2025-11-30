import React, { useRef, useEffect } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

interface GalaxyProps {
  className?: string;
  starCount?: number;
  speed?: number;
  backgroundColor?: string;
}

export const Galaxy: React.FC<GalaxyProps> = ({
  className = '',
  starCount = 800,
  speed = 0.5,
  backgroundColor = '#0a0a0f',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const colors = [
      '#ffffff',
      '#a0c4ff',
      '#bdb2ff',
      '#ffc6ff',
      '#caffbf',
      '#ffd6a5',
    ];

    const initStars = () => {
      starsRef.current = [];
      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width - canvas.width / 2,
          y: Math.random() * canvas.height - canvas.height / 2,
          z: Math.random() * canvas.width,
          size: Math.random() * 2 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      starsRef.current.forEach((star) => {
        star.z -= speed;

        if (star.z <= 0) {
          star.x = Math.random() * canvas.width - centerX;
          star.y = Math.random() * canvas.height - centerY;
          star.z = canvas.width;
        }

        const sx = (star.x / star.z) * canvas.width + centerX;
        const sy = (star.y / star.z) * canvas.height + centerY;
        const size = (1 - star.z / canvas.width) * star.size * 3;
        const opacity = 1 - star.z / canvas.width;

        if (sx >= 0 && sx <= canvas.width && sy >= 0 && sy <= canvas.height) {
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = opacity;
          ctx.fill();
          ctx.globalAlpha = 1;

          // Glow effect
          const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
          gradient.addColorStop(0, star.color);
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = opacity * 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initStars();
    animate();

    window.addEventListener('resize', () => {
      resizeCanvas();
      initStars();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [starCount, speed, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 z-0 ${className}`}
      style={{ background: backgroundColor }}
    />
  );
};

export default Galaxy;
