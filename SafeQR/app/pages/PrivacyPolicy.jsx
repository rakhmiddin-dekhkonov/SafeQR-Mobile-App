import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect

export default function PrivacyPolicy() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const loadTheme = async () => {
        const savedTheme = await AsyncStorage.getItem("theme");
        setIsDarkMode(savedTheme === "dark");
      };
      loadTheme();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? "#333" : "#f8f8f8" }]}>
      <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>Privacy Policy</Text>
      
      <ScrollView style={styles.content}>
        <View style={[styles.policyItem, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
          <Text style={[styles.policyTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>1. Introduction</Text>
          <Text style={[styles.policyText, { color: isDarkMode ? "#fff" : "#000" }]}>
            Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.
          </Text>
        </View>

        <View style={[styles.policyItem, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
          <Text style={[styles.policyTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>2. Information We Collect</Text>
          <Text style={[styles.policyText, { color: isDarkMode ? "#fff" : "#000" }]}>
            We may collect personal information such as name, email, and usage data to improve our services.
          </Text>
        </View>

        <View style={[styles.policyItem, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
          <Text style={[styles.policyTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>3. How We Use Your Information</Text>
          <Text style={[styles.policyText, { color: isDarkMode ? "#fff" : "#000" }]}>
            We use the collected data to enhance our platform, provide support, and ensure security.
          </Text>
        </View>

        <View style={[styles.policyItem, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
          <Text style={[styles.policyTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>4. Data Protection</Text>
          <Text style={[styles.policyText, { color: isDarkMode ? "#fff" : "#000" }]}>
            We implement security measures to safeguard your personal data against unauthorized access.
          </Text>
        </View>

        <View style={[styles.policyItem, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
          <Text style={[styles.policyTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>5. Contact Us</Text>
          <Text style={[styles.policyText, { color: isDarkMode ? "#fff" : "#000" }]}>
            If you have any questions about this Privacy Policy, please contact us at support@example.com.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  content: {
    flex: 1,
  },
  policyItem: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  policyText: {
    fontSize: 14,
  },
});
