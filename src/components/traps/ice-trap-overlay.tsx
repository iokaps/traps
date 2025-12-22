import { config } from '@/config';
import { cn } from '@/utils/cn';
import { Snowflake } from 'lucide-react';
import * as React from 'react';

interface IceTrapOverlayProps {
	taps: number;
	onTap: () => void;
}

export const IceTrapOverlay: React.FC<IceTrapOverlayProps> = ({
	taps,
	onTap
}) => {
	const crackLevel = Math.min(taps, 3);

	const handleTap = (e: React.MouseEvent) => {
		e.stopPropagation();
		onTap();
	};

	return (
		<button
			onClick={handleTap}
			className={cn(
				'absolute inset-0 flex flex-col items-center justify-center rounded-xl transition-all',
				crackLevel === 0 && 'bg-cyan-300',
				crackLevel === 1 && 'bg-cyan-300/90',
				crackLevel === 2 && 'bg-cyan-300/75'
			)}
		>
			<Snowflake
				className={cn(
					'h-8 w-8 text-cyan-600 transition-transform',
					crackLevel === 1 && 'rotate-12',
					crackLevel === 2 && 'scale-90 -rotate-12'
				)}
			/>
			<span className="mt-1 text-sm font-bold text-cyan-700">
				{config.tapToBreakIceLabel}
			</span>
			<div className="mt-1 flex gap-1">
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className={cn(
							'h-2 w-2 rounded-full transition-colors',
							i < crackLevel ? 'bg-cyan-600' : 'bg-cyan-300'
						)}
					/>
				))}
			</div>

			{/* Crack effect */}
			{crackLevel > 0 && (
				<svg
					className="pointer-events-none absolute inset-0 h-full w-full"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
				>
					{crackLevel >= 1 && (
						<path
							d="M30,0 L35,30 L20,50 L40,70 L30,100"
							stroke="rgba(255,255,255,0.8)"
							strokeWidth="2"
							fill="none"
						/>
					)}
					{crackLevel >= 2 && (
						<path
							d="M70,0 L60,25 L75,45 L55,65 L70,100"
							stroke="rgba(255,255,255,0.8)"
							strokeWidth="2"
							fill="none"
						/>
					)}
				</svg>
			)}
		</button>
	);
};
