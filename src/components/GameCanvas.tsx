import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  EnemyRocket, 
  InterceptorMissile, 
  Explosion, 
  City, 
  Battery, 
  Point,
  GameState
} from '../types/game';

interface GameCanvasProps {
  gameState: GameState;
  onScoreUpdate: (points: number) => void;
  onGameOver: (won: boolean) => void;
  onAmmoUpdate: (batteries: Battery[]) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  onScoreUpdate, 
  onGameOver,
  onAmmoUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  // Game State Refs (to avoid closure issues in loop)
  const stateRef = useRef({
    rockets: [] as EnemyRocket[],
    missiles: [] as InterceptorMissile[],
    explosions: [] as Explosion[],
    cities: [] as City[],
    batteries: [] as Battery[],
    score: 0,
    level: 1,
    lastRocketSpawn: 0,
    spawnInterval: 1200,
  });

  const initGame = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const cities: City[] = [];
    const citySpacing = width / 10;
    for (let i = 0; i < 6; i++) {
      // Place cities between batteries
      let x = 0;
      if (i < 3) x = (i + 1) * (width / 4) / 4 + width / 8;
      else x = (i - 2) * (width / 4) / 4 + width * 5/8;
      
      // Better distribution
      const positions = [0.15, 0.25, 0.35, 0.65, 0.75, 0.85];
      cities.push({
        id: `city-${i}`,
        x: width * positions[i],
        y: height - 40,
        active: true
      });
    }

    const batteries: Battery[] = [
      { id: 'bat-0', x: 40, y: height - 40, active: true, ammo: 20, maxAmmo: 20 },
      { id: 'bat-1', x: width / 2, y: height - 40, active: true, ammo: 40, maxAmmo: 40 },
      { id: 'bat-2', x: width - 40, y: height - 40, active: true, ammo: 20, maxAmmo: 20 },
    ];

    stateRef.current = {
      rockets: [],
      missiles: [],
      explosions: [],
      cities,
      batteries,
      score: 0,
      level: 1,
      lastRocketSpawn: 0,
      spawnInterval: 1200,
    };
    
