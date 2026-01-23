import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { socket } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QRScannerScreen() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getBarCodeScannerPermissions();
    }, []);

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);
        // data = sessionId (UUID) from the web QR

        try {
            const token = await AsyncStorage.getItem('nexus_token');
            if (!token) {
                alert("You are not logged in!");
                router.back();
                return;
            }

            console.log("Authorizing session:", data);

            // Emit to backend
            socket.emit('authorize_session', { sessionId: data, token });

            Alert.alert("Success", "Web Login Authorized!", [{ text: "OK", onPress: () => router.back() }]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to authorize session");
            setScanned(false);
        }
    };

    if (hasPermission === null) {
        return <View className="flex-1 bg-black items-center justify-center"><Text className="text-white">Requesting camera permission...</Text></View>;
    }
    if (hasPermission === false) {
        return <View className="flex-1 bg-black items-center justify-center"><Text className="text-white">No access to camera</Text></View>;
    }

    return (
        <View className="flex-1 bg-black">
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Overlay */}
            <View className="flex-1 bg-black/50 items-center justify-center">
                <View className="w-64 h-64 border-2 border-emerald-500 bg-transparent rounded-3xl" />
                <Text className="text-white mt-8 font-medium text-center opacity-80">
                    Align the QR code within the frame
                </Text>
            </View>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-12 left-6 bg-black/50 p-3 rounded-full"
            >
                <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
        </View>
    );
}
