import { useEffect, useRef } from "react";

const CODE_SNIPPETS = [
  "const app = express();",
  "async function deploy() {",
  "import { useState } from 'react';",
  "export default class API {",
  "router.get('/api', handler);",
  "const db = new Database();",
  "await fetch('/api/data');",
  "function buildProject() {",
  "const token = jwt.sign(data);",
  "interface User { id: string }",
  "type Response = Promise<void>",
  "npm install --save express",
  "git commit -m 'feat: AI'",
  "docker build -t belka .",
  "SELECT * FROM agents;",
  "CREATE TABLE models (",
  "return NextResponse.json()",
  "export const schema = z.object",
  "pnpm run dev --port 3000",
  "const ws = new WebSocket()",
];

const SYMBOLS = ["{", "}", "(", ")", ";", "=>", "//", "/*", "*/", "</>", "&&", "||", "===", "!==", "...", "[]", "::", ">>", "<<", "#"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  opacity: number;
  size: number;
  type: "code" | "symbol" | "dot";
  life: number;
  maxLife: number;
}

function createParticle(w: number, h: number): Particle {
  const type = Math.random() < 0.15 ? "code" : Math.random() < 0.5 ? "symbol" : "dot";
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -Math.random() * 0.4 - 0.1,
    text: type === "code"
      ? CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)]
      : type === "symbol"
      ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      : "",
    opacity: Math.random() * 0.12 + 0.03,
    size: type === "code" ? 10 : type === "symbol" ? 12 : Math.random() * 2 + 1,
    type,
    life: 0,
    maxLife: 600 + Math.random() * 400,
  };
}

export function CodeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
    }
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(Math.floor(w * h / 12000), 80);
    particlesRef.current = Array.from({ length: count }, () => createParticle(w, h));

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const fadeFactor = p.life < 60
          ? p.life / 60
          : p.life > p.maxLife - 60
          ? (p.maxLife - p.life) / 60
          : 1;

        const alpha = p.opacity * fadeFactor;

        if (p.type === "dot") {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(99, 130, 255, ${alpha})`;
          ctx!.fill();
        } else {
          ctx!.font = `${p.size}px 'Fira Code', monospace`;
          ctx!.fillStyle = p.type === "code"
            ? `rgba(99, 130, 255, ${alpha * 0.7})`
            : `rgba(160, 120, 255, ${alpha * 0.9})`;
          ctx!.fillText(p.text, p.x, p.y);
        }

        if (p.life > p.maxLife || p.y < -50 || p.x < -200 || p.x > w + 200) {
          particles[i] = createParticle(w, h);
          particles[i].y = h + 20;
        }
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && particles[i].type === "dot" && particles[j].type === "dot") {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(99, 130, 255, ${0.03 * (1 - dist / 120)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}
