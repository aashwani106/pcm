import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { FeedbackPopup, FeedbackType } from '../../components/feedback-popup';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { completeMyPasswordChange, getReadableErrorMessage } from '../../services/backend';
import { getUserRole } from '../../services/profile';
import { supabase } from '../../services/supabase';

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export default function ForceChangePasswordScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: FeedbackType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerBackVisible: false,
        gestureEnabled: false,
      });
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [navigation])
  );

  function showPopup(type: FeedbackType, title: string, message: string) {
    setPopup({ visible: true, type, title, message });
  }

  async function handleSubmit() {
    if (!isStrongPassword(newPassword)) {
      showPopup(
        'warning',
        'Weak Password',
        'Use at least 8 chars with uppercase, lowercase, number, and special character.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showPopup('warning', 'Mismatch', 'New password and confirm password must match.');
      return;
    }

    try {
      setSaving(true);

      const { data: authData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !authData.session?.access_token || !authData.session.user) {
        throw new Error('Not authenticated');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw updateError;
      }

      await completeMyPasswordChange(authData.session.access_token);
      const role = await getUserRole(authData.session.user.id, authData.session.user.email);

      if (role === 'student') router.replace('/(student)' as never);
      else if (role === 'parent') router.replace('/(parent)' as never);
      else if (role === 'admin') router.replace('/(admin)' as never);
      else router.replace('/login');
    } catch (error: unknown) {
      showPopup('error', 'Update Failed', getReadableErrorMessage(error, 'Failed to change password.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FeedbackPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>
          You must change your temporary password before using the app.
        </Text>

        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="New Password"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm Password"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && !saving && styles.submitPressed,
            saving && styles.submitDisabled,
          ]}
          disabled={saving}
          onPress={handleSubmit}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Update Password</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    color: Colors.text,
    fontFamily: Typography.body,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPressed: {
    opacity: 0.88,
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 15,
  },
});
