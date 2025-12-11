import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import {
	globalStore,
	type GameConfig,
	type TrapType
} from '../stores/global-store';

interface GeneratedQuestion {
	question: string;
	answers: string[];
	correctIndex: number;
}

export const globalActions = {
	// Set game configuration (host only)
	async setGameConfig(gameConfig: GameConfig) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.gameConfig = gameConfig;
		});
	},

	// Start game from lobby - shows countdown while generating categories
	async startGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.phase = 'starting';
			globalState.currentRound = 1;
			globalState.gameStartTimestamp = kmClient.serverTimestamp();
			globalState.categoryOptions = []; // Clear any old categories
			globalState.categoryVotes = {};
			globalState.selectedCategory = '';
			globalState.trapSelections = {};
			globalState.activeTraps = {};
			globalState.trapSelectionStartTimestamp = 0; // Clear old timestamps
			globalState.trapSelectionAllDoneTimestamp = 0;
			globalState.currentQuestion = null;
			globalState.playerAnswers = {};
			globalState.isGeneratingQuestion = false; // Reset generation lock
			globalState.isGeneratingCategories = false; // Reset category generation lock
		});

		// Generate categories in background (controller will transition when ready)
		globalActions.generateCategories();
	},

	// Category pool - pick 4 random categories each round for variety
	CATEGORY_POOL: [
		'World Geography',
		'Classic Movies',
		'Science & Nature',
		'Sports History',
		'Pop Music',
		'Ancient History',
		'Food & Cooking',
		'Technology',
		'Literature',
		'Space Exploration',
		'World Cultures',
		'Famous Inventions',
		'Animals',
		'Art & Artists',
		'Television Shows',
		'Mythology',
		'Olympics',
		'Video Games',
		'World Capitals',
		'Ocean Life',
		'Famous Scientists',
		'Musical Instruments',
		'World Languages',
		'Dinosaurs',
		'Weather & Climate',
		'Famous Buildings',
		'Board Games',
		'Superheroes',
		'National Parks',
		'Desserts & Sweets'
	],

	// Generate 4 random category options (instant, no AI)
	async generateCategories() {
		const state = globalStore.proxy;

		// Guard: prevent multiple clients from generating simultaneously
		if (
			state.phase !== 'starting' ||
			state.categoryOptions.length >= 4 ||
			state.isGeneratingCategories
		) {
			return;
		}

		// Try to acquire lock atomically
		let acquired = false;
		await kmClient.transact([globalStore], ([globalState]) => {
			if (
				globalState.phase === 'starting' &&
				globalState.categoryOptions.length < 4 &&
				!globalState.isGeneratingCategories
			) {
				globalState.isGeneratingCategories = true;
				acquired = true;
			}
		});

		if (!acquired) {
			return;
		}

		// Shuffle and pick 4 random categories
		const shuffled = [...globalActions.CATEGORY_POOL].sort(
			() => Math.random() - 0.5
		);
		const categories = shuffled.slice(0, 4);

		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.categoryOptions = categories;
			globalState.categoryVotes = {};
			globalState.isGeneratingCategories = false;
		});
	},

	// Transition from starting to category-vote (called by controller)
	async transitionToCategoryVote() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.phase = 'category-vote';
			globalState.categoryVoteStartTimestamp = kmClient.serverTimestamp();
		});
	},

	// Submit a category vote
	async submitCategoryVote(category: string) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.categoryVotes[kmClient.id] = category;
		});
	},

	// Resolve category voting and move to trap selection
	async resolveCategory() {
		const state = globalStore.proxy;
		const votes = state.categoryVotes;
		const options = state.categoryOptions;

		// Count votes per category
		const voteCounts: Record<string, number> = {};
		options.forEach((opt) => (voteCounts[opt] = 0));

		Object.values(votes).forEach((votedCategory) => {
			if (voteCounts[votedCategory] !== undefined) {
				voteCounts[votedCategory]++;
			}
		});

		// Find max votes
		let maxVotes = 0;
		const topCategories: string[] = [];

		options.forEach((opt) => {
			if (voteCounts[opt] > maxVotes) {
				maxVotes = voteCounts[opt];
				topCategories.length = 0;
				topCategories.push(opt);
			} else if (voteCounts[opt] === maxVotes) {
				topCategories.push(opt);
			}
		});

		// Pick randomly from tied categories
		const selected =
			topCategories[Math.floor(Math.random() * topCategories.length)];

		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.selectedCategory = selected;
			globalState.phase = 'trap-selection';
			globalState.trapSelections = {};
			globalState.activeTraps = {};
			globalState.trapSelectionStartTimestamp = kmClient.serverTimestamp();
			globalState.trapSelectionAllDoneTimestamp = 0;
			globalState.currentQuestion = null;
			globalState.isGeneratingQuestion = false; // Reset lock for new round
		});
	},

	// Assign a trap from one player to another
	async assignTrap(trapType: TrapType, targetId: string) {
		await kmClient.transact([globalStore], ([globalState]) => {
			// Record this player's trap selection
			globalState.trapSelections[kmClient.id] = {
				trapType,
				targetId
			};

			// Add trap to target's active traps
			if (!globalState.activeTraps[targetId]) {
				globalState.activeTraps[targetId] = [];
			}

			globalState.activeTraps[targetId].push({
				trapType,
				fromPlayerId: kmClient.id
			});
		});
	},

	// Mark that all players have finished trap selection, start 5s countdown
	async markAllTrapSelectionsDone() {
		await kmClient.transact([globalStore], ([globalState]) => {
			if (globalState.trapSelectionAllDoneTimestamp === 0) {
				globalState.trapSelectionAllDoneTimestamp = kmClient.serverTimestamp();
			}
		});
	},

	// Generate question for selected category and start question phase
	async startQuestion() {
		const state = globalStore.proxy;

		// Guard: if phase already changed, skip
		if (state.phase !== 'trap-selection') {
			return;
		}

		// Guard: if already generating, skip
		if (state.isGeneratingQuestion) {
			return;
		}

		// Try to acquire generation lock atomically
		// Also clear any stale question from previous sessions
		let acquired = false;
		await kmClient.transact([globalStore], ([globalState]) => {
			if (
				globalState.phase === 'trap-selection' &&
				!globalState.isGeneratingQuestion
			) {
				// Clear stale question if any exists from previous session
				globalState.currentQuestion = null;
				globalState.isGeneratingQuestion = true;
				acquired = true;
			}
		});

		if (!acquired) {
			return;
		}

		const category = state.selectedCategory;
		const questionTime = state.gameConfig.questionTimeSeconds;

		try {
			const question = await kmClient.ai.generateJson<GeneratedQuestion>({
				model: 'gpt-4o',
				systemPrompt: config.questionGenerationPrompt,
				userPrompt: `Generate a trivia question about: ${category}`,
				temperature: 0.7
			});

			const startTimestamp = kmClient.serverTimestamp();

			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.currentQuestion = {
					question: question.question,
					answers: question.answers,
					correctIndex: question.correctIndex,
					startTimestamp,
					endTimestamp: startTimestamp + questionTime * 1000
				};
				globalState.playerAnswers = {};
				globalState.phase = 'question';
				globalState.isGeneratingQuestion = false;
			});
		} catch (error) {
			console.error('Question generation failed:', error);
			// Release lock on error
			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.isGeneratingQuestion = false;
			});
		}
	},

	// Submit an answer
	async submitAnswer(answerIndex: number) {
		const state = globalStore.proxy;
		const question = state.currentQuestion;

		if (!question) return;

		const timestamp = kmClient.serverTimestamp();
		const isCorrect = answerIndex === question.correctIndex;

		// Calculate points based on speed
		const timeToAnswer = timestamp - question.startTimestamp;
		const maxTime = question.endTimestamp - question.startTimestamp;
		const speedRatio = Math.max(0, 1 - timeToAnswer / maxTime);
		const speedBonus = Math.floor(speedRatio * 900);
		const pointsEarned = isCorrect ? 100 + speedBonus : 0;

		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.playerAnswers[kmClient.id] = {
				answerIndex,
				timestamp,
				isCorrect,
				pointsEarned
			};
		});
	},

	// End question early (when all players answered)
	async endQuestionEarly() {
		await kmClient.transact([globalStore], ([globalState]) => {
			if (globalState.currentQuestion) {
				globalState.currentQuestion.endTimestamp = kmClient.serverTimestamp();
			}
		});
	},

	// Calculate and apply round scores, move to results
	async showRoundResults() {
		await kmClient.transact([globalStore], ([globalState]) => {
			// Update player scores
			Object.entries(globalState.playerAnswers).forEach(
				([clientId, answer]) => {
					if (globalState.players[clientId]) {
						globalState.players[clientId].score += answer.pointsEarned;
					}
				}
			);

			globalState.phase = 'round-results';
			globalState.roundResultsStartTimestamp = kmClient.serverTimestamp();
		});
	},

	// Advance to next round or final results
	async nextRound() {
		const state = globalStore.proxy;
		const currentRound = state.currentRound;
		const totalRounds = state.gameConfig.totalRounds;

		if (currentRound >= totalRounds) {
			// Game over
			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.phase = 'final-results';
			});
		} else {
			// Next round - go to starting phase (shows "Get Ready!" + generates categories)
			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.currentRound = currentRound + 1;
				globalState.phase = 'starting';
				globalState.gameStartTimestamp = kmClient.serverTimestamp();
				globalState.categoryOptions = [];
				globalState.categoryVotes = {};
				globalState.selectedCategory = '';
				globalState.currentQuestion = null;
				globalState.playerAnswers = {};
				globalState.trapSelections = {};
				globalState.activeTraps = {};
			});

			// Generate new categories in background
			globalActions.generateCategories();
		}
	},

	// Reset game to lobby
	async resetToLobby() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.phase = 'lobby';
			globalState.currentRound = 0;
			globalState.categoryOptions = [];
			globalState.categoryVotes = {};
			globalState.selectedCategory = '';
			globalState.trapSelections = {};
			globalState.activeTraps = {};
			globalState.trapSelectionStartTimestamp = 0;
			globalState.trapSelectionAllDoneTimestamp = 0;
			globalState.currentQuestion = null;
			globalState.playerAnswers = {};
			globalState.categoryVoteStartTimestamp = 0;
			globalState.roundResultsStartTimestamp = 0;
			globalState.isGeneratingCategories = false; // Reset category generation lock
			globalState.isGeneratingQuestion = false; // Reset question generation lock

			// Reset player scores but keep names
			Object.keys(globalState.players).forEach((clientId) => {
				globalState.players[clientId].score = 0;
			});
		});
	}
};
