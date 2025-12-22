import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { KmTimeCountdown } from '@kokimoki/shared';
import { Check } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const CATEGORY_VOTE_TIME = 15000; // 15 seconds

export const CategoryVoteView: React.FC = () => {
	const serverTime = useServerTimer(250);
	const { categoryOptions, categoryVotes, categoryVoteStartTimestamp } =
		useSnapshot(globalStore.proxy);

	const myVote = categoryVotes[kmClient.id];
	const hasVoted = Boolean(myVote);

	// Calculate remaining time
	const elapsed = serverTime - categoryVoteStartTimestamp;
	const remaining = Math.max(0, CATEGORY_VOTE_TIME - elapsed);

	// Count votes per category
	const voteCounts = React.useMemo(() => {
		const counts: Record<string, number> = {};
		categoryOptions.forEach((opt) => (counts[opt] = 0));
		Object.values(categoryVotes).forEach((voted) => {
			if (counts[voted] !== undefined) {
				counts[voted]++;
			}
		});
		return counts;
	}, [categoryOptions, categoryVotes]);

	const handleVote = async (category: string) => {
		if (hasVoted) return;
		await globalActions.submitCategoryVote(category);
	};

	// Show loading if categories not yet generated
	if (categoryOptions.length === 0) {
		return (
			<div className="flex w-full max-w-md flex-col items-center gap-4">
				<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
				<p className="text-text-muted">{config.loading}</p>
			</div>
		);
	}

	return (
		<div className="flex w-full max-w-md flex-col gap-6">
			<div className="text-center">
				<h2 className="text-text-heading text-2xl font-bold">
					{config.categoryVoteTitle}
				</h2>
				<p className="text-text-muted">{config.categoryVoteSubtitle}</p>
			</div>

			<div className="flex items-center justify-center gap-2 text-lg">
				<span className="text-text-muted">{config.categoryVoteTimeLabel}:</span>
				<KmTimeCountdown
					ms={remaining}
					display="s"
					className="text-primary font-bold"
				/>
			</div>

			<div className="flex flex-col gap-3">
				{categoryOptions.map((category) => {
					const isSelected = myVote === category;
					const voteCount = voteCounts[category] || 0;

					return (
						<button
							key={category}
							onClick={() => handleVote(category)}
							disabled={hasVoted}
							className={cn(
								'relative flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all',
								isSelected
									? 'border-primary bg-primary/10'
									: 'bg-surface hover:border-primary-light hover:bg-primary/5 border-gray-200',
								hasVoted && !isSelected && 'opacity-60'
							)}
						>
							<span className="text-lg font-medium">{category}</span>
							<div className="flex items-center gap-2">
								{voteCount > 0 && (
									<span className="text-text-muted text-sm">
										{voteCount} {config.votesLabel}
									</span>
								)}
								{isSelected && <Check className="text-primary h-5 w-5" />}
							</div>
						</button>
					);
				})}
			</div>

			{hasVoted && (
				<p className="text-text-muted text-center">
					{config.waitingForOthersLabel}
				</p>
			)}
		</div>
	);
};
