import { NameLabel } from '@/components/player/name-label';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { PlayerLayout } from '@/layouts/player';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { CategoryVoteView } from '@/views/category-vote-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { FinalResultsView } from '@/views/final-results-view';
import { GameLobbyView } from '@/views/game-lobby-view';
import { GameStartingView } from '@/views/game-starting-view';
import { QuestionView } from '@/views/question-view';
import { RoundResultsView } from '@/views/round-results-view';
import { TrapSelectionView } from '@/views/trap-selection-view';
import { KmModalProvider } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView } = useSnapshot(playerStore.proxy);
	const { phase } = useSnapshot(globalStore.proxy);

	useGlobalController();
	useDocumentTitle(title);

	// Sync player view with global phase
	React.useEffect(() => {
		if (phase === 'lobby') {
			playerActions.setCurrentView('lobby');
		} else if (phase === 'starting') {
			playerActions.setCurrentView('starting');
		} else if (phase === 'category-vote') {
			playerActions.setCurrentView('category-vote');
			// Reset trap state for new round
			playerActions.resetTrapState();
		} else if (phase === 'trap-selection') {
			playerActions.setCurrentView('trap-selection');
		} else if (phase === 'question') {
			playerActions.setCurrentView('question');
		} else if (phase === 'round-results') {
			playerActions.setCurrentView('round-results');
		} else if (phase === 'final-results') {
			playerActions.setCurrentView('final-results');
		}
	}, [phase]);

	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	return (
		<KmModalProvider>
			<PlayerLayout.Root>
				<PlayerLayout.Header />

				<PlayerLayout.Main>
					{currentView === 'lobby' && <GameLobbyView />}
					{currentView === 'starting' && <GameStartingView />}
					{currentView === 'category-vote' && <CategoryVoteView />}
					{currentView === 'trap-selection' && <TrapSelectionView />}
					{currentView === 'question' && <QuestionView />}
					{currentView === 'round-results' && <RoundResultsView />}
					{currentView === 'final-results' && <FinalResultsView />}
				</PlayerLayout.Main>

				<PlayerLayout.Footer>
					<NameLabel name={name} />
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		</KmModalProvider>
	);
};

export default App;
