import { config } from '@/config';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { Check, X } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

export const RoundResultsView: React.FC = () => {
	const { playSound } = useSoundEffects();
	const { currentQuestion, playerAnswers, players, currentRound, gameConfig } =
		useSnapshot(globalStore.proxy);

	const myAnswer = playerAnswers[kmClient.id];
	const hasPlayedSound = React.useRef(false);

	// Play sound on mount based on result
	React.useEffect(() => {
		if (hasPlayedSound.current) return;
		hasPlayedSound.current = true;

		if (myAnswer?.isCorrect) {
			playSound('correct', 0.5);
		} else if (myAnswer) {
			playSound('incorrect', 0.4);
		}
	}, [myAnswer, playSound]);

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
				<h2 className="text-2xl font-bold">{config.roundResultsTitle}</h2>
				<p className="text-gray-500">
					{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
				</p>
			</div>

			{/* My Result */}
			<div
				className={cn(
					'rounded-xl p-6 text-center',
					myAnswer?.isCorrect ? 'bg-green-50' : 'bg-red-50'
				)}
			>
				{myAnswer ? (
					<>
						<div className="mb-2 flex items-center justify-center gap-2">
							{myAnswer.isCorrect ? (
								<Check className="h-8 w-8 text-green-500" />
							) : (
								<X className="h-8 w-8 text-red-500" />
							)}
							<span
								className={cn(
									'text-xl font-bold',
									myAnswer.isCorrect ? 'text-green-700' : 'text-red-700'
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
					<p className="text-lg text-gray-600">{config.noAnswerLabel}</p>
				)}
			</div>

			{/* Correct Answer */}
			<div className="rounded-xl bg-white p-4 shadow-md">
				<p className="text-sm text-gray-500">{config.correctAnswerLabel}:</p>
				<p className="text-lg font-bold text-green-600">{correctAnswer}</p>
			</div>

			{/* Leaderboard */}
			<div className="rounded-xl bg-white p-4 shadow-md">
				<h3 className="mb-3 font-bold">{config.leaderboardTitle}</h3>
				<div className="flex flex-col gap-2">
					{leaderboard.map((player, index) => (
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
							<div className="flex items-center gap-2">
								{player.roundPoints > 0 && (
									<span className="text-sm text-green-600">
										+{player.roundPoints}
									</span>
								)}
								<span className="font-bold">{player.score}</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
