import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useServerTimer } from '@/hooks/useServerTime';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { KmQrCode, KmTimeCountdown } from '@kokimoki/shared';
import { HelpCircle, X } from 'lucide-react';
import * as React from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

const GAME_START_COUNTDOWN = 5000;

const phaseColors: Record<string, string> = {
	'category-vote': 'bg-accent/15 text-accent',
	'trap-selection': 'bg-trap-mixed/15 text-trap-mixed',
	question: 'bg-primary/15 text-primary',
	'round-results': 'bg-success/15 text-success-dark',
	'final-results': 'bg-warning/30 text-yellow-800',
	starting: 'bg-secondary/15 text-secondary'
};

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	useDocumentTitle(title);
	const serverTime = useServerTimer(100);

	const {
		phase,
		gameConfig,
		players,
		currentRound,
		currentQuestion,
		trapSelections,
		playerAnswers,
		questionGenerationFailed,
		isGeneratingQuestion,
		gameStartTimestamp
	} = useSnapshot(globalStore.proxy);
	const onlineClientIds = useSnapshot(globalStore.connections).clientIds;

	const [totalRounds, setTotalRounds] = React.useState(
		config.defaultTotalRounds
	);
	const [questionTime, setQuestionTime] = React.useState(
		config.defaultQuestionTimeSeconds
	);
	const [showHowToPlay, setShowHowToPlay] = React.useState(false);

	if (kmClient.clientContext.mode !== 'host') {
		throw new Error('App host rendered in non-host mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	const presenterLink = generateLink(kmClient.clientContext.presenterCode, {
		mode: 'presenter',
		playerCode: kmClient.clientContext.playerCode
	});

	const handleStartGame = async () => {
		await globalActions.setGameConfig({
			totalRounds,
			questionTimeSeconds: questionTime
		});
		await globalActions.startGame();
	};

	const handleResetGame = async () => {
		await globalActions.resetToLobby();
	};

	// Count online players
	const onlinePlayers = Object.entries(players).filter(([clientId]) =>
		onlineClientIds.has(clientId)
	);

	// Get player list with status
	const playerList = Object.entries(players).map(([clientId, info]) => ({
		clientId,
		name: info.name,
		score: info.score,
		isOnline: onlineClientIds.has(clientId),
		hasAnswered: Boolean(playerAnswers[clientId]),
		hasTrap: Boolean(trapSelections[clientId])
	}));

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header>
				<div className="flex items-center gap-3">
					<span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold">
						{config.hostLabel}
					</span>
					<button
						onClick={() => setShowHowToPlay(true)}
						className="border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-full border bg-white/60 px-3 py-1 text-sm font-medium transition-colors"
					>
						<HelpCircle className="h-4 w-4" />
						{config.howToPlayButton}
					</button>
				</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				{/* Game Links */}
				<div className="card-glass rounded-2xl">
					<div className="flex flex-col items-center gap-3 p-6">
						<h2 className="text-text-heading text-lg font-bold">
							{config.gameLinksTitle}
						</h2>
						<KmQrCode data={playerLink} size={200} interactive={false} />
						<div className="flex items-center gap-3 text-sm">
							<a
								href={playerLink}
								target="_blank"
								rel="noreferrer"
								className="text-primary decoration-primary/30 hover:text-primary-dark hover:decoration-primary font-medium break-all underline underline-offset-2 transition-colors"
							>
								{config.playerLinkLabel}
							</a>
							<span className="text-text-muted">|</span>
							<a
								href={presenterLink}
								target="_blank"
								rel="noreferrer"
								className="text-primary decoration-primary/30 hover:text-primary-dark hover:decoration-primary font-medium break-all underline underline-offset-2 transition-colors"
							>
								{config.presenterLinkLabel}
							</a>
						</div>
					</div>
				</div>

				{/* Game Configuration (Lobby only) */}
				{phase === 'lobby' && (
					<div className="card-glass rounded-2xl p-6">
						<h2 className="text-text-heading mb-5 text-lg font-bold">
							{config.configureGameTitle}
						</h2>

						<div className="flex flex-col gap-5">
							<div>
								<label className="text-text-body mb-1.5 block text-sm font-semibold">
									{config.totalRoundsLabel}
								</label>
								<input
									type="number"
									min={1}
									max={50}
									value={totalRounds}
									onChange={(e) => setTotalRounds(Number(e.target.value))}
									className="border-primary/20 focus:border-primary focus:ring-primary/20 w-full rounded-xl border bg-white/80 px-4 py-2.5 transition-all focus:ring-2 focus:outline-none"
								/>
							</div>

							<div>
								<label className="text-text-body mb-1.5 block text-sm font-semibold">
									{config.questionTimeLabel}
								</label>
								<input
									type="number"
									min={5}
									max={60}
									value={questionTime}
									onChange={(e) => setQuestionTime(Number(e.target.value))}
									className="border-primary/20 focus:border-primary focus:ring-primary/20 w-full rounded-xl border bg-white/80 px-4 py-2.5 transition-all focus:ring-2 focus:outline-none"
								/>
							</div>

							<button
								onClick={handleStartGame}
								disabled={onlinePlayers.length < 2}
								className="from-primary to-primary-dark shadow-primary/25 hover:shadow-primary/30 rounded-xl bg-gradient-to-r px-4 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
							>
								{config.startGameButton}
							</button>

							{onlinePlayers.length < 2 && (
								<p className="text-text-muted text-center text-sm">
									{config.needMorePlayersMessage}
								</p>
							)}
						</div>
					</div>
				)}

				{/* Starting Phase Countdown */}
				{phase === 'starting' && (
					<div className="card-glass rounded-2xl p-6">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-text-heading text-lg font-bold">
								{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
							</h2>
							<span
								className={cn(
									'rounded-full px-3 py-1 text-sm font-semibold',
									phaseColors[phase]
								)}
							>
								{phase}
							</span>
						</div>
						<div className="flex flex-col items-center gap-4 py-4">
							<div className="relative">
								<div className="animate-pulse-ring bg-primary/30 absolute inset-0 rounded-full" />
								<div className="from-primary to-secondary shadow-primary/30 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br shadow-xl">
									{gameStartTimestamp > 0 ? (
										<KmTimeCountdown
											ms={Math.max(
												0,
												GAME_START_COUNTDOWN - (serverTime - gameStartTimestamp)
											)}
											display="s"
											className="text-3xl font-bold text-white"
										/>
									) : (
										<div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
									)}
								</div>
							</div>
							<p className="text-text-muted text-sm">
								{config.getReadyMessage}
							</p>
						</div>
						<div className="flex justify-center">
							<button
								onClick={handleResetGame}
								className="bg-error/10 text-error-dark hover:bg-error/20 rounded-xl px-4 py-2 font-medium transition-colors"
							>
								{config.backToLobbyButton}
							</button>
						</div>
					</div>
				)}

				{/* Game Status (During game) */}
				{phase !== 'lobby' && phase !== 'starting' && (
					<div className="card-glass rounded-2xl p-6">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-text-heading text-lg font-bold">
								{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
							</h2>
							<span
								className={cn(
									'rounded-full px-3 py-1 text-sm font-semibold',
									phaseColors[phase] || 'bg-primary/10 text-primary'
								)}
							>
								{phase}
							</span>
						</div>

						{currentQuestion && (
							<div className="bg-primary/5 mb-4 rounded-xl p-4">
								<p className="text-text-muted mb-1 text-xs font-semibold tracking-wider uppercase">
									{config.questionTitle}
								</p>
								<p className="text-text-heading font-semibold">
									{currentQuestion.question}
								</p>
							</div>
						)}
						{/* Question Generation Failed - Retry Button */}
						{questionGenerationFailed && (
							<div className="border-error/20 bg-error/5 mb-4 rounded-xl border p-4">
								<p className="text-error-dark mb-3 font-medium">
									{config.questionGenerationFailedLabel}
								</p>
								<button
									onClick={() => globalActions.retryQuestionGeneration()}
									disabled={isGeneratingQuestion}
									className="from-primary to-primary-dark rounded-xl bg-gradient-to-r px-4 py-2 font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isGeneratingQuestion ? config.loading : config.retryButton}
								</button>
							</div>
						)}
						<button
							onClick={handleResetGame}
							className="bg-error/10 text-error-dark hover:bg-error/20 rounded-xl px-4 py-2 font-medium transition-colors"
						>
							{config.backToLobbyButton}
						</button>
					</div>
				)}

				{/* Players List */}
				<div className="card-glass rounded-2xl p-6">
					<h2 className="text-text-heading mb-4 text-lg font-bold">
						{config.playersLabel} ({onlinePlayers.length})
					</h2>

					<div className="flex flex-col gap-2">
						{playerList
							.sort((a, b) => b.score - a.score)
							.map((player) => (
								<div
									key={player.clientId}
									className="flex items-center justify-between rounded-xl bg-white/60 p-3 transition-colors"
								>
									<div className="flex items-center gap-2.5">
										<div
											className={cn(
												'h-2.5 w-2.5 rounded-full',
												player.isOnline
													? 'bg-success shadow-success/50 shadow-sm'
													: 'bg-gray-300'
											)}
										/>
										<span className="font-semibold">{player.name}</span>
									</div>
									<div className="flex items-center gap-3">
										{phase === 'trap-selection' && (
											<span
												className={cn(
													'text-sm font-medium',
													player.hasTrap
														? 'text-success-dark'
														: 'text-text-muted'
												)}
											>
												{player.hasTrap ? config.trapSubmittedLabel : '...'}
											</span>
										)}
										{phase === 'question' && (
											<span
												className={cn(
													'text-sm font-medium',
													player.hasAnswered
														? 'text-success-dark'
														: 'text-text-muted'
												)}
											>
												{player.hasAnswered
													? config.answerSubmittedHostLabel
													: '...'}
											</span>
										)}
										<span className="text-text-heading min-w-[2rem] text-right font-bold">
											{player.score}
										</span>
									</div>
								</div>
							))}
					</div>
				</div>
			</HostPresenterLayout.Main>

			{/* How to Play Modal */}
			{showHowToPlay && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
					onClick={() => setShowHowToPlay(false)}
				>
					<div
						className="relative mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => setShowHowToPlay(false)}
							className="text-text-muted hover:text-text-body absolute top-4 right-4 rounded-full p-1.5 transition-colors hover:bg-gray-100"
						>
							<X className="h-5 w-5" />
						</button>
						<div className="prose prose-sm max-w-none">
							<Markdown>{config.howToPlayContentMd}</Markdown>
						</div>
					</div>
				</div>
			)}
		</HostPresenterLayout.Root>
	);
};

export default App;
