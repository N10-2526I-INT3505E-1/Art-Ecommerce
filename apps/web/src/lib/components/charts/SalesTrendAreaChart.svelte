<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import { fade } from 'svelte/transition';

	// --- Types ---
	interface TrendData {
		date: string;
		orders: number;
		revenue: number;
	}

	interface ParsedData {
		date: Date;
		orders: number;
		revenue: number;
	}

	interface TooltipState {
		date: Date;
		orders: number;
		revenue: number;
		x: number;
		side: 'left' | 'right';
	}

	type SeriesKey = 'Đơn hàng' | 'Doanh thu';

	// --- Props ---
	export let data: TrendData[] = [];
	export let height: number = 300;
	export let animationDuration: number = 1200;
	export let ordersLabel: string = 'Đơn hàng';
	export let revenueLabel: string = 'Doanh thu';
	export let locale: string = 'vi-VN';
	export let currency: string = 'VND';
	export let emptyMessage: string = 'Không có dữ liệu';

	// --- Colors (customizable) ---
	export let ordersColor: string = '#10b981';
	export let revenueColor: string = '#f59e0b';

	// --- State ---
	let container: HTMLDivElement;
	let width = 0;
	let resizeObserver: ResizeObserver;
	let chartDrawn = false;

	// Series visibility
	let visibleSeries: Record<SeriesKey, boolean> = {
		orders: true,
		revenue: true,
	};

	// Tooltip state
	let tooltipState: TooltipState | null = null;
	let isHovering = false;

	// Unique IDs for gradients (prevents conflicts with multiple instances)
	const instanceId = Math.random().toString(36).slice(2, 9);
	const ordersGradientId = `orders-gradient-${instanceId}`;

	// --- Constants ---
	const margin = { top: 20, right: 60, bottom: 40, left: 60 };

	// --- Computed ---
	$: innerWidth = Math.max(0, width - margin.left - margin.right);
	$: innerHeight = Math.max(0, height - margin.top - margin.bottom);
	$: hasData = data.length > 0;
	$: hasVisibleSeries = visibleSeries.orders || visibleSeries.revenue;

	$: parsedData = hasData
		? data
				.map((d) => ({
					date: new Date(d.date),
					orders: d.orders,
					revenue: d.revenue,
				}))
				.filter((d) => !isNaN(d.date.getTime()))
				.sort((a, b) => a.date.getTime() - b.date.getTime())
		: [];

	$: colors = {
		orders: ordersColor,
		revenue: revenueColor,
		grid: 'var(--chart-grid, #e5e7eb)',
		text: 'var(--chart-text-secondary, #6b7280)',
	};

	// --- Formatters ---
	const currencyFormatter = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency,
		maximumFractionDigits: 0,
	});

	const dateFormatter = new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});

	function formatCompact(val: number): string {
		if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
		if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
		if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
		return val.toString();
	}

	function formatShortDate(date: Date): string {
		return d3.timeFormat('%d/%m')(date);
	}

	// --- Utilities ---
	function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
		let timeoutId: ReturnType<typeof setTimeout>;
		return ((...args: unknown[]) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => fn(...args), ms);
		}) as T;
	}

	function toggleSeries(key: SeriesKey): void {
		// Prevent hiding all series
		const otherKey = key === 'orders' ? 'revenue' : 'orders';
		if (visibleSeries[key] && !visibleSeries[otherKey]) {
			return; // Don't allow hiding the last visible series
		}
		visibleSeries[key] = !visibleSeries[key];
		visibleSeries = visibleSeries; // Trigger reactivity
	}

	// --- Chart Drawing ---
	function drawChart(animate: boolean = true): void {
		if (!container || width === 0 || innerWidth <= 0 || innerHeight <= 0) return;

		// Clear previous
		d3.select(container).selectAll('*').remove();

		// Create SVG
		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.attr('role', 'img')
			.attr('aria-label', 'Orders and revenue trend chart');

		// Empty state
		if (parsedData.length === 0) {
			svg
				.append('text')
				.attr('x', width / 2)
				.attr('y', height / 2)
				.attr('text-anchor', 'middle')
				.attr('fill', colors.text)
				.attr('font-size', '14px')
				.text(emptyMessage);
			chartDrawn = true;
			return;
		}

		const defs = svg.append('defs');
		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		// --- Scales ---
		const xExtent = d3.extent(parsedData, (d) => d.date) as [Date, Date];

		const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

		const yScaleOrders = d3
			.scaleLinear()
			.domain([0, (d3.max(parsedData, (d) => d.orders) || 0) * 1.15])
			.nice()
			.range([innerHeight, 0]);

		const yScaleRevenue = d3
			.scaleLinear()
			.domain([0, (d3.max(parsedData, (d) => d.revenue) || 0) * 1.15])
			.nice()
			.range([innerHeight, 0]);

		// --- Grid Lines ---
		const gridGroup = g.append('g').attr('class', 'grid');

		if (visibleSeries.orders) {
			gridGroup
				.selectAll('line.grid-line')
				.data(yScaleOrders.ticks(5))
				.enter()
				.append('line')
				.attr('class', 'grid-line')
				.attr('x1', 0)
				.attr('x2', innerWidth)
				.attr('y1', (d) => yScaleOrders(d))
				.attr('y2', (d) => yScaleOrders(d))
				.attr('stroke', colors.grid)
				.attr('stroke-dasharray', '4,4')
				.attr('opacity', 0.6);
		}

		// --- Axes ---
		const tickCount = width < 500 ? 3 : width < 700 ? 5 : 7;

		// X Axis
		const xAxis = d3
			.axisBottom(xScale)
			.ticks(tickCount)
			.tickFormat((d) => formatShortDate(d as Date))
			.tickSize(0)
			.tickPadding(10);

		g.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(xAxis)
			.call((g) => g.select('.domain').remove())
			.selectAll('text')
			.attr('fill', colors.text)
			.attr('font-size', '11px');

		// Left Y Axis (Orders)
		if (visibleSeries.orders) {
			const yAxisLeft = d3.axisLeft(yScaleOrders).ticks(5).tickSize(0).tickPadding(10);

			g.append('g')
				.attr('class', 'y-axis-left')
				.call(yAxisLeft)
				.call((g) => g.select('.domain').remove())
				.selectAll('text')
				.attr('fill', colors.orders)
				.attr('font-size', '11px')
				.attr('font-weight', '500');
		}

		// Right Y Axis (Revenue)
		if (visibleSeries.revenue) {
			const yAxisRight = d3
				.axisRight(yScaleRevenue)
				.ticks(5)
				.tickFormat((d) => formatCompact(d as number))
				.tickSize(0)
				.tickPadding(10);

			g.append('g')
				.attr('class', 'y-axis-right')
				.attr('transform', `translate(${innerWidth},0)`)
				.call(yAxisRight)
				.call((g) => g.select('.domain').remove())
				.selectAll('text')
				.attr('fill', colors.revenue)
				.attr('font-size', '11px')
				.attr('font-weight', '500');
		}

		// --- Orders Series (Area + Line) ---
		if (visibleSeries.orders) {
			// Gradient
			const gradient = defs
				.append('linearGradient')
				.attr('id', ordersGradientId)
				.attr('x1', '0%')
				.attr('y1', '0%')
				.attr('x2', '0%')
				.attr('y2', '100%');

			gradient
				.append('stop')
				.attr('offset', '0%')
				.attr('stop-color', colors.orders)
				.attr('stop-opacity', 0.25);

			gradient
				.append('stop')
				.attr('offset', '100%')
				.attr('stop-color', colors.orders)
				.attr('stop-opacity', 0.02);

			// Area generator
			const areaOrders = d3
				.area<ParsedData>()
				.x((d) => xScale(d.date))
				.y0(innerHeight)
				.y1((d) => yScaleOrders(d.orders))
				.curve(d3.curveMonotoneX);

			// Line generator
			const lineOrders = d3
				.line<ParsedData>()
				.x((d) => xScale(d.date))
				.y((d) => yScaleOrders(d.orders))
				.curve(d3.curveMonotoneX);

			// Draw area
			const areaPath = g
				.append('path')
				.datum(parsedData)
				.attr('class', 'area-orders')
				.attr('fill', `url(#${ordersGradientId})`)
				.attr('d', areaOrders);

			// Draw line
			const linePath = g
				.append('path')
				.datum(parsedData)
				.attr('class', 'line-orders')
				.attr('fill', 'none')
				.attr('stroke', colors.orders)
				.attr('stroke-width', 2.5)
				.attr('stroke-linecap', 'round')
				.attr('stroke-linejoin', 'round')
				.attr('d', lineOrders);

			// Animation
			if (animate) {
				areaPath
					.attr('opacity', 0)
					.transition()
					.duration(animationDuration * 0.6)
					.attr('opacity', 1);

				const lineLength = linePath.node()?.getTotalLength() || 0;
				linePath
					.attr('stroke-dasharray', `${lineLength} ${lineLength}`)
					.attr('stroke-dashoffset', lineLength)
					.transition()
					.duration(animationDuration)
					.ease(d3.easeCubicOut)
					.attr('stroke-dashoffset', 0);
			}
		}

		// --- Revenue Series (Dashed Line) ---
		if (visibleSeries.revenue) {
			const lineRevenue = d3
				.line<ParsedData>()
				.x((d) => xScale(d.date))
				.y((d) => yScaleRevenue(d.revenue))
				.curve(d3.curveMonotoneX);

			const revenuePath = g
				.append('path')
				.datum(parsedData)
				.attr('class', 'line-revenue')
				.attr('fill', 'none')
				.attr('stroke', colors.revenue)
				.attr('stroke-width', 2.5)
				.attr('stroke-dasharray', '6,4')
				.attr('stroke-linecap', 'round')
				.attr('d', lineRevenue);

			if (animate) {
				revenuePath
					.attr('opacity', 0)
					.transition()
					.delay(animationDuration * 0.3)
					.duration(animationDuration * 0.5)
					.attr('opacity', 1);
			}
		}

		// --- Interactivity ---
		const focus = g.append('g').attr('class', 'focus').style('display', 'none');

		// Vertical line
		focus
			.append('line')
			.attr('class', 'focus-line')
			.attr('y1', 0)
			.attr('y2', innerHeight)
			.attr('stroke', colors.text)
			.attr('stroke-width', 1)
			.attr('stroke-dasharray', '4,4')
			.attr('opacity', 0.5);

		// Focus dots
		if (visibleSeries.orders) {
			focus
				.append('circle')
				.attr('class', 'dot-orders')
				.attr('r', 6)
				.attr('fill', 'white')
				.attr('stroke', colors.orders)
				.attr('stroke-width', 3)
				.style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');
		}

		if (visibleSeries.revenue) {
			focus
				.append('circle')
				.attr('class', 'dot-revenue')
				.attr('r', 6)
				.attr('fill', 'white')
				.attr('stroke', colors.revenue)
				.attr('stroke-width', 3)
				.style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');
		}

		// Bisector
		const bisect = d3.bisector<ParsedData, Date>((d) => d.date).center;

		// Overlay for interaction
		g.append('rect')
			.attr('class', 'overlay')
			.attr('width', innerWidth)
			.attr('height', innerHeight)
			.attr('fill', 'transparent')
			.style('cursor', 'crosshair')
			.on('pointerenter', handlePointerEnter)
			.on('pointerleave', handlePointerLeave)
			.on('pointermove', handlePointerMove)
			.on('touchstart', (e) => e.preventDefault());

		function handlePointerEnter(): void {
			isHovering = true;
			focus.style('display', null);
		}

		function handlePointerLeave(): void {
			isHovering = false;
			focus.style('display', 'none');
			tooltipState = null;
		}

		function handlePointerMove(event: PointerEvent): void {
			const [xPos] = d3.pointer(event);
			const xDate = xScale.invert(xPos);
			const index = bisect(parsedData, xDate);
			const d = parsedData[index];

			if (!d) return;

			const x = xScale(d.date);

			// Update focus line
			focus.select('.focus-line').attr('x1', x).attr('x2', x);

			// Update dots
			if (visibleSeries.orders) {
				focus.select('.dot-orders').attr('cx', x).attr('cy', yScaleOrders(d.orders));
			}

			if (visibleSeries.revenue) {
				focus.select('.dot-revenue').attr('cx', x).attr('cy', yScaleRevenue(d.revenue));
			}

			// Update tooltip state
			tooltipState = {
				date: d.date,
				orders: d.orders,
				revenue: d.revenue,
				x: x + margin.left,
				side: x > innerWidth * 0.6 ? 'left' : 'right',
			};
		}

		chartDrawn = true;
	}

	// Debounced resize
	const debouncedDraw = debounce(() => {
		if (chartDrawn) {
			drawChart(false);
		}
	}, 150);

	// --- Lifecycle ---
	onMount(() => {
		resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				const newWidth = entry.contentRect.width;
				if (newWidth > 0 && Math.abs(newWidth - width) > 1) {
					width = newWidth;
					if (!chartDrawn) {
						drawChart(true);
					} else {
						debouncedDraw();
					}
				}
			}
		});
		resizeObserver.observe(container);
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
	});

	// Redraw on data or visibility changes
	$: if (data && width > 0 && container) {
		drawChart(!chartDrawn);
	}

	// Redraw when visibility changes (without animation)
	$: if (visibleSeries && chartDrawn && width > 0) {
		drawChart(false);
	}
