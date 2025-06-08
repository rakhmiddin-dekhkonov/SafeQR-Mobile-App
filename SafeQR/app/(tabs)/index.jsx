import { CameraView, useCameraPermissions, scanFromURLAsync } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { DeviceEventEmitter } from "react-native";
import {
  AppState,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity, 
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import Overlay from "../scanner/Overlay";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import NetInfo from "@react-native-community/netinfo";
import database from "../firebase/config"; // Firebase configuration
import { ref, set } from "firebase/database";
import * as Device from "expo-device";
import Constants from "expo-constants";
import base64 from "base-64";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { Snackbar } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native"; // Import at the top

// Trie Implementation
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  // Insert a domain into the Trie
  insert(domain) {
    let node = this.root;
    for (const char of domain) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
  }

  // Search for a domain in the Trie
  search(domain) {
    let node = this.root;
    for (const char of domain) {
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }
    return node.isEndOfWord;
  }
}

// Global Trie Instance
let trancoTrie = null;

// Utility function to sanitize device IDs
const sanitizeDeviceId = (id) => id.replace(/[.#$/[\]]/g, "_");

const GOOGLE_SAFE_BROWSING_API_KEY =
  Constants.expoConfig?.extra?.GOOGLE_SAFE_BROWSING_API_KEY ||
  Constants.manifest?.extra?.GOOGLE_SAFE_BROWSING_API_KEY;

const VIRUS_TOTAL_API_KEY =
  Constants.expoConfig?.extra?.VIRUS_TOTAL_API_KEY ||
  Constants.manifest?.extra?.VIRUS_TOTAL_API_KEY;

export default function Scan() {
  const qrLock = useRef(false); // Prevent duplicate scans
  const appState = useRef(AppState.currentState); // Track app state
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const [torch, setTorch] = useState(false);
  const [cameraType, setCameraType] = useState("back");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
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

  // Flashlight toggle
  function toggleFlashMode() {
    setTorch((current) => !current);
  }

  const toggleCameraType = () => {
    setCameraType((prevType) => (prevType === "back" ? "front" : "back"));
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        qrLock.current = false; // Reset lock
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Lazy load and preprocess Tranco data
  const loadTrancoData = async () => {
    if (!trancoTrie) {
      const trancoData = require("../../assets/trancodata/trancourls.json");
      trancoTrie = new Trie();

      // Insert domains into the Trie
      trancoData.forEach((entry) => {
        trancoTrie.insert(entry.domain);
      });
      console.log("Tranco Trie loaded.");
    }
  };

  // Function to check with Tranco
  const checkWithTranco = async (url) => {
    try {
      await loadTrancoData(); // Ensure the Trie is loaded
  
      // Normalize the URL by adding a protocol if missing
      const normalizedUrl = url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;
  
      const domain = new URL(normalizedUrl).hostname;
  
      // Use the Trie to check if the domain exists
      const isListed = trancoTrie.search(domain);
  
      return {
        safe: isListed,
        source: isListed ? "Tranco Database" : "Not in Tranco Database",
      };
    } catch (error) {
      console.error("Error checking Tranco data:", error);
      return {
        safe: false,
        source: "Error occurred while checking Tranco",
      };
    }
  };
  

  const checkWithMLModel = async (url) => {
    try {
        // Replace with your Flask API URL
        const endpoint = "https://8b76-203-217-187-32.ngrok-free.app/predict";
    
        const response = await axios.post(endpoint, { url });
        const { safety_percentage, unsafe_percentage, safe } = response.data;

        // Determine which percentage is higher
        const higherPercentage = safety_percentage > unsafe_percentage ? `${safety_percentage} Safe` : `${unsafe_percentage} Unsafe`;

        return {
            safe,
            source: "ML Model",
            safetyStatus: higherPercentage,
        };
    } catch (error) {
        console.error("Error checking with ML model:", error);
        return {
            safe: false,
            source: "ML Model",
            safetyStatus: "Error occurred during ML model check",
        };
    }
};


// Function to sync history with Firebase
const syncWithFirebase = async () => {
  const { isConnected } = await NetInfo.fetch();
  if (isConnected) {
    try {
      const rawDeviceId = Device.isDevice ? Device.osInternalBuildId : "emulator";
      const deviceId = sanitizeDeviceId(rawDeviceId);
      const storedHistory = await AsyncStorage.getItem("scanHistory");

      if (storedHistory) {
        const historyArray = JSON.parse(storedHistory);
        const firebaseRef = ref(database, `devices/${deviceId}/scanHistory`);
        await set(firebaseRef, historyArray);

        console.log("History successfully synced to Firebase.");
      }
    } catch (error) {
      console.error("Error syncing history with Firebase:", error);
    }
  }
};

// Function to check if a link is safe using Google Safe Browsing API
const checkWithGoogleSafeBrowsing = async (url) => {
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`;

  const payload = {
    client: {
      clientId: "safe-qr",
      clientVersion: "1.0.0",
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  try {
    const response = await axios.post(endpoint, payload);
    if (response.data && response.data.matches) {
      return { safe: false, source: "Google Safe Browsing" };
    }
    return { safe: true };
  } catch (error) {
    console.error("Error checking Google Safe Browsing API:", error);
    return null;
  }
};

// Function to check with VirusTotal API
const checkWithVirusTotal = async (url) => {
  try {
    const encodedUrl = base64.encode(url).replace(/=+$/, "");
    const getEndpoint = `https://www.virustotal.com/api/v3/urls/${encodedUrl}`;

    // Attempt to fetch existing scan results
    const response = await axios.get(getEndpoint, {
      headers: { "x-apikey": VIRUS_TOTAL_API_KEY },
    });

    if (response.data?.data?.attributes) {
      const analysisStats = response.data.data.attributes.last_analysis_stats;
      const maliciousCount = analysisStats.malicious || 0;

      if (maliciousCount > 0) {
        return { safe: false, source: `VirusTotal (Flagged by ${maliciousCount} vendors)` };
      } else {
        return { safe: true };
      }
    }
  } catch (error) {
    // If VirusTotal has never seen the URL before (404 error), just return null and skip it
    if (error.response?.status === 404) {
      console.log("VirusTotal: URL not found, skipping...");
      return null; 
    }

    // Log unexpected errors but don't crash the app
    console.error("Unexpected VirusTotal API error:", error);
    return null;
  }

  return null; // Default return if no data was found
};

const saveToHistory = async (entry) => {
  try {
    const storedHistory = await AsyncStorage.getItem("scanHistory");
    const history = storedHistory ? JSON.parse(storedHistory) : [];

    entry.lastChecked = new Date().toISOString(); // Add timestamp

    const updatedHistory = [...history, entry];

    await AsyncStorage.setItem("scanHistory", JSON.stringify(updatedHistory));

    // Emit event to notify history page that history is updated
    DeviceEventEmitter.emit("historyUpdated", updatedHistory);

    await syncWithFirebase();
  } catch (error) {
    console.error("Error saving to history:", error);
  }
};

const isUrl = (data) => {
  // Check for full URLs with protocol
  const fullUrlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
  if (fullUrlPattern.test(data)) return true;

  // Check if it's a domain (e.g., example.com)
  const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return domainPattern.test(data);
};


const pickImage = async () => {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });

  if (result && result.assets && result.assets[0].uri) {
    try {
      const localUri = result.assets[0].uri;
      console.log("Scanning QR code from URI:", localUri);

      // Scan QR code from the selected image
      const scannedResults = await scanFromURLAsync(localUri, ["qr"]);

      if (scannedResults.length > 0) {
        const qrData = scannedResults[0].data; // Extracted QR code content

        let isSafe = true;
        let source = "Plain Text / Number";
        let safetyStatus = "Plain Text / Number - Safe";

        // Check if the scanned data is a URL
        if (isUrl(qrData)) {

          // Step 1: Google Safe Browsing
          const googleResult = await checkWithGoogleSafeBrowsing(qrData);
          if (googleResult && !googleResult.safe) {
            isSafe = false;
            source = googleResult.source;
            safetyStatus = "100% Unsafe";
          }

          // Step 2: VirusTotal
          if (isSafe) {
            const virusTotalResult = await checkWithVirusTotal(qrData);
            if (virusTotalResult && !virusTotalResult.safe) {
              isSafe = false;
              source = virusTotalResult.source;
              safetyStatus = "100% Unsafe";
            }
          }

          // Step 3: Tranco Database
          if (isSafe) {
            const trancoResult = await checkWithTranco(qrData);
            if (trancoResult && trancoResult.safe) {
              isSafe = true;
              source = trancoResult.source;
              safetyStatus = "100% Safe"; 
              // Stop here, DO NOT proceed to ML
            } else {
              // Step 4: ML Model (only if NOT found in Tranco)
              const mlResult = await checkWithMLModel(qrData);
              if (mlResult && !mlResult.safe) {
                isSafe = false;
                source = mlResult.source;
                safetyStatus = mlResult.safetyStatus;
              }
            }
          }
        }

        // Save scan result to history
        const entry = { url: qrData, isSafe, source, safetyStatus };
        await saveToHistory(entry);

        // Navigate to details page
        router.push({
          pathname: "/pages/details",
          params: { qrCode: qrData, isSafe, source, safetyStatus },
        });
      } else {
        showSnackbar("No QR Code Found", "Please select a valid QR code image.");
      }
    } catch (error) {
      console.log("QR Scan Error:", error);
      showSnackbar("Error", "Failed to scan QR code from the image.");
    }
  }
};



// Handle QR code scan
const handleBarcodeScanned = async ({ data }) => {
  if (data && !qrLock.current) {
    qrLock.current = true;

    let isSafe = true;
    let source = "Plain Text / Number";
    let safetyStatus = "Plain Text / Number - Safe";

    try {
      // Check if the scanned data is a URL
      if (isUrl(data)) {

        // Step 1: Google Safe Browsing
        const googleResult = await checkWithGoogleSafeBrowsing(data);
        if (googleResult && !googleResult.safe) {
          isSafe = false;
          source = googleResult.source;
          safetyStatus = "100% Unsafe";
        }

        // Step 2: VirusTotal
        if (isSafe) {
          const virusTotalResult = await checkWithVirusTotal(data);
          if (virusTotalResult && !virusTotalResult.safe) {
            isSafe = false;
            source = virusTotalResult.source;
            safetyStatus = "100% Unsafe";
          }
        }
        
        // Step 3: Tranco Database
        if (isSafe) {
          const trancoResult = await checkWithTranco(data);
          if (trancoResult && trancoResult.safe) {
            isSafe = true;
            source = trancoResult.source;
            safetyStatus = "100% Safe"; 
            // Stop here, DO NOT proceed to ML
          } else {
            // Step 4: ML Model (only if NOT found in Tranco)
            const mlResult = await checkWithMLModel(data);
            if (mlResult && !mlResult.safe) {
              isSafe = false;
              source = mlResult.source;
              safetyStatus = mlResult.safetyStatus;
            }
          }
        }        
      }

      // Save scan result to history
      const entry = { url: data, isSafe, source, safetyStatus };
      await saveToHistory(entry);

      // Navigate to details page
      router.push({
        pathname: "/pages/details",
        params: { qrCode: data, isSafe, source, safetyStatus },
      });
    } catch (error) {
      console.log("Error during link validation:", error);
      showSnackbar("Error", "Something went wrong. Please try again.");
    } finally {
      setTimeout(() => {
        qrLock.current = false;
      }, 1000); // Prevent rapid scans
    }
  }
};




  return (
    <SafeAreaView style={StyleSheet.absoluteFillObject}>
      <Stack.Screen options={{ title: "Scan", headerShown: false }} />
      {Platform.OS === "android" ? <StatusBar hidden /> : null}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={cameraType}
        onBarcodeScanned={qrLock.current ? undefined : handleBarcodeScanned}
        enableTorch={torch}
      />
      <Overlay />
      <View style={[styles.buttonContainer, { backgroundColor: isDarkMode ? "#333" : "#e8e8e8" }]}>
        {/* Gallery Button */}
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <MaterialCommunityIcons name="image-multiple" size={24} color={isDarkMode ? "white" : "black"} />
        </TouchableOpacity>

        {/* Flashlight Button */}
        <TouchableOpacity style={styles.button} onPress={toggleFlashMode}>
          <Feather name="zap" size={24} color={torch ? "yellow" : isDarkMode ? "white" : "black"} />
        </TouchableOpacity>

        {/* Swap Camera Button */}
        <TouchableOpacity style={styles.button} onPress={toggleCameraType}>
          <MaterialCommunityIcons name="camera-flip" size={24} color={isDarkMode ? "white" : "black"} />
        </TouchableOpacity>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          action={{
            label: "OK",
            onPress: () => setSnackbarVisible(false),
          }}
          style={styles.snackbar}
          wrapperStyle={styles.snackbarWrapper} // Center it
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  buttonContainer: {
    position: "absolute",
    top: 50,
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "center",
    borderRadius: 20,
    padding: 10,
  },
  button: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  snackbarWrapper: {
    position: "absolute", // Move up from the default bottom position
    alignSelf: "center",
  },
  snackbar: {
    backgroundColor: "#444",
    width: "80%",
    alignSelf: "center",
    borderRadius: 10,
  },  
});

