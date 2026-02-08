import { View, Text, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../services/supabase';
import { getUserRole } from '../services/profile';
import { useAuth } from '../hooks/useAuth';
import { Colors, Typography } from '../constants/theme';

export default function Index() {
    const router = useRouter();
    const { session, loading } = useAuth();

    useEffect(() => {
        const routeUser = async () => {
            if (loading) return;

            if (!session) {
                // RootLayout will handle the redirect to /login
                return;
            }

            try {
                const role = await getUserRole(session.user.id);

                if (role === 'admin') router.replace('/(admin)');
                else if (role === 'student') router.replace('/(student)');
                else if (role === 'parent') router.replace('/(parent)');
                else {
                    console.error('Unknown role:', role);
                    // Fallback or error state
                }
            } catch (error) {
                console.error('Error fetching role:', error);
            }
        };

        routeUser();
    }, [session, loading]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{
                marginTop: 16,
                color: Colors.primary,
                fontFamily: Typography.medium,
                fontSize: 16
            }}>
                Preparing your experience...
            </Text>
        </View>
    );
}
