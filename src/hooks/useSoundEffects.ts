import { useCallback, useRef } from 'react';

// Sound effect URLs - using placeholder paths
// To add actual sounds, place mp3/ogg files in public/sounds/
const SOUNDS = {
	// Trap sounds
	iceBreak: '/sounds/ice-break.mp3',
	mudClear: '/sounds/mud-clear.mp3',
	trapThrow: '/sounds/trap-throw.mp3',

	// Answer sounds
	correct: '/sounds/correct.mp3',
	incorrect: '/sounds/incorrect.mp3',

	// Timer sounds
	tick: '/sounds/tick.mp3',
	timerWarning: '/sounds/timer-warning.mp3',

	// Game phase sounds
	roundStart: '/sounds/round-start.mp3',
	roundEnd: '/sounds/round-end.mp3',
	gameOver: '/sounds/game-over.mp3',

	// UI sounds
	buttonClick: '/sounds/button-click.mp3',
	vote: '/sounds/vote.mp3'
} as const;

export type SoundEffect = keyof typeof SOUNDS;

/**
 * Hook for playing one-shot sound effects
 * Sound files should be placed in public/sounds/
 */
export function useSoundEffects() {
	const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

	const playSound = useCallback((sound: SoundEffect, volume = 0.5) => {
		const url = SOUNDS[sound];
		if (!url) return;

		try {
			// Check cache first
			let audio = audioCache.current.get(url);

			if (!audio) {
				audio = new Audio(url);
				audioCache.current.set(url, audio);
			}

			// Reset and play
			audio.currentTime = 0;
			audio.volume = Math.max(0, Math.min(1, volume));
			audio.play().catch(() => {
				// Ignore autoplay errors - user may not have interacted yet
			});
		} catch {
			// Ignore errors for missing sounds during development
		}
	}, []);

	const preloadSounds = useCallback((sounds: SoundEffect[]) => {
		sounds.forEach((sound) => {
			const url = SOUNDS[sound];
			if (!url || audioCache.current.has(url)) return;

			// Create audio with src to avoid empty src warnings
			const audio = new Audio(url);
			audio.preload = 'auto';
			audioCache.current.set(url, audio);
		});
	}, []);

	return { playSound, preloadSounds, SOUNDS };
}
