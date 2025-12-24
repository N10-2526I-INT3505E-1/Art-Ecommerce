<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';

	interface ProductData {
		name: string;
		sold: number;
		revenue: number;
	}

	export let data: ProductData[] = [];
	export let height: number = 300;
	export let showRevenue: boolean = false; // Prop to toggle mode

	let container: HTMLDivElement;
	let width = 0;
	let resizeObserver: ResizeObserver;

	// Tooltip State
	let hoverData: ProductData | null = null;
	let tooltipX = 0;
	let tooltipY = 0;

	// Config
	const margin = { top: 20, right: 50, bottom: 20, left: 140 }; // Left margin for labels

	// Computed colors based on mode
	$: themeColor = showRevenue ? '#10b981' : '#6366f1'; // Emerald vs Indigo
	$: innerWidth = width - margin.left - margin.right;
	$: innerHeight = height - margin.top - margin.bottom;

	// Formatters
	const currencyFormatter = new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: 'VND',
		maximumFractionDigits: 0,
	});

	function formatValue(d: ProductData) {
		if (showRevenue) return currencyFormatter.format(d.revenue);
		return `${d.sold.toLocaleString()} cái`;
	}

	function compactFormat(val: number) {
		if (showRevenue) {
			if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
			if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
		}
		return val.toString();
	}

	function truncateText(text: string, maxLength: number = 18): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	function drawChart() {
		if (!container || data.length === 0 || width === 0) return;

		// 1. Prepare Data
		// Sort by currently selected metric and take top 5
		const sortedData = [...data]
			.sort((a, b) => (showRevenue ? b.revenue - a.revenue : b.sold - a.sold))
			.slice(0, 5);

		const getValue = (d: ProductData) => (showRevenue ? d.revenue : d.sold);
		const maxValue = d3.max(sortedData, getValue) || 0;

		// 2. Clear & Setup
		d3.select(container).selectAll('*').remove();

		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.style('overflow', 'visible');

		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		// 3. Scales
		const yScale = d3
			.scaleBand()
			.domain(sortedData.map((d) => d.name))
			.range([0, innerHeight])
			.padding(0.35); // More breathing room between bars

		const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);

		// 4. Gradients (Dynamic based on themeColor)
		const defs = svg.append('defs');
		const gradientId = `bar-gradient-${showRevenue ? 'rev' : 'sold'}`;
		const gradient = defs
			.append('linearGradient')
			.attr('id', gradientId)
			.attr('x1', '0%')
			.attr('y1', '0%')
			.attr('x2', '100%')
			.attr('y2', '0%');

		gradient
			.append('stop')
			.attr('offset', '0%')
			.attr('stop-color', themeColor)
			.attr('stop-opacity', 0.6);
		gradient
			.append('stop')
			.attr('offset', '100%')
			.attr('stop-color', themeColor)
			.attr('stop-opacity', 1);

		// 5. Draw "Tracks" (Background bars)
		g.selectAll('.track')
			.data(sortedData)
			.enter()
			.append('rect')
			.attr('x', 0)
			.attr('y', (d) => yScale(d.name)!)
			.attr('width', innerWidth)
			.attr('height', yScale.bandwidth())
			.attr('fill', '#f3f4f6') // gray-100
			.attr('rx', 4);

		// 6. Draw Foreground Bars
		const bars = g
			.selectAll('.bar')
			.data(sortedData)
			.enter()
			.append('rect')
			.attr('class', 'bar')
			.attr('y', (d) => yScale(d.name)!)
			.attr('height', yScale.bandwidth())
			.attr('x', 0)
			.attr('width', 0) // Start at 0 for animation
			.attr('fill', `url(#${gradientId})`)
			.attr('rx', 4); // Rounded corners

		// Animate Width
		bars
			.transition()
			.duration(1000)
			.ease(d3.easeCubicOut)
			.delay((_, i) => i * 100)
			.attr('width', (d) => Math.max(xScale(getValue(d)), 4)); // Min width 4px to show tiny values

		// 7. Value Labels (Right of bar)
		g.selectAll('.label-val')
			.data(sortedData)
			.enter()
			.append('text')
			.attr('class', 'label-val')
			.attr('y', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
			.attr('dy', '0.35em')
			.attr('font-size', '11px')
			.attr('font-weight', '600')
			.attr('fill', '#374151')
			.text((d) => compactFormat(getValue(d)))
			.attr('x', 0) // Start at 0
			.attr('opacity', 0)
			.transition()
			.duration(1000)
			.ease(d3.easeCubicOut)
			.delay((_, i) => i * 100)
			.attr('x', (d) => xScale(getValue(d)) + 8) // Move to end of bar
			.attr('opacity', 1);

		// 8. Y Axis Labels (Product Names)
		const yAxisG = g.append('g').call(d3.axisLeft(yScale).tickSize(0).tickPadding(10));

		yAxisG.select('.domain').remove(); // Remove vertical line
		yAxisG
			.selectAll('text')
			.attr('font-size', '12px')
			.attr('color', '#4b5563')
			.style('text-anchor', 'end')
			.text((d) => truncateText(d as string));

		// 9. Interactive Overlay (For Tooltip)
		// We add invisible rects over the entire row (label + bar) to catch hover easily
		const overlayGroup = g.append('g').attr('class', 'overlays');

		overlayGroup
			.selectAll('.overlay-rect')
			.data(sortedData)
			.enter()
			.append('rect')
			.attr('x', -margin.left) // Cover the label area too
			.attr('y', (d) => yScale(d.name)!)
			.attr('width', width)
			.attr('height', yScale.bandwidth())
			.attr('fill', 'transparent')
			.style('cursor', 'pointer')
			.on('mouseenter', function (event, d) {
				hoverData = d;
				// Calculate position relative to container
				tooltipY = yScale(d.name)! + margin.top;
				// Position tooltip near the end of the bar, or at least somewhat centered
				const barEnd = xScale(getValue(d));
				tooltipX = Math.min(barEnd + margin.left, width - 150); // Prevent overflow right

				// Highlight the label
				d3.select(container)
					.selectAll('.tick text')
					.filter((t) => t === d.name)
					.attr('font-weight', 'bold')
					.attr('color', themeColor);
			})
			.on('mouseleave', function () {
				hoverData = null;
				// Reset label styles
				d3.select(container)
					.selectAll('.tick text')
					.attr('font-weight', 'normal')
					.attr('color', '#4b5563');
			});
	}

	onMount(() => {
		resizeObserver = new ResizeObserver((entries) => {
			if (entries[0]) width = entries[0].contentRect.width;
		});
		resizeObserver.observe(container);
	});

	onDestroy(() => resizeObserver?.disconnect());

	// Reactivity
	$: if (container && data && width && (showRevenue || !showRevenue)) {
		drawChart();
	}
</script>

<div class="chart-wrapper">
	<div bind:this={container} class="chart-container" style="height: {height}px;"></div>

	<!-- HTML Tooltip -->
	{#if hoverData}
		<div class="tooltip" style="top: {tooltipY}px; left: {margin.left + 10}px;">
			<div class="tooltip-title">{hoverData.name}</div>
			<div class="tooltip-value" style="color: {themeColor}">
				{formatValue(hoverData)}
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
	}

	.tooltip {
		position: absolute;
		transform: translateY(-110%); /* Place above the bar */
		background: rgba(255, 255, 255, 0.98);
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		padding: 6px 10px;
		pointer-events: none;
		z-index: 10;
		min-width: 120px;
		backdrop-filter: blur(2px);
		transition: top 0.1s ease-out;
	}

	.tooltip-title {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
		margin-bottom: 2px;
		/* Allow title to wrap if very long */
		white-space: normal;
		line-height: 1.2;
	}

	.tooltip-value {
		font-size: 0.9rem;
		font-weight: 700;
	}
</style>
