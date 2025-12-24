<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import { fade, scale } from 'svelte/transition';

	interface StatusData {
		status: string;
		count: number;
		label: string;
	}

	export let data: StatusData[] = [];
	export let height: number = 300; // Container height

	// --- State ---
	let container: HTMLDivElement;
	let width = 0;
	let resizeObserver: ResizeObserver;
	let activeStatus: string | null = null; // Shared state for hover (Chart <-> Legend)

	const statusColors: Record<string, string> = {
		pending: '#f59e0b', // Amber
		paid: '#10b981', // Emerald
		shipped: '#3b82f6', // Blue
		delivered: '#8b5cf6', // Violet
		cancelled: '#ef4444', // Red
		default: '#9ca3af',
	};

	// --- Computed ---
	$: totalCount = data.reduce((sum, d) => sum + d.count, 0);

	// Get data for the center text (either the hovered item or the total)
	$: activeItem = activeStatus ? data.find((d) => d.status === activeStatus) : null;
	$: centerLabel = activeItem ? activeItem.label : 'Tổng đơn';
	$: centerValue = activeItem ? activeItem.count : totalCount;
	$: centerColor = activeItem ? statusColors[activeItem.status] || statusColors.default : '#374151';

	// --- D3 Logic ---
	function drawChart() {
		if (!container || data.length === 0 || width === 0) return;

		d3.select(container).selectAll('*').remove();

		const radius = Math.min(width, height) / 2;
		const innerRadius = radius * 0.65; // Thinner donut looks more modern
		const outerRadius = radius;

		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.append('g')
			.attr('transform', `translate(${width / 2},${height / 2})`);

		const pie = d3
			.pie<StatusData>()
			.value((d) => d.count)
			.sort(null) // Keep order of data array
			.padAngle(0.03); // Space between slices

		const arc = d3
			.arc<d3.PieArcDatum<StatusData>>()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius);

		const arcHover = d3
			.arc<d3.PieArcDatum<StatusData>>()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius + 8); // Expands slightly

		// Create paths
		const paths = svg
			.selectAll('path')
			.data(pie(data))
			.enter()
			.append('path')
			.attr('fill', (d) => statusColors[d.data.status] || statusColors.default)
			.attr('class', 'donut-slice')
			.style('cursor', 'pointer')
			.on('mouseenter', (e, d) => (activeStatus = d.data.status))
			.on('mouseleave', () => (activeStatus = null));

		// Entry Animation (Tween)
		paths
			.transition()
			.duration(750)
			.attrTween('d', function (d) {
				const i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
				return function (t) {
					d.endAngle = i(t);
					return arc(d) || '';
				};
			});

		// Reactive Update function for Hover effects
		// We assign this to a property on the element or keep a reference to update it
		// whenever `activeStatus` changes in the reactive statement below.
		(svg.node() as any).__updateGraph = (currentActive: string | null) => {
			paths
				.transition()
				.duration(200)
				.attr('d', (d) => (d.data.status === currentActive ? arcHover(d) : arc(d)) || '')
				.attr('opacity', (d) => (currentActive && d.data.status !== currentActive ? 0.3 : 1));
		};
	}

	// Update chart when activeStatus changes without full redraw
	$: if (container) {
		const svgNode = d3.select(container).select('svg g').node() as any;
		if (svgNode && svgNode.__updateGraph) {
			svgNode.__updateGraph(activeStatus);
		}
	}

	onMount(() => {
		resizeObserver = new ResizeObserver((entries) => {
			if (entries[0]) {
				width = entries[0].contentRect.width;
				drawChart();
			}
		});
		resizeObserver.observe(container);
	});

	onDestroy(() => resizeObserver?.disconnect());

	// Redraw if data changes
	$: if (data) drawChart();
</script>

<div class="wrapper">
	<!-- Chart Section -->
	<div class="chart-area" style="height: {height}px; width: {height}px;">
		<div bind:this={container} class="d3-container"></div>

		<!-- HTML Center Overlay -->
		<div class="center-content">
			{#key centerValue}
				<div in:scale={{ start: 0.8, duration: 200 }} class="center-inner">
					<div class="center-val" style="color: {centerColor}">{centerValue}</div>
					<div class="center-label">{centerLabel}</div>
				</div>
			{/key}
		</div>
	</div>

	<!-- Legend Section -->
	<div class="legend">
		{#each data as item}
			<button
				class="legend-item"
				class:is-active={activeStatus === item.status}
				class:is-dimmed={activeStatus && activeStatus !== item.status}
				on:mouseenter={() => (activeStatus = item.status)}
				on:mouseleave={() => (activeStatus = null)}
			>
				<span class="dot" style="background-color: {statusColors[item.status] || '#9ca3af'}"></span>
				<div class="legend-text">
					<span class="label">{item.label}</span>
					<span class="percent">
						{Math.round((item.count / totalCount) * 100)}%
					</span>
				</div>
				<span class="count">{item.count}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	/* Tablet/Desktop: Side-by-side layout */
	@media (min-width: 640px) {
		.wrapper {
			flex-direction: row;
			align-items: center;
			justify-content: center;
		}
	}

	.chart-area {
		position: relative;
		/* Aspect ratio enforcement */
		flex-shrink: 0;
	}

	.d3-container {
		width: 100%;
		height: 100%;
	}

	/* Absolute Center Text */
	.center-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none; /* Let clicks pass through to donut */
	}

	.center-inner {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.center-val {
		font-size: 2.25rem;
		font-weight: 800;
		line-height: 1;
		margin-bottom: 0.25rem;
		transition: color 0.2s;
	}

	.center-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Legend */
	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		min-width: 200px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		width: 100%;
		background: transparent;
		border: 1px solid transparent;
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.legend-item:hover {
		background: #f9fafb;
		border-color: #e5e7eb;
	}

	.legend-item.is-dimmed {
		opacity: 0.3;
	}

	.legend-item.is-active {
		background: #f3f4f6;
		transform: scale(1.02);
		border-color: #d1d5db;
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 4px; /* Soft square */
		margin-right: 12px;
		flex-shrink: 0;
	}

	.legend-text {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.label {
		font-size: 0.875rem;
		color: #374151;
		font-weight: 500;
	}

	.percent {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.count {
		font-size: 0.875rem;
		font-weight: 700;
		color: #111827;
	}
</style>
