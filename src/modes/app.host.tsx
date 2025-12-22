import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { KmQrCode } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	useDocumentTitle(title);

	const {
		phase,
		gameConfig,
		players,
		currentRound,
		currentQuestion,
		trapSelections,
		playerAnswers,
		questionGenerationFailed,
		isGeneratingQuestion
	} = useSnapshot(globalStore.proxy);
	const onlineClientIds = useSnapshot(globalStore.connections).clientIds;

	const [totalRounds, setTotalRounds] = React.useState(
		config.defaultTotalRounds
	);
	const [questionTime, setQuestionTime] = React.useState(
		config.defaultQuestionTimeSeconds
	);

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
				<div className="text-sm opacity-70">{config.hostLabel}</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				{/* Game Links */}
				<div className="rounded-lg border border-gray-200 bg-white shadow-md">
					<div className="flex flex-col gap-2 p-6">
						<h2 className="text-xl font-bold">{config.gameLinksTitle}</h2>
						<KmQrCode data={playerLink} size={200} interactive={false} />
						<div className="flex gap-2">
							<a
								href={playerLink}
								target="_blank"
								rel="noreferrer"
								className="break-all text-blue-600 underline hover:text-blue-700"
							>
								{config.playerLinkLabel}
							</a>
							|
							<a
								href={presenterLink}
								target="_blank"
								rel="noreferrer"
								className="break-all text-blue-600 underline hover:text-blue-700"
							>
								{config.presenterLinkLabel}
							</a>
						</div>
					</div>
				</div>

				{/* Game Configuration (Lobby only) */}
				{phase === 'lobby' && (
					<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
						<h2 className="mb-4 text-xl font-bold">
							{config.configureGameTitle}
						</h2>

						<div className="flex flex-col gap-4">
							<div>
								<label className="mb-1 block text-sm font-medium">
									{config.totalRoundsLabel}
								</label>
								<input
									type="number"
									min={1}
									max={50}
									value={totalRounds}
									onChange={(e) => setTotalRounds(Number(e.target.value))}
									className="w-full rounded-lg border border-gray-300 px-3 py-2"
								/>
							</div>

							<div>
								<label className="mb-1 block text-sm font-medium">
									{config.questionTimeLabel}
								</label>
								<input
									type="number"
									min={5}
									max={60}
									value={questionTime}
									onChange={(e) => setQuestionTime(Number(e.target.value))}
									className="w-full rounded-lg border border-gray-300 px-3 py-2"
								/>
							</div>

							<button
								onClick={handleStartGame}
								disabled={onlinePlayers.length < 2}
								className="rounded-lg bg-blue-500 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{config.startGameButton}
							</button>

							{onlinePlayers.length < 2 && (
								<p className="text-sm text-gray-500">
									{config.needMorePlayersMessage}
								</p>
							)}
						</div>
					</div>
				)}

				{/* Game Status (During game) */}
				{phase !== 'lobby' && (
					<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-xl font-bold">
								{config.roundLabel} {currentRound}/{gameConfig.totalRounds}
							</h2>
							<span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
								{phase}
							</span>
						</div>

						{currentQuestion && (
							<div className="mb-4 rounded-lg bg-gray-50 p-3">
								<p className="text-sm text-gray-500">{config.questionTitle}:</p>
								<p className="font-medium">{currentQuestion.question}</p>
							</div>
						)}
						{/* Question Generation Failed - Retry Button */}
						{questionGenerationFailed && (
							<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
								<p className="mb-3 font-medium text-red-700">
									{config.questionGenerationFailedLabel}
								</p>
								<button
									onClick={() => globalActions.retryQuestionGeneration()}
									disabled={isGeneratingQuestion}
									className="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isGeneratingQuestion ? config.loading : config.retryButton}
								</button>
							</div>
						)}
						<button
							onClick={handleResetGame}
							className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
						>
							{config.backToLobbyButton}
						</button>
					</div>
				)}

				{/* Players List */}
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
					<h2 className="mb-4 text-xl font-bold">
						{config.playersLabel} ({onlinePlayers.length})
					</h2>

					<div className="flex flex-col gap-2">
						{playerList
							.sort((a, b) => b.score - a.score)
							.map((player) => (
								<div
									key={player.clientId}
									className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
								>
									<div className="flex items-center gap-2">
										<div
											className={`h-2 w-2 rounded-full ${
												player.isOnline ? 'bg-green-500' : 'bg-gray-300'
											}`}
										/>
										<span className="font-medium">{player.name}</span>
									</div>
									<div className="flex items-center gap-3">
										{phase === 'trap-selection' && (
											<span
												className={`text-sm ${
													player.hasTrap ? 'text-green-600' : 'text-gray-400'
												}`}
											>
												{player.hasTrap ? config.trapSubmittedLabel : '...'}
											</span>
										)}
										{phase === 'question' && (
											<span
												className={`text-sm ${
													player.hasAnswered
														? 'text-green-600'
														: 'text-gray-400'
												}`}
											>
												{player.hasAnswered
													? config.answerSubmittedHostLabel
													: '...'}
											</span>
										)}
										<span className="font-bold">{player.score}</span>
									</div>
								</div>
							))}
					</div>
				</div>
			</HostPresenterLayout.Main>
		</HostPresenterLayout.Root>
	);
};

export default App;
