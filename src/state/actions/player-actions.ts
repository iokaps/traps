import { kmClient } from '@/services/km-client';
import { globalStore } from '../stores/global-store';
import { playerStore, type PlayerView } from '../stores/player-store';

export const playerActions = {
	async setCurrentView(view: PlayerView) {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = view;
		});
	},

	async setPlayerName(name: string) {
		await kmClient.transact(
			[playerStore, globalStore],
			([playerState, globalState]) => {
				playerState.name = name;
				globalState.players[kmClient.id] = { name, score: 0 };
			}
		);
	},

	// Clear player name (for changing name)
	async clearPlayerName() {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.name = '';
		});
	},

	// Record a tap on ice for a specific answer index
	async recordIceTap(answerIndex: number) {
		await kmClient.transact([playerStore], ([playerState]) => {
			const currentTaps = playerState.iceBreaksPerAnswer[answerIndex] || 0;
			playerState.iceBreaksPerAnswer[answerIndex] = currentTaps + 1;
		});
	},

	// Record a swipe on mud for a specific answer index
	async recordMudSwipe(answerIndex: number) {
		await kmClient.transact([playerStore], ([playerState]) => {
			const currentSwipes = playerState.mudSwipesPerAnswer[answerIndex] || 0;
			playerState.mudSwipesPerAnswer[answerIndex] = currentSwipes + 1;
		});
	},

	// Reset trap state for new round
	async resetTrapState() {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.iceBreaksPerAnswer = {};
			playerState.mudSwipesPerAnswer = {};
		});
	}
};
