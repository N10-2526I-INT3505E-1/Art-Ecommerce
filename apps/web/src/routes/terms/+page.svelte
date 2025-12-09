<script lang="ts">
	import {
		AlertTriangle,
		ArrowLeft,
		Brain,
		Copyright,
		CreditCard,
		Eye,
		FileText,
		HelpCircle,
		Lock,
		Mail,
		RefreshCw,
		Shield,
		ShoppingBag,
		Truck,
		User,
	} from 'lucide-svelte';
	import { onMount } from 'svelte';

	let activeSection = $state('intro');
	let isMobileNavVisible = $state(false);

	const sections = [
		{
			id: 'intro',
			title: 'Tổng quan',
			icon: FileText,
			content: `
				<strong>Đây là dự án để học tập, mang tính chất tham khảo, không được là/không phải là sản phẩm thương mại thực tế, không thực sự bán hàng và không phục vụ mục đích kinh doanh.</strong>
				<strong>Mọi thông tin về sản phẩm, dịch vụ, chính sách, và điều khoản đều mang tính minh họa và không áp dụng trong thực tế. Thuật toán bát tự được sử dụng trên trang web này là có tham khảo và có cơ sở, tuy vậy, có nhiều trường phái, pháp pháp tính toán Bát tự Tử Bình khác nhau và trang web có thể đưa ra kết quả dự đoán khác. Ngoài ra, không thể đánh giá được Bát tự Tử Bình hay các môn huyền học khác có ảnh hưởng như thế nào tới vận mệnh, đời sống (một cách khoa học).</strong>
                <p>Chào mừng bạn đến với Novus. Nền tảng của chúng tôi cung cấp dịch vụ thương mại điện tử chuyên biệt về vật phẩm phong thủy kết hợp công nghệ tư vấn nội thất thông minh dựa trên trí tuệ nhân tạo. Việc truy cập và sử dụng nền tảng đồng nghĩa với việc bạn chấp nhận tuân thủ toàn bộ các điều khoản dịch vụ được quy định dưới đây.</p>
                <p>Novus giúp bạn lựa chọn vật phẩm phù hợp với mệnh lý cá nhân và không gian sống theo phương pháp khoa học, mang lại trải nghiệm tiện lợi và tin cậy.</p>
            `,
		},
		{
			id: 'ai-disclaimer',
			title: 'Tuyên bố về AI',
			icon: Brain,
			content: `
                <p>Hệ thống tư vấn tự động của Novus sử dụng trí tuệ nhân tạo để phân tích thông tin Bát tự (dựa trên ngày giờ sinh) và hình ảnh không gian nội thất. Chúng tôi cam kết minh bạch về các điểm sau:</p>
                <ul class="mt-4 space-y-3">
                    <li><strong>Tính chất tham khảo:</strong> Kết quả phân tích mang tính chất gợi ý dựa trên nguyên lý phong thủy và mệnh lý cơ bản, không thay thế ý kiến của chuyên gia phong thủy chuyên nghiệp.</li>
                    <li><strong>Tiếp cận khoa học:</strong> Chúng tôi không khuyến khích mê tín dị đoan, không sử dụng yếu tố hù dọa hoặc ép buộc mua hàng. Hệ thống tập trung vào việc tạo ra sự hài hòa năng lượng trong không gian sống một cách khoa học và hợp lý.</li>
                    <li><strong>Giới hạn trách nhiệm:</strong> Novus không chịu trách nhiệm pháp lý đối với các quyết định cá nhân mà bạn đưa ra dựa trên kết quả tư vấn từ hệ thống AI.</li>
                </ul>
            `,
		},
		{
			id: 'privacy',
			title: 'Bảo mật & Dữ liệu',
			icon: Shield,
			content: `
                <p>Chúng tôi tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và cam kết bảo vệ quyền riêng tư của bạn theo các nguyên tắc sau:</p>
                <ul class="mt-4 space-y-3">
                    <li><strong>Dữ liệu mệnh lý:</strong> Thông tin ngày giờ sinh chỉ được sử dụng cho mục đích tính toán Bát tự và Dụng thần. Dữ liệu này được bảo mật tuyệt đối, không chia sẻ với bên thứ ba.</li>
                    <li><strong>Hình ảnh nội thất:</strong> Ảnh không gian nội thất do bạn tải lên sẽ tự động xóa vĩnh viễn khỏi hệ thống sau 12 giờ kể từ thời điểm phân tích hoàn tất.</li>
                    <li><strong>Lịch sử tương tác:</strong> Dữ liệu hội thoại được lưu trữ tối đa 12 tháng để cải thiện trải nghiệm người dùng. Bạn có quyền yêu cầu xóa bỏ dữ liệu này bất cứ lúc nào.</li>
                    <li><strong>Quyền kiểm soát:</strong> Bạn có toàn quyền truy cập, chỉnh sửa, hoặc yêu cầu xóa dữ liệu cá nhân thông qua tính năng quản lý tài khoản.</li>
                </ul>
            `,
		},
		{
			id: 'account',
			title: 'Quản lý tài khoản',
			icon: User,
			content: `
                <p>Để sử dụng đầy đủ các tính năng của Novus, bạn cần tạo tài khoản và tuân thủ các quy tắc sau:</p>
                <ul class="mt-4 space-y-3">
                    <li><strong>Tính chính xác:</strong> Thông tin ngày giờ sinh cần được cung cấp chính xác để hệ thống AI có thể đưa ra tư vấn phù hợp. Sai lệch thông tin sẽ dẫn đến kết quả phân tích không chính xác.</li>
                    <li><strong>Bảo mật tài khoản:</strong> Bạn có trách nhiệm bảo vệ thông tin đăng nhập và thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép. Chúng tôi hỗ trợ xác thực qua Google OAuth và Magic Link để tăng cường bảo mật.</li>
                    <li><strong>Sử dụng hợp pháp:</strong> Tài khoản chỉ được sử dụng cho mục đích cá nhân, không nhằm mục đích thương mại hoặc vi phạm pháp luật.</li>
                </ul>
            `,
		},
		{
			id: 'products',
			title: 'Sản phẩm & Mô tả',
			icon: ShoppingBag,
			content: `
                <p>Novus cam kết cung cấp thông tin sản phẩm chính xác và đầy đủ:</p>
                <ul class="mt-4 space-y-3">
                    <li><strong>Mô tả chi tiết:</strong> Mỗi sản phẩm được mô tả rõ ràng về thuộc tính Ngũ hành, hướng đặt phù hợp, và công dụng phong thủy. Do đặc thù hiển thị màn hình, màu sắc thực tế có thể có sự sai lệch nhỏ so với hình ảnh.</li>
                    <li><strong>Sản phẩm thủ công:</strong> Nhiều vật phẩm phong thủy là sản phẩm thủ công hoặc từ nguyên liệu tự nhiên, nên có thể có sự khác biệt nhỏ về kích thước, vân đá, hoặc chi tiết. Những khác biệt này mang tính tự nhiên và không được coi là lỗi sản phẩm.</li>
                    <li><strong>Tính sẵn có:</strong> Thông tin về số lượng và tình trạng kho được cập nhật thường xuyên, tuy nhiên chúng tôi không đảm bảo sản phẩm luôn có sẵn do tính chất khan hiếm của một số vật phẩm.</li>
                </ul>
            `,
		},
		{
			id: 'payment',
			title: 'Thanh toán & Đơn hàng',
			icon: CreditCard,
			content: `
                <p>Quy trình thanh toán và xử lý đơn hàng được thực hiện theo các nguyên tắc sau:</p>
                <ul class="mt-4 space-y-3">
                    <li><strong>Giá cả minh bạch:</strong> Giá niêm yết đã bao gồm thuế GTGT theo quy định. Phí vận chuyển được tính toán tự động tại bước thanh toán dựa trên địa chỉ giao hàng.</li>
                    <li><strong>Phương thức thanh toán:</strong> Chúng tôi chấp nhận thanh toán qua VNPAY, hoặc các phương thức khác được hiện thị tại trang thanh toán.</li>
                    <li><strong>Xác nhận đơn hàng:</strong> Sau khi đặt hàng thành công, bạn sẽ nhận email xác nhận chi tiết đơn hàng và mã theo dõi.</li>
                    <li><strong>Hủy đơn hàng:</strong> Bạn có thể hủy đơn hàng miễn phí khi đơn hàng đang ở trạng thái "Chờ thanh toán" hoặc "Chờ đóng gói". Đơn hàng đã chuyển sang trạng thái "Đang vận chuyển" không thể hủy.</li>
                </ul>
            `,
		},
		{
			id: 'shipping',
			title: 'Vận chuyển & Giao nhận',
			icon: Truck,
			content: `
                <p>Chính sách vận chuyển của Novus được thiết kế để đảm bảo sản phẩm đến tay bạn an toàn:</p>
                <ul class="mt-4 space-y-3">
                    <li><strong>Thời gian xử lý:</strong> Đơn hàng được xử lý và đóng gói trong vòng 1-2 ngày làm việc kể từ khi xác nhận thanh toán thành công.</li>
                    <li><strong>Thời gian giao hàng:</strong> Tùy thuộc vào khu vực, thời gian giao hàng dao động từ 2-7 ngày làm việc. Các sản phẩm đặc biệt có thể mất thời gian lâu hơn.</li>
                    <li><strong>Đóng gói cẩn thận:</strong> Vật phẩm phong thủy, đặc biệt là đá tự nhiên và gốm sứ, được đóng gói kỹ càng với vật liệu chống sốc chuyên dụng.</li>
                    <li><strong>Kiểm tra khi nhận hàng:</strong> Vui lòng kiểm tra kỹ sản phẩm trước khi ký nhận. Nếu phát hiện hư hỏng do vận chuyển, hãy chụp ảnh và liên hệ ngay với chúng tôi.</li>
                </ul>
            `,
		},
		{
			id: 'returns',
			title: 'Đổi trả & Hoàn tiền',
			icon: RefreshCw,
			content: `
                <p>Chúng tôi áp dụng chính sách đổi trả linh hoạt để đảm bảo quyền lợi khách hàng:</p>
                <ul class="mt-4 space-y-3">
                    <li><strong>Thời hạn đổi trả:</strong> Bạn có thể yêu cầu đổi trả trong vòng 7-30 ngày tùy theo loại sản phẩm (được ghi rõ trên trang sản phẩm).</li>
                    <li><strong>Điều kiện đổi trả:</strong> Sản phẩm phải còn nguyên vẹn, chưa qua sử dụng, có đầy đủ hộp và phụ kiện đi kèm.</li>
                    <li><strong>Lỗi từ nhà cung cấp:</strong> Sản phẩm bị hư hỏng do vận chuyển hoặc lỗi sản xuất sẽ được đổi mới miễn phí, bao gồm cả phí vận chuyển hai chiều.</li>
                    <li><strong>Không phù hợp cá nhân:</strong> Trường hợp sản phẩm không phù hợp với mong đợi hoặc mệnh lý, vui lòng liên hệ bộ phận chăm sóc khách hàng để được tư vấn giải pháp thay thế hoặc đổi trả (có thể áp dụng phí vận chuyển).</li>
                    <li><strong>Hoàn tiền:</strong> Tiền được hoàn lại trong vòng 5-7 ngày làm việc sau khi chúng tôi nhận và kiểm tra sản phẩm hoàn trả.</li>
                </ul>
            `,
		},
		{
			id: 'ip',
			title: 'Sở hữu trí tuệ',
			icon: Copyright,
			content: `
                <p>Toàn bộ nội dung, giao diện, hình ảnh, logo, và thuật toán AI trên nền tảng Novus là tài sản trí tuệ được bảo hộ theo pháp luật Việt Nam và các điều ước quốc tế. Mọi hành vi sao chép, sử dụng, hoặc thương mại hóa mà không có sự cho phép bằng văn bản của Novus đều bị nghiêm cấm và có thể bị xử lý theo pháp luật.</p>
                <p class="mt-4">Bạn được cấp quyền sử dụng cá nhân, không độc quyền, không thể chuyển nhượng đối với nội dung trên nền tảng chỉ cho mục đích cá nhân và không thương mại.</p>
            `,
		},
		{
			id: 'limitation',
			title: 'Giới hạn trách nhiệm',
			icon: AlertTriangle,
			content: `
                <p>Trong phạm vi pháp luật cho phép, Novus không chịu trách nhiệm đối với:</p>
                <ul class="mt-4 space-y-3">
                    <li>Các quyết định cá nhân dựa trên kết quả tư vấn từ hệ thống AI</li>
                    <li>Tổn thất gián tiếp, ngẫu nhiên, hoặc do hậu quả phát sinh từ việc sử dụng dịch vụ</li>
                    <li>Gián đoạn dịch vụ do sự cố kỹ thuật, bảo trì hệ thống, hoặc lý do bất khả kháng</li>
                    <li>Nội dung hoặc hành vi của bên thứ ba trên nền tảng</li>
                </ul>
                <p class="mt-4">Trách nhiệm tối đa của chúng tôi không vượt quá giá trị đơn hàng hoặc dịch vụ mà bạn đã thanh toán.</p>
            `,
		},
		{
			id: 'changes',
			title: 'Thay đổi điều khoản',
			icon: FileText,
			content: `
                <p>Novus có quyền cập nhật hoặc sửa đổi các điều khoản dịch vụ này bất kỳ lúc nào. Các thay đổi quan trọng sẽ được thông báo qua email hoặc thông báo nổi bật trên nền tảng ít nhất 7 ngày trước khi có hiệu lực.</p>
                <p class="mt-4">Việc bạn tiếp tục sử dụng dịch vụ sau khi các thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các điều khoản đã được cập nhật.</p>
            `,
		},
		{
			id: 'contact',
			title: 'Liên hệ & Hỗ trợ',
			icon: Mail,
			content: `
                <p>Nếu bạn có bất kỳ thắc mắc nào về các điều khoản dịch vụ hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi qua:</p>
                <ul class="mt-4 space-y-2">
                    <li class="flex items-center gap-2">
                        <strong>Email pháp lý:</strong> legal@novus.io.vn
                    </li>
                    <li class="flex items-center gap-2">
                        <strong>Email hỗ trợ:</strong> support@novus.io.vn
                    </li>
                    <li class="flex items-center gap-2">
                        <strong>Hotline:</strong> 1900 JQKA (8:00 - 22:00 hàng ngày)
                    </li>
                    <li class="flex items-center gap-2">
                        <strong>Địa chỉ:</strong> Khu Công Nghệ Cao Hòa Lạc, Thạch Thất, Hà Nội
                    </li>
                </ul>
            `,
		},
	];

	function scrollToSection(id: string) {
		const element = document.getElementById(id);
		if (element) {
			const offset = window.innerWidth >= 1024 ? 140 : 120;
			const y = element.getBoundingClientRect().top + window.scrollY - offset;
			window.scrollTo({ top: y, behavior: 'smooth' });
			activeSection = id;
			if (window.innerWidth < 1024) isMobileNavVisible = false;
		}
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeSection = entry.target.id;
					}
				});
			},
			{ rootMargin: '-20% 0px -60% 0px' },
		);

		sections.forEach((section) => {
			const element = document.getElementById(section.id);
			if (element) observer.observe(element);
		});

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>Điều khoản dịch vụ - Novus</title>
	<meta
		name="description"
		content="Điều khoản sử dụng và chính sách bảo mật cho nền tảng phong thủy thông minh Novus"
	/>
