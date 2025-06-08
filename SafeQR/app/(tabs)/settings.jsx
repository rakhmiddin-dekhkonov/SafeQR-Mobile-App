import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Share,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { getDatabase, ref, push } from "firebase/database";
import { Snackbar} from "react-native-paper";

export default function Settings() {
  const [vibrate, setVibrate] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const navigation = useNavigation();
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const vibrateSetting = await AsyncStorage.getItem("vibrate");
        const themeSetting = await AsyncStorage.getItem("theme");
        
        setVibrate(vibrateSetting === "true");
        setIsDarkMode(themeSetting === "dark");
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);  

  const toggleVibrate = async () => {
    const newState = !vibrate;
    setVibrate(newState);
    await AsyncStorage.setItem("vibrate", newState.toString());
  };

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? "light" : "dark";
    await AsyncStorage.setItem("theme", newTheme);
    setIsDarkMode(!isDarkMode);
  };
  

  const sendFeedback = async () => {
    if (feedbackText.trim() === "") {
      setSnackbarMessage("Feedback cannot be empty!");
      setSnackbarVisible(true);
      return;
    }

    try {
      const db = getDatabase();
      const feedbackRef = ref(db, "feedbacks");

      await push(feedbackRef, {
        feedback: feedbackText,
        timestamp: new Date().toISOString(),
      });

      console.log("Feedback saved successfully!");
      setFeedbackText("");
      setFeedbackModalVisible(false);
      setSnackbarMessage("Feedback submitted successfully!");
      setSnackbarVisible(true);
    } catch (error) {
      console.error("Error saving feedback:", error);
      setSnackbarMessage("Failed to submit feedback. Please try again.");
      setSnackbarVisible(true);
    }
  };
  
  const openShareSheet = async () => {
    try {
      await Share.share({
        message: "Check out SafeQR! 🔒 Secure your QR codes now: https://csit321fyp24s414.wixsite.com/safeqr",
        url: "https://csit321fyp24s414.wixsite.com/safeqr",
        title: "SafeQR - Secure QR Codes",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };
  

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? "#333" : "#f8f8f8" }]}>
      <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>Settings</Text>

      <View style={[styles.settingItem, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
        <View style={styles.settingLabel}>
          <MaterialCommunityIcons name="vibrate" size={24} color="#FFC107" />
          <Text style={[styles.settingText, { color: isDarkMode ? "#fff" : "#000" }]}>Vibrate</Text>
        </View>
        <Switch value={vibrate} onValueChange={toggleVibrate} />
      </View>

      <View style={[styles.settingItem, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
        <View style={styles.settingLabel}>
          <MaterialIcons name="brightness-6" size={22} color="#FFC107" />
          <Text style={[styles.settingText, { color: isDarkMode ? "#fff" : "#000" }]}>Dark Mode</Text>
        </View>
        <Switch value={isDarkMode} onValueChange={toggleTheme} />
      </View>

      <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>Support</Text>

      {/* Feedback Button - Opens Modal */}
      <TouchableOpacity 
        style={[styles.supportItem, { backgroundColor: isDarkMode ? "#222" : "#ccc" }]}
        onPress={() => setFeedbackModalVisible(true)}
      >
        <Feather name="message-circle" size={22} color="#FFC107" />
        <Text style={[styles.supportText, { color: isDarkMode ? "#fff" : "#000" }]}>Feedback</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.supportItem, { backgroundColor: isDarkMode ? "#222" : "#ccc" }]}
        onPress={openShareSheet}
      >
        <Feather name="share-2" size={22} color="#FFC107" />
        <Text style={[styles.supportText, { color: isDarkMode ? "#fff" : "#000" }]}>Share</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.supportItem, { backgroundColor: isDarkMode ? "#222" : "#ccc" }]}
        onPress={() => navigation.navigate("pages/PrivacyPolicy")}
      >
        <MaterialIcons name="policy" size={22} color="#FFC107" />
        <Text style={[styles.supportText, { color: isDarkMode ? "#fff" : "#000" }]}>Privacy Policy</Text>
      </TouchableOpacity>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
        }}
        style={styles.snackbar}
        wrapperStyle={styles.snackbarWrapper} // Center it
      >
        {snackbarMessage}
      </Snackbar>

      {/* Feedback Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? "#444" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? "#FFC107" : "#000" }]}>
              Submit Feedback
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: isDarkMode ? "#555" : "#f0f0f0", color: isDarkMode ? "#fff" : "#000" }]}
              placeholder="Write your feedback..."
              placeholderTextColor={isDarkMode ? "#bbb" : "#666"}
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setFeedbackModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={sendFeedback}>
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  settingLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 16,
    marginLeft: 10,
  },
  supportItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  supportText: {
    fontSize: 16,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "red",
  },
  sendButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  snackbarWrapper: {
    position: "absolute",
    bottom: 80, // Move up from the default bottom position
    alignSelf: "center",
  },
  snackbar: {
    backgroundColor: "#444",
    width: "80%",
    alignSelf: "center",
    borderRadius: 10,
  },
});

