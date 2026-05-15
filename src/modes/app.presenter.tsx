import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useServerTimer } from '@/hooks/useServerTime';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import {
	KmConfettiProvider,
	KmPodiumTable,
	KmQrCode,
	useKmConfettiContext
} from '@kokimoki/shared';
import {
	Droplets,
	EyeOff,
	QrCode,
	Shuffle,
	Snowflake,
	Trophy,
	Users,
	X
} from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const CATEGORY_VOTE_TIME = 15000;
const TRAP_SELECTION_TIME = 20000;
const GAME_START_COUNTDOWN = 5000;

const TrapIcon: React.FC<{ type: string }> = ({ type }) => {
	switch (type) {
		case 'ice':
			return <Snowflake className="text-trap-ice h-4 w-4" />;
		case 'mud':
			return <Droplets className="text-trap-mud h-4 w-4" />;
		case 'mixed':
			return <Shuffle className="text-trap-mixed h-4 w-4" />;
		case 'missing':
			return <EyeOff className="text-trap-missing h-4 w-4" />;
		default:
			return null;
	}
};

const positionStyle = (index: number) =>
	index === 0
		? 'bg-gradient-to-r from-yellow-400/80 to-amber-300/80 text-yellow-900'
		: index === 1
			? 'bg-gradient-to-r from-gray-300/80 to-slate-200/80 text-gray-700'
			: index === 2
				? 'bg-gradient-to-r from-amber-600/80 to-orange-400/80 text-amber-100'
				: 'bg-white/40';

const positionBadge = (index: number) =>
	index === 0
		? 'bg-yellow-400 text-yellow-900'
		: index === 1
			? 'bg-gray-300 text-gray-700'
			: index === 2
				? 'bg-amber-600 text-amber-100'
				: 'bg-white/60 text-text-body';

const PresenterLeaderboardRow: React.FC<{
	player: { clientId: string; name: string; score: number };
	index: number;
	roundPoints: number;
}> = React.memo(({ player, index, roundPoints }) => (
	<div
		className={cn(
			'flex items-center justify-between rounded-xl p-3 transition-all',
			positionStyle(index)
		)}
	>
		<div className="flex items-center gap-3">
			<span
				className={cn(
					'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
					positionBadge(index)
				)}
			>
				{index + 1}
			</span>
			<span className="text-lg font-semibold">{player.name}</span>
		</div>
		<div className="flex items-center gap-3">
			{roundPoints > 0 && (
				<span className="text-success-dark font-medium">+{roundPoints}</span>
			)}
			<span className="text-xl font-bold">{player.score}</span>
		</div>
	</div>
));

const PresenterScoreRow: React.FC<{
	player: { clientId: string; name: string; score: number };
	index: number;
}> = React.memo(({ player, index }) => (
	<div
		className={cn(
			'flex items-center justify-between rounded-xl p-3',
			positionStyle(index)
		)}
	>
		<div className="flex items-center gap-3">
			<span
				className={cn(
					'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
					positionBadge(index)
				)}
			>
				{index + 1}
			</span>
			<span className="text-lg font-semibold">{player.name}</span>
		</div>
		<span className="text-xl font-bold">{player.score}</span>
	</div>
));

/* ─── Circular Timer ──────────────────────────────────────────────── */

interface CircularTimerProps {
	remainingMs: number;
	totalMs: number;
	size?: number;
}

const CircularTimer: React.FC<CircularTimerProps> = ({
	remainingMs,
	totalMs,
	size = 80
}) => {
	const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
	const fraction = Math.max(0, Math.min(1, remainingMs / totalMs));
	const urgent = remainingMs <= 5000 && remainingMs > 0;

	const strokeWidth = size * 0.1;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference * (1 - fraction);

	return (
		<div className="relative" style={{ width: size, height: size }}>
			{urgent && (
				<div
					className="animate-pulse-ring border-error absolute inset-0 rounded-full border-2"
					aria-hidden
				/>
			)}
			<svg width={size} height={size} className="-rotate-90">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="rgba(124,58,237,0.12)"
					strokeWidth={strokeWidth}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke={urgent ? 'var(--color-error)' : 'var(--color-primary)'}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={dashOffset}
					className="transition-[stroke-dashoffset] duration-300 ease-linear"
				/>
			</svg>
			<span
				className={cn(
					'absolute inset-0 flex items-center justify-center font-bold',
					urgent ? 'text-error' : 'text-primary',
					size >= 80 ? 'text-2xl' : 'text-lg'
				)}
			>
				{seconds}
			</span>
		</div>
	);
};

