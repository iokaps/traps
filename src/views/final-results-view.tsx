import { config } from '@/config';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import {
	KmConfettiProvider,
	KmPodiumTable,
	useKmAnimatedValue,
	useKmConfettiContext
} from '@kokimoki/shared';
import { Crown, Sparkles, Star, Trophy } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

// Animated score component
const AnimatedScore: React.FC<{ score: number; delay: number }> = ({
	score,
	delay
}) => {
	const [shouldAnimate, setShouldAnimate] = React.useState(false);
	const { ref } = useKmAnimatedValue<HTMLSpanElement>(
		shouldAnimate ? score : 0,
		0,
		{
			duration: 1.5,
			ease: 'easeOut'
		}
	);

	React.useEffect(() => {
		const timer = setTimeout(() => setShouldAnimate(true), delay);
		return () => clearTimeout(timer);
	}, [delay]);

	return <span ref={ref} className="font-bold tabular-nums" />;
};

// Player row component with staggered animation
const PlayerRow: React.FC<{
	player: { clientId: string; name: string; score: number };
	index: number;
	isCurrentPlayer: boolean;
	revealDelay: number;
}> = ({ player, index, isCurrentPlayer, revealDelay }) => {
	const [isVisible, setIsVisible] = React.useState(false);

	React.useEffect(() => {
		const timer = setTimeout(() => setIsVisible(true), revealDelay);
		return () => clearTimeout(timer);
	}, [revealDelay]);

	const getMedalEmoji = (position: number) => {
		switch (position) {
			case 0:
				return '🥇';
			case 1:
				return '🥈';
			case 2:
				return '🥉';
			default:
				return null;
		}
	};

	const getPositionStyle = (position: number) => {
		switch (position) {
			case 0:
				return 'bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 shadow-lg shadow-yellow-400/30';
			case 1:
				return 'bg-gradient-to-r from-gray-300 to-slate-300 text-gray-700 shadow-md shadow-gray-300/30';
			case 2:
				return 'bg-gradient-to-r from-amber-600 to-orange-500 text-amber-100 shadow-md shadow-amber-600/30';
			default:
				return 'bg-gray-100 text-gray-600';
		}
	};

	return (
		<div
			className={cn(
				'flex items-center justify-between rounded-xl p-3 transition-all duration-500',
				isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
				isCurrentPlayer && 'ring-primary ring-2 ring-offset-2',
				index < 3 ? getPositionStyle(index) : 'bg-surface-alt'
			)}
		>
			<div className="flex items-center gap-3">
				{/* Position indicator */}
				<div
					className={cn(
						'flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold',
						index >= 3 && 'bg-white/50'
					)}
				>
					{getMedalEmoji(index) || index + 1}
				</div>

				{/* Player name */}
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold">{player.name}</span>
					{isCurrentPlayer && (
						<span className="bg-primary rounded-full px-2 py-0.5 text-xs font-medium text-white">
							You
						</span>
					)}
					{index === 0 && <Crown className="h-5 w-5 text-yellow-600" />}
				</div>
			</div>

			{/* Animated score */}
			<div className="text-xl">
				<AnimatedScore score={player.score} delay={revealDelay + 200} />
			</div>
		</div>
	);
};

