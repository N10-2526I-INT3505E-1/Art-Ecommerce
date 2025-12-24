<script lang="ts">
	import type { PageData } from './$types';
	import RevenueLineChart from '$lib/components/charts/RevenueLineChart.svelte';
	import OrderStatusDonutChart from '$lib/components/charts/OrderStatusDonutChart.svelte';
	import TopProductsBarChart from '$lib/components/charts/TopProductsBarChart.svelte';
	import SalesTrendAreaChart from '$lib/components/charts/SalesTrendAreaChart.svelte';

	import {
		TrendingUp,
		TrendingDown,
		DollarSign,
		ShoppingCart,
		Package,
		BarChart3,
		Calendar,
		AlertCircle,
	} from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	export let data: PageData;

	$: summary = data.summary;
	$: charts = data.charts;
	$: dateRange = data.dateRange;

	let showRevenueInTopProducts = false;

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
			maximumFractionDigits: 0,
		}).format(amount);
	}

	function formatPercent(value: number): string {
		const sign = value >= 0 ? '+' : '';
		return `${sign}${value.toFixed(1)}%`;
	}

	function handleDateChange(event: Event) {
		const form = (event.target as HTMLInputElement).form;
		if (form) {
			form.submit();
		}
	}
</script>

<svelte:head>
	<title>Thống kê | Quản lý</title>
</svelte:head>

