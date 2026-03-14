import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Shield, Zap, Languages } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GameState, Language, Battery } from './types/game';
import { translations } from './translations';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [language, setLanguage] = useState<Language>('zh');
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [reviveTrigger, setReviveTrigger] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);

  const t = translations[language];

  const handleScoreUpdate = useCallback((points: number) => {
    setScore(prev => prev + points);
  }, []);

  const handleGameOver = useCallback((won: boolean) => {
    setGameState(won ? 'WON' : 'LOST');
  }, []);

  const handleAmmoUpdate = useCallback((updatedBatteries: Battery[]) => {
    setBatteries(updatedBatteries);
  }, []);

  const startGame = () => {
    setScore(0);
    setReviveTrigger(0);
    setGameState('PLAYING');
  };

  const handleRevive = () => {
    setIsWatchingAd(true);
    // Simulate ad watching for 3 seconds
    setTimeout(() => {
      setIsWatchingAd(false);
      setReviveTrigger(prev => prev + 1);
      setGameState('PLAYING');
    }, 3000);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white select-none touch-none">
      {/* Game Canvas */}
      <GameCanvas 
        gameState={gameState} 
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        onAmmoUpdate={handleAmmoUpdate}
        reviveTrigger={reviveTrigger}
        gameSpeed={gameSpeed}
      />

      {/* HUD Overlay */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono">{t.score}</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">{score.toString().padStart(4, '0')}</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono">{t.targetScore}</span>
                <span className="text-sm font-mono text-white/70">1000</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {batteries.map((bat, i) => (
              <div key={bat.id} className={`bg-black/60 backdrop-blur-md border ${bat.active ? 'border-blue-500/30' : 'border-red-500/30'} p-2 rounded-lg flex flex-col items-center min-w-[60px]`}>
                <span className="text-[9px] uppercase tracking-tighter text-white/40 mb-1">{t.ammo} {i+1}</span>
                <div className="flex flex-wrap gap-0.5 justify-center max-w-[40px]">
                  {Array.from({ length: Math.ceil(bat.ammo / 2) }).map((_, idx) => (
                    <div key={idx} className={`w-1 h-2 rounded-full ${bat.active ? 'bg-blue-400' : 'bg-red-900/50'}`} />
                  ))}
                </div>
                <span className={`text-xs font-mono mt-1 ${bat.ammo < 5 ? 'text-red-400 animate-pulse' : 'text-blue-300'}`}>
                  {bat.ammo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Speed Control (Floating when playing) */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{t.gameSpeed}</span>
          <div className="flex gap-1 bg-black/40 backdrop-blur-md border border-white/10 p-1 rounded-xl">
            {[0.5, 1, 1.5, 2].map(speed => (
              <button
                key={speed}
                onClick={() => setGameSpeed(speed)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${gameSpeed === speed ? 'bg-emerald-500 text-black font-bold' : 'text-white/60 hover:text-white'}`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Screens */}
      <AnimatePresence>
        {(gameState !== 'PLAYING' || isWatchingAd) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl text-center"
            >
              {isWatchingAd ? (
                <div className="py-12">
                  <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                  <h2 className="text-2xl font-bold">{t.watchingAd}</h2>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                      {gameState === 'START' ? <Shield className="text-emerald-400 w-8 h-8" /> : 
                       gameState === 'WON' ? <Zap className="text-yellow-400 w-8 h-8" /> : 
                       <Target className="text-red-400 w-8 h-8" />}
                    </div>
                  </div>

                  <h1 className="text-4xl font-bold tracking-tight mb-2">
                    {gameState === 'START' ? t.title : gameState === 'WON' ? t.victory : t.gameOver}
                  </h1>
                  
                  <p className="text-zinc-400 mb-8 leading-relaxed">
                    {gameState === 'START' ? t.instructions : gameState === 'WON' ? t.winMsg : t.lossMsg}
                  </p>

                  {gameState !== 'START' && (
                    <div className="mb-8 p-4 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-xs uppercase tracking-widest text-zinc-500 block mb-1">{t.score}</span>
                      <span className="text-4xl font-bold font-mono text-emerald-400">{score}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={startGame}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                      {gameState === 'START' ? t.start : t.playAgain}
                    </button>

                    {gameState === 'LOST' && (
                      <button 
                        onClick={handleRevive}
                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all active:scale-95 border border-white/5"
                      >
                        {t.revive}
                      </button>
                    )}
                    
                    <button 
                      onClick={toggleLanguage}
                      className="flex items-center justify-center gap-2 py-3 text-zinc-400 hover:text-white transition-colors"
                    >
                      <Languages size={18} />
                      <span>{t.lang}</span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language Toggle (Floating when playing) */}
      {gameState === 'PLAYING' && (
        <button 
          onClick={toggleLanguage}
          className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white/40 hover:text-white transition-all z-40"
        >
          <Languages size={20} />
        </button>
      )}
    </div>
  );
}
