import { IceTrapOverlay } from '@/components/traps/ice-trap-overlay';
import { MudTrapOverlay } from '@/components/traps/mud-trap-overlay';
import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { cn } from '@/utils/cn';
import { applyMissingLetters, applyMixedLetters } from '@/utils/trap-effects';
import { KmTimeCountdown } from '@kokimoki/shared';
import { Check } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

export const QuestionView: React.FC = () => {
	const serverTime = useServerTimer(100);
	const {
		currentQuestion,
		playerAnswers,
		activeTraps,
		currentRound,
		gameConfig
	} = useSnapshot(globalStore.proxy);
	const { iceBreaksPerAnswer, mudSwipesPerAnswer } = useSnapshot(
		playerStore.proxy
	);

	const myAnswer = playerAnswers[kmClient.id];
	const hasAnswered = Boolean(myAnswer);

	// Get my traps
	const myTraps = activeTraps[kmClient.id] || [];
	const hasIceTrap = myTraps.some((t) => t.trapType === 'ice');
	const hasMudTrap = myTraps.some((t) => t.trapType === 'mud');
	const hasMixedTrap = myTraps.some((t) => t.trapType === 'mixed');
	const hasMissingTrap = myTraps.some((t) => t.trapType === 'missing');

	if (!currentQuestion) {
		return <div className="text-center">{config.loading}</div>;
	}

	const remaining = Math.max(0, currentQuestion.endTimestamp - serverTime);

	// Answer button color styles based on index
	const getAnswerColors = (index: number, isSelected: boolean) => {
		if (isSelected) {
			return 'border-primary bg-primary/20 ring-2 ring-primary';
		}
		const colors = [
			'bg-answer-a-bg border-answer-a-border text-answer-a-text hover:border-answer-a-border/80',
			'bg-answer-b-bg border-answer-b-border text-answer-b-text hover:border-answer-b-border/80',
			'bg-answer-c-bg border-answer-c-border text-answer-c-text hover:border-answer-c-border/80',
			'bg-answer-d-bg border-answer-d-border text-answer-d-text hover:border-answer-d-border/80'
		];
		return colors[index] || colors[0];
	};

	// Check if answer is selectable (ice broken, mud cleared)
	const isAnswerSelectable = (index: number): boolean => {
		if (hasAnswered) return false;

		// Check ice trap - need 3 taps
		if (hasIceTrap) {
			const taps = iceBreaksPerAnswer[index] || 0;
			if (taps < 3) return false;
		}

		// Check mud trap - need to be cleared (3 swipes)
		if (hasMudTrap) {
			if ((mudSwipesPerAnswer[index] || 0) < 3) return false;
		}

		return true;
	};

	// Apply text effects to answer
	const getDisplayAnswer = (answer: string, index: number): string => {
		let displayText = answer;

		if (hasMixedTrap) {
			displayText = applyMixedLetters(displayText, currentRound * 100 + index);
		}

		if (hasMissingTrap) {
			displayText = applyMissingLetters(
				displayText,
				currentRound * 100 + index
			);
		}

		return displayText;
	};

	const handleAnswerClick = async (index: number) => {
		if (!isAnswerSelectable(index)) return;
		playSound('buttonClick', 0.3);
		await globalActions.submitAnswer(index);
	};

	const handleIceTap = async (index: number) => {
		if (hasAnswered) return;
		await playerActions.recordIceTap(index);
	};

	const handleMudSwipe = async (index: number) => {
		if (hasAnswered) return;
		await playerActions.recordMudSwipe(index);
	};

	return (
		<div className="flex w-full max-w-md flex-col gap-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<span className="text-text-muted text-sm">
					{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
				</span>
				<div className="flex items-center gap-1">
					<span className="text-text-muted text-sm">
						{config.timeRemainingLabel}:
					</span>
					<KmTimeCountdown
						ms={remaining}
						display="s"
						className={cn(
							'text-lg font-bold',
							remaining <= 5000 ? 'text-error animate-pulse' : 'text-primary'
						)}
					/>
				</div>
			</div>

			{/* Question */}
			<div className="bg-surface border-primary/20 rounded-xl border-2 p-4 shadow-md">
				<h2 className="text-text-heading text-xl font-bold">
					{currentQuestion.question}
				</h2>
			</div>

			{/* Answers */}
			<div className="flex flex-col gap-3">
				{currentQuestion.answers.map((answer, index) => {
					const selectable = isAnswerSelectable(index);
					const isSelected = myAnswer?.answerIndex === index;
					const displayAnswer = getDisplayAnswer(answer, index);
					const iceTaps = iceBreaksPerAnswer[index] || 0;
					const mudSwipes = mudSwipesPerAnswer[index] || 0;
					const mudCleared = mudSwipes >= 3;

					return (
						<div key={index} className="relative">
							<button
								onClick={() => handleAnswerClick(index)}
								disabled={!selectable || hasAnswered}
								className={cn(
									'relative min-h-[60px] w-full rounded-xl border-2 p-4 text-left font-semibold transition-all',
									selectable || isSelected
										? getAnswerColors(index, isSelected)
										: 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-70'
								)}
							>
								<span>{displayAnswer}</span>
								{isSelected && (
									<Check className="text-primary\ absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2" />
								)}
							</button>

							{/* Trap Overlays */}
							{hasIceTrap && iceTaps < 3 && !hasAnswered && (
								<IceTrapOverlay
									taps={iceTaps}
									onTap={() => handleIceTap(index)}
								/>
							)}

							{hasMudTrap && !mudCleared && !hasAnswered && (
								<MudTrapOverlay
									swipes={mudSwipes}
									onSwipe={() => handleMudSwipe(index)}
								/>
							)}
						</div>
					);
				})}
			</div>

			{/* Status */}
			{hasAnswered && (
				<div className="bg-success/10 rounded-xl p-4 text-center">
					<Check className="text-success mx-auto mb-2 h-8 w-8" />
					<p className="text-success-dark font-bold">
						{config.answerSubmittedLabel}
					</p>
					<p className="text-text-muted text-sm">
						{config.waitingForResultsLabel}
					</p>
				</div>
			)}
		</div>
	);
};
