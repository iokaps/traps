/**
 * Utility functions for trap text effects
 */

/**
 * Scrambles letters in a string while keeping spaces and punctuation in place
 * Uses a seeded random for deterministic results
 */
export function applyMixedLetters(text: string, seed: number): string {
	const letters = text.split('').filter((char) => /[a-zA-Z]/.test(char));

	// Seeded shuffle
	const shuffled = [...letters];
	let currentSeed = seed;

	for (let i = shuffled.length - 1; i > 0; i--) {
		currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
		const j = currentSeed % (i + 1);
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	// Replace letters in original string
	let letterIndex = 0;
	return text
		.split('')
		.map((char) => {
			if (/[a-zA-Z]/.test(char)) {
				return shuffled[letterIndex++];
			}
			return char;
		})
		.join('');
}

/**
 * Replaces ~40% of letters with underscores
 * Uses a seeded random for deterministic results
 */
export function applyMissingLetters(text: string, seed: number): string {
	let currentSeed = seed;

	return text
		.split('')
		.map((char) => {
			if (/[a-zA-Z]/.test(char)) {
				currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
				const shouldHide = currentSeed % 100 < 40;
				return shouldHide ? '_' : char;
			}
			return char;
		})
		.join('');
}