</script>

<div class="dual-chart-wrapper" role="figure" aria-label="Dual axis trend chart">
	<!-- Chart Container -->
	<div bind:this={container} class="chart-container" style="height: {height}px;"></div>

	<!-- HTML Tooltip -->
	{#if tooltipState && isHovering}
		<div
			class="tooltip"
			class:left={tooltipState.side === 'left'}
			style="left: {tooltipState.x}px;"
			transition:fade={{ duration: 150 }}
		>
			<div class="tooltip-header">
				{dateFormatter.format(tooltipState.date)}
			</div>

			<div class="tooltip-body">
				{#if visibleSeries.orders}
					<div class="tooltip-row">
						<span class="tooltip-dot" style="background-color: {colors.orders};"></span>
						<span class="tooltip-label">{ordersLabel}</span>
						<span class="tooltip-value">{tooltipState.orders.toLocaleString(locale)}</span>
					</div>
				{/if}

				{#if visibleSeries.revenue}
					<div class="tooltip-row">
						<span class="tooltip-dot dashed" style="border-color: {colors.revenue};"></span>
						<span class="tooltip-label">{revenueLabel}</span>
						<span class="tooltip-value">{currencyFormatter.format(tooltipState.revenue)}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Legend -->
	<div class="legend" role="group" aria-label="Chart legend">
		<button
			type="button"
			class="legend-item"
			class:inactive={!visibleSeries.orders}
			on:click={() => toggleSeries('orders')}
			aria-pressed={visibleSeries.orders}
			title={visibleSeries.orders ? `Hide ${ordersLabel}` : `Show ${ordersLabel}`}
		>
			<span class="legend-line solid" style="background-color: {colors.orders};"></span>
			<span class="legend-text">{ordersLabel}</span>
		</button>

		<button
			type="button"
			class="legend-item"
			class:inactive={!visibleSeries.revenue}
			on:click={() => toggleSeries('revenue')}
			aria-pressed={visibleSeries.revenue}
			title={visibleSeries.revenue ? `Hide ${revenueLabel}` : `Show ${revenueLabel}`}
		>
			<span class="legend-line dashed" style="border-color: {colors.revenue};"></span>
			<span class="legend-text">{revenueLabel}</span>
		</button>
	</div>
</div>

<style>
	.dual-chart-wrapper {
		--chart-bg: white;
		--chart-text-primary: #374151;
		--chart-text-secondary: #6b7280;
		--chart-grid: #e5e7eb;
		--chart-border: #e5e7eb;

		position: relative;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		user-select: none;
	}

	/* Dark mode */
	:global(.dark) .dual-chart-wrapper {
		--chart-bg: #1f2937;
		--chart-text-primary: #f3f4f6;
		--chart-text-secondary: #9ca3af;
		--chart-grid: #374151;
		--chart-border: #4b5563;
	}

	.chart-container {
		width: 100%;
		touch-action: pan-y pinch-zoom;
	}

	.chart-container :global(svg) {
		display: block;
	}

	/* Focus elements smooth transitions */
	.chart-container :global(.focus-line),
	.chart-container :global(.dot-orders),
	.chart-container :global(.dot-revenue) {
		transition:
			cx 0.05s ease-out,
			cy 0.05s ease-out,
			x1 0.05s ease-out,
			x2 0.05s ease-out;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		top: 20px;
		transform: translateX(12px);
		background: var(--chart-bg);
		border: 1px solid var(--chart-border);
		border-radius: 10px;
		padding: 12px 14px;
		min-width: 160px;
		pointer-events: none;
		z-index: 20;
		box-shadow:
			0 10px 25px -5px rgba(0, 0, 0, 0.1),
			0 8px 10px -6px rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(8px);
	}

	.tooltip.left {
		transform: translateX(calc(-100% - 12px));
	}

	.tooltip-header {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--chart-text-secondary);
		margin-bottom: 10px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--chart-border);
	}

	.tooltip-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tooltip-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tooltip-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.tooltip-dot.dashed {
		background: transparent;
		border: 2px dashed;
		width: 10px;
		height: 10px;
	}

	.tooltip-label {
		flex: 1;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--chart-text-secondary);
	}

	.tooltip-value {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--chart-text-primary);
	}

	/* Legend */
	.legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 6px 12px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.legend-item:hover {
		background: var(--chart-grid);
	}

	.legend-item:focus-visible {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.legend-item.inactive {
		opacity: 0.4;
	}

	.legend-item.inactive:hover {
		opacity: 0.6;
	}

	.legend-line {
		width: 24px;
		height: 3px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.legend-line.dashed {
		background: transparent;
		border-top: 3px dashed;
		height: 0;
	}

	.legend-text {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--chart-text-primary);
	}

	/* Responsive */
	@media (max-width: 480px) {
		.tooltip {
			min-width: 140px;
			padding: 10px 12px;
		}

		.legend {
			gap: 0.75rem;
		}

		.legend-item {
			padding: 4px 8px;
		}
	}
</style>
