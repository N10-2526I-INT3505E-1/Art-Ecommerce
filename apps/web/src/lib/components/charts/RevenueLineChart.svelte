<!-- src/lib/components/charts/RevenueLineChart.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import { fade } from 'svelte/transition';

	// --- Types ---
	interface RevenueData {
		date: string;
		revenue: number;
	}

	interface TooltipData {
		date: Date;
		revenue: number;
		x: number;
		y: number;
	}

	// --- Props ---
	let {
		data = [],
		height = 300, // Used as min-height
		color = '#3b82f6',
		showGlow = true,
		locale = 'vi-VN',
	} = $props<{
		data: RevenueData[];
		height?: number;
		color?: string;
		showGlow?: boolean;
		locale?: string;
	}>();

	// --- State ---
	let container = $state<HTMLDivElement>();
	let width = $state(0);
	let currentHeight = $state(0); // Track observed height
	let resizeObserver: ResizeObserver;
	let tooltip = $state<TooltipData | null>(null);
	let isHovering = $state(false);

	const CHART_ID = Math.random().toString(36).slice(2, 9);
	const GRADIENT_ID = `area-grad-${CHART_ID}`;
	const GLOW_ID = `line-glow-${CHART_ID}`;
	const MARGIN = { top: 20, right: 10, bottom: 30, left: 45 };

	// --- Formatters ---
	const currencyFmt = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: 'VND',
		maximumFractionDigits: 0,
	});

	const dateFmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });

	function formatAxisValue(val: number): string {
		if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
		if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
		if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
		return val.toString();
	}

	// --- D3 Logic ---
	function drawChart() {
		if (!container || width === 0 || currentHeight === 0 || data.length === 0) return;

		const parsedData = data
			.map((d) => ({ date: new Date(d.date), revenue: d.revenue }))
			.sort((a, b) => a.date.getTime() - b.date.getTime());

		d3.select(container).selectAll('*').remove();

		// Use the observed dimensions (minus margins)
		const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
		const innerHeight = Math.max(0, currentHeight - MARGIN.top - MARGIN.bottom);

		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', `0 0 ${width} ${currentHeight}`)
			.style('overflow', 'visible');

		// Defs
		const defs = svg.append('defs');

		// 1. Area Gradient
		const gradient = defs
			.append('linearGradient')
			.attr('id', GRADIENT_ID)
			.attr('x1', '0%')
			.attr('y1', '0%')
			.attr('x2', '0%')
			.attr('y2', '100%');
		gradient
			.append('stop')
			.attr('offset', '0%')
			.attr('stop-color', color)
			.attr('stop-opacity', 0.4);
		gradient
			.append('stop')
			.attr('offset', '80%')
			.attr('stop-color', color)
			.attr('stop-opacity', 0.05);
		gradient
			.append('stop')
			.attr('offset', '100%')
			.attr('stop-color', color)
			.attr('stop-opacity', 0);

		// 2. Glow Filter
		if (showGlow) {
			const filter = defs
				.append('filter')
				.attr('id', GLOW_ID)
				.attr('x', '-50%')
				.attr('y', '-50%')
				.attr('width', '200%')
				.attr('height', '200%');
			filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
			const feMerge = filter.append('feMerge');
			feMerge.append('feMergeNode').attr('in', 'coloredBlur');
			feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
		}

		// Scales
		const xScale = d3
			.scaleTime()
			.domain(d3.extent(parsedData, (d) => d.date) as [Date, Date])
			.range([0, innerWidth]);

		const yMax = d3.max(parsedData, (d) => d.revenue) || 0;
		const yScale = d3
			.scaleLinear()
			.domain([0, yMax * 1.05])
			.range([innerHeight, 0]); // Note: .nice() removed to strictly respect grid height if desired

		const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

		// Grid Lines (Horizontal only for clean look)
		const yAxisGrid = d3
			.axisLeft(yScale)
			.tickSize(-innerWidth)
			.tickFormat(() => '')
			.ticks(5);

		g.append('g')
			.attr('class', 'grid-lines')
			.call(yAxisGrid)
			.selectAll('line')
			.attr('stroke', '#f3f4f6') // very light gray
			.attr('stroke-dasharray', '4,4');

		g.select('.domain').remove();

		// Generators
		const area = d3
			.area<{ date: Date; revenue: number }>()
			.x((d) => xScale(d.date))
			.y0(innerHeight)
			.y1((d) => yScale(d.revenue))
			.curve(d3.curveMonotoneX);

		const line = d3
			.line<{ date: Date; revenue: number }>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.revenue))
			.curve(d3.curveMonotoneX);

		// Draw Area
		g.append('path')
			.datum(parsedData)
			.attr('fill', `url(#${GRADIENT_ID})`)
			.attr('d', area)
			.style('opacity', 0)
			.transition()
			.duration(800)
			.style('opacity', 1);

		// Draw Line
		const path = g
			.append('path')
			.datum(parsedData)
			.attr('fill', 'none')
			.attr('stroke', color)
			.attr('stroke-width', 2.5)
			.attr('d', line)
			.style('filter', showGlow ? `url(#${GLOW_ID})` : null);

		const totalLength = path.node()?.getTotalLength() || 0;
		path
			.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
			.attr('stroke-dashoffset', totalLength)
			.transition()
			.duration(1000)
			.ease(d3.easeCubicOut)
			.attr('stroke-dashoffset', 0);

		// Axes Labels
		const xAxis = d3
			.axisBottom(xScale)
			.ticks(width < 500 ? 3 : 6)
			.tickFormat((d) => dateFmt.format(d as Date))
			.tickSize(0)
			.tickPadding(16);

		g.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(xAxis)
			.style('font-size', '11px')
			.style('color', '#9ca3af')
			.select('.domain')
			.remove();

		const yAxis = d3
			.axisLeft(yScale)
			.ticks(5)
			.tickFormat((d) => formatAxisValue(d as number))
			.tickSize(0)
			.tickPadding(8);

		g.append('g')
			.call(yAxis)
			.style('font-size', '11px')
			.style('color', '#9ca3af')
			.select('.domain')
			.remove();

		// Interactions
		const focus = g.append('g').style('display', 'none');

		focus
			.append('circle')
			.attr('r', 6)
			.attr('fill', color)
			.attr('stroke', 'white')
			.attr('stroke-width', 3)
			.style('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))');

		const bisectDate = d3.bisector((d: any) => d.date).center;

		g.append('rect')
			.attr('width', innerWidth)
			.attr('height', innerHeight)
			.attr('fill', 'transparent')
			.style('cursor', 'crosshair')
			.on('pointerenter', () => {
				isHovering = true;
				focus.style('display', null);
			})
			.on('pointerleave', () => {
				isHovering = false;
				focus.style('display', 'none');
				tooltip = null;
			})
			.on('pointermove', function (event) {
				const x0 = xScale.invert(d3.pointer(event)[0]);
				const i = bisectDate(parsedData, x0);
				const d = parsedData[i];
				if (!d) return;

				const cx = xScale(d.date);
				const cy = yScale(d.revenue);
				focus.attr('transform', `translate(${cx},${cy})`);

				tooltip = {
					date: d.date,
					revenue: d.revenue,
					x: cx + MARGIN.left,
					y: cy + MARGIN.top,
				};
			});
	}

	onMount(() => {
		resizeObserver = new ResizeObserver((entries) => {
			if (!entries[0]) return;
			const rect = entries[0].contentRect;
			// Update both dims
			width = rect.width;
			currentHeight = rect.height;
		});
		resizeObserver.observe(container!);
	});

	onDestroy(() => resizeObserver?.disconnect());

	// Trigger redraw when dims or data change
	$effect(() => {
		if (data && width && currentHeight) drawChart();
	});
