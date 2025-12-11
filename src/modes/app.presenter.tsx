import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useServerTimer } from '@/hooks/useServerTime';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import {
	KmConfettiProvider,
	KmPodiumTable,
	KmQrCode,
	KmTimeCountdown,
	useKmConfettiContext
} from '@kokimoki/shared';
import { Droplets, EyeOff, Shuffle, Snowflake, Trophy } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const CATEGORY_VOTE_TIME = 15000;
const TRAP_SELECTION_TIME = 20000;
const ROUND_RESULTS_TIME = 5000;

const TrapIcon: React.FC<{ type: string }> = ({ type }) => {
	switch (type) {
		case 'ice':
			return <Snowflake className="h-4 w-4 text-cyan-500" />;
		case 'mud':
			return <Droplets className="h-4 w-4 text-amber-600" />;
		case 'mixed':
			return <Shuffle className="h-4 w-4 text-purple-500" />;
		case 'missing':
			return <EyeOff className="h-4 w-4 text-gray-500" />;
		default:
			return null;
	}
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
		roundResultsStartTimestamp
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

	// Podium data - only include players that exist
	const podiumEntries = sortedPlayers
		.slice(0, 3)
		.filter((player) => player && player.name)
		.map((player) => ({
			id: player.clientId,
			name: player.name,
			points: player.score ?? 0
		}));

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header>
				<div className="flex items-center gap-4">
					<span className="text-sm opacity-70">{config.presenterLabel}</span>
					{phase !== 'lobby' && (
						<span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
							{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
						</span>
					)}
				</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				{/* Lobby View */}
				{phase === 'lobby' && (
					<>
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<div className="flex flex-col items-center gap-4">
								<h2 className="text-2xl font-bold">{config.lobbyTitle}</h2>
								<p className="text-gray-600">{config.lobbySubtitle}</p>
								<KmQrCode data={playerLink} size={300} interactive={false} />
								<a
									href={playerLink}
									target="_blank"
									rel="noreferrer"
									className="text-blue-600 underline hover:text-blue-700"
								>
									{config.playerLinkLabel}
								</a>
							</div>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">
								{config.playersLabel} (
								{sortedPlayers.filter((p) => p.isOnline).length})
							</h2>
							<div className="flex flex-wrap gap-2">
								{sortedPlayers.map((player) => (
									<div
										key={player.clientId}
										className={`rounded-full px-4 py-2 font-medium ${
											player.isOnline
												? 'bg-green-100 text-green-700'
												: 'bg-gray-100 text-gray-400'
										}`}
									>
										{player.name}
									</div>
								))}
							</div>
						</div>
					</>
				)}

				{/* Category Vote View */}
				{phase === 'category-vote' && (
					<>
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-2xl font-bold">
									{config.categoryVoteTitle}
								</h2>
								<KmTimeCountdown
									ms={getCategoryVoteRemaining()}
									display="s"
									className="text-3xl font-bold"
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
											className="relative overflow-hidden rounded-xl border-2 border-gray-200 p-4"
										>
											<div
												className="absolute inset-0 bg-blue-100 transition-all"
												style={{ width: `${percentage}%` }}
											/>
											<div className="relative flex items-center justify-between">
												<span className="text-lg font-medium">{category}</span>
												<span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-bold text-white">
													{votes}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</>
				)}

				{/* Trap Selection View */}
				{phase === 'trap-selection' && (
					<>
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<div className="mb-4 flex items-center justify-between">
								<div>
									<h2 className="text-2xl font-bold">
										{config.trapSelectionTitle}
									</h2>
									<p className="text-gray-600">
										Category:{' '}
										<span className="font-bold">{selectedCategory}</span>
									</p>
								</div>
								<KmTimeCountdown
									ms={getTrapSelectionRemaining()}
									display="s"
									className="text-3xl font-bold"
								/>
							</div>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">
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
											className="flex items-center gap-2 rounded-lg bg-gray-50 p-3"
										>
											<span className="font-medium">{fromPlayer.name}</span>
											<span className="text-gray-400">→</span>
											<TrapIcon type={selection.trapType} />
											<span className="text-gray-400">→</span>
											<span className="font-medium">{toPlayer.name}</span>
										</div>
									);
								})}
							</div>
						</div>
					</>
				)}

				{/* Question View */}
				{phase === 'question' && currentQuestion && (
					<>
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<div className="mb-4 flex items-center justify-between">
								<span className="text-gray-500">{config.questionTitle}</span>
								<KmTimeCountdown
									ms={getQuestionRemaining()}
									display="s"
									className={`text-3xl font-bold ${
										getQuestionRemaining() <= 5000
											? 'animate-pulse text-red-500'
											: ''
									}`}
								/>
							</div>
							<h2 className="mb-6 text-3xl font-bold">
								{currentQuestion.question}
							</h2>

							<div className="grid grid-cols-2 gap-4">
								{currentQuestion.answers.map((answer, index) => (
									<div
										key={index}
										className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-lg"
									>
										{answer}
									</div>
								))}
							</div>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">
								{config.presenterAnswerProgressTitle}
							</h2>
							<div className="flex items-center gap-4">
								<div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
									<div
										className="h-full bg-green-500 transition-all"
										style={{
											width: `${
												(Object.keys(playerAnswers).length /
													sortedPlayers.filter((p) => p.isOnline).length) *
												100
											}%`
										}}
									/>
								</div>
								<span className="font-bold">
									{Object.keys(playerAnswers).length}/
									{sortedPlayers.filter((p) => p.isOnline).length}{' '}
									{config.answeredLabel}
								</span>
							</div>
						</div>

						{/* Trap Activity */}
						{Object.keys(activeTraps).length > 0 && (
							<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
								<h2 className="mb-4 text-xl font-bold">
									{config.presenterTrapActivityTitle}
								</h2>
								<div className="flex flex-wrap gap-2">
									{Object.entries(activeTraps).map(([targetId, traps]) => {
										const targetPlayer = players[targetId];
										if (!targetPlayer) return null;

										return (
											<div
												key={targetId}
												className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2"
											>
												<span className="font-medium">{targetPlayer.name}</span>
												<div className="flex gap-1">
													{traps.map((trap, i) => (
														<TrapIcon key={i} type={trap.trapType} />
													))}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</>
				)}

				{/* Round Results View */}
				{phase === 'round-results' && currentQuestion && (
					<>
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-2xl font-bold">
								{config.roundResultsTitle}
							</h2>
							<div className="mb-4 rounded-xl bg-green-50 p-4">
								<p className="text-sm text-gray-500">
									{config.correctAnswerLabel}:
								</p>
								<p className="text-2xl font-bold text-green-600">
									{currentQuestion.answers[currentQuestion.correctIndex]}
								</p>
							</div>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">
								{config.leaderboardTitle}
							</h2>
							<div className="flex flex-col gap-2">
								{sortedPlayers.map((player, index) => {
									const roundPoints =
										playerAnswers[player.clientId]?.pointsEarned || 0;

									return (
										<div
											key={player.clientId}
											className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
										>
											<div className="flex items-center gap-3">
												<span
													className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
														index === 0
															? 'bg-yellow-400 text-yellow-900'
															: index === 1
																? 'bg-gray-300 text-gray-700'
																: index === 2
																	? 'bg-amber-600 text-amber-100'
																	: 'bg-gray-100 text-gray-600'
													}`}
												>
													{index + 1}
												</span>
												<span className="text-lg font-medium">
													{player.name}
												</span>
											</div>
											<div className="flex items-center gap-3">
												{roundPoints > 0 && (
													<span className="text-green-600">+{roundPoints}</span>
												)}
												<span className="text-xl font-bold">
													{player.score}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</>
				)}

				{/* Final Results View */}
				{phase === 'final-results' && (
					<>
						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<div className="mb-6 flex items-center justify-center gap-2">
								<Trophy className="h-10 w-10 text-yellow-500" />
								<h2 className="text-3xl font-bold">
									{config.finalResultsTitle}
								</h2>
							</div>

							{sortedPlayers[0] && (
								<div className="mb-6 text-center">
									<p className="text-gray-500">{config.winnerLabel}</p>
									<p className="text-4xl font-bold text-yellow-600">
										🎉 {sortedPlayers[0].name} 🎉
									</p>
									<p className="text-2xl font-bold">
										{sortedPlayers[0].score} points
									</p>
								</div>
							)}

							<KmPodiumTable entries={podiumEntries} />
						</div>

						<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
							<h2 className="mb-4 text-xl font-bold">
								{config.finalScoresLabel}
							</h2>
							<div className="flex flex-col gap-2">
								{sortedPlayers.map((player, index) => (
									<div
										key={player.clientId}
										className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
									>
										<div className="flex items-center gap-3">
											<span
												className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
													index === 0
														? 'bg-yellow-400 text-yellow-900'
														: index === 1
															? 'bg-gray-300 text-gray-700'
															: index === 2
																? 'bg-amber-600 text-amber-100'
																: 'bg-gray-100 text-gray-600'
												}`}
											>
												{index + 1}
											</span>
											<span className="text-lg font-medium">{player.name}</span>
										</div>
										<span className="text-xl font-bold">{player.score}</span>
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</HostPresenterLayout.Main>
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
