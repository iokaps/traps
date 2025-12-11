import { config } from '@/config';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import {
	KmConfettiProvider,
	KmPodiumTable,
	useKmConfettiContext
} from '@kokimoki/shared';
import { Trophy } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const FinalResultsContent: React.FC = () => {
	const { playSound } = useSoundEffects();
	const { players } = useSnapshot(globalStore.proxy);
	const confetti = useKmConfettiContext();

	// Sort players by score
	const sortedPlayers = React.useMemo(() => {
		return Object.entries(players)
			.map(([clientId, info]) => ({
				clientId,
				name: info.name,
				score: info.score
			}))
			.sort((a, b) => b.score - a.score);
	}, [players]);

	// Trigger confetti and game over sound on mount
	React.useEffect(() => {
		confetti?.triggerConfetti({ preset: 'massive' });
		playSound('gameOver', 0.6);
	}, [confetti, playSound]);

	const winner = sortedPlayers[0];
	const isWinner = winner?.clientId === kmClient.id;

	// Prepare podium data - only include players that exist
	const podiumEntries = sortedPlayers
		.slice(0, 3)
		.filter((player) => player && player.name)
		.map((player) => ({
			id: player.clientId,
			name: player.name,
			points: player.score ?? 0
		}));

	const handlePlayAgain = async () => {
		await globalActions.resetToLobby();
	};

	return (
		<div className="flex w-full max-w-md flex-col gap-6">
			{/* Header */}
			<div className="text-center">
				<h2 className="text-3xl font-bold">{config.finalResultsTitle}</h2>
				{winner && (
					<div className="mt-2 flex items-center justify-center gap-2">
						<Trophy className="h-6 w-6 text-yellow-500" />
						<span className="text-xl">
							{config.winnerLabel}:{' '}
							<span className="font-bold">{winner.name}</span>
						</span>
					</div>
				)}
			</div>

			{/* Winner celebration if current player won */}
			{isWinner && (
				<div className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 p-6 text-center text-white shadow-lg">
					<Trophy className="mx-auto mb-2 h-16 w-16" />
					<p className="text-2xl font-bold">🎉 You Won! 🎉</p>
				</div>
			)}

			{/* Podium */}
			<div className="rounded-xl bg-white p-4 shadow-md">
				<KmPodiumTable entries={podiumEntries} />
			</div>

			{/* Full Scores */}
			<div className="rounded-xl bg-white p-4 shadow-md">
				<h3 className="mb-3 font-bold">{config.finalScoresLabel}</h3>
				<div className="flex flex-col gap-2">
					{sortedPlayers.map((player, index) => (
						<div
							key={player.clientId}
							className={cn(
								'flex items-center justify-between rounded-lg p-2',
								player.clientId === kmClient.id && 'bg-blue-50'
							)}
						>
							<div className="flex items-center gap-2">
								<span
									className={cn(
										'flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold',
										index === 0 && 'bg-yellow-400 text-yellow-900',
										index === 1 && 'bg-gray-300 text-gray-700',
										index === 2 && 'bg-amber-600 text-amber-100',
										index > 2 && 'bg-gray-100 text-gray-600'
									)}
								>
									{index + 1}
								</span>
								<span className="font-medium">{player.name}</span>
							</div>
							<span className="font-bold">{player.score}</span>
						</div>
					))}
				</div>
			</div>

			{/* Play Again Button */}
			<button
				onClick={handlePlayAgain}
				className="rounded-xl bg-blue-500 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-600"
			>
				{config.playAgainButton}
			</button>
		</div>
	);
};

export const FinalResultsView: React.FC = () => {
	return (
		<KmConfettiProvider>
			<FinalResultsContent />
		</KmConfettiProvider>
	);
};
