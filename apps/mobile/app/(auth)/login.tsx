import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Colors, Spacing, Typography } from '../../constants/theme'; // Removed Shadows since it wasn't used in previous version or can be simplified
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface AnimatedShapeProps {
    size: number;
    color: string;
    initialPos: { x: number; y: number };
    duration?: number;
}

const AnimatedShape = ({ size, color, initialPos, duration = 5000 }: AnimatedShapeProps) => {
    const translationY = useSharedValue(initialPos.y);
    const rotation = useSharedValue(0);

    useEffect(() => {
        translationY.value = withRepeat(
            withTiming(initialPos.y - 40, { duration: duration, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
        rotation.value = withRepeat(
            withTiming(360, { duration: duration * 3, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translationY.value },
            { rotate: `${rotation.value}deg` }
        ],
    }));

    return (
        <Animated.View style={[
            styles.shape,
            {
                width: size,
                height: size,
                backgroundColor: color,
                left: initialPos.x,
                borderRadius: size * 0.45
            },
            animatedStyle
        ]} />
    );
};

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const login = async () => {
        if (!email || !password) return;
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
            setLoading(false);
        }
    };

    const isButtonDisabled = !email || !password || loading;

    return (
        <View style={styles.container}>
            {/* Background Layer */}
            <LinearGradient
                colors={['#FFFFFF', '#FDFBF7', '#F5F5DC']}
                style={StyleSheet.absoluteFill}
            />

            {/* Floating Organic Shapes */}
            <View style={StyleSheet.absoluteFill}>
                <AnimatedShape size={300} color="rgba(76, 175, 80, 0.07)" initialPos={{ x: -100, y: height * 0.1 }} duration={6000} />
                <AnimatedShape size={250} color="rgba(165, 214, 167, 0.1)" initialPos={{ x: width * 0.6, y: height * 0.5 }} duration={8000} />
                <AnimatedShape size={350} color="rgba(76, 175, 80, 0.05)" initialPos={{ x: width * 0.2, y: height * 0.75 }} duration={7000} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Top Branding - Integrated Typography matching the Numerade reference */}
                    <Animated.View entering={FadeInUp.duration(1000).springify()} style={styles.brandSection}>
                        <Text style={styles.logoBranding}>PCM Coaching</Text>
                        <Text style={styles.headline}>Learning</Text>
                        <Text style={styles.subHeadline}>simplified for students</Text>
                    </Animated.View>

                    {/* Inputs Section */}
                    <View style={styles.formSection}>
                        <Animated.View entering={FadeInDown.delay(200).duration(1000).springify()} style={styles.pillContainer}>
                            <BlurView intensity={20} tint="light" style={styles.pillBlur}>
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    placeholder="Email Address"
                                    placeholderTextColor="#A09E97"
                                    style={styles.input}
                                />
                            </BlurView>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(400).duration(1000).springify()} style={styles.pillContainer}>
                            <BlurView intensity={20} tint="light" style={styles.pillBlur}>
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    placeholder="Password"
                                    placeholderTextColor="#A09E97"
                                    style={styles.input}
                                />
                            </BlurView>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(600).duration(1000).springify()}>
                            <Pressable
                                onPress={login}
                                disabled={isButtonDisabled}
                                style={({ pressed }) => [
                                    styles.loginButton,
                                    isButtonDisabled && styles.buttonDisabled,
                                    pressed && !isButtonDisabled && styles.buttonPressed
                                ]}
                            >
                                <LinearGradient
                                    colors={isButtonDisabled ? ['#D4EDD6', '#D4EDD6'] : ['#4CAF50', '#2E7D32']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buttonGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.buttonText}>Log In</Text>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </Animated.View>
                    </View>

                    {/* Bottom Links */}
                    <Animated.View entering={FadeInDown.delay(800).duration(1000)} style={styles.footer}>
                        <Pressable>
                            <Text style={styles.footerText}>Need help? <Text style={styles.footerLink}>Contact Tutor</Text></Text>
                        </Pressable>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    shape: {
        position: 'absolute',
        zIndex: -1,
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoBranding: {
        fontFamily: Typography.branding,
        color: '#4CAF50',
        fontSize: 32,
        marginBottom: 8,
    },
    headline: {
        fontFamily: Typography.heading,
        fontSize: 48,
        color: '#2D2926',
        letterSpacing: -1.5,
        lineHeight: 52,
    },
    subHeadline: {
        fontFamily: Typography.body,
        fontSize: 18,
        color: '#7D7667',
        marginTop: 0,
    },
    formSection: {
        gap: 20,
    },
    pillContainer: {
        borderRadius: 35,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    pillBlur: {
        paddingHorizontal: 25,
        height: 70,
        justifyContent: 'center',
    },
    input: {
        fontFamily: Typography.body,
        fontSize: 16,
        color: '#2D2926',
    },
    loginButton: {
        height: 70,
        borderRadius: 35,
        overflow: 'hidden',
        marginTop: 10,
    },
    buttonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: Typography.heading,
        color: '#FFF',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonPressed: {
        transform: [{ scale: 0.97 }],
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontFamily: Typography.medium,
        color: '#7D7667',
        fontSize: 15,
    },
    footerLink: {
        fontFamily: Typography.heading,
        color: '#4CAF50',
    },
});
