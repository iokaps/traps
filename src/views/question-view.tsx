import { IceTrapOverlay } from '@/components/traps/ice-trap-overlay';
import { MudTrapOverlay } from '@/components/traps/mud-trap-overlay';
import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { useSoundEffects } from '@/hooks/useSoundEffects';
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
	const { playSound } = useSoundEffects();
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
	const prevRemainingRef = React.useRef<number>(0);

	// Get my traps
	const myTraps = activeTraps[kmClient.id] || [];
	const hasIceTrap = myTraps.some((t) => t.trapType === 'ice');
	const hasMudTrap = myTraps.some((t) => t.trapType === 'mud');
	const hasMixedTrap = myTraps.some((t) => t.trapType === 'mixed');
	const hasMissingTrap = myTraps.some((t) => t.trapType === 'missing');

	// Play warning sound in last 5 seconds
	React.useEffect(() => {
		if (!currentQuestion) return;
		const remaining = Math.max(0, currentQuestion.endTimestamp - serverTime);
		const prevRemaining = prevRemainingRef.current;

		if (remaining <= 5000 && remaining > 0 && prevRemaining > 5000) {
			playSound('timerWarning', 0.3);
		}

		prevRemainingRef.current = remaining;
	}, [serverTime, currentQuestion, playSound]);

	if (!currentQuestion) {
		return <div className="text-center">{config.loading}</div>;
	}

	const remaining = Math.max(0, currentQuestion.endTimestamp - serverTime);

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
				<span className="text-sm text-gray-500">
					{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
				</span>
				<div className="flex items-center gap-1">
					<span className="text-sm text-gray-500">
						{config.timeRemainingLabel}:
					</span>
					<KmTimeCountdown
						ms={remaining}
						display="s"
						className={cn(
							'text-lg font-bold',
							remaining <= 5000 && 'animate-pulse text-red-500'
						)}
					/>
				</div>
			</div>

			{/* Question */}
			<div className="rounded-xl bg-white p-4 shadow-md">
				<h2 className="text-xl font-bold">{currentQuestion.question}</h2>
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
									'relative min-h-[60px] w-full rounded-xl border-2 p-4 text-left transition-all',
									isSelected
										? 'border-blue-500 bg-blue-50'
										: selectable
											? 'border-gray-200 bg-white hover:border-gray-300'
											: 'cursor-not-allowed border-gray-200 bg-gray-50'
								)}
							>
								<span className="font-medium">{displayAnswer}</span>
								{isSelected && (
									<Check className="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-blue-500" />
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
				<div className="rounded-xl bg-green-50 p-4 text-center">
					<Check className="mx-auto mb-2 h-8 w-8 text-green-500" />
					<p className="font-bold text-green-700">
						{config.answerSubmittedLabel}
					</p>
					<p className="text-sm text-gray-600">
						{config.waitingForResultsLabel}
					</p>
				</div>
			)}
		</div>
	);
};
