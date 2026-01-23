import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { MessageSquare, Settings, User } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#09090b', // Zinc-950
                    borderTopColor: '#27272a', // Zinc-800
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#10b981', // Emerald-500
                tabBarInactiveTintColor: '#71717a', // Zinc-500
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: 'bold',
                },
            }}
        >
            <Tabs.Screen
                name="chats"
                options={{
                    title: 'Chats',
                    tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
