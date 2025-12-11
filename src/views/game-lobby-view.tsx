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
				'w-full max-w-screen-sm rounded-lg border border-gray-200 bg-white shadow-md',
				className
			)}
		>
			<div className="prose p-6">
				<Markdown>{config.waitingForHostMd}</Markdown>
			</div>

			<div className="border-t border-gray-200 p-6">
				<h3 className="mb-3 font-bold">
					{config.playersLabel} ({onlinePlayers.length})
				</h3>
				<div className="flex flex-wrap gap-2">
					{onlinePlayers.map((name) => (
						<span
							key={name}
							className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
						>
							{name}
						</span>
					))}
				</div>
			</div>
		</div>
	);
};
