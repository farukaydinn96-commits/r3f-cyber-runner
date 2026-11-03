import { create } from 'zustand';
import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager';

export type StageType = 1 | 2 | 3;
export type PowerUpType = 'JUGGERNAUT' | 'MAGNET' | 'DOUBLE_SCORE' | 'SLOW_MO' | null;
export type DragonId = 'IGNIS' | 'FROSTY' | 'JADE' | 'NEBULA' | 'AURELIUS';

// Yaklaşık 5 dakikalık aktif oynanış = 2500 XP (1 Level)
export const XP_PER_LEVEL = 2500;

export const DRAGON_UNLOCK_LEVELS: Record<DragonId, number> = {
  IGNIS: 1,
  FROSTY: 2,
  JADE: 3,
  NEBULA: 4,
  AURELIUS: 5,
};

interface GameState {
  status: 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
  stage: StageType;
  score: number;
  highScore: number;
  xp: number;
  level: number;
  selectedDragon: DragonId;
  isNewRecord: boolean;
  combo: number;
  hasShield: boolean;
  shieldCharge: number;
  activePowerUp: PowerUpType;
  powerUpTimeLeft: number;
  speed: number;
  shakeIntensity: number;
  floatingText: string | null;
  floatingTextTimer: number;
  isMuted: boolean;
  explosionPos: THREE.Vector3 | null;
  explosionColor: string;
  selectStage: (stage: StageType) => void;
  selectDragon: (dragon: DragonId) => void;
  gainXp: (amount: number) => void;
  togglePause: () => void;
  toggleSound: () => void;
  startGame: () => void;
  endGame: (crashPosition: THREE.Vector3) => void;
  shatterObstacle: (obsPosition: THREE.Vector3, keepShield?: boolean) => void;
  triggerCloseCall: () => void;
  activatePowerUp: (type: Exclude<PowerUpType, null>, pos: THREE.Vector3) => void;
  updateTimers: (delta: number) => void;
  addScore: (points: number) => void;
  collectCoin: (coinPos: THREE.Vector3) => void;
  increaseSpeed: (delta: number) => void;
}

const savedHighScore = Number(localStorage.getItem('cyber_runner_high_score') || 0);
const savedXp = Number(localStorage.getItem('cyber_runner_xp_v2') || 0);
const savedDragon = (localStorage.getItem('cyber_runner_dragon_v2') as DragonId) || 'IGNIS';

const calcLevel = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