</svelte:head>

<div class="bg-base-200 min-h-screen pb-20 font-sans md:pb-24">
	<!-- Header - Sticky on mobile -->
	<div
		class="border-base-300 from-base-100 to-base-100/95 sticky top-0 z-30 border-b bg-gradient-to-b shadow-sm backdrop-blur-md"
	>
		<div class="container mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
			<div class="mb-5 flex items-center justify-between md:mb-6">
				<a
					href="/"
					class="btn btn-ghost btn-sm text-base-content/70 hover:text-primary md:btn-md gap-2 px-3 normal-case transition-colors active:scale-95 md:px-4"
					aria-label="Quay lại trang chủ"
				>
					<ArrowLeft size={18} class="md:h-5 md:w-5" />
					<span>Trang chủ</span>
				</a>

				<button
					class="btn btn-circle btn-ghost btn-sm lg:hidden"
					onclick={() => (isMobileNavVisible = !isMobileNavVisible)}
					aria-label="Mở menu điều hướng"
					aria-expanded={isMobileNavVisible}
				>
					<FileText size={20} />
				</button>
			</div>

			<div class="space-y-2 text-center lg:text-left">
				<h1
					class="font-montserrat text-base-content text-3xl font-black tracking-tight sm:text-4xl md:text-5xl"
				>
					Điều khoản dịch vụ
				</h1>
				<p class="text-base-content/70 max-w-2xl text-base md:text-lg">
					Quy định sử dụng và cam kết bảo vệ quyền lợi người dùng tại Novus
				</p>
				<div
					class="text-base-content/50 flex items-center justify-center gap-2 pt-1 text-sm lg:justify-start"
				>
					<Shield size={16} class="text-primary" />
					<span>Phiên bản 0.2 · Cập nhật 01/12/2025</span>
				</div>
			</div>
		</div>
	</div>

	<div class="relative container mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
		<!-- Mobile Navigation Drawer -->
		{#if isMobileNavVisible}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
				onclick={() => (isMobileNavVisible = false)}
				role="button"
				tabindex="0"
				aria-label="Đóng menu"
			>
				<div
					class="bg-base-100 absolute right-0 bottom-0 left-0 max-h-[70vh] overflow-y-auto rounded-t-3xl p-6 shadow-2xl"
					onclick={(e) => e.stopPropagation()}
					role="dialog"
					tabindex="-1"
					aria-modal="true"
				>
					<div class="border-base-200 mb-6 flex items-center justify-between border-b pb-4">
						<h3 class="text-base-content text-lg font-bold">Mục lục</h3>
						<button
							class="btn btn-circle btn-ghost btn-sm"
							onclick={() => (isMobileNavVisible = false)}
							aria-label="Đóng"
						>
							<ArrowLeft size={20} />
						</button>
					</div>
					<nav class="space-y-2">
						{#each sections as section}
							<button
								onclick={() => scrollToSection(section.id)}
								class="flex w-full items-center gap-3 rounded-xl p-3 text-left font-medium transition-all active:scale-98 {activeSection ===
								section.id
									? 'bg-primary shadow-primary/30 text-white shadow-lg'
									: 'hover:bg-base-200 text-base-content/80'}"
							>
								<svelte:component
									this={section.icon}
									size={20}
									class={activeSection === section.id ? 'text-white' : 'text-base-content/50'}
								/>
								<span class="text-sm">{section.title}</span>
							</button>
						{/each}
					</nav>
				</div>
			</div>
		{/if}

		<div class="mt-8 flex gap-8 lg:gap-12">
			<!-- Desktop Sidebar - Sticky with proper viewport tracking -->
			<aside class="hidden lg:block lg:w-80 lg:flex-shrink-0">
				<div
					class="border-base-300 bg-base-100 sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl border p-6 shadow-lg"
				>
					<h3 class="text-base-content/60 mb-6 px-2 text-xs font-bold tracking-wider uppercase">
						Mục lục
					</h3>
					<nav class="space-y-1.5">
						{#each sections as section}
							<button
								onclick={() => scrollToSection(section.id)}
								class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98] {activeSection ===
								section.id
									? 'from-primary to-primary/90 shadow-primary/25 bg-gradient-to-r text-white shadow-md'
									: 'text-base-content/75 hover:bg-base-200 hover:text-base-content'}"
								aria-current={activeSection === section.id ? 'true' : 'false'}
							>
								<svelte:component
									this={section.icon}
									size={18}
									class={activeSection === section.id ? 'text-white' : 'text-base-content/40'}
								/>
								<span>{section.title}</span>
							</button>
						{/each}
					</nav>
				</div>
			</aside>

			<!-- Main Content -->
			<main class="flex-1 lg:max-w-4xl">
				<article
					class="border-base-300 bg-base-100 space-y-12 rounded-2xl border p-6 shadow-xl md:p-10 lg:p-12"
				>
					{#each sections as section, index}
						<section
							id={section.id}
							class="scroll-mt-36 lg:scroll-mt-40"
							aria-labelledby="{section.id}-heading"
						>
							<!-- Section Header -->
							<div class="mb-6 flex items-start gap-4">
								<div
									class="border-primary/20 from-primary/10 to-primary/5 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br"
								>
									<svelte:component this={section.icon} size={26} class="text-primary" />
								</div>
								<div class="flex-1">
									<h2
										id="{section.id}-heading"
										class="font-montserrat text-base-content text-2xl font-bold tracking-tight md:text-3xl"
									>
										{section.title}
									</h2>
									<div
										class="from-primary via-primary/60 mt-3 h-1 w-20 rounded-full bg-gradient-to-r to-transparent"
									></div>
								</div>
							</div>

							<!-- Content -->
							<div class="prose prose-base text-base-content/85 lg:prose-lg max-w-none">
								{@html section.content}
							</div>

							{#if index < sections.length - 1}
								<div class="border-base-200 mt-10 border-t"></div>
							{/if}
						</section>
					{/each}

					<!-- Footer Agreement -->
					<footer class="border-base-200 bg-base-50 mt-12 rounded-xl border-t p-8 text-center">
						<div class="mx-auto max-w-2xl space-y-3">
							<Shield size={32} class="text-primary mx-auto opacity-60" />
							<p class="text-base-content/65 text-sm leading-relaxed italic">
								Bằng việc tiếp tục sử dụng dịch vụ Novus, bạn xác nhận rằng đã đọc, hiểu rõ và đồng
								ý tuân thủ toàn bộ các điều khoản được nêu trong tài liệu này.
							</p>
						</div>
					</footer>
				</article>
			</main>
		</div>

		<!-- Back to Top Button - Mobile -->
		<button
			class="btn btn-circle btn-primary btn-lg shadow-primary/30 hover:shadow-primary/40 fixed right-6 bottom-6 z-40 shadow-xl transition-all hover:shadow-2xl active:scale-95 md:hidden"
			onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
			aria-label="Cuộn lên đầu trang"
		>
			<ArrowLeft size={22} class="rotate-90" />
		</button>
	</div>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
		font-family:
			'Inter',
			'SF Pro Display',
			-apple-system,
			BlinkMacSystemFont,
			system-ui,
			sans-serif;
	}

	:global(.font-montserrat) {
		font-family: 'Montserrat', 'Inter', sans-serif;
	}

	/* Prose styling for content */
	:global(.prose p) {
		margin-bottom: 1rem;
		line-height: 1.75;
	}

	:global(.prose ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
	}

	:global(.prose li) {
		margin-bottom: 0.75rem;
		line-height: 1.7;
	}

	:global(.prose strong) {
		font-weight: 600;
		color: rgb(var(--bc) / 0.95);
	}

	/* Smooth transitions */
	@media (prefers-reduced-motion: no-preference) {
		.transition-all {
			transition-property: all;
			transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
			transition-duration: 200ms;
		}
	}

	/* Backdrop blur support */
	@supports (backdrop-filter: blur(12px)) {
		.backdrop-blur-md {
			backdrop-filter: blur(12px);
		}
		.backdrop-blur-sm {
			backdrop-filter: blur(8px);
		}
	}

	/* Custom scrollbar for sidebar */
	@media (min-width: 1024px) {
		aside::-webkit-scrollbar {
			width: 6px;
		}
		aside::-webkit-scrollbar-track {
			background: transparent;
		}
		aside::-webkit-scrollbar-thumb {
			background: rgb(var(--bc) / 0.2);
			border-radius: 10px;
		}
		aside::-webkit-scrollbar-thumb:hover {
			background: rgb(var(--bc) / 0.3);
		}
	}
</style>
