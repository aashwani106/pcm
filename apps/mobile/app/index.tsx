import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../services/supabase';
import { getUserRole } from '../services/profile';
import { useAuth } from '../hooks/useAuth';
import { BorderRadius, Colors, Typography } from '../constants/theme';

type RouteState = 'loading' | 'error';

export default function Index() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const [state, setState] = useState<RouteState>('loading');
    const [message, setMessage] = useState('Preparing your experience...');

    const routeUser = useCallback(async () => {
        if (loading) return;

        if (!session) {
            return;
        }

        try {
            setState('loading');
            setMessage('Preparing your experience...');
            const role = await getUserRole(session.user.id, session.user.email);
           console.log('e',role)
            if (role === 'admin') router.replace('/(admin)' as never);
            else if (role === 'student') router.replace('/(student)' as never);
            else if (role === 'parent') router.replace('/(parent)' as never);
            else {
                setState('error');
                setMessage('Unknown role. Please contact admin.');
            }
        } catch(e) {
            setState('error');
            setMessage('Unable to load your profile. Please retry.');
        }
    }, [loading, router, session]);

    useEffect(() => {
        routeUser();
    }, [routeUser]);

    async function handleGoLogin() {
        try {
            await supabase.auth.signOut();
        } finally {
            router.replace('/login');
        }
    }

    return (
        <View style={styles.container}>
            {state === 'loading' ? <ActivityIndicator size="large" color={Colors.primary} /> : null}
            <Text style={styles.message}>{message}</Text>
            {state === 'error' ? (
                <View style={styles.actions}>
                    <Pressable style={styles.button} onPress={routeUser}>
                        <Text style={styles.buttonText}>Retry</Text>
                    </Pressable>
                    <Pressable style={styles.outlineButton} onPress={handleGoLogin}>
                        <Text style={styles.outlineButtonText}>Go to Login</Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: 24,
    },
    message: {
        marginTop: 16,
        color: Colors.primary,
        fontFamily: Typography.medium,
        fontSize: 16,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    buttonText: {
        color: Colors.white,
        fontFamily: Typography.heading,
        fontSize: 13,
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    outlineButtonText: {
        color: Colors.textMuted,
        fontFamily: Typography.medium,
        fontSize: 13,
    },
});