</script>

<div class="wrapper">
	<!-- 
		container uses h-full to fill parent grid cell,
		min-height ensures it doesn't collapse below a usable size
	-->
	<div bind:this={container} class="chart-container" style="min-height: {height}px;"></div>

	{#if tooltip && isHovering}
		<div
			class="tooltip"
			style="left: {tooltip.x}px; top: {tooltip.y}px;"
			transition:fade={{ duration: 100 }}
		>
			<div class="date">{dateFmt.format(tooltip.date)}</div>
			<div class="value" style="color: {color}">
				{currencyFmt.format(tooltip.revenue)}
			</div>
		</div>
	{/if}
</div>

<style>
	.wrapper {
		position: relative;
		width: 100%;
		height: 100%; /* Critical for filling the grid cell */
		display: flex;
		flex-direction: column;
	}

	.chart-container {
		flex: 1; /* Grow to fill wrapper */
		width: 100%;
		/* Ensures clean interactions */
		touch-action: none;
	}

	.tooltip {
		position: absolute;
		transform: translate(-50%, -125%);
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: 8px 12px;
		border-radius: 8px;
		pointer-events: none;
		z-index: 20;
		min-width: 100px;
		text-align: center;
		backdrop-filter: blur(4px);
	}

	:global(.dark) .tooltip {
		background: rgba(31, 41, 55, 0.95);
		border-color: #374151;
	}

	.tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		margin-left: -5px;
		border-width: 5px;
		border-style: solid;
		border-color: rgba(255, 255, 255, 0.95) transparent transparent transparent;
	}

	:global(.dark) .tooltip::after {
		border-color: rgba(31, 41, 55, 0.95) transparent transparent transparent;
	}

	.date {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		margin-bottom: 2px;
	}

	.value {
		font-size: 0.95rem;
		font-weight: 700;
	}
</style>