const PresenterContent: React.FC = () => {
	const { title } = config;
	const serverTime = useServerTimer(250);

	useGlobalController();
	useDocumentTitle(title);

	const {
		phase,
		gameConfig,
		players,
		currentRound,
		categoryOptions,
		categoryVotes,
		categoryVoteStartTimestamp,
		selectedCategory,
		trapSelections,
		activeTraps,
		trapSelectionStartTimestamp,
		currentQuestion,
		playerAnswers,
		gameStartTimestamp
	} = useSnapshot(globalStore.proxy);
	const onlineClientIds = useSnapshot(globalStore.connections).clientIds;
	const confetti = useKmConfettiContext();

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	// Trigger confetti on final results
	React.useEffect(() => {
		if (phase === 'final-results') {
			confetti?.triggerConfetti({ preset: 'massive' });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [phase]);

	// Sort players by score
	const sortedPlayers = React.useMemo(() => {
		return Object.entries(players)
			.map(([clientId, info]) => ({
				clientId,
				name: info.name,
				score: info.score,
				isOnline: onlineClientIds.has(clientId)
			}))
			.sort((a, b) => b.score - a.score);
	}, [players, onlineClientIds]);

	// Count votes per category
	const voteCounts = React.useMemo(() => {
		const counts: Record<string, number> = {};
		categoryOptions.forEach((opt) => (counts[opt] = 0));
		Object.values(categoryVotes).forEach((voted) => {
			if (counts[voted] !== undefined) {
				counts[voted]++;
			}
		});
		return counts;
	}, [categoryOptions, categoryVotes]);

	// Calculate timers
	const getCategoryVoteRemaining = () => {
		const elapsed = serverTime - categoryVoteStartTimestamp;
		return Math.max(0, CATEGORY_VOTE_TIME - elapsed);
	};

	const getTrapSelectionRemaining = () => {
		const elapsed = serverTime - trapSelectionStartTimestamp;
		return Math.max(0, TRAP_SELECTION_TIME - elapsed);
	};

	const getQuestionRemaining = () => {
		if (!currentQuestion) return 0;
		return Math.max(0, currentQuestion.endTimestamp - serverTime);
	};

	// Podium data
	const podiumColors = ['#713f12', '#374151', '#431407'];
	const podiumEntries = sortedPlayers
		.slice(0, 3)
		.filter((player) => player && player.name)
		.map((player, index) => ({
			id: player.clientId,
			name: player.name,
			points: player.score ?? 0,
			color: podiumColors[index] || '#374151'
		}));

	const [qrVisible, setQrVisible] = React.useState(false);

	return (
		<HostPresenterLayout.Root className={phase !== 'lobby' ? 'pb-20' : ''}>
			<HostPresenterLayout.Header>
				<div className="flex items-center gap-3">
					{phase !== 'lobby' && (
						<span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold">
							{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
						</span>
					)}
					<span className="bg-secondary/10 text-secondary rounded-full px-3 py-1 text-sm font-semibold">
						{config.presenterLabel}
					</span>
					<button
						onClick={() => setQrVisible((v) => !v)}
						className="card-glass text-primary hover:bg-primary/10 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
					>
						<QrCode className="h-4 w-4" />
						{qrVisible ? config.hideQrCodeButton : config.showQrCodeButton}
					</button>
				</div>
			</HostPresenterLayout.Header>

			{/* QR Code Overlay */}
			{qrVisible && (
				<div
					className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 p-6 backdrop-blur-sm"
					onClick={() => setQrVisible(false)}
				>
					<div
						className="card-glass animate-slide-in-right mt-16 w-80 rounded-2xl p-6"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-text-heading text-sm font-bold">
								{config.playerLinkLabel}
							</h3>
							<button
								onClick={() => setQrVisible(false)}
								className="text-text-muted hover:text-text-heading rounded-full p-1 transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="flex justify-center">
							<KmQrCode data={playerLink} size={220} interactive={false} />
						</div>
						<a
							href={playerLink}
							target="_blank"
							rel="noreferrer"
							className="text-primary decoration-primary/30 hover:text-primary-dark mt-4 block text-center text-xs font-medium break-all underline underline-offset-2"
						>
							{playerLink}
						</a>
					</div>
				</div>
			)}

			<HostPresenterLayout.Main className="max-w-screen-lg">
				{/* Phase content with transition animation */}
				<div key={phase} className="animate-fade-slide-in flex flex-col gap-6">
					{/* ── Lobby ──────────────────────────────────────── */}
					{phase === 'lobby' && (
						<>
							<div className="card-glass rounded-3xl p-10 text-center">
								<h2 className="from-primary to-secondary bg-gradient-to-r bg-clip-text text-5xl font-extrabold text-transparent">
									{config.lobbyTitle}
								</h2>
								<p className="text-text-muted mt-3 text-xl">
									{config.lobbySubtitle}
								</p>
								<div className="mx-auto mt-8 w-fit">
									<KmQrCode data={playerLink} size={240} interactive={false} />
									<a
										href={playerLink}
										target="_blank"
										rel="noreferrer"
										className="text-primary decoration-primary/30 hover:text-primary-dark mt-3 block text-center text-sm font-medium break-all underline underline-offset-2"
									>
										{playerLink}
									</a>
								</div>
							</div>

							<div className="card-glass rounded-2xl p-6">
								<h2 className="text-text-heading mb-4 text-xl font-bold">
									{config.playersLabel} (
									{sortedPlayers.filter((p) => p.isOnline).length})
								</h2>
								<div className="flex flex-wrap gap-2">
									{sortedPlayers.map((player) => (
										<div
											key={player.clientId}
											className={cn(
												'rounded-full px-4 py-2 text-sm font-semibold transition-all',
												player.isOnline
													? 'from-success/20 to-success/10 text-success-dark bg-gradient-to-r shadow-sm'
													: 'text-text-muted bg-gray-100/50'
											)}
										>
											{player.name}
										</div>
									))}
								</div>
							</div>
						</>
					)}

					{/* ── Starting ──────────────────────────────────── */}
					{phase === 'starting' && (
						<div className="card-glass flex flex-col items-center gap-6 rounded-3xl p-10">
							<h2 className="from-primary to-secondary bg-gradient-to-r bg-clip-text text-4xl font-extrabold text-transparent">
								{config.gameStartingTitle}
							</h2>
							<p className="text-text-muted">
								{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
							</p>
							{gameStartTimestamp > 0 ? (
								<CircularTimer
									remainingMs={Math.max(
										0,
										GAME_START_COUNTDOWN - (serverTime - gameStartTimestamp)
									)}
									totalMs={GAME_START_COUNTDOWN}
									size={120}
								/>
							) : (
								<div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
							)}
							<p className="text-text-muted text-lg">
								{config.getReadyMessage}
							</p>
						</div>
					)}

					{/* ── Category Vote ──────────────────────────────── */}
					{phase === 'category-vote' && (
						<div className="card-glass rounded-2xl p-8">
							<div className="mb-6 flex items-center justify-between">
								<h2 className="text-text-heading text-3xl font-bold">
									{config.categoryVoteTitle}
								</h2>
								<CircularTimer
									remainingMs={getCategoryVoteRemaining()}
									totalMs={CATEGORY_VOTE_TIME}
									size={72}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								{categoryOptions.map((category) => {
									const votes = voteCounts[category] || 0;
									const maxVotes = Math.max(...Object.values(voteCounts), 1);
									const percentage = (votes / maxVotes) * 100;

									return (
										<div
											key={category}
											className="border-primary/10 relative overflow-hidden rounded-2xl border bg-white/50 p-5"
										>
											<div
												className="from-primary/15 to-secondary/10 absolute inset-0 bg-gradient-to-r transition-all duration-500"
												style={{ width: `${percentage}%` }}
											/>
											<div className="relative flex items-center justify-between">
												<span className="text-text-heading text-xl font-semibold">
													{category}
												</span>
												<span className="from-primary to-secondary rounded-full bg-gradient-to-r px-3 py-1 text-sm font-bold text-white shadow-sm">
													{votes}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* ── Trap Selection ─────────────────────────────── */}
					{phase === 'trap-selection' && (
						<>
							<div className="card-glass rounded-2xl p-8">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-text-heading text-3xl font-bold">
											{config.trapSelectionTitle}
										</h2>
										<p className="text-text-muted mt-1">
											{config.categoryLabel}:{' '}
											<span className="text-primary font-bold">
												{selectedCategory}
											</span>
										</p>
									</div>
									<CircularTimer
										remainingMs={getTrapSelectionRemaining()}
										totalMs={TRAP_SELECTION_TIME}
										size={72}
									/>
								</div>
							</div>

							<div className="card-glass rounded-2xl p-6">
								<h2 className="text-text-heading mb-4 text-xl font-bold">
									{config.presenterTrapActivityTitle}
								</h2>
								<div className="flex flex-col gap-2">
									{Object.entries(trapSelections).map(([fromId, selection]) => {
										const fromPlayer = players[fromId];
										const toPlayer = players[selection.targetId];
										if (!fromPlayer || !toPlayer) return null;

										return (
											<div
												key={fromId}
												className="flex items-center gap-3 rounded-xl bg-white/50 p-3"
											>
												<span className="font-semibold">{fromPlayer.name}</span>
												<span className="text-text-muted">→</span>
												<TrapIcon type={selection.trapType} />
												<span className="text-text-muted">→</span>
												<span className="font-semibold">{toPlayer.name}</span>
											</div>
										);
									})}
								</div>
							</div>
						</>
					)}

					{/* ── Question ───────────────────────────────────── */}
					{phase === 'question' && currentQuestion && (
						<>
							<div className="card-glass flex flex-col items-center gap-6 rounded-3xl p-10">
								<CircularTimer
									remainingMs={getQuestionRemaining()}
									totalMs={
										currentQuestion.endTimestamp -
										(currentQuestion.endTimestamp -
											gameConfig.questionTimeSeconds * 1000)
									}
									size={96}
								/>
								<span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
									{config.questionTitle}
								</span>
								<h2 className="text-text-heading max-w-3xl text-center text-4xl leading-snug font-bold">
									{currentQuestion.question}
								</h2>
							</div>

							<div className="card-glass rounded-2xl p-6">
								<h2 className="text-text-heading mb-3 text-lg font-bold">
									{config.presenterAnswerProgressTitle}
								</h2>
								<div className="flex items-center gap-4">
									<div className="h-3 flex-1 overflow-hidden rounded-full bg-white/50">
										<div
											className="from-success to-success-dark h-full rounded-full bg-gradient-to-r transition-all duration-500"
											style={{
												width: `${
													(Object.keys(playerAnswers).length /
														Math.max(
															sortedPlayers.filter((p) => p.isOnline).length,
															1
														)) *
													100
												}%`
											}}
										/>
									</div>
									<span className="text-text-heading font-bold">
										{Object.keys(playerAnswers).length}/
										{sortedPlayers.filter((p) => p.isOnline).length}{' '}
										{config.answeredLabel}
									</span>
								</div>
							</div>

							{Object.keys(activeTraps).length > 0 && (
								<div className="flex flex-wrap justify-center gap-2">
									{Object.entries(activeTraps).map(
										([targetId, trapsRecord]) => {
											const targetPlayer = players[targetId];
											if (!targetPlayer) return null;
											const traps = Object.values(trapsRecord);

											return (
												<div
													key={targetId}
													className="card-glass flex items-center gap-2 rounded-full px-4 py-2"
												>
													<span className="text-sm font-semibold">
														{targetPlayer.name}
													</span>
													<div className="flex gap-1">
														{traps.map((trap, i) => (
															<TrapIcon key={i} type={trap.trapType} />
														))}
													</div>
												</div>
											);
										}
									)}
								</div>
							)}
						</>
					)}

					{/* ── Round Results ──────────────────────────────── */}
					{phase === 'round-results' && currentQuestion && (
						<>
							<div className="card-glass rounded-2xl p-6">
								<h2 className="text-text-heading mb-4 text-2xl font-bold">
									{config.roundResultsTitle}
								</h2>
								<div className="bg-success/10 rounded-2xl p-5">
									<p className="text-text-muted text-xs font-semibold tracking-wider uppercase">
										{config.correctAnswerLabel}
									</p>
									<p className="text-success-dark text-3xl font-bold">
										{currentQuestion.answers[currentQuestion.correctIndex]}
									</p>
								</div>
							</div>

							<div className="card-glass rounded-2xl p-6">
								<h2 className="text-text-heading mb-4 text-xl font-bold">
									{config.leaderboardTitle}
								</h2>
								<div className="flex flex-col gap-2">
									{sortedPlayers.map((player, index) => (
										<PresenterLeaderboardRow
											key={player.clientId}
											player={player}
											index={index}
											roundPoints={
												playerAnswers[player.clientId]?.pointsEarned || 0
											}
										/>
									))}
								</div>
							</div>
						</>
					)}

					{/* ── Final Results ──────────────────────────────── */}
					{phase === 'final-results' && (
						<>
							<div className="card-glass rounded-3xl p-8">
								<div className="mb-6 flex items-center justify-center gap-3">
									<Trophy className="text-warning h-10 w-10 animate-bounce" />
									<h2 className="from-primary to-secondary bg-gradient-to-r bg-clip-text text-5xl font-extrabold text-transparent">
										{config.finalResultsTitle}
									</h2>
								</div>

								{sortedPlayers[0] && (
									<div className="mb-6 text-center">
										<p className="text-text-muted text-sm font-medium tracking-wider uppercase">
											{config.winnerLabel}
										</p>
										<p className="from-warning bg-gradient-to-r to-amber-500 bg-clip-text text-5xl font-black text-transparent">
											{sortedPlayers[0].name}
										</p>
										<p className="text-text-heading mt-1 text-2xl font-bold">
											{sortedPlayers[0].score} {config.pointsLabel}
										</p>
									</div>
								)}

								<KmPodiumTable entries={podiumEntries} />
							</div>

							<div className="card-glass rounded-2xl p-6">
								<h2 className="text-text-heading mb-4 text-xl font-bold">
									{config.finalScoresLabel}
								</h2>
								<div className="flex flex-col gap-2">
									{sortedPlayers.map((player, index) => (
										<PresenterScoreRow
											key={player.clientId}
											player={player}
											index={index}
										/>
									))}
								</div>
							</div>
						</>
					)}
				</div>
			</HostPresenterLayout.Main>

			{/* ── Bottom Bar (visible during gameplay) ────────────── */}
			{phase !== 'lobby' && phase !== 'final-results' && (
				<div className="card-glass fixed right-0 bottom-0 left-0 z-40 flex items-center justify-between px-8 py-3">
					<span className="text-text-heading text-sm font-bold">
						{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
						<span className="text-text-muted mx-2">·</span>
						<span className="text-primary capitalize">
							{phase.replace('-', ' ')}
						</span>
					</span>
					<div className="flex items-center gap-2">
						<Users className="text-primary h-4 w-4" />
						<span className="text-text-heading text-sm font-bold">
							{sortedPlayers.filter((p) => p.isOnline).length}
						</span>
						<span className="text-text-muted text-sm">
							{config.presenterOnlineLabel}
						</span>
					</div>
					<span className="from-primary to-secondary bg-gradient-to-r bg-clip-text text-sm font-extrabold text-transparent">
						{config.title}
					</span>
				</div>
			)}
		</HostPresenterLayout.Root>
	);
};

const App: React.FC = () => {
	return (
		<KmConfettiProvider>
			<PresenterContent />
		</KmConfettiProvider>
	);
};

export default App;