    onAmmoUpdate(batteries);
  }, [onAmmoUpdate]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      initGame();
    }
  }, [gameState, initGame]);

  const spawnRocket = (time: number) => {
    const { rockets, cities, batteries, level, spawnInterval } = stateRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (time - stateRef.current.lastRocketSpawn > spawnInterval) {
      const activeTargets = [
        ...cities.filter(c => c.active),
        ...batteries.filter(b => b.active)
      ];

      if (activeTargets.length > 0) {
        const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];
        const startX = Math.random() * width;
        
        rockets.push({
          id: `rocket-${Date.now()}-${Math.random()}`,
          x: startX,
          y: 0,
          targetX: target.x,
          targetY: target.y,
          speed: 0.0003 + (level * 0.00005),
          progress: 0
        });
        
        stateRef.current.lastRocketSpawn = time;
        // Gradually speed up spawning
        stateRef.current.spawnInterval = Math.max(300, 1200 - (stateRef.current.score / 100) * 100);
      }
    }
  };

  const update = (time: number) => {
    if (gameState !== 'PLAYING') return;

    const { rockets, missiles, explosions, cities, batteries } = stateRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    spawnRocket(time);

    // Update Rockets
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.progress += r.speed * 16; // Approx 60fps
      r.x = r.x + (r.targetX - r.x) * (r.speed * 16 / (1 - r.progress + 0.001));
      r.y = r.y + (r.targetY - r.y) * (r.speed * 16 / (1 - r.progress + 0.001));
      
      // Recalculate x,y based on progress for linear movement
      // Actually simpler:
      // r.x = startX + (targetX - startX) * progress
      // But we didn't store startX. Let's fix that or use simple lerp.
      // Let's use a simpler lerp with stored startX in the future, 
      // for now let's just move them down.
      
      if (r.progress >= 1 || r.y >= r.targetY) {
        // Hit target
        const cityHit = cities.find(c => Math.abs(c.x - r.targetX) < 5 && Math.abs(c.y - r.targetY) < 5);
        if (cityHit) cityHit.active = false;
        
        const batHit = batteries.find(b => Math.abs(b.x - r.targetX) < 5 && Math.abs(b.y - r.targetY) < 5);
        if (batHit) batHit.active = false;

        // Create explosion at impact
        explosions.push({
          id: `exp-hit-${Date.now()}`,
          x: r.targetX,
          y: r.targetY,
          radius: 0,
          maxRadius: 30,
          expanding: true,
          life: 1
        });

        rockets.splice(i, 1);
        
        // Check game over
        if (batteries.every(b => !b.active)) {
          onGameOver(false);
        }
      }
    }

    // Update Missiles
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.progress += m.speed * 16;
      
      const dx = m.targetX - m.startX;
      const dy = m.targetY - m.startY;
      m.x = m.startX + dx * m.progress;
      m.y = m.startY + dy * m.progress;

      if (m.progress >= 1) {
        // Reached target, explode
        explosions.push({
          id: `exp-${Date.now()}`,
          x: m.targetX,
          y: m.targetY,
          radius: 0,
          maxRadius: 50,
          expanding: true,
          life: 1
        });
        missiles.splice(i, 1);
      }
    }

    // Update Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      if (e.expanding) {
        e.radius += 2;
        if (e.radius >= e.maxRadius) e.expanding = false;
      } else {
        e.radius -= 0.5;
        e.life -= 0.02;
      }

      if (e.radius <= 0 || e.life <= 0) {
        explosions.splice(i, 1);
      } else {
        // Check collision with rockets
        for (let j = rockets.length - 1; j >= 0; j--) {
          const r = rockets[j];
          const dist = Math.sqrt((r.x - e.x) ** 2 + (r.y - e.y) ** 2);
          if (dist < e.radius) {
            rockets.splice(j, 1);
            stateRef.current.score += 20;
            onScoreUpdate(20);
            
            // Win condition
            if (stateRef.current.score >= 1000) {
              onGameOver(true);
            }
          }
        }
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { rockets, missiles, explosions, cities, batteries } = stateRef.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, height - 40, width, 40);

    // Draw Cities
    cities.forEach(city => {
      if (city.active) {
        ctx.fillStyle = '#4ade80'; // Green
        ctx.fillRect(city.x - 15, city.y - 10, 30, 10);
        ctx.fillRect(city.x - 10, city.y - 20, 20, 10);
      } else {
        ctx.fillStyle = '#454545'; // Gray rubble
        ctx.beginPath();
        ctx.moveTo(city.x - 15, city.y);
        ctx.lineTo(city.x + 15, city.y);
        ctx.lineTo(city.x, city.y - 5);
        ctx.fill();
      }
    });

    // Draw Batteries
    batteries.forEach(bat => {
      if (bat.active) {
        ctx.fillStyle = '#3b82f6'; // Blue
        ctx.beginPath();
        ctx.moveTo(bat.x - 20, bat.y);
        ctx.lineTo(bat.x + 20, bat.y);
        ctx.lineTo(bat.x, bat.y - 25);
        ctx.fill();
        
        // Draw ammo count text
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(bat.ammo.toString(), bat.x, bat.y + 15);
      } else {
        ctx.fillStyle = '#ef4444'; // Red destroyed
        ctx.fillRect(bat.x - 10, bat.y - 5, 20, 5);
      }
    });

    // Draw Rockets
    ctx.setLineDash([5, 5]);
    rockets.forEach(r => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      // We don't have startX, so we just draw a trail from top
      // For better visual, we could store startX
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, 0); // Simple vertical trail for now
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.setLineDash([]);

    // Draw Missiles
    missiles.forEach(m => {
      ctx.strokeStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(m.startX, m.startY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      // Target X
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(m.targetX - 5, m.targetY - 5);
      ctx.lineTo(m.targetX + 5, m.targetY + 5);
      ctx.moveTo(m.targetX + 5, m.targetY - 5);
      ctx.lineTo(m.targetX - 5, m.targetY + 5);
      ctx.stroke();
    });

    // Draw Explosions
    explosions.forEach(e => {
      const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${e.life})`);
      gradient.addColorStop(0.2, `rgba(253, 224, 71, ${e.life})`); // Yellow
      gradient.addColorStop(0.6, `rgba(249, 115, 22, ${e.life})`); // Orange
      gradient.addColorStop(1, `rgba(239, 68, 68, 0)`); // Red transparent

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const loop = (time: number) => {
    update(time);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Find closest battery with ammo
    const { batteries, missiles } = stateRef.current;
    let bestBattery = -1;
    let minDist = Infinity;

    batteries.forEach((bat, index) => {
      if (bat.active && bat.ammo > 0) {
        const dist = Math.abs(bat.x - x);
        if (dist < minDist) {
          minDist = dist;
          bestBattery = index;
        }
      }
    });

    if (bestBattery !== -1) {
      const bat = batteries[bestBattery];
      bat.ammo--;
      onAmmoUpdate([...batteries]);

      missiles.push({
        id: `missile-${Date.now()}`,
        startX: bat.x,
        startY: bat.y,
        x: bat.x,
        y: bat.y,
        targetX: x,
        targetY: y,
        speed: 0.005,
        progress: 0,
        batteryIndex: bestBattery
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Re-init positions if needed, but usually we want to keep state
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full bg-black cursor-crosshair"
      onClick={handleCanvasClick}
      onTouchStart={handleCanvasClick}
    />
  );
};

export default GameCanvas;
