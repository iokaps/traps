import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { useServerTimer } from './useServerTime';

const GAME_START_COUNTDOWN = 5000; // 5 seconds countdown before category vote
const CATEGORY_VOTE_TIME = 15000; // 15 seconds
const TRAP_SELECTION_TIME = 30000; // 30 seconds
const TRAP_SELECTION_FINAL_COUNTDOWN = 5000; // 5 seconds when all done
const ROUND_RESULTS_TIME = 5000; // 5 seconds

export function useGlobalController() {
	const {
		controllerConnectionId,
		phase,
		gameStartTimestamp,
		categoryOptions,
		categoryVoteStartTimestamp,
		trapSelectionStartTimestamp,
		trapSelectionAllDoneTimestamp,
		trapSelections,
		currentQuestion,
		playerAnswers,
		players,
		roundResultsStartTimestamp
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const clientIds = connections.clientIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(500);

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		if (connectionIds.has(controllerConnectionId)) {
			return;
		}

		kmClient
			.transact([globalStore], ([globalState]) => {
				const connectionIdsArray = Array.from(connectionIds);
				connectionIdsArray.sort();
				globalState.controllerConnectionId = connectionIdsArray[0] || '';
			})
			.then(() => {})
			.catch(() => {});
	}, [connectionIds, controllerConnectionId]);

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
		}

		// Category Vote Phase - auto-advance after timeout
		if (phase === 'category-vote' && categoryVoteStartTimestamp > 0) {
			const elapsed = serverTime - categoryVoteStartTimestamp;
			if (elapsed >= CATEGORY_VOTE_TIME) {
				globalActions.resolveCategory();
			}
		}

		// Trap Selection Phase
		if (phase === 'trap-selection' && trapSelectionStartTimestamp > 0) {
			// Check if all online players have selected traps
			// Only mark done if there's at least one online player
			const allDone =
				onlinePlayerIds.length > 0 &&
				onlinePlayerIds.every((id) => trapSelections[id] !== undefined);

			const elapsed = serverTime - trapSelectionStartTimestamp;

			if (allDone && trapSelectionAllDoneTimestamp === 0) {
				// All players done, start 5s countdown
				globalActions.markAllTrapSelectionsDone();
			}

			// Check timers
			if (trapSelectionAllDoneTimestamp > 0) {
				// 5s countdown after all done
				const elapsedSinceDone = serverTime - trapSelectionAllDoneTimestamp;
				if (elapsedSinceDone >= TRAP_SELECTION_FINAL_COUNTDOWN) {
					globalActions.startQuestion();
				}
			} else {
				// 30s main timer
				if (elapsed >= TRAP_SELECTION_TIME) {
					globalActions.startQuestion();
				}
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
		trapSelectionStartTimestamp,
		trapSelectionAllDoneTimestamp,
		trapSelections,
		currentQuestion,
		playerAnswers,
		players,
		clientIds,
		roundResultsStartTimestamp
	]);

	return isGlobalController;
}
