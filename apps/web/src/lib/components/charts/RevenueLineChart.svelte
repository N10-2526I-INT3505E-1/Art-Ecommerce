<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';

	interface RevenueData {
		date: string;
		revenue: number;
	}

	export let data: RevenueData[] = [];
	export let height: number = 300;
	export let color: string = '#3b82f6'; // Allow color customization

	let container: HTMLDivElement;
	let width = 0; // Reactive width
	let resizeObserver: ResizeObserver;

	// Tooltip State
	let tooltipData: { date: Date; revenue: number } | null = null;
	let tooltipX = 0;
	let tooltipY = 0;

	const margin = { top: 20, right: 20, bottom: 40, left: 60 };

	$: innerWidth = width - margin.left - margin.right;
	$: innerHeight = height - margin.top - margin.bottom;

	// Formatter for Vietnamese Currency
	const currencyFormatter = new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
		maximumFractionDigits: 0,
	});

	// Compact Axis Formatter (1M, 500K)
	function axisFormatter(value: number): string {
		if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
		if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
		return value.toString();
	}

	function drawChart() {
		if (!container || data.length === 0 || width === 0) return;

		// Clean up
		d3.select(container).selectAll('svg').remove();

		const parsedData = data
			.map((d) => ({
				date: new Date(d.date),
				revenue: d.revenue,
			}))
			.sort((a, b) => a.date.getTime() - b.date.getTime());

		// Scales
		const xScale = d3
			.scaleTime()
			.domain(d3.extent(parsedData, (d) => d.date) as [Date, Date])
			.range([0, innerWidth]);

		const yScale = d3
			.scaleLinear()
			.domain([0, d3.max(parsedData, (d) => d.revenue)! * 1.1]) // Add 10% headroom
			.nice()
			.range([innerHeight, 0]);

		// Base SVG
		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.style('overflow', 'visible');

		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		// Gradients
		const defs = svg.append('defs');
		const gradientId = 'area-gradient-' + Math.random().toString(36).substr(2, 9);
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
			.attr('stop-color', color)
			.attr('stop-opacity', 0.4);
		gradient
			.append('stop')
			.attr('offset', '100%')
			.attr('stop-color', color)
			.attr('stop-opacity', 0);

		// Generators
		const areaGenerator = d3
			.area<{ date: Date; revenue: number }>()
			.x((d) => xScale(d.date))
			.y0(innerHeight)
			.y1((d) => yScale(d.revenue))
			.curve(d3.curveMonotoneX);

		const lineGenerator = d3
			.line<{ date: Date; revenue: number }>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.revenue))
			.curve(d3.curveMonotoneX);

		// Grid Lines (Y-Axis)
		g.append('g')
			.attr('class', 'grid')
			.call(
				d3
					.axisLeft(yScale)
					.tickSize(-innerWidth)
					.tickFormat(() => ''),
			)
			.selectAll('line')
			.attr('stroke', '#e5e7eb') // tailwind gray-200
			.attr('stroke-dasharray', '4,4');
		g.select('.domain').remove(); // Remove outer box line

		// Draw Area
		g.append('path').datum(parsedData).attr('fill', `url(#${gradientId})`).attr('d', areaGenerator);

		// Draw Line (with animation)
		const path = g
			.append('path')
			.datum(parsedData)
			.attr('fill', 'none')
			.attr('stroke', color)
			.attr('stroke-width', 2.5)
			.attr('d', lineGenerator);

		// Line Animation: Draw from left to right
		const totalLength = path.node()?.getTotalLength() || 0;
		path
			.attr('stroke-dasharray', `${totalLength} ${totalLength}`)
			.attr('stroke-dashoffset', totalLength)
			.transition()
			.duration(1500)
			.ease(d3.easeCubicOut)
			.attr('stroke-dashoffset', 0);

		// Axes
		const xAxis = d3
			.axisBottom(xScale)
			.ticks(width < 400 ? 3 : 6) // Reduce ticks on small screens
			.tickFormat((d) => d3.timeFormat('%d/%m')(d as Date));

		g.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(xAxis)
			.attr('font-size', '11px')
			.attr('color', '#6b7280') // gray-500
			.select('.domain')
			.remove();

		g.append('g')
			.call(
				d3
					.axisLeft(yScale)
					.ticks(5)
					.tickFormat((d) => axisFormatter(d as number)),
			)
			.attr('font-size', '11px')
			.attr('color', '#6b7280')
			.select('.domain')
			.remove();

		// --- INTERACTIVITY (Bisector) ---

		// Focus elements (The vertical line and the circle)
		const focus = g.append('g').style('display', 'none');

		focus
			.append('line')
			.attr('stroke', color)
			.attr('stroke-dasharray', '3,3')
			.attr('y1', 0)
			.attr('y2', innerHeight)
			.attr('opacity', 0.5);

		focus
			.append('circle')
			.attr('r', 5)
			.attr('fill', 'white')
			.attr('stroke', color)
			.attr('stroke-width', 3);

		// Invisible overlay to catch mouse events
		g.append('rect')
			.attr('width', innerWidth)
			.attr('height', innerHeight)
			.attr('fill', 'transparent')
			.on('pointerenter', () => focus.style('display', null))
			.on('pointerleave', () => {
				focus.style('display', 'none');
				tooltipData = null; // Hide Svelte tooltip
			})
			.on('pointermove', function (event) {
				const [xm] = d3.pointer(event);
				const xDate = xScale.invert(xm);
				const bisect = d3.bisector((d: any) => d.date).center;
				const i = bisect(parsedData, xDate);
				const d = parsedData[i];

				if (d) {
					// Move the D3 Focus elements
					focus.attr('transform', `translate(${xScale(d.date)},${yScale(d.revenue)})`);
					focus.select('line').attr('y2', innerHeight - yScale(d.revenue)); // Only draw line down

					// Update Svelte State for HTML Tooltip
					tooltipData = d;
					// Calculate HTML coordinates relative to the container
					tooltipX = xScale(d.date) + margin.left;
					tooltipY = yScale(d.revenue) + margin.top;
				}
			});
	}

	onMount(() => {
		// Use ResizeObserver for responsiveness
		resizeObserver = new ResizeObserver((entries) => {
			if (!entries || entries.length === 0) return;
			width = entries[0].contentRect.width;
		});
		resizeObserver.observe(container);
	});

	onDestroy(() => {
		if (resizeObserver) resizeObserver.disconnect();
	});

	// Reactivity: Redraw when data or dimensions change
	$: if (container && data && width > 0) {
		drawChart();
	}
