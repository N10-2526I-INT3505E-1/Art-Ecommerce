<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';

	interface TrendData {
		date: string;
		orders: number;
		revenue: number;
	}

	export let data: TrendData[] = [];
	export let height: number = 300; // Fixed height, width is responsive

	// --- Config & Colors ---
	const COLORS = {
		orders: '#10b981', // Emerald 500
		revenue: '#f59e0b', // Amber 500
		grid: '#e5e7eb',
		text: '#6b7280',
	};

	// --- State ---
	let container: HTMLDivElement;
	let width = 0;
	let resizeObserver: ResizeObserver;

	// Series Visibility Toggles
	let showOrders = true;
	let showRevenue = true;

	// Tooltip State
	let hoverData: { date: Date; orders: number; revenue: number } | null = null;
	let tooltipX = 0;
	let tooltipY = 0; // Y position isn't strictly needed for vertical line focus, but good for positioning
	let tooltipSide: 'left' | 'right' = 'right'; // To flip tooltip near edge

	// --- Helpers ---
	const margin = { top: 20, right: 60, bottom: 40, left: 60 };
	$: innerWidth = width - margin.left - margin.right;
	$: innerHeight = height - margin.top - margin.bottom;

	const formatCurrency = (val: number) => {
		if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
		if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
		return val.toString();
	};

	const formatDate = d3.timeFormat('%d/%m');
	const formatFullDate = d3.timeFormat('%d/%m/%Y');
	const currencyFormatter = new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
		maximumFractionDigits: 0,
	});

	// --- Chart Logic ---
	function drawChart() {
		if (!container || data.length === 0 || width === 0) return;

		// 1. Clear previous
		d3.select(container).selectAll('*').remove();

		// 2. Setup SVG
		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.style('overflow', 'visible');

		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
		const defs = svg.append('defs');

		// 3. Process Data
		const parsedData = data
			.map((d) => ({
				date: new Date(d.date),
				orders: d.orders,
				revenue: d.revenue,
			}))
			.sort((a, b) => a.date.getTime() - b.date.getTime());

		// 4. Scales
		const xScale = d3
			.scaleTime()
			.domain(d3.extent(parsedData, (d) => d.date) as [Date, Date])
			.range([0, innerWidth]);

		// Add headroom (multiply max by 1.1) so lines don't hit the top edge
		const yScaleOrders = d3
			.scaleLinear()
			.domain([0, (d3.max(parsedData, (d) => d.orders) || 0) * 1.1])
			.nice()
			.range([innerHeight, 0]);

		const yScaleRevenue = d3
			.scaleLinear()
			.domain([0, (d3.max(parsedData, (d) => d.revenue) || 0) * 1.1])
			.nice()
			.range([innerHeight, 0]);

		// 5. Axes & Grid
		const xAxis = d3
			.axisBottom(xScale)
			.ticks(width < 500 ? 3 : 6)
			.tickFormat((d) => formatDate(d as Date));
		const yAxisLeft = d3.axisLeft(yScaleOrders).ticks(5);
		const yAxisRight = d3
			.axisRight(yScaleRevenue)
			.ticks(5)
			.tickFormat((d) => formatCurrency(d as number));

		// Draw X Axis
		g.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(xAxis)
			.attr('color', COLORS.text)
			.style('font-size', '10px')
			.select('.domain')
			.remove(); // Hide axis line

		// Draw Left Axis (Orders) - Only if visible
		if (showOrders) {
			const leftG = g
				.append('g')
				.call(yAxisLeft)
				.attr('color', COLORS.orders)
				.style('font-size', '10px');

			leftG.select('.domain').remove();

			// Add Grid lines (Based on Left Axis)
			leftG
				.selectAll('.tick line')
				.clone()
				.attr('x2', innerWidth)
				.attr('stroke', COLORS.grid)
				.attr('stroke-dasharray', '4,4')
				.attr('stroke-opacity', 0.5);
		}

		// Draw Right Axis (Revenue) - Only if visible
		if (showRevenue) {
			const rightG = g
				.append('g')
				.attr('transform', `translate(${innerWidth},0)`)
				.call(yAxisRight)
				.attr('color', COLORS.revenue)
				.style('font-size', '10px');

			rightG.select('.domain').remove();
			// We do NOT draw grid lines for the right axis to avoid grid-mesh clutter
		}

		// 6. Draw Content

		// --- ORDERS (Area + Line) ---
		if (showOrders) {
			// Gradient
			const gradientId = 'orders-gradient';
			const gradient = defs
				.append('linearGradient')
				.attr('id', gradientId)
				.attr('x1', '0%')
				.attr('y1', '0%')
				.attr('x2', '0%')
				.attr('y2', '100%');
			gradient
				.append('stop')
				.attr('offset', '0%')
				.attr('stop-color', COLORS.orders)
				.attr('stop-opacity', 0.2);
			gradient
				.append('stop')
				.attr('offset', '100%')
				.attr('stop-color', COLORS.orders)
				.attr('stop-opacity', 0);

			const areaOrders = d3
				.area<(typeof parsedData)[0]>()
				.x((d) => xScale(d.date))
				.y0(innerHeight)
				.y1((d) => yScaleOrders(d.orders))
				.curve(d3.curveMonotoneX);

			const lineOrders = d3
				.line<(typeof parsedData)[0]>()
				.x((d) => xScale(d.date))
				.y((d) => yScaleOrders(d.orders))
				.curve(d3.curveMonotoneX);

			// Draw Area
			g.append('path')
				.datum(parsedData)
				.attr('fill', `url(#${gradientId})`)
				.attr('d', areaOrders)
				.style('opacity', 0)
				.transition()
				.duration(800)
				.style('opacity', 1);

			// Draw Line with Animation
			const path = g
				.append('path')
				.datum(parsedData)
				.attr('fill', 'none')
				.attr('stroke', COLORS.orders)
				.attr('stroke-width', 2)
				.attr('d', lineOrders);

			const len = path.node()?.getTotalLength() || 0;
			path
				.attr('stroke-dasharray', `${len} ${len}`)
				.attr('stroke-dashoffset', len)
				.transition()
				.duration(1500)
				.ease(d3.easeCubicOut)
				.attr('stroke-dashoffset', 0);
		}

		// --- REVENUE (Dashed Line) ---
		if (showRevenue) {
			const lineRevenue = d3
				.line<(typeof parsedData)[0]>()
				.x((d) => xScale(d.date))
				.y((d) => yScaleRevenue(d.revenue))
				.curve(d3.curveMonotoneX);

			const path = g
				.append('path')
				.datum(parsedData)
				.attr('fill', 'none')
				.attr('stroke', COLORS.revenue)
				.attr('stroke-width', 2.5)
				.attr('stroke-dasharray', '4,4') // Dashed
				.attr('d', lineRevenue);

			// Animation for dashed line (sliding dash)
			path.style('opacity', 0).transition().duration(500).style('opacity', 1);
		}

		// 7. Interaction (Focus)
		const focus = g.append('g').style('display', 'none');

		// Vertical Line
		focus
			.append('line')
			.attr('y1', 0)
			.attr('y2', innerHeight)
			.attr('stroke', COLORS.text)
			.attr('stroke-dasharray', '3,3')
			.attr('opacity', 0.5);

		// Dots
		if (showOrders) {
			focus
				.append('circle')
				.attr('class', 'dot-orders')
				.attr('r', 5)
				.attr('fill', COLORS.orders)
				.attr('stroke', '#fff')
				.attr('stroke-width', 2);
		}
		if (showRevenue) {
			focus
				.append('circle')
				.attr('class', 'dot-revenue')
				.attr('r', 5)
				.attr('fill', COLORS.revenue)
				.attr('stroke', '#fff')
				.attr('stroke-width', 2);
		}

		// Overlay Rect
		g.append('rect')
			.attr('width', innerWidth)
			.attr('height', innerHeight)
			.attr('fill', 'transparent')
			.on('pointerenter', () => focus.style('display', null))
			.on('pointerleave', () => {
				focus.style('display', 'none');
				hoverData = null;
			})
			.on('pointermove', function (event) {
				const [xm] = d3.pointer(event);
				const xDate = xScale.invert(xm);
				const bisect = d3.bisector((d: any) => d.date).center;
				const i = bisect(parsedData, xDate);
				const d = parsedData[i];

				if (d) {
					const xPos = xScale(d.date);
					focus.attr('transform', `translate(${xPos},0)`);

					if (showOrders) focus.select('.dot-orders').attr('cy', yScaleOrders(d.orders));
					if (showRevenue) focus.select('.dot-revenue').attr('cy', yScaleRevenue(d.revenue));

					// Update Svelte State
					hoverData = d;
					tooltipX = xPos + margin.left;

					// Flip tooltip if past 60% of width
					tooltipSide = xPos > innerWidth * 0.6 ? 'left' : 'right';
				}
			});
	}

	onMount(() => {
		resizeObserver = new ResizeObserver((entries) => {
			if (entries[0]) width = entries[0].contentRect.width;
		});
		resizeObserver.observe(container);
	});

	onDestroy(() => resizeObserver?.disconnect());

	// Redraw triggers
	$: if (container && data && width && (showOrders || showRevenue || true)) {
		drawChart();
	}
