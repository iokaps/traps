import { kmClient } from '@/services/km-client';

export type GamePhase =
	| 'lobby'
	| 'starting'
	| 'category-vote'
	| 'trap-selection'
	| 'question'
	| 'round-results'
	| 'final-results';

export type TrapType = 'ice' | 'mud' | 'mixed' | 'missing';

export interface TrapInfo {
	trapType: TrapType;
	fromPlayerId: string;
}

export interface PlayerInfo {
	name: string;
	score: number;
}

export interface PlayerAnswer {
	answerIndex: number;
	timestamp: number;
	isCorrect: boolean;
	pointsEarned: number;
}

export interface CurrentQuestion {
	question: string;
	answers: string[];
	correctIndex: number;
	startTimestamp: number;
	endTimestamp: number;
}

export interface GameConfig {
	totalRounds: number;
	questionTimeSeconds: number;
}

export interface GlobalState {
	controllerConnectionId: string;

	// Game configuration
	gameConfig: GameConfig;

	// Game state
	phase: GamePhase;
	currentRound: number;

	// AI generation locks (prevent race conditions)
	isGeneratingCategories: boolean;
	isGeneratingQuestion: boolean;

	// Players
	players: Record<string, PlayerInfo>;

	// Category voting
	categoryOptions: string[];
	categoryVotes: Record<string, string>; // clientId -> voted category
	selectedCategory: string;

	// Trap selection
	trapSelections: Record<string, { trapType: TrapType; targetId: string }>; // clientId -> trap selection
	activeTraps: Record<string, TrapInfo[]>; // targetId -> array of traps received

	// Trap selection timing
	trapSelectionStartTimestamp: number;

	// Current question
	currentQuestion: CurrentQuestion | null;

	// Player answers for current round
	playerAnswers: Record<string, PlayerAnswer>; // clientId -> answer info

	// Game start timing (countdown before category vote)
	gameStartTimestamp: number;

	// Category vote timing
	categoryVoteStartTimestamp: number;

	// Round results timing
	roundResultsStartTimestamp: number;
}

const initialState: GlobalState = {
	controllerConnectionId: '',

	gameConfig: {
		totalRounds: 10,
		questionTimeSeconds: 15
	},

	phase: 'lobby',
	currentRound: 0,

	isGeneratingCategories: false,
	isGeneratingQuestion: false,

	players: {},

	categoryOptions: [],
	categoryVotes: {},
	selectedCategory: '',

	trapSelections: {},
	activeTraps: {},
	trapSelectionStartTimestamp: 0,

	currentQuestion: null,
	playerAnswers: {},

	gameStartTimestamp: 0,
	categoryVoteStartTimestamp: 0,
	roundResultsStartTimestamp: 0
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
