import { config } from '@/config';
import { globalStore } from '@/state/stores/global-store';
import { Trophy } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

export const CategoryResultView: React.FC = () => {
	const { selectedCategory } = useSnapshot(globalStore.proxy);

	return (
		<div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
			<Trophy className="text-primary h-16 w-16 animate-bounce" />
			<h2 className="text-text-heading text-2xl font-bold">
				{config.categoryResultTitle}
			</h2>
			<p className="from-primary to-secondary bg-gradient-to-r bg-clip-text text-4xl font-extrabold text-transparent">
				{selectedCategory}
			</p>
		</div>
	);
};
