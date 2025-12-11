import { config } from '@/config';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface LayoutProps {
	children?: React.ReactNode;
	className?: string;
}

const HostPresenterRoot: React.FC<LayoutProps> = ({ children, className }) => (
	<div className={cn('bg-page-bg min-h-screen p-8', className)}>{children}</div>
);

const HostPresenterHeader: React.FC<LayoutProps> = ({
	children,
	className
}) => (
	<header className={cn('mb-8', className)}>
		<h1 className="text-text-heading text-3xl font-bold">{config.title}</h1>
		{children}
	</header>
);

const HostPresenterMain: React.FC<LayoutProps> = ({ children, className }) => (
	<main className={cn('mx-auto grid max-w-screen-xl gap-6', className)}>
		{children}
	</main>
);

/**
 * Layout components for the 'host' and 'presenter' modes
 */
export const HostPresenterLayout = {
	Root: HostPresenterRoot,
	Header: HostPresenterHeader,
	Main: HostPresenterMain
};
