export type Point = { x: number; y: number };

export interface GameObject {
  id: string;
  x: number;
  y: number;
}

export interface EnemyRocket extends GameObject {
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
}

export interface InterceptorMissile extends GameObject {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
  batteryIndex: number;
}

export interface Explosion extends GameObject {
  radius: number;
  maxRadius: number;
  expanding: boolean;
  life: number; // 0 to 1
}

export interface City extends GameObject {
  active: boolean;
}

export interface Battery extends GameObject {
  active: boolean;
  ammo: number;
  maxAmmo: number;
}

export type GameState = 'START' | 'PLAYING' | 'WON' | 'LOST';

export type Language = 'en' | 'zh';
