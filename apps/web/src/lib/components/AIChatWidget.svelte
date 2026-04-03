<script lang="ts">
	import { Loader2, MessageCircle, Send, X } from 'lucide-svelte';
	import { marked } from 'marked';
	import { type CurrentProduct, currentProductStore } from '$lib/stores/currentProduct.svelte';

	// Configure marked for safe rendering
	marked.setOptions({
		breaks: true,
		gfm: true,
	});

	// Helper to render markdown to HTML
	function renderMarkdown(content: string): string {
		try {
			return marked.parse(content) as string;
		} catch {
			return content;
		}
	}

	// Props - feng shui profile for personalized recommendations
	interface FengShuiProfile {
		dung_than: string[];
		hy_than: string[];
		ky_than: string[];
		hung_than: string[];
		day_master_element?: string;
		day_master_status?: string;
	}

	interface Props {
		baziProfile?: {
			limit_score?: {
				dungThan: string[];
				hyThan: string[];
				kyThan: string[];
				hungThan: string[];
			};
			day_master_element?: string;
			day_master_status?: string;
		} | null;
	}

	const { baziProfile = null }: Props = $props();

	let isOpen = $state(false);
	let messages = $state<{ role: 'user' | 'ai'; content: string }[]>([]);
	let inputText = $state('');
	let isTyping = $state(false);
	let messagesContainer = $state<HTMLDivElement | null>(null);

	// Demo mode: no external AI service
	const DEMO_MODE = true;

	// Get current product from store - use .value for Svelte 5 reactivity
	const currentProduct = $derived(currentProductStore.value);

	// Build feng shui profile from bazi data
	const fengShuiProfile = $derived<FengShuiProfile | null>(
		baziProfile?.limit_score
			? {
					dung_than: baziProfile.limit_score.dungThan ?? [],
					hy_than: baziProfile.limit_score.hyThan ?? [],
					ky_than: baziProfile.limit_score.kyThan ?? [],
					hung_than: baziProfile.limit_score.hungThan ?? [],
					day_master_element: baziProfile.day_master_element,
					day_master_status: baziProfile.day_master_status,
				}
			: null,
	);

	async function sendMessage() {
		if (!inputText.trim() || isTyping) return;

		const userMessage = inputText.trim();

		// Add user message
		messages = [...messages, { role: 'user', content: userMessage }];
		inputText = '';
		isTyping = true;

		scrollToBottom();

		try {
			// Demo mode: generate canned responses
			await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay

			let aiResponse = '';
			const lowerMsg = userMessage.toLowerCase();

			if (currentProduct) {
				if (
					lowerMsg.includes('hợp') ||
					lowerMsg.includes('mệnh') ||
					lowerMsg.includes('phong thủy')
				) {
					aiResponse = `**Phân tích sản phẩm "${currentProduct.name}":**\n\n`;
					if (fengShuiProfile && fengShuiProfile.dung_than.length > 0) {
						aiResponse += `Dựa trên Dụng Thần **${fengShuiProfile.dung_than.join(', ')}** của bạn, sản phẩm này có thể phù hợp với không gian sống của bạn.\n\n`;
						aiResponse += `💡 *Đây là bản demo. Phân tích chi tiết có trong phiên bản đầy đủ.*`;
					} else {
						aiResponse += `Để phân tích phong thủy chính xác, bạn cần tạo hồ sơ Bát Tự tại trang [Bát Tự](/bazi).\n\n`;
						aiResponse += `💡 *Đây là bản demo.*`;
					}
				} else {
					aiResponse = `Sản phẩm **${currentProduct.name}** là một lựa chọn tốt cho trang trí không gian.\n\nBạn có muốn tôi phân tích phong thủy của sản phẩm này không?`;
				}
			} else if (lowerMsg.includes('mệnh') || lowerMsg.includes('ngũ hành')) {
				if (fengShuiProfile) {
					aiResponse = `Theo hồ sơ của bạn:\n- **Dụng Thần:** ${fengShuiProfile.dung_than.join(', ')}\n- **Hỷ Thần:** ${fengShuiProfile.hy_than.join(', ')}\n\nBạn nên chọn tranh và đồ trang trí phù hợp với các hành trên.\n\n💡 *Đây là bản demo.*`;
				} else {
					aiResponse = `Bạn chưa có hồ sơ Bát Tự. Hãy tạo hồ sơ tại trang [Bát Tự](/bazi) để nhận tư vấn cá nhân hóa!\n\n💡 *Đây là bản demo.*`;
				}
			} else {
				aiResponse = `Cảm ơn câu hỏi của bạn! Tôi là AI phong thủy Novice.\n\nTrong bản demo này, tôi có thể hỗ trợ:\n- Phân tích sản phẩm (mở trang sản phẩm rồi hỏi)\n- Tư vấn theo mệnh ngũ hành\n\n💡 *Tính năng AI đầy đủ có trong phiên bản production.*`;
			}

			messages = [...messages, { role: 'ai', content: aiResponse }];
		} catch (error) {
			console.error('Error generating response:', error);
			messages = [
				...messages,
				{ role: 'ai', content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' },
			];
		} finally {
			isTyping = false;
			scrollToBottom();
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 100);
	}

	function toggleChat() {
		isOpen = !isOpen;
		if (isOpen && messages.length === 0) {
			// Welcome message - personalized based on context
			let welcomeMessage = 'Xin chào! Tôi là Novice - AI phong thủy của Novus.';

			// If viewing a product, mention it
			if (currentProduct) {
				welcomeMessage += `\n\n🛍️ Tôi thấy bạn đang xem **${currentProduct.name}**.`;

				if (fengShuiProfile && fengShuiProfile.dung_than.length > 0) {
					welcomeMessage += `\n\nBạn muốn tôi phân tích xem sản phẩm này có hợp với mệnh của bạn không?`;
				} else {
					welcomeMessage += `\n\nBạn có muốn tôi tư vấn về sản phẩm này không?`;
				}
			} else if (fengShuiProfile && fengShuiProfile.dung_than.length > 0) {
				const kyThanList = [...fengShuiProfile.ky_than, ...fengShuiProfile.hung_than];
				welcomeMessage += `\n\n🎯 Tôi đã nhận được hồ sơ phong thủy của bạn:`;
				welcomeMessage += `\n• Dụng Thần: ${fengShuiProfile.dung_than.join(', ')}`;
				if (kyThanList.length > 0) {
					welcomeMessage += `\n• Kỵ Thần: ${kyThanList.join(', ')}`;
				}
				welcomeMessage += `\n\nTôi sẽ tư vấn dựa trên mệnh của bạn! Bạn cần hỗ trợ gì?`;
			} else {
				welcomeMessage += `\n\nBạn có thể hỏi tôi về:\n• Mệnh ngũ hành\n• Chọn tranh/đồ vật hợp mệnh\n• Tư vấn bố trí phòng\n• Ý nghĩa phong thủy\n\nBạn cần tư vấn gì?`;
			}

			messages = [{ role: 'ai', content: welcomeMessage }];
		}
		if (isOpen) {
			scrollToBottom();
		}
	}

	// Reset welcome message when product changes while chat is closed
	$effect(() => {
		const _product = currentProduct; // Track product changes
		if (!isOpen) {
			messages = []; // Clear messages so new welcome message appears on next open
		}
	});
</script>

<!-- Floating Button -->
{#if !isOpen}
	<button
		class="group bg-primary text-primary-content fixed right-6 bottom-6 z-50 flex h-12 flex-row-reverse items-center overflow-hidden rounded-full shadow-lg transition-all duration-300 ease-in-out"
		onclick={toggleChat}
		aria-label="Open AI Chat"
	>
		<div class="relative flex h-12 w-12 shrink-0 items-center justify-center">
			<MessageCircle class="h-6 w-6" />
			{#if currentProduct}
				<span class="absolute top-1.5 right-1.5 flex h-3 w-3">
					<span
						class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
					></span>
					<span class="bg-success relative inline-flex h-3 w-3 rounded-full"></span>
				</span>
			{/if}
		</div>
		<span
			class="inline-block max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-300 ease-in-out group-hover:max-w-48 group-hover:pr-2 group-hover:pl-4 group-hover:opacity-100"
		>
			Chat with Novice
		</span>
	</button>
{/if}

<!-- Chat Window -->
{#if isOpen}
	<div
		class="bg-base-100 fixed right-6 bottom-6 z-50 flex h-[600px] w-96 flex-col rounded-lg shadow-2xl"
	>
		<!-- Header -->
		<div class="bg-primary text-primary-content flex items-center justify-between rounded-t-lg p-4">
			<div class="flex items-center gap-2">
				<MessageCircle class="h-5 w-5" />
				<div>
					<h3 class="font-semibold">AI Phong Thủy</h3>
					<p class="text-xs opacity-80">
						{#if currentProduct}
							🛍️ Đang xem: {currentProduct.name.slice(0, 20)}{currentProduct.name.length > 20
								? '...'
								: ''}
						{:else if fengShuiProfile}
							🎯 Đã kết nối hồ sơ
						{:else if isTyping}
							⏳ Đang trả lời...
						{:else}
							🟢 Sẵn sàng
						{/if}
					</p>
				</div>
			</div>
			<button class="btn btn-ghost btn-sm btn-circle" onclick={toggleChat}>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Messages -->
		<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
			{#each messages as message}
				<div
					class="chat"
					class:chat-end={message.role === 'user'}
					class:chat-start={message.role === 'ai'}
				>
					{#if message.role === 'ai'}
						<div class="chat-bubble prose prose-sm prose-invert max-w-none">
							{@html renderMarkdown(message.content)}
						</div>
					{:else}
						<div class="chat-bubble chat-bubble-primary whitespace-pre-wrap">
							{message.content}
						</div>
					{/if}
				</div>
			{/each}

			{#if isTyping}
				<div class="chat chat-start">
					<div class="chat-bubble flex items-center gap-2">
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>AI đang trả lời...</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input -->
		<div class="border-base-300 border-t p-4">
			{#if currentProduct}
				<div class="text-base-content/60 mb-2 flex items-center gap-1 text-xs">
					<span class="badge badge-ghost badge-sm"
						>🛍️ {currentProduct.name.slice(0, 25)}{currentProduct.name.length > 25
							? '...'
							: ''}</span
					>
				</div>
			{/if}
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={inputText}
					onkeypress={handleKeyPress}
					placeholder={currentProduct ? 'Hỏi về sản phẩm này...' : 'Nhập câu hỏi...'}
					class="input input-bordered flex-1"
					disabled={isTyping}
				/>
				<button
					class="btn btn-primary"
					onclick={sendMessage}
					disabled={!inputText.trim() || isTyping}
				>
					{#if isTyping}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Send class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
