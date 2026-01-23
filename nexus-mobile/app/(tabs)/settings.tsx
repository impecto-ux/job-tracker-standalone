import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-zinc-950 justify-center items-center">
            <Text className="text-white text-xl font-bold mb-8">Settings</Text>

            <TouchableOpacity
                onPress={() => router.replace('/')}
                className="bg-red-500/10 border border-red-500/20 px-8 py-4 rounded-xl"
            >
                <Text className="text-red-500 font-bold">Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}
