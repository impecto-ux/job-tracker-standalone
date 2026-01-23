import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function signInWithGoogle() {
        return signInWithPopup(auth, googleProvider).catch((error) => {
            console.error("Firebase Login Failed (Normal if using dummy keys):", error);
            // OPTIONAL: For demo purposes, if real auth fails, we can MOCK a successful login
            // Uncomment the lines below to enable "Demo Mode" login

            /*
            console.log("Simulating demo login...");
            setCurrentUser({
               uid: "demo-user-123",
               displayName: "Demo User",
               photoURL: "https://ui-avatars.com/api/?name=Demo+User&background=random",
               email: "demo@example.com"
            });
            return; 
            */

            throw error;
        });
    }

    function logOut() {
        return signOut(auth).catch(() => {
            // If we were in mock mode, just clear state
            setCurrentUser(null);
        });
    }

    useEffect(() => {
        // Only subscribe to auth changes if auth is initialized correctly
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signInWithGoogle,
        logOut
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
