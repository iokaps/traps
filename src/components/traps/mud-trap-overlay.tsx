import { config } from '@/config';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/utils/cn';
import { Droplets } from 'lucide-react';
import * as React from 'react';

interface MudTrapOverlayProps {
	swipes: number;
	onSwipe: () => void;
}

export const MudTrapOverlay: React.FC<MudTrapOverlayProps> = ({
	swipes,
	onSwipe
}) => {
	const [swipeProgress, setSwipeProgress] = React.useState(0);
	const [startX, setStartX] = React.useState<number | null>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const { playSound } = useSoundEffects();

	const mudLevel = Math.min(swipes, 3);
	const SWIPE_THRESHOLD = 80; // pixels needed to complete one swipe

	const handleComplete = () => {
		playSound('mudClear', 0.5);
		onSwipe();
		setSwipeProgress(0);
		setStartX(null);
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		setStartX(e.touches[0].clientX);
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (startX === null) return;

		const currentX = e.touches[0].clientX;
		const diff = Math.abs(currentX - startX);
		const progress = Math.min(diff / SWIPE_THRESHOLD, 1);
		setSwipeProgress(progress);

		if (progress >= 1) {
			handleComplete();
		}
	};

	const handleTouchEnd = () => {
		setStartX(null);
		if (swipeProgress < 1) {
			setSwipeProgress(0);
		}
	};

	// Mouse support for desktop testing
	const handleMouseDown = (e: React.MouseEvent) => {
		setStartX(e.clientX);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (startX === null) return;

		const diff = Math.abs(e.clientX - startX);
		const progress = Math.min(diff / SWIPE_THRESHOLD, 1);
		setSwipeProgress(progress);

		if (progress >= 1) {
			handleComplete();
		}
	};

	const handleMouseUp = () => {
		setStartX(null);
		if (swipeProgress < 1) {
			setSwipeProgress(0);
		}
	};

	return (
		<div
			ref={containerRef}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			className={cn(
				'absolute inset-0 flex cursor-grab flex-col items-center justify-center rounded-xl transition-all select-none active:cursor-grabbing',
				mudLevel === 0 &&
					'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800',
				mudLevel === 1 &&
					'bg-gradient-to-br from-amber-600/85 via-amber-700/85 to-amber-800/85',
				mudLevel === 2 &&
					'bg-gradient-to-br from-amber-600/65 via-amber-700/65 to-amber-800/65'
			)}
			style={{
				opacity: 1 - swipeProgress * 0.3
			}}
		>
			<Droplets className="h-8 w-8 text-amber-200" />
			<span className="mt-1 text-sm font-bold text-amber-100">
				{config.swipeToRevealLabel}
			</span>

			{/* Swipe count indicator (like ice tap dots) */}
			<div className="mt-2 flex gap-1">
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className={cn(
							'h-2 w-2 rounded-full transition-colors',
							i < mudLevel ? 'bg-amber-200' : 'bg-amber-900'
						)}
					/>
				))}
			</div>

			{/* Current swipe progress bar */}
			<div className="mt-2 h-1 w-20 overflow-hidden rounded-full bg-amber-900">
				<div
					className="h-full bg-amber-200 transition-all"
					style={{ width: `${swipeProgress * 100}%` }}
				/>
			</div>

			{/* Mud texture overlay */}
			<div
				className="pointer-events-none absolute inset-0 rounded-xl opacity-30"
				style={{
					backgroundImage: `radial-gradient(circle at 20% 30%, rgba(0,0,0,0.3) 0%, transparent 20%),
						radial-gradient(circle at 80% 70%, rgba(0,0,0,0.3) 0%, transparent 20%),
						radial-gradient(circle at 50% 50%, rgba(0,0,0,0.2) 0%, transparent 30%)`
				}}
			/>
		</div>
	);
};
