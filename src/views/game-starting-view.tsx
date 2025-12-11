import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { globalStore } from '@/state/stores/global-store';
import { KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const GAME_START_COUNTDOWN = 5000; // 5 seconds

export const GameStartingView: React.FC = () => {
	const serverTime = useServerTimer(100);
	const { gameStartTimestamp, currentRound, gameConfig, categoryOptions } =
		useSnapshot(globalStore.proxy);

	const elapsed = serverTime - gameStartTimestamp;
	const remaining = Math.max(0, GAME_START_COUNTDOWN - elapsed);
	const countdownDone = remaining === 0;
	const categoriesReady = categoryOptions.length >= 4;

	// Show generating state if countdown done but categories not ready
	if (countdownDone && !categoriesReady) {
		return (
			<div className="flex w-full max-w-md flex-col items-center gap-6">
				<div className="text-center">
					<h2 className="text-2xl font-bold">{config.gameStartingTitle}</h2>
					<p className="text-gray-600">
						{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
					</p>
				</div>

				<div className="flex h-32 w-32 items-center justify-center rounded-full bg-blue-500 shadow-lg">
					<div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
				</div>

				<p className="text-center text-gray-500">
					{config.generatingCategoriesMessage}
				</p>
			</div>
		);
	}

	return (
		<div className="flex w-full max-w-md flex-col items-center gap-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold">{config.gameStartingTitle}</h2>
				<p className="text-gray-600">
					{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
				</p>
			</div>

			<div className="flex h-32 w-32 items-center justify-center rounded-full bg-blue-500 shadow-lg">
				<KmTimeCountdown
					ms={remaining}
					display="s"
					className="text-6xl font-bold text-white"
				/>
			</div>

			<p className="text-center text-gray-500">{config.getReadyMessage}</p>
		</div>
	);
};
