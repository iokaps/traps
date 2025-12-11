import { kmClient } from '@/services/km-client';

export type PlayerView =
	| 'lobby'
	| 'starting'
	| 'category-vote'
	| 'trap-selection'
	| 'question'
	| 'round-results'
	| 'final-results';

export interface PlayerState {
	name: string;
	currentView: PlayerView;

	// Ice trap state: track taps per answer index (0-3)
	iceBreaksPerAnswer: Record<number, number>;

	// Mud trap state: track swipes per answer index (0-3)
	mudSwipesPerAnswer: Record<number, number>;
}

const initialState: PlayerState = {
	name: '',
	currentView: 'lobby',
	iceBreaksPerAnswer: {},
	mudSwipesPerAnswer: {}
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
