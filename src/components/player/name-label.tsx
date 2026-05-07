import { config } from '@/config';
import * as React from 'react';

interface NameLabelProps {
	name: string;
}

/**
 * A label component to display the player's name
 * This example is **optional** and can be removed if not needed
 */
export const NameLabel: React.FC<NameLabelProps> = ({ name }) => {
	return (
		<div className="flex items-center gap-2">
			<span className="text-text-muted">{config.playerNameLabel}</span>
			<span className="text-primary font-bold">{name}</span>
		</div>
	);
};
