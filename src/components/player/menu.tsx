import { config } from '@/config';
import { playerActions } from '@/state/actions/player-actions';
import { playerStore } from '@/state/stores/player-store';
import { useKmModal } from '@kokimoki/shared';
import { MenuIcon } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

/**
 * Menu component for player mode - shows player name and option to change it
 */
export const PlayerMenu: React.FC = () => {
	const { openDrawer, closeModal } = useKmModal();
	const { name } = useSnapshot(playerStore.proxy);

	const handleChangeName = () => {
		// Clear name to show profile creation screen
		playerActions.clearPlayerName();
		closeModal();
	};

	const handleOpen = () => {
		openDrawer({
			title: config.menuTitle,
			content: (
				<div className="flex h-full w-full flex-col gap-4 p-4">
					<div className="rounded-lg bg-gray-50 p-4">
						<p className="text-sm text-gray-500">{config.playerNameLabel}</p>
						<p className="text-lg font-bold">{name}</p>
					</div>
					<button
						onClick={handleChangeName}
						className="w-full rounded-lg bg-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-300"
					>
						Change Name
					</button>
				</div>
			)
		});
	};

	return (
		<button
			className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
			onClick={handleOpen}
		>
			<MenuIcon className="h-6 w-6 text-white" />
			<span className="sr-only">{config.menuAriaLabel}</span>
		</button>
	);
};
