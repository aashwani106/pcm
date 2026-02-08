import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { Colors } from '../constants/theme';


export default function SplashScreenView() {
    return (
        <View style={styles.container}>
            <LottieView
                autoPlay
                loop
                style={styles.animation}
                source={require('../assets/lottie/Online Learning.json')}
                renderMode="SOFTWARE"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animation: {
        width: 600,
        height: 600,
        backgroundColor: 'transparent',
    },
});