const FinalResultsContent: React.FC = () => {
	const { playSound } = useSoundEffects();
	const { players } = useSnapshot(globalStore.proxy);
	const confetti = useKmConfettiContext();
	const [showWinnerReveal, setShowWinnerReveal] = React.useState(false);
	const [showPodium, setShowPodium] = React.useState(false);
	const [showScores, setShowScores] = React.useState(false);

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

	const winner = sortedPlayers[0];
	const isWinner = winner?.clientId === kmClient.id;

	// Staged reveal animation
	React.useEffect(() => {
		// Stage 1: Show "And the winner is..." (immediate)
		const winnerRevealTimer = setTimeout(() => {
			setShowWinnerReveal(true);
			playSound('gameOver', 0.6);
		}, 500);

		// Stage 2: Show podium (after 1.5s)
		const podiumTimer = setTimeout(() => {
			setShowPodium(true);
			confetti?.triggerConfetti({ preset: 'massive' });
		}, 1500);

		// Stage 3: Show full scores (after 2.5s)
		const scoresTimer = setTimeout(() => {
			setShowScores(true);
		}, 2500);

		return () => {
			clearTimeout(winnerRevealTimer);
			clearTimeout(podiumTimer);
			clearTimeout(scoresTimer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Prepare podium data with custom colors
	const podiumEntries = sortedPlayers
		.slice(0, 3)
		.filter((player) => player && player.name)
		.map((player, index) => ({
			id: player.clientId,
			name: player.name,
			points: player.score ?? 0,
			color: index === 0 ? '#facc15' : index === 1 ? '#9ca3af' : '#d97706'
		}));

	return (
		<div className="flex w-full max-w-md flex-col gap-6">
			{/* Header with sparkle animation */}
			<div className="relative text-center">
				<div className="absolute -top-4 left-1/2 -translate-x-1/2">
					<Sparkles
						className={cn(
							'text-warning h-8 w-8 transition-all duration-1000',
							showWinnerReveal ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
						)}
					/>
				</div>
				<h2
					className={cn(
						'text-text-heading text-3xl font-bold transition-all duration-700',
						showWinnerReveal
							? 'translate-y-0 opacity-100'
							: '-translate-y-4 opacity-0'
					)}
				>
					{config.finalResultsTitle}
				</h2>

				{/* Winner announcement with dramatic reveal */}
				{winner && (
					<div
						className={cn(
							'mt-4 transition-all delay-300 duration-700',
							showWinnerReveal
								? 'translate-y-0 opacity-100'
								: 'translate-y-4 opacity-0'
						)}
					>
						<p className="text-text-muted mb-1 text-sm tracking-wider uppercase">
							{config.winnerLabel}
						</p>
						<div className="flex items-center justify-center gap-2">
							<Trophy className="text-warning h-8 w-8 animate-bounce" />
							<span className="from-warning bg-gradient-to-r to-amber-500 bg-clip-text text-3xl font-black text-transparent">
								{winner.name}
							</span>
							<Trophy className="text-warning h-8 w-8 animate-bounce" />
						</div>
					</div>
				)}
			</div>

			{/* Winner celebration banner (if current player won) */}
			{isWinner && showWinnerReveal && (
				<div
					className={cn(
						'from-warning relative overflow-hidden rounded-2xl bg-gradient-to-r to-amber-400 p-6 text-center text-yellow-900 shadow-lg transition-all duration-700',
						showPodium ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
					)}
				>
					{/* Animated stars background */}
					<div className="absolute inset-0 overflow-hidden">
						{[...Array(6)].map((_, i) => (
							<Star
								key={i}
								className="absolute h-6 w-6 animate-pulse text-yellow-600/30"
								style={{
									left: `${15 + i * 15}%`,
									top: `${20 + (i % 2) * 40}%`,
									animationDelay: `${i * 0.2}s`
								}}
							/>
						))}
					</div>
					<div className="relative">
						<Crown className="mx-auto mb-2 h-16 w-16 animate-bounce text-yellow-700" />
						<p className="text-2xl font-black">🎉 You Won! 🎉</p>
						<p className="mt-1 text-sm font-medium text-yellow-800">
							Champion of the game!
						</p>
					</div>
				</div>
			)}

			{/* Podium with enhanced styling */}
			<div
				className={cn(
					'bg-surface rounded-2xl p-4 shadow-lg transition-all duration-700',
					showPodium ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
				)}
			>
				<KmPodiumTable
					entries={podiumEntries}
					pointsLabel="Score"
					podiumSettings={{
						'0': { label: '🥇', className: 'bg-yellow-400/20' },
						'1': { label: '🥈', className: 'bg-gray-300/20' },
						'2': { label: '🥉', className: 'bg-amber-600/20' }
					}}
				/>
			</div>

			{/* Full Scores with staggered reveal */}
			<div
				className={cn(
					'bg-surface rounded-2xl p-4 shadow-lg transition-all duration-500',
					showScores ? 'opacity-100' : 'opacity-0'
				)}
			>
				<h3 className="text-text-heading mb-4 flex items-center gap-2 font-bold">
					<Star className="text-primary h-5 w-5" />
					{config.finalScoresLabel}
				</h3>
				<div className="flex flex-col gap-2">
					{sortedPlayers.map((player, index) => (
						<PlayerRow
							key={player.clientId}
							player={player}
							index={index}
							isCurrentPlayer={player.clientId === kmClient.id}
							revealDelay={2500 + index * 150}
						/>
					))}
				</div>
			</div>
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