<div class="container mx-auto max-w-7xl space-y-8 p-4 md:p-6" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
		<div>
			<h1 class="text-base-content text-3xl font-bold tracking-tight">Thống kê</h1>
			<p class="text-base-content/60 mt-1">Tổng quan hiệu quả kinh doanh của hệ thống</p>
		</div>

		<!-- Date Range Filter -->
		<form
			class="bg-base-100 border-base-200 flex flex-col items-center gap-2 rounded-xl border p-2 shadow-sm sm:flex-row"
		>
			<div class="flex items-center gap-2 px-2">
				<Calendar size={16} class="text-base-content/50" />
				<span class="text-base-content/50 text-xs font-semibold uppercase">Thời gian:</span>
			</div>

			<div class="join">
				<input
					type="date"
					name="from"
					value={dateRange.from}
					on:change={handleDateChange}
					class="input input-bordered input-sm join-item focus:outline-none"
				/>
				<div class="bg-base-200 join-item text-base-content/50 flex items-center px-2 text-xs">
					đến
				</div>
				<input
					type="date"
					name="to"
					value={dateRange.to}
					on:change={handleDateChange}
					class="input input-bordered input-sm join-item focus:outline-none"
				/>
			</div>
		</form>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Total Revenue -->
		<div
			class="bg-base-100 border-base-200 hover:border-primary/20 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-base-content/60 text-sm font-medium">Tổng doanh thu</p>
					<p class="text-primary mt-2 text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
					<div class="mt-2 flex items-center gap-1 text-xs font-medium">
						{#if summary.revenueGrowth >= 0}
							<div class="text-success bg-success/10 flex items-center rounded px-1.5 py-0.5">
								<TrendingUp class="mr-1 h-3 w-3" />
								{formatPercent(summary.revenueGrowth)}
							</div>
						{:else}
							<div class="text-error bg-error/10 flex items-center rounded px-1.5 py-0.5">
								<TrendingDown class="mr-1 h-3 w-3" />
								{formatPercent(summary.revenueGrowth)}
							</div>
						{/if}
						<span class="text-base-content/40 ml-1">so với kỳ trước</span>
					</div>
				</div>
				<div class="bg-primary/10 rounded-xl p-3">
					<DollarSign class="text-primary h-6 w-6" />
				</div>
			</div>
		</div>

		<!-- Total Orders -->
		<div
			class="bg-base-100 border-base-200 hover:border-secondary/20 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-base-content/60 text-sm font-medium">Tổng đơn hàng</p>
					<p class="text-base-content mt-2 text-2xl font-bold">{summary.totalOrders}</p>
					<div class="mt-2 flex items-center gap-1 text-xs font-medium">
						{#if summary.ordersGrowth >= 0}
							<div class="text-success bg-success/10 flex items-center rounded px-1.5 py-0.5">
								<TrendingUp class="mr-1 h-3 w-3" />
								{formatPercent(summary.ordersGrowth)}
							</div>
						{:else}
							<div class="text-error bg-error/10 flex items-center rounded px-1.5 py-0.5">
								<TrendingDown class="mr-1 h-3 w-3" />
								{formatPercent(summary.ordersGrowth)}
							</div>
						{/if}
						<span class="text-base-content/40 ml-1">so với kỳ trước</span>
					</div>
				</div>
				<div class="bg-secondary/10 rounded-xl p-3">
					<ShoppingCart class="text-secondary h-6 w-6" />
				</div>
			</div>
		</div>

		<!-- Paid Orders -->
		<div
			class="bg-base-100 border-base-200 hover:border-success/20 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-base-content/60 text-sm font-medium">Đơn thành công</p>
					<p class="text-success mt-2 text-2xl font-bold">{summary.paidOrdersCount}</p>
					<div class="text-base-content/50 mt-2 flex items-center text-xs">
						<span class="text-base-content/70 mr-1 font-semibold">
							{summary.totalOrders > 0
								? ((summary.paidOrdersCount / summary.totalOrders) * 100).toFixed(1)
								: 0}%
						</span>
						tỷ lệ thành công
					</div>
				</div>
				<div class="bg-success/10 rounded-xl p-3">
					<Package class="text-success h-6 w-6" />
				</div>
			</div>
		</div>

		<!-- AOV -->
		<div
			class="bg-base-100 border-base-200 hover:border-accent/20 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-base-content/60 text-sm font-medium">Giá trị TB/đơn</p>
					<p class="text-accent mt-2 text-2xl font-bold">
						{formatCurrency(summary.averageOrderValue)}
					</p>
					<p class="text-base-content/40 mt-2 text-xs">Tính trên đơn đã thanh toán</p>
				</div>
				<div class="bg-accent/10 rounded-xl p-3">
					<BarChart3 class="text-accent h-6 w-6" />
				</div>
			</div>
		</div>
	</div>

	<!-- Charts Grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- 1. Revenue Chart -->
		<!-- Added: flex flex-col to parent, flex-1 to wrapper to make it fill height -->
		<div
			class="bg-base-100 border-base-200 flex h-full flex-col rounded-2xl border p-6 shadow-sm lg:col-span-2"
		>
			<div class="mb-6 flex-shrink-0">
				<h2 class="text-lg font-bold">Doanh thu theo thời gian</h2>
				<p class="text-base-content/50 text-xs">Biểu đồ thể hiện dòng tiền thực tế</p>
			</div>

			<div class="min-h-[300px] w-full flex-1">
				{#if charts.revenue.length > 0}
					<RevenueLineChart data={charts.revenue} height={320} />
				{:else}
					<div
						class="bg-base-200/50 flex h-full items-center justify-center rounded-xl border border-dashed"
					>
						<AlertCircle class="text-base-content/20 mb-2 h-10 w-10" />
						<span class="text-base-content/50 text-sm">Chưa có dữ liệu doanh thu</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- 2. Order Status (Donut) -->
		<div class="bg-base-100 border-base-200 flex h-full flex-col rounded-2xl border p-6 shadow-sm">
			<div class="mb-6 flex-shrink-0">
				<h2 class="text-lg font-bold">Trạng thái đơn hàng</h2>
				<p class="text-base-content/50 text-xs">Tỷ lệ hoàn thành và hủy</p>
			</div>

			<div class="flex min-h-[300px] w-full flex-1 items-center justify-center">
				{#if charts.orderStatus.length > 0}
					<OrderStatusDonutChart data={charts.orderStatus} height={320} />
				{:else}
					<div
						class="bg-base-200/50 flex h-full w-full items-center justify-center rounded-xl border border-dashed"
					>
						<AlertCircle class="text-base-content/20 mb-2 h-10 w-10" />
						<span class="text-base-content/50 text-sm">Chưa có dữ liệu đơn hàng</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- 3. Sales Trend -->
		<div
			class="bg-base-100 border-base-200 flex flex-col rounded-2xl border p-6 shadow-sm lg:col-span-2"
		>
			<div class="mb-6 flex-shrink-0">
				<h2 class="text-lg font-bold">Xu hướng bán hàng</h2>
				<p class="text-base-content/50 text-xs">So sánh số lượng đơn và doanh thu</p>
			</div>

			<div class="min-h-[300px] w-full flex-1">
				{#if charts.trend.length > 0}
					<SalesTrendAreaChart data={charts.trend} height={300} />
				{:else}
					<div
						class="bg-base-200/50 flex h-full items-center justify-center rounded-xl border border-dashed"
					>
						<AlertCircle class="text-base-content/20 mb-2 h-10 w-10" />
						<span class="text-base-content/50 text-sm">Chưa có dữ liệu xu hướng</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- 4. Top Products -->
		<div class="bg-base-100 border-base-200 flex flex-col rounded-2xl border p-6 shadow-sm">
			<div class="mb-6 flex flex-shrink-0 items-center justify-between">
				<div>
					<h2 class="text-lg font-bold">Top sản phẩm</h2>
					<p class="text-base-content/50 text-xs">5 sản phẩm hiệu quả nhất</p>
				</div>
				<div class="join bg-base-200 rounded-lg p-1">
					<button
						class="join-item btn btn-xs border-none shadow-none {!showRevenueInTopProducts
							? 'text-primary bg-white'
							: 'text-base-content/60 bg-transparent'}"
						on:click={() => (showRevenueInTopProducts = false)}
					>
						SL
					</button>
					<button
						class="join-item btn btn-xs border-none shadow-none {showRevenueInTopProducts
							? 'text-primary bg-white'
							: 'text-base-content/60 bg-transparent'}"
						on:click={() => (showRevenueInTopProducts = true)}
					>
						Tiền
					</button>
				</div>
			</div>

			<div class="min-h-[300px] w-full flex-1">
				{#if charts.topProducts.length > 0}
					<TopProductsBarChart
						data={charts.topProducts}
						height={300}
						showRevenue={showRevenueInTopProducts}
					/>
				{:else}
					<div
						class="bg-base-200/50 flex h-full items-center justify-center rounded-xl border border-dashed"
					>
						<AlertCircle class="text-base-content/20 mb-2 h-10 w-10" />
						<span class="text-base-content/50 text-sm">Chưa có dữ liệu sản phẩm</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
