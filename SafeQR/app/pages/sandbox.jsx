import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useRoute } from "@react-navigation/native";

export default function Sandbox() {
  const route = useRoute();
  let { link, safetyStatus = "Unknown" } = route.params || {}; // Ensure safetyStatus is defined
  const [webViewError, setWebViewError] = useState(null);

  // ✅ Ensure safetyStatus is a string & convert to lowercase
  safetyStatus = String(safetyStatus).toLowerCase();

  console.log("Sandbox - Link:", link);
  console.log("Sandbox - Safety Status:", safetyStatus); // ✅ Debugging Log

  // ✅ Function to check if the string is a valid URL
  const isValidUrl = (string) => {
    try {
      new URL(string); // If this fails, it's not a valid URL
      return true;
    } catch (_) {
      return false;
    }
  };

  // ✅ Display an error message instead of returning null
  if (!link) {
    setWebViewError("Error: No link provided.");
  }

  if (!isValidUrl(link)) {
    setWebViewError("Info: This is not a URL, just plain text.");
  }

  // ✅ Show a warning if necessary
  if (safetyStatus.includes("unsafe")) {
    Alert.alert("⚠️ Warning", "Proceed with caution. This site is flagged as unsafe.");
  }

  return (
    <View style={styles.container}>
      {webViewError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{webViewError}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: link }}
          style={styles.webview}
          javaScriptEnabled={!safetyStatus.includes("unsafe")} // Disable JavaScript for risky links
          domStorageEnabled={false} // Prevent local storage & tracking
          incognito={true} // Prevent cookies, cache, and persistent storage
          allowFileAccess={false} // Block local file access
          allowUniversalAccessFromFileURLs={false} // Prevent access to file:// URLs
          mixedContentMode="never" // Enforce HTTPS, block mixed content
          onError={({ nativeEvent }) => {
            console.log("WebView Error:", nativeEvent.description);
            setWebViewError(`Error: ${nativeEvent.description}`);
          }}
          onHttpError={({ nativeEvent }) => {
            console.log("WebView HTTP Error:", nativeEvent.statusCode);
            setWebViewError(`HTTP Error: Status code ${nativeEvent.statusCode}`);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
});
