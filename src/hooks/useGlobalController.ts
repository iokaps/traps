import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { useServerTimer } from './useServerTime';

const GAME_START_COUNTDOWN = 5000; // 5 seconds countdown before category vote
const CATEGORY_VOTE_TIME = 15000; // 15 seconds
const CATEGORY_RESULT_TIME = 3000; // 3 seconds to show winning category
const TRAP_SELECTION_TIME = 20000; // 20 seconds
const ROUND_RESULTS_TIME = 5000; // 5 seconds

const HEARTBEAT_INTERVAL = 3000; // Write heartbeat every 3 seconds
const HEARTBEAT_TIMEOUT = 8000; // Consider controller stale after 8 seconds
const CATEGORY_GENERATION_TIMEOUT = 5000; // Categories should be instant
const QUESTION_GENERATION_TIMEOUT = 30000; // AI question generation timeout

export function useGlobalController() {
	const {
		controllerConnectionId,
		controllerHeartbeat,
		phase,
		gameStartTimestamp,
		categoryOptions,
		categoryVoteStartTimestamp,
		categoryResultStartTimestamp,
		trapSelectionStartTimestamp,
		trapSelections,
		currentQuestion,
		playerAnswers,
		players,
		roundResultsStartTimestamp,
		isGeneratingCategories,
		isGeneratingQuestion
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const clientIds = connections.clientIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(500);
	const lastHeartbeatRef = useRef(0);

	// Elect a global controller — handle disconnects AND stale (backgrounded) controllers
	useEffect(() => {
		const isActivePhase = phase !== 'lobby' && phase !== 'final-results';

		const controllerConnected = connectionIds.has(controllerConnectionId);

		// Check if controller is stale (connected but not sending heartbeats)
		const isStale =
			controllerConnected &&
			isActivePhase &&
			controllerHeartbeat > 0 &&
			serverTime - controllerHeartbeat > HEARTBEAT_TIMEOUT;

		if (controllerConnected && !isStale) {
			return; // Controller is alive and responsive
		}

		// Re-elect: pick the first sorted connectionId, excluding the stale one
		const candidates = Array.from(connectionIds)
			.filter((id) => !isStale || id !== controllerConnectionId)
			.sort();

		const newController = candidates[0] || '';

		if (newController === controllerConnectionId) {
			return; // No better candidate available
		}

		kmClient
			.transact([globalStore], ([globalState]) => {
				globalState.controllerConnectionId = newController;
				globalState.controllerHeartbeat = kmClient.serverTimestamp();
			})
			.then(() => {})
			.catch(() => {});
	}, [
		connectionIds,
		controllerConnectionId,
		controllerHeartbeat,
		serverTime,
		phase
	]);

	// Heartbeat writer — controller proves it's active during game phases
	useEffect(() => {
		if (!isGlobalController) {
			return;
		}

		const isActivePhase = phase !== 'lobby' && phase !== 'final-results';

		if (!isActivePhase) {
			return;
		}

		// Throttle: only write heartbeat every HEARTBEAT_INTERVAL
		if (serverTime - lastHeartbeatRef.current < HEARTBEAT_INTERVAL) {
			return;
		}

		lastHeartbeatRef.current = serverTime;

		kmClient
			.transact([globalStore], ([globalState]) => {
				globalState.controllerHeartbeat = kmClient.serverTimestamp();
			})
			.then(() => {})
			.catch(() => {});
	}, [isGlobalController, serverTime, phase]);

	// Recovery logic — when becoming the new controller, recover stuck states
	const wasControllerRef = useRef(false);
	useEffect(() => {
		if (!isGlobalController) {
			wasControllerRef.current = false;
			return;
		}

		// Only run recovery on takeover (transition from non-controller to controller)
		if (wasControllerRef.current) {
			return;
		}
		wasControllerRef.current = true;

		// Recovery: stuck category generation
		if (phase === 'starting') {
			if (isGeneratingCategories) {
				// Lock has been held — reset and retry
				globalActions.resetGenerationLocks().then(() => {
					globalActions.generateCategories();
				});
			} else if (categoryOptions.length < 4) {
				// Not generating and categories not ready — retry
				globalActions.generateCategories();
			}
		}

		// Recovery: stuck question generation
		if (phase === 'trap-selection' && trapSelectionStartTimestamp > 0) {
			const elapsed = serverTime - trapSelectionStartTimestamp;

			if (elapsed >= TRAP_SELECTION_TIME && !currentQuestion) {
				if (isGeneratingQuestion) {
					// Lock stuck — reset and retry
					globalActions.resetGenerationLocks().then(() => {
						globalActions.startQuestion();
					});
				} else {
					// Not generating and timer expired — retry
					globalActions.startQuestion();
				}
			}
		}
	}, [
		isGlobalController,
		phase,
		isGeneratingCategories,
		isGeneratingQuestion,
		categoryOptions,
		currentQuestion,
		trapSelectionStartTimestamp,
		serverTime
	]);

	// Global controller-specific logic
	useEffect(() => {
		if (!isGlobalController) {
			return;
		}

		// Get online players (those who have registered)
		const onlinePlayerIds = Object.keys(players).filter((id) =>
			clientIds.has(id)
		);

		// Starting Phase - wait for countdown AND categories to be ready
		if (phase === 'starting' && gameStartTimestamp > 0) {
			const elapsed = serverTime - gameStartTimestamp;
			const countdownDone = elapsed >= GAME_START_COUNTDOWN;
			const categoriesReady = categoryOptions.length >= 4;

			if (countdownDone && categoriesReady) {
				globalActions.transitionToCategoryVote();
			}

			// Recovery: categories stuck with lock held too long
			if (
				isGeneratingCategories &&
				elapsed > GAME_START_COUNTDOWN + CATEGORY_GENERATION_TIMEOUT
			) {
				globalActions.resetGenerationLocks().then(() => {
					globalActions.generateCategories();
				});
			}
		}

		// Category Vote Phase - auto-advance after timeout
		if (phase === 'category-vote' && categoryVoteStartTimestamp > 0) {
			const elapsed = serverTime - categoryVoteStartTimestamp;
			if (elapsed >= CATEGORY_VOTE_TIME) {
				globalActions.resolveCategory();
			}
		}

		// Category Result Phase - auto-advance to trap selection after brief display
		if (phase === 'category-result' && categoryResultStartTimestamp > 0) {
			const elapsed = serverTime - categoryResultStartTimestamp;
			if (elapsed >= CATEGORY_RESULT_TIME) {
				globalActions.transitionToTrapSelection();
			}
		}

		// Trap Selection Phase - always wait for full timer to give AI time to generate question
		if (phase === 'trap-selection' && trapSelectionStartTimestamp > 0) {
			const elapsed = serverTime - trapSelectionStartTimestamp;

			if (elapsed >= TRAP_SELECTION_TIME) {
				// Timer expired, start question
				globalActions.startQuestion();
			}

			// Recovery: question generation stuck with lock held too long
			if (
				isGeneratingQuestion &&
				elapsed > TRAP_SELECTION_TIME + QUESTION_GENERATION_TIMEOUT
			) {
				globalActions.resetGenerationLocks().then(() => {
					globalActions.startQuestion();
				});
			}
		}

		// Question Phase - check if all answered or timer expired
		if (phase === 'question' && currentQuestion) {
			const allAnswered =
				onlinePlayerIds.length > 0 &&
				onlinePlayerIds.every((id) => playerAnswers[id] !== undefined);

			if (allAnswered && serverTime < currentQuestion.endTimestamp) {
				// All answered early
				globalActions.endQuestionEarly();
			}

			if (serverTime >= currentQuestion.endTimestamp) {
				// Time's up
				globalActions.showRoundResults();
			}
		}

		// Round Results Phase - auto-advance after timeout
		if (phase === 'round-results' && roundResultsStartTimestamp > 0) {
			const elapsed = serverTime - roundResultsStartTimestamp;
			if (elapsed >= ROUND_RESULTS_TIME) {
				globalActions.nextRound();
			}
		}
	}, [
		isGlobalController,
		serverTime,
		phase,
		gameStartTimestamp,
		categoryOptions,
		categoryVoteStartTimestamp,
		categoryResultStartTimestamp,
		trapSelectionStartTimestamp,
		trapSelections,
		currentQuestion,
		playerAnswers,
		players,
		clientIds,
		roundResultsStartTimestamp,
		isGeneratingCategories,
		isGeneratingQuestion
	]);

	return isGlobalController;
}