</script>

<div class="wrapper">
	<!-- Chart -->
	<div class="chart-container" style="height: {height}px;" bind:this={container}></div>

	<!-- HTML Tooltip -->
	{#if hoverData}
		<div
			class="tooltip"
			class:left-align={tooltipSide === 'left'}
			style="top: 20px; left: {tooltipX}px;"
		>
			<div class="tooltip-header">{formatFullDate(hoverData.date)}</div>

			<div class="tooltip-grid">
				{#if showOrders}
					<div class="tooltip-label" style="color: {COLORS.orders}">Đơn hàng</div>
					<div class="tooltip-val">{hoverData.orders}</div>
				{/if}
				{#if showRevenue}
					<div class="tooltip-label" style="color: {COLORS.revenue}">Doanh thu</div>
					<div class="tooltip-val">{currencyFormatter.format(hoverData.revenue)}</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Interactive Legend -->
	<div class="legend">
		<button
			class="legend-item"
			class:inactive={!showOrders}
			on:click={() => (showOrders = !showOrders)}
		>
			<div class="legend-indicator solid" style="background-color: {COLORS.orders}"></div>
			<span>Số đơn hàng</span>
		</button>

		<button
			class="legend-item"
			class:inactive={!showRevenue}
			on:click={() => (showRevenue = !showRevenue)}
		>
			<div class="legend-indicator dashed" style="border-color: {COLORS.revenue}"></div>
			<span>Doanh thu</span>
		</button>
	</div>
</div>

<style>
	.wrapper {
		width: 100%;
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		user-select: none;
	}

	.chart-container {
		width: 100%;
		/* touch-action: none allows dragging finger across chart without scrolling page */
		touch-action: none;
	}

	/* Tooltip Styling */
	.tooltip {
		position: absolute;
		pointer-events: none;
		background: rgba(255, 255, 255, 0.98);
		border: 1px solid #e5e7eb;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		border-radius: 8px;
		padding: 10px 14px;
		z-index: 20;
		min-width: 140px;
		transform: translateX(15px); /* Default right offset */
		transition:
			transform 0.1s ease-out,
			top 0.1s,
			left 0.1s;
		backdrop-filter: blur(4px);
	}

	.tooltip.left-align {
		transform: translateX(calc(-100% - 15px)); /* Flip to left */
	}

	.tooltip-header {
		font-size: 0.8rem;
		color: #9ca3af;
		font-weight: 500;
		margin-bottom: 6px;
		border-bottom: 1px solid #f3f4f6;
		padding-bottom: 4px;
	}

	.tooltip-grid {
		display: grid;
		grid-template-columns: auto auto;
		column-gap: 12px;
		row-gap: 4px;
		align-items: center;
	}

	.tooltip-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-align: left;
	}

	.tooltip-val {
		font-size: 0.85rem;
		font-weight: 700;
		color: #1f2937;
		text-align: right;
	}

	/* Legend Styling */
	.legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: #374151;
		cursor: pointer;
		background: none;
		border: none;
		padding: 4px 8px;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.legend-item:hover {
		background-color: #f3f4f6;
	}

	.legend-item.inactive {
		opacity: 0.4;
		filter: grayscale(1);
	}

	.legend-indicator {
		width: 24px;
		height: 3px;
		border-radius: 2px;
	}

	.legend-indicator.dashed {
		background: transparent;
		border-top: 3px dashed;
		height: 0;
	}
</style>
