import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Send, Paperclip } from 'lucide-react-native';
import { chatApi, authApi } from '../../services/api';

export default function ChatRoomScreen() {
    const router = useRouter();
    const { id, name } = useLocalSearchParams();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef(null);

    import { socket } from '../../services/socket';

    // Fetch Messages & Listen to Socket
    useEffect(() => {
        loadMessages();

        // Listen for new messages
        socket.on('message.created', (newMessage) => {
            // Only add if it belongs to this channel
            // Note: In a real app, backend usually broadcasts to a specific room (channelId)
            // Ideally: socket.emit('joinRoom', id);

            // For now, assuming Global Broadcast or basic filter:
            if (Number(newMessage.channelId) === Number(id)) {
                setMessages((prev) => [...prev, newMessage]);
                // Scroll to bottom
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        });

        return () => {
            socket.off('message.created');
        };
    }, [id]);

    const loadMessages = async () => {
        try {
            const data = await chatApi.getMessages(Number(id));
            setMessages(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load messages", error);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return;

        const content = message;
        setMessage(''); // Optimistic clear
        setSending(true);

        try {
            await chatApi.sendMessage(Number(id), content);
            await loadMessages(); // Refresh list
        } catch (error) {
            console.error("Failed to send", error);
            setMessage(content); // Restore if failed
        } finally {
            setSending(false);
        }
    };

    const renderItem = ({ item }) => {
        // Simple logic to detect "my" messages 
        // In a real app, we decode the token to get our ID. 
        // For MVP, if I sent it (via API response structure), we might need to know "my id".
        // Let's assume for now right-aligned is OK or we fetch profile.
        // Actually, let's just make ALL messages left aligned for SAFETY unless we know our ID.
        // IMPROVEMENT: Let's assume backend returns `sender: { id: ... }`.

        // Since we don't have our ID stored globally yet in a React Context,
        // we will align mostly to left or check against a stored ID if we had one.
        // But waittt! The backend message entity has `senderId`.
        // We need to know who WE are.

        return (
            <View className={`max-w-[80%] rounded-2xl px-4 py-3 bg-zinc-800 self-start rounded-tl-none`}>
                <Text className="text-emerald-400 text-xs font-bold mb-1">{item.sender?.fullName || 'User'}</Text>
                <Text className="text-white text-base leading-6">{item.content}</Text>
                <Text className="text-[10px] mt-1 text-right text-zinc-400">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-zinc-950">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <SafeAreaView className="bg-zinc-900 border-b border-white/5 pt-8">
                <View className="px-4 py-3 flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-1">
                        <ArrowLeft color="#fff" size={24} />
                    </TouchableOpacity>

                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center">
                            <Text className="text-white font-bold">{name ? name[0] : '?'}</Text>
                        </View>
                        <View>
                            <Text className="text-white font-bold text-lg">{name || 'Chat'}</Text>
                            <Text className="text-zinc-400 text-xs">Online</Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                className="flex-1 px-4 py-4"
                contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
                renderItem={renderItem}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View className="px-4 py-3 bg-zinc-900 border-t border-white/5 flex-row items-center gap-3 mb-4">
                    <TouchableOpacity className="p-2">
                        <Paperclip color="#a1a1aa" size={20} />
                    </TouchableOpacity>

                    <TextInput
                        className="flex-1 bg-zinc-950 text-white rounded-full px-4 py-3 max-h-24 border border-white/10"
                        placeholder="Type a message..."
                        placeholderTextColor="#52525b"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                    />

                    <TouchableOpacity
                        onPress={handleSend}
                        className={`w-10 h-10 rounded-full items-center justify-center ${message.trim() ? 'bg-emerald-500' : 'bg-zinc-800'
                            }`}
                        disabled={!message.trim()}
                    >
                        <Send color={message.trim() ? '#fff' : '#52525b'} size={18} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
