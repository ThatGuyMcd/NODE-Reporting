import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import Colors from '@/constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useBusiness();

  const [businessName, setBusinessName] = useState<string>(profile.businessName);
  const [ownerName, setOwnerName] = useState<string>(profile.ownerName);
  const [email, setEmail] = useState<string>(profile.email);
  const [phone, setPhone] = useState<string>(profile.phone);
  const [address, setAddress] = useState<string>(profile.address);
  const [vatNumber, setVatNumber] = useState<string>(profile.vatNumber || '');
  const [utrNumber, setUtrNumber] = useState<string>(profile.utrNumber || '');
  const [bankAccountName, setBankAccountName] = useState<string>(profile.bankAccountName || '');
  const [bankName, setBankName] = useState<string>(profile.bankName || '');
  const [bankSortCode, setBankSortCode] = useState<string>(profile.bankSortCode || '');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(profile.bankAccountNumber || '');

  useEffect(() => {
    setBusinessName(profile.businessName);
    setOwnerName(profile.ownerName);
    setEmail(profile.email);
    setPhone(profile.phone);
    setAddress(profile.address);
    setVatNumber(profile.vatNumber || '');
    setUtrNumber(profile.utrNumber || '');
    setBankAccountName(profile.bankAccountName || '');
    setBankName(profile.bankName || '');
    setBankSortCode(profile.bankSortCode || '');
    setBankAccountNumber(profile.bankAccountNumber || '');
  }, [profile]);

  const handleSave = () => {
    updateProfile({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      vatNumber: vatNumber.trim() || undefined,
      utrNumber: utrNumber.trim() || undefined,
      bankAccountName: bankAccountName.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankSortCode: bankSortCode.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
    });

    Alert.alert('Saved', 'Your business profile has been updated');
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your business name"
              placeholderTextColor={Colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Your phone number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Your business address"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Transfer Details</Text>
          <Text style={styles.sectionSubtitle}>
            Shown on invoices for customers who want to pay by bank transfer
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Acme Consulting Ltd"
              placeholderTextColor={Colors.textMuted}
              value={bankAccountName}
              onChangeText={setBankAccountName}
              testID="bankAccountNameInput"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HSBC"
              placeholderTextColor={Colors.textMuted}
              value={bankName}
              onChangeText={setBankName}
              testID="bankNameInput"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sort Code</Text>
            <TextInput
              style={styles.input}
              placeholder="00-00-00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={bankSortCode}
              onChangeText={setBankSortCode}
              testID="bankSortCodeInput"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="12345678"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              testID="bankAccountNumberInput"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Information</Text>
          <Text style={styles.sectionSubtitle}>
            These details appear on invoices and are required for HMRC
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>VAT Number (if registered)</Text>
            <TextInput
              style={styles.input}
              placeholder="GB 123 4567 89"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              value={vatNumber}
              onChangeText={setVatNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>UTR Number (Unique Taxpayer Reference)</Text>
            <TextInput
              style={styles.input}
              placeholder="1234567890"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={utrNumber}
              onChangeText={setUtrNumber}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About these numbers</Text>
          <Text style={styles.infoText}>
            • VAT Number: Required if you're VAT registered (turnover over £85,000){'\n'}
            • UTR Number: 10-digit number from HMRC when you registered as self-employed
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
