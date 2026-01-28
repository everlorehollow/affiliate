"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  maxOpacity: number;
  fadeSpeed: number;
  life: number;
  fadeDirection: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobbleOffset: number;
  time: number;
  currentOpacity: number;
  color: { r: number; g: number; b: number };
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle(): Particle {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.15 + 0.03;
      const opacity = Math.random() * 0.5 + 0.2;

      // Color variation: gold, light gold, or soft purple
      const colorChoice = Math.random();
      let color: { r: number; g: number; b: number };
      if (colorChoice < 0.5) {
        color = { r: 212, g: 175, b: 55 }; // Primary gold
      } else if (colorChoice < 0.75) {
        color = { r: 240, g: 216, b: 117 }; // Light gold
      } else {
        color = { r: 157, g: 124, b: 216 }; // Soft purple
      }

      return {
        x: Math.random() * (canvas?.width || window.innerWidth),
        y: Math.random() * (canvas?.height || window.innerHeight),
        size: Math.random() * 2.5 + 0.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity,
        maxOpacity: opacity,
        fadeSpeed: Math.random() * 0.0008 + 0.0003,
        life: Math.random(),
        fadeDirection: Math.random() > 0.5 ? 1 : -1,
        wobbleSpeed: Math.random() * 0.008 + 0.003,
        wobbleAmount: Math.random() * 0.3 + 0.1,
        wobbleOffset: Math.random() * Math.PI * 2,
        time: Math.random() * 1000,
        currentOpacity: opacity,
        color,
      };
    }

    function updateParticle(particle: Particle) {
      if (!canvas) return;

      particle.time += 1;

      // Gentle drift with subtle wobble
      const wobbleX =
        Math.sin(particle.time * particle.wobbleSpeed + particle.wobbleOffset) *
        particle.wobbleAmount;
      const wobbleY =
        Math.cos(
          particle.time * particle.wobbleSpeed * 0.7 + particle.wobbleOffset
        ) * particle.wobbleAmount;

      particle.x += particle.speedX + wobbleX * 0.1;
      particle.y += particle.speedY + wobbleY * 0.1;

      // Breathing opacity effect
      particle.life += particle.fadeSpeed * particle.fadeDirection;

      if (particle.life >= 1) {
        particle.fadeDirection = -1;
      } else if (particle.life <= 0) {
        particle.fadeDirection = 1;
      }

      // Smooth opacity based on life
      particle.currentOpacity = particle.maxOpacity * (0.3 + particle.life * 0.7);

      // Wrap around edges seamlessly
      if (particle.x < -20) particle.x = canvas.width + 20;
      if (particle.x > canvas.width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = canvas.height + 20;
      if (particle.y > canvas.height + 20) particle.y = -20;
    }

    function drawParticle(particle: Particle) {
      if (!ctx) return;

      const { r, g, b } = particle.color;

      // Outer glow
      const glowGradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 4
      );
      glowGradient.addColorStop(
        0,
        `rgba(${r}, ${g}, ${b}, ${particle.currentOpacity * 0.25})`
      );
      glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Core particle
      const coreGradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size
      );
      coreGradient.addColorStop(
        0,
        `rgba(255, 255, 255, ${particle.currentOpacity})`
      );
      coreGradient.addColorStop(
        0.4,
        `rgba(${r}, ${g}, ${b}, ${particle.currentOpacity})`
      );
      coreGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
    }

    function initParticles() {
      const particleCount = Math.min(50, Math.floor(window.innerWidth / 30));
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle());
      }
    }

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        updateParticle(particle);
        drawParticle(particle);
      });

      animationRef.current = requestAnimationFrame(animate);
    }

    function handleResize() {
      resizeCanvas();
      const newCount = Math.min(50, Math.floor(window.innerWidth / 30));
      while (particlesRef.current.length < newCount) {
        particlesRef.current.push(createParticle());
      }
      while (particlesRef.current.length > newCount) {
        particlesRef.current.pop();
      }
    }

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
