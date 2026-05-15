import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { Check, X } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const LeaderboardRow: React.FC<{
	player: {
		clientId: string;
		name: string;
		score: number;
		roundPoints: number;
	};
	index: number;
	isCurrentPlayer: boolean;
}> = React.memo(({ player, index, isCurrentPlayer }) => (
	<div
		className={cn(
			'flex items-center justify-between rounded-xl p-2',
			isCurrentPlayer && 'bg-primary/10 ring-primary/20 ring-1'
		)}
	>
		<div className="flex items-center gap-2">
			<span
				className={cn(
					'flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold',
					index === 0 && 'bg-warning text-yellow-900',
					index === 1 && 'bg-gray-300 text-gray-700',
					index === 2 && 'bg-amber-600 text-amber-100',
					index > 2 && 'bg-gray-100 text-gray-600'
				)}
			>
				{index + 1}
			</span>
			<span className="font-medium">{player.name}</span>
		</div>
		<div className="flex items-center gap-2">
			{player.roundPoints > 0 && (
				<span className="text-success-dark text-sm">+{player.roundPoints}</span>
			)}
			<span className="font-bold">{player.score}</span>
		</div>
	</div>
));

export const RoundResultsView: React.FC = () => {
	const { currentQuestion, playerAnswers, players, currentRound, gameConfig } =
		useSnapshot(globalStore.proxy);

	const myAnswer = playerAnswers[kmClient.id];

	// Sort players by score for leaderboard
	const leaderboard = React.useMemo(() => {
		return Object.entries(players)
			.map(([clientId, info]) => ({
				clientId,
				name: info.name,
				score: info.score,
				roundPoints: playerAnswers[clientId]?.pointsEarned || 0,
				isCorrect: playerAnswers[clientId]?.isCorrect || false
			}))
			.sort((a, b) => b.score - a.score);
	}, [players, playerAnswers]);

	if (!currentQuestion) {
		return <div className="text-center">{config.loading}</div>;
	}

	const correctAnswer = currentQuestion.answers[currentQuestion.correctIndex];

	return (
		<div className="flex w-full max-w-md flex-col gap-6">
			{/* Header */}
			<div className="text-center">
				<h2 className="text-text-heading text-2xl font-bold">
					{config.roundResultsTitle}
				</h2>
				<p className="text-text-muted">
					{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
				</p>
			</div>

			{/* My Result */}
			<div
				className={cn(
					'rounded-2xl p-6 text-center',
					myAnswer?.isCorrect ? 'bg-success/10' : 'bg-error/10'
				)}
			>
				{myAnswer ? (
					<>
						<div className="mb-2 flex items-center justify-center gap-2">
							{myAnswer.isCorrect ? (
								<Check className="text-success h-8 w-8" />
							) : (
								<X className="text-error h-8 w-8" />
							)}
							<span
								className={cn(
									'text-xl font-bold',
									myAnswer.isCorrect ? 'text-success-dark' : 'text-error-dark'
								)}
							>
								{myAnswer.isCorrect
									? config.correctLabel
									: config.incorrectLabel}
							</span>
						</div>
						<p className="text-lg">
							{config.pointsEarnedLabel}:{' '}
							<span className="font-bold">+{myAnswer.pointsEarned}</span>
						</p>
					</>
				) : (
					<p className="text-text-muted text-lg">{config.noAnswerLabel}</p>
				)}
			</div>

			{/* Correct Answer */}
			<div className="card-glass rounded-2xl p-4">
				<p className="text-text-muted text-xs font-semibold tracking-wider uppercase">
					{config.correctAnswerLabel}
				</p>
				<p className="text-success-dark text-lg font-bold">{correctAnswer}</p>
			</div>

			{/* Leaderboard */}
			<div className="card-glass rounded-2xl p-4">
				<h3 className="text-text-heading mb-3 font-bold">
					{config.leaderboardTitle}
				</h3>
				<div className="flex flex-col gap-2">
					{leaderboard.map((player, index) => (
						<LeaderboardRow
							key={player.clientId}
							player={player}
							index={index}
							isCurrentPlayer={player.clientId === kmClient.id}
						/>
					))}
				</div>
			</div>
		</div>
	);
};
