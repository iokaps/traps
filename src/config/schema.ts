import { z } from 'zod/v4';

export const schema = z.object({
	// App title
	title: z.string().default('Traps'),

	// Game configuration defaults
	defaultTotalRounds: z.number().default(10),
	defaultQuestionTimeSeconds: z.number().default(15),

	// Lobby
	lobbyTitle: z.string().default('Traps'),
	lobbySubtitle: z.string().default('Real-time Trivia with Sabotage!'),
	waitingForHostMd: z
		.string()
		.default(
			'# Waiting for game to start...\nThe host will start the game soon.'
		),
	playersLabel: z.string().default('Players'),
	startGameButton: z.string().default('Start Game'),
	configureGameTitle: z.string().default('Game Settings'),
	totalRoundsLabel: z.string().default('Total Rounds'),
	questionTimeLabel: z.string().default('Question Time (seconds)'),

	// Game Starting
	gameStartingTitle: z.string().default('Get Ready!'),
	getReadyMessage: z.string().default('The game is about to begin...'),
	generatingCategoriesMessage: z.string().default('Generating categories...'),

	// Category Vote
	categoryVoteTitle: z.string().default('Vote for a Category'),
	categoryVoteSubtitle: z
		.string()
		.default('Choose a topic for the next question'),
	votesLabel: z.string().default('votes'),
	categoryVoteTimeLabel: z.string().default('Time remaining'),

	// Trap Selection
	trapSelectionTitle: z.string().default('Throw a Trap!'),
	trapSelectionSubtitle: z
		.string()
		.default('Select a trap and choose your target'),
	selectTrapLabel: z.string().default('Select Trap'),
	selectTargetLabel: z.string().default('Select Target'),
	trapSelectedLabel: z.string().default('Trap Ready!'),
	waitingForOthersLabel: z.string().default('Waiting for other players...'),

	// Trap names and descriptions
	iceTrapName: z.string().default('Ice Trap'),
	iceTrapDescription: z
		.string()
		.default('Freezes answers - tap 3 times to break'),
	mudTrapName: z.string().default('Mud Trap'),
	mudTrapDescription: z.string().default('Covers answers - swipe to reveal'),
	mixedTrapName: z.string().default('Mixed Letters'),
	mixedTrapDescription: z.string().default('Scrambles the letters in answers'),
	missingTrapName: z.string().default('Missing Letters'),
	missingTrapDescription: z.string().default('Removes letters from answers'),

	// Question
	questionTitle: z.string().default('Question'),
	roundLabel: z.string().default('Round'),
	timeRemainingLabel: z.string().default('Time'),
	tapToBreakIceLabel: z.string().default('Tap 3x to break ice'),
	swipeToRevealLabel: z.string().default('Swipe to reveal'),
	answerSubmittedLabel: z.string().default('Answer submitted!'),
	waitingForResultsLabel: z.string().default('Waiting for results...'),

	// Round Results
	roundResultsTitle: z.string().default('Round Results'),
	correctAnswerLabel: z.string().default('Correct Answer'),
	pointsEarnedLabel: z.string().default('Points Earned'),
	leaderboardTitle: z.string().default('Leaderboard'),
	correctLabel: z.string().default('Correct!'),
	incorrectLabel: z.string().default('Incorrect'),
	noAnswerLabel: z.string().default('No answer'),

	// Final Results
	finalResultsTitle: z.string().default('Game Over!'),
	winnerLabel: z.string().default('Winner'),
	winnerCelebrationTitle: z.string().default('🎉 You Won! 🎉'),
	winnerCelebrationSubtitle: z.string().default('Champion of the game!'),
	finalScoresLabel: z.string().default('Final Scores'),
	backToLobbyButton: z.string().default('Back to Lobby'),

	// Host/Presenter labels
	hostLabel: z.string().default('Host'),
	presenterLabel: z.string().default('Presenter'),
	gameLinksTitle: z.string().default('Game Links'),
	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Link'),

	// Player profile
	playerNameTitle: z.string().default('Enter Your Name'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Join Game'),

	// Misc
	loading: z.string().default('Loading...'),
	retryButton: z.string().default('Retry'),
	questionGenerationFailedLabel: z
		.string()
		.default('Question generation failed. Please try again.'),

	// Presenter specific
	presenterTrapActivityTitle: z.string().default('Trap Activity'),
	presenterAnswerProgressTitle: z.string().default('Answer Progress'),
	answeredLabel: z.string().default('answered'),

	// Additional labels
	youLabel: z.string().default('You'),
	scoreLabel: z.string().default('Score'),
	needMorePlayersMessage: z
		.string()
		.default('Need at least 2 players to start'),
	trapSubmittedLabel: z.string().default('✓ Trap'),
	answerSubmittedHostLabel: z.string().default('✓ Answered'),
	categoryLabel: z.string().default('Category'),
	pointsLabel: z.string().default('points'),

	// AI prompts (for customization)
	questionGenerationPrompt: z
		.string()
		.default(
			'Generate 1 medium-difficulty trivia question about the topic. Return as JSON with: question (string), answers (array of 4 strings), correctIndex (number 0-3). All wrong answers should be plausible. No trick questions.'
		)
});

export type Config = z.infer<typeof schema>;
