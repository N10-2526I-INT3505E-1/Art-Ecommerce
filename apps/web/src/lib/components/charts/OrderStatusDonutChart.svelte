<!-- src/lib/components/charts/OrderStatusDonutChart.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface StatusData {
		status: string;
		count: number;
		label: string;
	}

	let {
		data = [],
		height = 300,
		colors = {},
		thickness = 0.2,
		showGlow = true,
	} = $props<{
		data: StatusData[];
		height?: number;
		colors?: Record<string, string>;
		thickness?: number;
		showGlow?: boolean;
	}>();

	// --- Config ---
	const MARGIN = 24;
	const VIEWBOX_SIZE = 400;
	const CENTER = VIEWBOX_SIZE / 2;
	const RADIUS = (VIEWBOX_SIZE - MARGIN * 2) / 2;

	const DEFAULT_COLORS: Record<string, string> = {
		pending: '#f59e0b',
		paid: '#10b981',
		shipped: '#3b82f6',
		delivered: '#8b5cf6',
		cancelled: '#ef4444',
		default: '#d1d5db',
	};

	// --- State ---
	let container = $state<HTMLDivElement>();
	let activeStatus = $state<string | null>(null);
	let isVisible = $state(false);

	// --- Derived ---
	const processedColors = $derived({ ...DEFAULT_COLORS, ...colors });
	const total = $derived(data.reduce((acc, curr) => acc + curr.count, 0));

	const activeItem = $derived(activeStatus ? data.find((d) => d.status === activeStatus) : null);
	const centerLabel = $derived(activeItem ? activeItem.label : 'Tổng Đơn');
	const centerValue = $derived(activeItem ? activeItem.count : total);
	const centerColor = $derived(
		activeItem ? processedColors[activeItem.status] : 'var(--base-content)',
	);

	// --- Chart Setup ---
	function setupChart() {
		if (!container) return;
		d3.select(container).selectAll('*').remove();

		const svg = d3
			.select(container)
			.append('svg')
			.attr('viewBox', `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`)
			.attr('width', '100%')
			.attr('height', '100%')
			.style('overflow', 'hidden')
			.style('display', 'block');

		if (showGlow) {
			const defs = svg.append('defs');
			const filter = defs
				.append('filter')
				.attr('id', 'donut-glow')
				.attr('filterUnits', 'userSpaceOnUse')
				.attr('x', '-50%')
				.attr('y', '-50%')
				.attr('width', '200%')
				.attr('height', '200%');

			filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
			const feMerge = filter.append('feMerge');
			feMerge.append('feMergeNode').attr('in', 'coloredBlur');
			feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
		}

		const g = svg.append('g').attr('transform', `translate(${CENTER}, ${CENTER})`);

		renderSegments(g);
	}

	function renderSegments(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
		const pie = d3
			.pie<StatusData>()
			.value((d) => d.count)
			.sort(null)
			.padAngle(0.04);
		const arcs = pie(data);

		const arc = d3
			.arc<d3.PieArcDatum<StatusData>>()
			.innerRadius(RADIUS * (1 - thickness))
			.outerRadius(RADIUS)
			.cornerRadius(8);

		g.selectAll('path')
			.data(arcs)
			.enter()
			.append('path')
			.attr('d', arc)
			.attr('fill', (d) => processedColors[d.data.status] || processedColors.default)
			.style('filter', showGlow ? 'url(#donut-glow)' : null)
			.style('cursor', 'pointer')
			.attr('stroke', 'transparent')
			.attr('stroke-width', '2px')
			.style('transform-origin', 'center')
			.style('transition', 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s')
			.on('mouseenter', (e, d) => (activeStatus = d.data.status))
			.on('mouseleave', () => (activeStatus = null));

		isVisible = true;
	}

	$effect(() => {
		if (!container || !isVisible) return;
		const paths = d3
			.select(container)
			.selectAll<SVGPathElement, d3.PieArcDatum<StatusData>>('path');
		paths
			.style('opacity', (d) => (!activeStatus || d.data.status === activeStatus ? 1 : 0.3))
			.style('transform', (d) => (d.data.status === activeStatus ? 'scale(1.05)' : 'scale(1)'));
	});

	onMount(() => setupChart());
	$effect(() => {
		if (data) setupChart();
	});
</script>

<div class="wrapper">
	<!-- Chart Section -->
	<div class="chart-container" style="max-width: {height}px;">
		<div bind:this={container} class="svg-layer"></div>

		<!-- Center Text -->
		<div class="center-content">
			{#key centerLabel}
				<div class="center-inner" in:scale={{ start: 0.8, duration: 300, easing: cubicOut }}>
					<span class="value" style="color: {centerColor}">{centerValue}</span>
					<span class="label">{centerLabel}</span>
				</div>
			{/key}
		</div>
	</div>

	<!-- Legend Section -->
	<div class="legend">
		{#each data as item}
			<button
				class="legend-item"
				class:active={activeStatus === item.status}
				class:inactive={activeStatus && activeStatus !== item.status}
				onmouseenter={() => (activeStatus = item.status)}
				onmouseleave={() => (activeStatus = null)}
			>
				<div class="legend-info">
					<span class="dot" style="background-color: {processedColors[item.status]}"></span>
					<span class="name">{item.label}</span>
				</div>
				<div class="legend-stats">
					<span class="percent">{total ? Math.round((item.count / total) * 100) : 0}%</span>
					<span class="count">{item.count}</span>
				</div>
			</button>
		{/each}
	</div>
</div>

<style>
	.wrapper {
		display: flex;
		flex-wrap: wrap; /* CRITICAL FIX: Allows wrapping if container is too small */
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		width: 100%;
	}

	.chart-container {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		flex-shrink: 0;
	}

	.svg-layer {
		width: 100%;
		height: 100%;
	}

	.center-content {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.center-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.value {
		font-size: 2.2rem;
		font-weight: 800;
		line-height: 1;
		transition: color 0.2s;
	}

	.label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		opacity: 0.6;
		margin-top: 4px;
	}

	/* Legend */
	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		min-width: 160px;
		flex: 1;
	}

	.legend-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 6px 8px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.legend-item:hover,
	.legend-item.active {
		background: rgba(0, 0, 0, 0.04);
	}

	.legend-item.inactive {
		opacity: 0.3;
	}

	.legend-info {
		display: flex;
		align-items: center;
		gap: 8px;
		text-align: left;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.name {
		font-size: 0.875rem;
		font-weight: 500;
		color: currentColor;
	}

	.legend-stats {
		display: flex;
		align-items: center;
		gap: 12px;
		font-variant-numeric: tabular-nums;
	}

	.percent {
		font-size: 0.75rem;
		opacity: 0.5;
	}

	.count {
		font-weight: 700;
		font-size: 0.875rem;
	}
</style>
