import { config } from '@/config';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import React from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

/**
 * View to display the game lobby information before the game starts
 */
export const GameLobbyView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	const { players } = useSnapshot(globalStore.proxy);
	const onlineClientIds = useSnapshot(globalStore.connections).clientIds;

	// Get online players
	const onlinePlayers = Object.entries(players)
		.filter(([clientId]) => onlineClientIds.has(clientId))
		.map(([, info]) => info.name);

	return (
		<div
			className={cn(
				'border-primary/20 bg-surface w-full max-w-screen-sm rounded-lg border shadow-md',
				className
			)}
		>
			<div className="prose p-6">
				<Markdown>{config.waitingForHostMd}</Markdown>
			</div>

			<div className="border-primary/20 border-t p-6">
				<h3 className="text-text-heading mb-3 font-bold">
					{config.playersLabel} ({onlinePlayers.length})
				</h3>
				<div className="flex flex-wrap gap-2">
					{onlinePlayers.map((name) => (
						<span
							key={name}
							className="bg-success/20 text-success-dark rounded-full px-3 py-1 text-sm font-medium"
						>
							{name}
						</span>
					))}
				</div>
			</div>
		</div>
	);
};
