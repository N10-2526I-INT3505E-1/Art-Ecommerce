<script lang="ts">
	import { MessageCircle, X, Send, Loader2 } from 'lucide-svelte';
	import { currentProductStore, type CurrentProduct } from '$lib/stores/currentProduct.svelte';

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

	const API_URL = 'https://api.novus.io.vn/api/chat';

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
			// Build request body with optional feng shui profile and current product
			const requestBody: {
				text: string;
				feng_shui_profile?: FengShuiProfile;
				current_product?: CurrentProduct;
			} = {
				text: userMessage,
			};

			if (fengShuiProfile) {
				requestBody.feng_shui_profile = fengShuiProfile;
				console.log('📊 Including Feng Shui profile in chat');
			}

			if (currentProduct) {
				requestBody.current_product = currentProduct;
				console.log('🛍️ Including current product context:', currentProduct.name);
			}

			const response = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Add AI response
			messages = [
				...messages,
				{ role: 'ai', content: data.answer || 'Xin lỗi, tôi không thể trả lời lúc này.' },
			];
		} catch (error) {
			console.error('Error sending message:', error);
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
		class="btn btn-circle btn-primary btn-lg fixed right-6 bottom-6 z-50 shadow-lg"
		onclick={toggleChat}
		aria-label="Open AI Chat"
	>
		<MessageCircle class="h-6 w-6" />
		{#if currentProduct}
			<span class="absolute -top-1 -right-1 flex h-3 w-3">
				<span
					class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
				></span>
				<span class="bg-success relative inline-flex h-3 w-3 rounded-full"></span>
			</span>
		{/if}
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
					<div
						class="chat-bubble whitespace-pre-wrap"
						class:chat-bubble-primary={message.role === 'user'}
					>
						{message.content}
					</div>
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