export const useGameStore = create<GameState>((set, get) => ({
  status: 'MENU',
  stage: 1,
  score: 0,
  highScore: savedHighScore,
  xp: savedXp,
  level: calcLevel(savedXp),
  selectedDragon: savedDragon,
  isNewRecord: false,
  combo: 1,
  hasShield: true,
  shieldCharge: 3,
  activePowerUp: null,
  powerUpTimeLeft: 0,
  speed: 15,
  shakeIntensity: 0,
  floatingText: null,
  floatingTextTimer: 0,
  isMuted: false,
  explosionPos: null,
  explosionColor: '#ff2a6d',

  selectStage: (stage) => {
    soundManager.playJump();
    set({ stage });
  },

  selectDragon: (dragon) => {
    const { level } = get();
    if (level >= DRAGON_UNLOCK_LEVELS[dragon]) {
      soundManager.playJump();
      localStorage.setItem('cyber_runner_dragon_v2', dragon);
      set({ selectedDragon: dragon });
    }
  },

  gainXp: (amount) => {
    const { xp, level } = get();
    const newXp = xp + amount;
    const newLevel = calcLevel(newXp);
    localStorage.setItem('cyber_runner_xp_v2', String(newXp));

    if (newLevel > level) {
      soundManager.playHighScoreFanfare();
      set({
        xp: newXp,
        level: newLevel,
        floatingText: `⭐ LEVEL ${newLevel} AÇILDI!`,
        floatingTextTimer: 2.2,
      });
    } else {
      set({ xp: newXp });
    }
  },

  togglePause: () => {
    const { status } = get();
    if (status === 'PLAYING') {
      soundManager.stopBGM();
      set({ status: 'PAUSED' });
    } else if (status === 'PAUSED') {
      soundManager.startBGM();
      set({ status: 'PLAYING' });
    }
  },

  toggleSound: () => {
    const muted = soundManager.toggleMute();
    if (!muted && get().status === 'PLAYING') {
      soundManager.startBGM();
    }
    set({ isMuted: muted });
  },

  startGame: () => {
    soundManager.playJump();
    soundManager.startBGM();
    set({
      status: 'PLAYING',
      score: 0,
      isNewRecord: false,
      combo: 1,
      hasShield: true,
      shieldCharge: 3,
      activePowerUp: null,
      powerUpTimeLeft: 0,
      speed: 15,
      shakeIntensity: 0,
      floatingText: null,
      floatingTextTimer: 0,
      explosionPos: null,
    });
  },

  endGame: (crashPosition) => {
    const { status, score, highScore } = get();
    if (status === 'GAMEOVER') return;

    const brokeRecord = score > highScore;
    const newHigh = Math.max(score, highScore);
    localStorage.setItem('cyber_runner_high_score', String(newHigh));

    if (brokeRecord && score > 0) {
      soundManager.playHighScoreFanfare();
    } else {
      soundManager.playCrash();
    }

    set({
      status: 'GAMEOVER',
      speed: 0,
      highScore: newHigh,
      isNewRecord: brokeRecord && score > 0,
      activePowerUp: null,
      powerUpTimeLeft: 0,
      shakeIntensity: 0.75,
      explosionPos: crashPosition.clone(),
      explosionColor: '#ff4500',
    });
  },

  // Dengelenmiş XP Kazanımları (5 Dakika = ~2500 XP)
  shatterObstacle: (obsPosition, keepShield = false) => {
    const { activePowerUp, gainXp } = get();
    const mult = activePowerUp === 'DOUBLE_SCORE' ? 2 : 1;
    soundManager.playShieldBreak();
    gainXp(10 * mult); // Engel parçalama: +10 XP

    set((state) => ({
      hasShield: keepShield ? state.hasShield : false,
      shieldCharge: keepShield ? state.shieldCharge : 0,
      score: state.score + 50 * mult,
      floatingText: `💥 PARÇALANDI +${50 * mult}`,
      floatingTextTimer: 0.9,
      shakeIntensity: 0.45,
      explosionPos: obsPosition.clone(),
      explosionColor: keepShield ? '#ff2a00' : '#38bdf8',
    }));
  },

  triggerCloseCall: () => {
    const { activePowerUp, gainXp } = get();
    const mult = activePowerUp === 'DOUBLE_SCORE' ? 2 : 1;
    soundManager.playCloseCall();
    gainXp(6 * mult); // Kıl payı geçiş: +6 XP

    set((state) => ({
      score: state.score + 35 * mult,
      floatingText: `⚡ KIL PAYI +${35 * mult}`,
      floatingTextTimer: 0.9,
    }));
  },

  activatePowerUp: (type, pos) => {
    soundManager.playHighScoreFanfare();
    get().gainXp(15); // Bonus taşı alma: +15 XP
    set({
      activePowerUp: type,
      powerUpTimeLeft: 5.0,
      shakeIntensity: 0.35,
      explosionPos: pos.clone(),
      explosionColor:
        type === 'JUGGERNAUT'
          ? '#ff2a00'
          : type === 'MAGNET'
          ? '#a855f7'
          : type === 'SLOW_MO'
          ? '#38bdf8'
          : '#10b981',
    });
  },

  updateTimers: (delta) =>
    set((state) => {
      const nextShake = Math.max(0, state.shakeIntensity - delta * 2.2);
      const nextFloatTimer = Math.max(0, state.floatingTextTimer - delta);
      const nextPowerTime = Math.max(0, state.powerUpTimeLeft - delta);

      return {
        shakeIntensity: nextShake,
        floatingTextTimer: nextFloatTimer,
        floatingText: nextFloatTimer === 0 ? null : state.floatingText,
        powerUpTimeLeft: nextPowerTime,
        activePowerUp: nextPowerTime === 0 ? null : state.activePowerUp,
      };
    }),

  addScore: (points) => {
    get().gainXp(2); // Normal engel geçme: +2 XP
    set((state) => {
      const mult = state.activePowerUp === 'DOUBLE_SCORE' ? 2 : 1;
      return { score: state.score + points * mult };
    });
  },

  collectCoin: (coinPos) => {
    const { combo, hasShield, shieldCharge, activePowerUp, gainXp } = get();
    const nextCombo = combo + 1;
    const nextCharge = hasShield ? 3 : Math.min(3, shieldCharge + 1);
    const shieldNowReady = nextCharge >= 3;
    const mult = activePowerUp === 'DOUBLE_SCORE' ? 2 : 1;

    gainXp(8 * mult); // Kristal toplama: +8 XP
    soundManager.playCoin(nextCombo);

    set((state) => ({
      combo: nextCombo,
      hasShield: shieldNowReady,
      shieldCharge: nextCharge,
      score: state.score + 25 * state.combo * mult,
      shakeIntensity: 0.12,
      explosionPos: coinPos.clone(),
      explosionColor: '#fbbf24',
    }));
  },

  increaseSpeed: (delta) =>
    set((state) => ({ speed: Math.min(state.speed + delta * 0.55, 36) })),
}));