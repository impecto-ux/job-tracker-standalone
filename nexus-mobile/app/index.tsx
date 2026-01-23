import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { authApi } from '../services/api';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setLoading(true);
            await authApi.login(email, password);
            router.replace('/(tabs)/chats');
        } catch (error) {
            alert('Login Failed: Check credentials or server');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-zinc-950"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                <View className="p-8 flex-col items-center">

                    {/* Logo / Header */}
                    <View className="w-20 h-20 bg-emerald-500/10 rounded-3xl items-center justify-center mb-6 border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
                        <Text className="text-4xl">❖</Text>
                    </View>

                    <Text className="text-3xl font-bold text-white mb-2 tracking-tight">Nexus</Text>
                    <Text className="text-zinc-500 text-base mb-12 text-center">JobTracker Professional Mobile</Text>

                    {/* Form */}
                    <View className="w-full space-y-4">
                        <View>
                            <Text className="text-zinc-400 font-bold mb-2 ml-1 text-xs uppercase tracking-wider">Email Work Address</Text>
                            <TextInput
                                placeholder="name@company.com"
                                placeholderTextColor="#52525b"
                                className="bg-zinc-900/50 border border-white/10 text-white p-4 rounded-xl text-base"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                            />
                        </View>

                        <View className="mt-4">
                            <Text className="text-zinc-400 font-bold mb-2 ml-1 text-xs uppercase tracking-wider">Password</Text>
                            <TextInput
                                placeholder="••••••••"
                                placeholderTextColor="#52525b"
                                className="bg-zinc-900/50 border border-white/10 text-white p-4 rounded-xl text-base"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            className="bg-emerald-600 w-full py-4 rounded-xl items-center mt-8 active:bg-emerald-700"
                        >
                            <Text className="text-white font-bold text-lg">Sign In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/qr-scanner')}
                            className="bg-zinc-800 w-full py-4 rounded-xl items-center mt-4 border border-white/5 active:bg-zinc-700"
                        >
                            <Text className="text-white font-bold text-lg">Link Web Device (QR)</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
