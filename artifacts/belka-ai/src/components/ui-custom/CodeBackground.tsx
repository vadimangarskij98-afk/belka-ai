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
  type: "code" | "symbol" | "dot" | "glow";
  life: number;
  maxLife: number;
  color: string;
}

const NEON_COLORS = [
  "99, 130, 255",
  "139, 92, 246",
  "99, 102, 241",
  "168, 85, 247",
  "59, 130, 246",
  "79, 70, 229",
];

function createParticle(w: number, h: number): Particle {
  const rand = Math.random();
  const type = rand < 0.08 ? "glow" : rand < 0.18 ? "code" : rand < 0.45 ? "symbol" : "dot";
  const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25,
    vy: -Math.random() * 0.35 - 0.08,
    text: type === "code"
      ? CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)]
      : type === "symbol"
      ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      : "",
    opacity: type === "glow" ? Math.random() * 0.08 + 0.02 : Math.random() * 0.1 + 0.02,
    size: type === "code" ? 10 : type === "symbol" ? 12 : type === "glow" ? Math.random() * 40 + 20 : Math.random() * 2 + 0.8,
    type,
    life: 0,
    maxLife: 700 + Math.random() * 500,
    color,
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

    const count = Math.min(Math.floor(w * h / 14000), 70);
    particlesRef.current = Array.from({ length: count }, () => createParticle(w, h));

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const fadeFactor = p.life < 80
          ? p.life / 80
          : p.life > p.maxLife - 80
          ? (p.maxLife - p.life) / 80
          : 1;

        const alpha = p.opacity * fadeFactor;

        if (p.type === "glow") {
          const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, `rgba(${p.color}, ${alpha * 0.6})`);
          gradient.addColorStop(0.5, `rgba(${p.color}, ${alpha * 0.2})`);
          gradient.addColorStop(1, `rgba(${p.color}, 0)`);
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = gradient;
          ctx!.fill();
        } else if (p.type === "dot") {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${p.color}, ${alpha})`;
          ctx!.fill();
        } else {
          ctx!.font = `${p.size}px 'Fira Code', monospace`;
          ctx!.fillStyle = p.type === "code"
            ? `rgba(${p.color}, ${alpha * 0.6})`
            : `rgba(${p.color}, ${alpha * 0.8})`;
          ctx!.fillText(p.text, p.x, p.y);
        }

        if (p.life > p.maxLife || p.y < -50 || p.x < -200 || p.x > w + 200) {
          particles[i] = createParticle(w, h);
          particles[i].y = h + 20;
        }
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          if (particles[i].type !== "dot" || particles[j].type !== "dot") continue;
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const lineAlpha = 0.025 * (1 - dist / 150);
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(${particles[i].color}, ${lineAlpha})`;
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
      style={{ opacity: 0.7 }}
    />
  );
}
