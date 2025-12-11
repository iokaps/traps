import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore, type TrapType } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { KmTimeCountdown } from '@kokimoki/shared';
import { Check, Droplets, EyeOff, Shuffle, Snowflake } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const TRAP_SELECTION_TIME = 20000; // 30 seconds

interface TrapOption {
	type: TrapType;
	name: string;
	description: string;
	icon: React.ReactNode;
	color: string;
}

const trapOptions: TrapOption[] = [
	{
		type: 'ice',
		name: config.iceTrapName,
		description: config.iceTrapDescription,
		icon: <Snowflake className="h-6 w-6" />,
		color: 'bg-trap-ice/20 border-trap-ice text-sky-700'
	},
	{
		type: 'mud',
		name: config.mudTrapName,
		description: config.mudTrapDescription,
		icon: <Droplets className="h-6 w-6" />,
		color: 'bg-trap-mud/20 border-trap-mud text-orange-700'
	},
	{
		type: 'mixed',
		name: config.mixedTrapName,
		description: config.mixedTrapDescription,
		icon: <Shuffle className="h-6 w-6" />,
		color: 'bg-trap-mixed/20 border-trap-mixed text-purple-700'
	},
	{
		type: 'missing',
		name: config.missingTrapName,
		description: config.missingTrapDescription,
		icon: <EyeOff className="h-6 w-6" />,
		color: 'bg-trap-missing/20 border-trap-missing text-slate-700'
	}
];

export const TrapSelectionView: React.FC = () => {
	const serverTime = useServerTimer(250);
	const { playSound } = useSoundEffects();
	const { players, trapSelections, trapSelectionStartTimestamp } = useSnapshot(
		globalStore.proxy
	);
	const onlineClientIds = useSnapshot(globalStore.connections).clientIds;

	const [selectedTrap, setSelectedTrap] = React.useState<TrapType | null>(null);
	const [selectedTarget, setSelectedTarget] = React.useState<string | null>(
		null
	);

	const mySelection = trapSelections[kmClient.id];
	const hasSubmitted = Boolean(mySelection);

	// Get other online players as targets
	const targetPlayers = React.useMemo(() => {
		return Object.entries(players)
			.filter(
				([clientId]) =>
					clientId !== kmClient.id && onlineClientIds.has(clientId)
			)
			.map(([clientId, info]) => ({
				clientId,
				name: info.name
			}));
	}, [players, onlineClientIds]);

	// Calculate remaining time
	const elapsed = serverTime - trapSelectionStartTimestamp;
	const remaining = Math.max(0, TRAP_SELECTION_TIME - elapsed);

	const handleSubmit = async () => {
		if (!selectedTrap || !selectedTarget || hasSubmitted) return;
		playSound('trapThrow', 0.5);
		await globalActions.assignTrap(selectedTrap, selectedTarget);
	};

	// Auto-submit when both selected
	React.useEffect(() => {
		if (selectedTrap && selectedTarget && !hasSubmitted) {
			handleSubmit();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTrap, selectedTarget]);

	return (
		<div className="flex w-full max-w-md flex-col gap-6">
			<div className="text-center">
				<h2 className="text-text-heading text-2xl font-bold">
					{config.trapSelectionTitle}
				</h2>
				<p className="text-text-muted">{config.trapSelectionSubtitle}</p>
			</div>

			<div className="flex items-center justify-center gap-2 text-lg">
				<KmTimeCountdown
					ms={remaining}
					display="s"
					className="text-primary text-2xl font-bold"
				/>
			</div>

			{!hasSubmitted ? (
				<>
					{/* Trap Selection */}
					<div>
						<h3 className="text-text-heading mb-2 font-semibold">
							{config.selectTrapLabel}
						</h3>
						<div className="grid grid-cols-2 gap-2">
							{trapOptions.map((trap) => (
								<button
									key={trap.type}
									onClick={() => setSelectedTrap(trap.type)}
									className={cn(
										'flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all',
										selectedTrap === trap.type
											? trap.color
											: 'bg-surface hover:border-primary-light border-gray-200'
									)}
								>
									{trap.icon}
									<span className="text-sm font-medium">{trap.name}</span>
									<span className="text-text-muted text-xs">
										{trap.description}
									</span>
								</button>
							))}
						</div>
					</div>

					{/* Target Selection */}
					<div>
						<h3 className="text-text-heading mb-2 font-semibold">
							{config.selectTargetLabel}
						</h3>
						<div className="flex flex-col gap-2">
							{targetPlayers.map((player) => (
								<button
									key={player.clientId}
									onClick={() => setSelectedTarget(player.clientId)}
									disabled={!selectedTrap}
									className={cn(
										'flex items-center justify-between rounded-xl border-2 p-3 transition-all',
										selectedTarget === player.clientId
											? 'border-secondary bg-secondary/10'
											: 'bg-surface hover:border-secondary/50 border-gray-200',
										!selectedTrap && 'cursor-not-allowed opacity-50'
									)}
								>
									<span className="font-medium">{player.name}</span>
									{selectedTarget === player.clientId && (
										<Check className="text-secondary h-5 w-5" />
									)}
								</button>
							))}
						</div>
					</div>
				</>
			) : (
				<div className="bg-success/10 rounded-xl p-6 text-center">
					<Check className="text-success mx-auto mb-2 h-12 w-12" />
					<p className="text-success-dark text-lg font-bold">
						{config.trapSelectedLabel}
					</p>
					<p className="text-text-muted">{config.waitingForOthersLabel}</p>
				</div>
			)}
		</div>
	);
};
