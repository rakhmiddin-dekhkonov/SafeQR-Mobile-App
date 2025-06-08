import React, { useState } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Feather, MaterialIcons, AntDesign } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter, Share, Linking } from "react-native";
import { Snackbar } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native"; // Import this at the top

export default function Details() {
  const route = useRoute();
  const navigation = useNavigation();
  const { qrCode, isSafe, source, safetyStatus } = route.params || {};
  const isSafeBool = isSafe === true || isSafe === "true";
  const [showQRCode, setShowQRCode] = useState(false);
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


  if (!qrCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No QR code data found!</Text>
      </View>
    );
  }

  const addToFavourites = async () => {
    try {
      const existingFavourites = await AsyncStorage.getItem("favourites");
      let favouritesArray = existingFavourites ? JSON.parse(existingFavourites) : [];

      // Check if the QR code is already in favourites
      const isAlreadyFavourite = favouritesArray.some((item) => item.url === qrCode);
      if (isAlreadyFavourite) {
        setSnackbarMessage("Already in favourites! ⭐");
        setSnackbarVisible(true);
        return;
      }

      // Add new item
      const newFavourite = { url: qrCode, safetyStatus, source };
      favouritesArray.push(newFavourite);
      await AsyncStorage.setItem("favourites", JSON.stringify(favouritesArray));

      // Emit event to update history screen
      DeviceEventEmitter.emit("favouritesUpdated", favouritesArray);

      setSnackbarMessage("Added to favourites! ⭐");
      setSnackbarVisible(true);
    } catch (error) {
      console.error("Error saving to favourites:", error);
      setSnackbarMessage("Failed to add to favourites. ❌");
      setSnackbarVisible(true);
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(qrCode);
      setSnackbarMessage("QR Code copied to clipboard! 📋");
      setSnackbarVisible(true);
    } catch (error) {
      setSnackbarMessage("Failed to copy. ❌");
      setSnackbarVisible(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? "#333" : "#f8f8f8" }]}>
      {/* QR Code Details */}
      {(source == "ML Model" || source === "Plain Text / Number")? (
        <View style={[styles.warningBox, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
          <Text style={[styles.unsafeText, { color: isDarkMode ? "#FFC107" : "#000" }]}>{safetyStatus}</Text>
          <View style={[styles.qrLinkBox, { backgroundColor: isDarkMode ? "#222" : "#eee" }]}>
            <Text style={[styles.qrText, { color: isDarkMode ? "#fff" : "#000" }]}>{qrCode}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowQRCode(!showQRCode)}>
            <Text style={[styles.showQrText, { color: "#FFC107" }]}>{showQRCode ? "Hide QR Code" : "Show QR Code"}</Text>
          </TouchableOpacity>
        </View>
      ): (
        <>
          {!isSafeBool && (
            <View style={[styles.warningBox, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
              <Text style={[styles.unsafeText, { color: isDarkMode ? "#FFC107" : "#000" }]}>{safetyStatus}</Text>
              <Text style={[styles.sourceText, { color: isDarkMode ? "#CCC" : "#000" }]}>Flagged By: {source}</Text>
              <View style={[styles.qrLinkBox, { backgroundColor: isDarkMode ? "#222" : "#eee" }]}>
                <Text style={[styles.qrText, { color: isDarkMode ? "#fff" : "#000" }]}>{qrCode}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQRCode(!showQRCode)}>
                <Text style={[styles.showQrText, { color: "#FFC107" }]}>{showQRCode ? "Hide QR Code" : "Show QR Code"}</Text>
              </TouchableOpacity>
            </View>
          )}
          {isSafeBool && (
            <View style={[styles.warningBox, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]}>
              <Text style={[styles.unsafeText, { color: isDarkMode ? "#FFC107" : "#000" }]}>{safetyStatus}</Text>
              <Text style={[styles.sourceText, { color: isDarkMode ? "#CCC" : "#444" }]}>Verified By: {source}</Text>
              <View style={[styles.qrLinkBox, { backgroundColor: isDarkMode ? "#222" : "#eee" }]}>
                <Text style={[styles.qrText, { color: isDarkMode ? "#fff" : "#000" }]}>{qrCode}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQRCode(!showQRCode)}>
                <Text style={[styles.showQrText, { color: "#FFC107" }]}>{showQRCode ? "Hide QR Code" : "Show QR Code"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
        )}

      {/* Show QR Code if Toggled */}
      {showQRCode && (
        <View style={styles.qrCodeContainer}>
          <QRCode value={qrCode} size={150} />
        </View>
      )}

      {/* Share & Copy Buttons */}
      <View style={styles.shareCopyContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={async () => {
            try {
              const result = await Share.share({
                message: `Check out this QR Code: ${qrCode}`,
                url: qrCode, // Some apps may use this link
                title: "QR Code",
              });

              if (result.action === Share.sharedAction) {
                if (result.activityType) {
                  console.log(`Shared via ${result.activityType}`);
                } else {
                  console.log("Shared successfully!");
                }
              } else if (result.action === Share.dismissedAction) {
                console.log("Share dismissed.");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to share. Try again.");
              console.error(error);
            }
          }}
        >
          <Feather name="share-2" size={24} color="#FFC107" />
          <Text style={styles.iconText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={copyToClipboard}
        >
          <MaterialIcons name="content-copy" size={24} color="#FFC107" />
          <Text style={styles.iconText}>Copy</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate("pages/sandbox", { link: qrCode, safetyStatus })}
      >
        <Text style={styles.actionText}>Open in Sandbox</Text>
        <AntDesign name="arrowright" size={20} color="white" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => Linking.openURL(qrCode)}
      >
        <Text style={styles.actionText}>Open In External Browser</Text>
        <AntDesign name="arrowright" size={20} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={addToFavourites}>
        <Text style={styles.actionText}>Add to Favourites</Text>
        <AntDesign name="arrowright" size={20} color="white" />
      </TouchableOpacity>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={styles.snackbar}
        wrapperStyle={styles.snackbarWrapper} // Center it
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
    alignItems: "center",
  },
  warningBox: {
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  unsafeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sourceText: {
    fontSize: 14,
    marginBottom: 10,
  },
  qrLinkBox: {
    padding: 10,
    borderRadius: 5,
    width: "100%",
  },
  qrText: {
    textAlign: "center",
  },
  showQrText: {
    marginTop: 5,
    textDecorationLine: "underline",
  },
  qrCodeContainer: {
    marginVertical: 15,
  },
  shareCopyContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 15,
  },
  iconButton: {
    alignItems: "center",
  },
  iconText: {
    color: "#FFC107",
    fontSize: 14,
    marginTop: 5,
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFC107",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    marginVertical: 5,
    alignItems: "center",
  },
  actionText: {
    color: "black",
    fontSize: 16,
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
