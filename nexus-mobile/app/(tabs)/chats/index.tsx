import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { chatApi } from '../../../../services/api';

export default function ChatListScreen() {
    const router = useRouter();
    const [channels, setChannels] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadChannels = async () => {
        try {
            const data = await chatApi.getChannels();
            setChannels(data);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadChannels();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadChannels();
        setRefreshing(false);
    };

    return (
        <View className="flex-1 bg-zinc-950">
            {/* Header */}
            <View className="px-6 pt-14 pb-4 bg-zinc-950 border-b border-white/5 flex-row justify-between items-end">
                <Text className="text-3xl font-bold text-white tracking-tight">Chats</Text>
                <TouchableOpacity className="bg-emerald-500/10 p-2 rounded-full border border-emerald-500/20">
                    <Plus color="#10b981" size={24} />
                </TouchableOpacity>
            </View>

            {/* Search Bar (Visual) */}
            <View className="mx-4 mt-4 mb-2 bg-zinc-900 rounded-xl flex-row items-center p-3 border border-white/5">
                <Search color="#71717a" size={20} />
                <Text className="text-zinc-500 ml-2 font-medium">Search</Text>
            </View>

            {/* List */}
            <ScrollView
                className="flex-1 px-2"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
                }
            >
                {channels.map((chat: any) => (
                    <TouchableOpacity
                        key={chat.id}
                        onPress={() => router.push({
                            pathname: '/chat/[id]',
                            params: { id: chat.id, name: chat.name }
                        })}
                        className="flex-row items-center p-4 active:bg-zinc-900/50 rounded-2xl"
                    >
                        {/* Avatar */}
                        <View className={`w-14 h-14 rounded-full bg-zinc-800 items-center justify-center mr-4`}>
                            <Text className="text-white font-bold text-xl">{chat.name[0]?.toUpperCase()}</Text>
                        </View>

                        {/* Content */}
                        <View className="flex-1 h-14 justify-center">
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-white font-bold text-lg">{chat.name}</Text>
                                {/* <Text className="text-zinc-500 text-xs font-medium">{chat.time}</Text> */}
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-zinc-400 text-sm truncate pr-4" numberOfLines={1}>Tap to view messages</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