</script>

<div class="chart-wrapper">
	<div bind:this={container} class="chart-container" style="height: {height}px;"></div>

	<!-- HTML Tooltip controlled by Svelte State -->
	{#if tooltipData}
		<div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
			<div class="tooltip-date">
				{tooltipData.date.toLocaleDateString('vi-VN')}
			</div>
			<div class="tooltip-value" style="color: {color}">
				{currencyFormatter.format(tooltipData.revenue)}
			</div>
		</div>
	{/if}
</div>

<style>
	.chart-wrapper {
		position: relative;
		width: 100%;
	}

	.chart-container {
		width: 100%;
		/* Allow touch actions for mobile scrolling unless touching the chart directly */
		touch-action: none;
	}

	.tooltip {
		position: absolute;
		transform: translate(-50%, -115%); /* Center horizontally, move above point */
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #e5e7eb;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		padding: 8px 12px;
		border-radius: 6px;
		pointer-events: none; /* Let mouse pass through to SVG overlay */
		transition:
			top 0.1s,
			left 0.1s; /* Smooth movement */
		z-index: 10;
		min-width: 120px;
		text-align: center;
		backdrop-filter: blur(4px);
	}

	/* Triangle Pointer for Tooltip */
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

	.tooltip-date {
		font-size: 0.75rem;
		color: #6b7280;
		margin-bottom: 2px;
		font-weight: 500;
	}

	.tooltip-value {
		font-size: 0.95rem;
		font-weight: 700;
	}
</style>
