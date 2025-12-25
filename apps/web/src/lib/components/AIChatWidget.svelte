<script lang="ts">
	import { MessageCircle, X, Send, Loader2 } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';

	let isOpen = $state(false);
	let messages = $state<{ role: 'user' | 'ai'; content: string }[]>([]);
	let inputText = $state('');
	let isConnected = $state(false);
	let isTyping = $state(false);
	let currentMessage = $state(''); // Accumulator for streaming tokens
	let ws: WebSocket | null = null;
	let messagesContainer: HTMLDivElement; // ← No $state needed for DOM refs

	onMount(() => {
		connectWebSocket();
	});

	onDestroy(() => {
		if (ws) {
			ws.close();
		}
	});

	function connectWebSocket() {
		try {
			ws = new WebSocket('ws://localhost:8000/ws/chat');

			ws.onopen = () => {
				isConnected = true;
				console.log('Connected to AI chat');
			};

			let currentMessage = '';
			let firstChunkReceived = false;

			ws.onmessage = (event) => {
				// Backend sends plain text tokens, not JSON
				const token = event.data;

				// Hide typing indicator on first token
				if (isTyping) {
					isTyping = false;
				}

				// Accumulate tokens
				currentMessage += token;

				// Update the last AI message in real-time
				if (messages.length > 0 && messages[messages.length - 1].role === 'ai') {
					// Update existing AI message
					messages[messages.length - 1].content = currentMessage;
					messages = [...messages]; // Trigger reactivity
				} else {
					// Create new AI message
					messages = [...messages, { role: 'ai', content: currentMessage }];
				}

				scrollToBottom();
			};

			ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				isConnected = false;
			};

			ws.onclose = () => {
				isConnected = false;
				console.log('Disconnected from AI chat');
			};
		} catch (error) {
			console.error('Failed to connect:', error);
			isConnected = false;
		}
	}

	function sendMessage() {
		if (!inputText.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

		const userMessage = inputText.trim();

		// Add user message
		messages = [...messages, { role: 'user', content: userMessage }];

		// Send to server
		ws.send(JSON.stringify({ text: userMessage }));

		// Clear input and reset for new AI response
		inputText = '';
		currentMessage = ''; // Reset accumulator
		isTyping = true;

		scrollToBottom();
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
			// Welcome message
			messages = [
				{
					role: 'ai',
					content:
						"Xin chào! Tôi là trợ lý AI phong thủy của L'Artelier. Bạn có thể hỏi tôi về:\n\n• Mệnh ngũ hành\n• Chọn tranh/đồ vật hợp mệnh\n• Tư vấn bố trí phòng\n• Ý nghĩa phong thủy\n\nBạn cần tư vấn gì?",
				},
			];
		}
		if (isOpen) {
			scrollToBottom();
		}
	}
</script>

<!-- Floating Button -->
{#if !isOpen}
	<button
		class="btn btn-circle btn-primary btn-lg fixed right-6 bottom-6 z-50 shadow-lg"
		onclick={toggleChat}
		aria-label="Open AI Chat"
	>
		<MessageCircle class="h-6 w-6" />
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
						{isConnected ? '🟢 Đang kết nối' : '🔴 Mất kết nối'}
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
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={inputText}
					onkeypress={handleKeyPress}
					placeholder="Nhập câu hỏi..."
					class="input input-bordered flex-1"
					disabled={!isConnected}
				/>
				<button
					class="btn btn-primary"
					onclick={sendMessage}
					disabled={!inputText.trim() || !isConnected}
				>
					<Send class="h-4 w-4" />
				</button>
			</div>
			{#if !isConnected}
				<p class="text-error mt-2 text-xs">Đang kết nối lại...</p>
			{/if}
		</div>
	</div>
{/if}
