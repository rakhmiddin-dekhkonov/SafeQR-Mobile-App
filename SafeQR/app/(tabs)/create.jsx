import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import { Snackbar } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native"; // Import at the top
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function Create() {
  const [input, setInput] = useState("");
  const [qrValue, setQrValue] = useState("");
  const qrCodeContainerRef = useRef(null);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
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

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleGenerateQR = () => {
    if (input.trim() === "") {
      showSnackbar("Please enter text to generate a QR code.");
    } else {
      setQrValue(input);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrValue) {
      showSnackbar("Generate a QR code first.");
      return;
    }
    try {
      const uri = await captureRef(qrCodeContainerRef.current, {
        format: "png",
        quality: 1,
      });

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        showSnackbar("Storage access is required.");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      showSnackbar("QR code saved to your gallery!");
    } catch (error) {
      showSnackbar("Could not save the QR code.");
    }
  };

  const handleShareQR = async () => {
    if (!qrValue) {
      showSnackbar("Generate a QR code first.");
      return;
    }
    try {
      const uri = await captureRef(qrCodeContainerRef, {
        format: "png",
        quality: 1,
      });

      const fileUri = FileSystem.cacheDirectory + "qrcode.png";
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share your QR Code",
      });
    } catch (error) {
      showSnackbar("Could not share the QR code.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? "#333" : "#f8f8f8" }]}>
      <Text style={[styles.title, { color: isDarkMode ? "#FFC107" : "#000" }]}>Create QR Code</Text>
      <TextInput
        style={[styles.input, {backgroundColor: isDarkMode ? "#444" : "#FFF", color: isDarkMode ? "white" : "black", borderColor: isDarkMode ? "#777" : "#CCC"}]}
        placeholder="Enter text or URL"
        placeholderTextColor="#999"
        value={input}
        onChangeText={setInput}
      />
      <TouchableOpacity style={styles.generateButton} onPress={handleGenerateQR}>
        <Text style={styles.buttonText}>Generate QR Code</Text>
      </TouchableOpacity>
      {qrValue ? (
        <View style={styles.qrWrapper}>
          <View style={[styles.qrContainer, { backgroundColor: isDarkMode ? "#222" : "#EEE" }]} ref={qrCodeContainerRef} collapsable={false}>
            <QRCode value={qrValue} size={200} />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={handleShareQR}>
              <Feather name="share-2" size={24} color="black" />
              <Text style={styles.iconText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleDownloadQR}>
              <Feather name="download" size={24} color="black" />
              <Text style={styles.iconText}>Download</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={[styles.placeholder, { color: isDarkMode ? "#aaa" : "#555" }]}>Your QR code will appear here</Text>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
        wrapperStyle={styles.snackbarWrapper}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    color: "white",
    marginBottom: 15,
  },
  generateButton: {
    backgroundColor: "#FFC107",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  qrContainer: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 10,
  },
  iconButton: {
    flexDirection: "row",
    backgroundColor: "#FFC107",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "45%",
  },
  iconText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  placeholder: {
    marginTop: 15,
    fontSize: 14,
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