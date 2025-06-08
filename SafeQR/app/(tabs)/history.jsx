import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  DeviceEventEmitter,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Menu, Provider, Dialog, Portal, Button } from "react-native-paper";
import Constants from "expo-constants";
import base64 from "base-64";
import axios from "axios";
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

const GOOGLE_SAFE_BROWSING_API_KEY =
  Constants.expoConfig?.extra?.GOOGLE_SAFE_BROWSING_API_KEY ||
  Constants.manifest?.extra?.GOOGLE_SAFE_BROWSING_API_KEY;

const VIRUS_TOTAL_API_KEY =
  Constants.expoConfig?.extra?.VIRUS_TOTAL_API_KEY ||
  Constants.manifest?.extra?.VIRUS_TOTAL_API_KEY;

export default function History() {
  const [history, setHistory] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [activeTab, setActiveTab] = useState("History");
  const [visibleMenu, setVisibleMenu] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const navigation = useNavigation();
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

  useEffect(() => {
    const fetchAndRecheckHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem("scanHistory");
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        }

        let historyArray = JSON.parse(storedHistory);
        let updatedHistory = [...historyArray];

        let hasUpdates = false;
        for (let item of updatedHistory) {
          const newCheck = await recheckQRCode(item.url);

          if (
            item.isSafe !== newCheck.isSafe ||
            item.safetyStatus !== newCheck.safetyStatus ||
            item.source !== newCheck.source
          ) {
            hasUpdates = true;
            item.isSafe = newCheck.isSafe;
            item.source = newCheck.source;
            item.safetyStatus = newCheck.safetyStatus;
          }

          item.lastChecked = new Date().toISOString();
        }

        if (hasUpdates) {
          await AsyncStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
          setHistory(updatedHistory);
        }
      } catch (error) {
        console.error("Error fetching or rechecking history:", error);
      }
    };

    fetchAndRecheckHistory();
    // Listen for scan history updates from Scan.js
    const historyListener = DeviceEventEmitter.addListener("historyUpdated", (updatedHistory) => {
      setHistory(updatedHistory); // Update history in real-time
    });

    return () => {
      historyListener.remove(); // Clean up the listener when component unmounts
    };
  }, []);

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const storedFavourites = await AsyncStorage.getItem("favourites");
        if (storedFavourites) {
          setFavourites(JSON.parse(storedFavourites));
        }
      } catch (error) {
        console.error("Error fetching favourites:", error);
      }
    };
  
    fetchFavourites();
  
    // Listen for updates from the Details page
    const favouritesListener = DeviceEventEmitter.addListener(
      "favouritesUpdated",
      (updatedFavourites) => {
        setFavourites(updatedFavourites);
      }
    );
  
    return () => {
      favouritesListener.remove(); // Clean up the listener
    };
  }, []);  

  const toggleFavourite = async (item) => {
    try {
      let updatedFavourites = favourites.filter((fav) => fav.url !== item.url);
  
      if (!favourites.some((fav) => fav.url === item.url)) {
        updatedFavourites = [...favourites, item];
      }
  
      setFavourites(updatedFavourites);
      await AsyncStorage.setItem("favourites", JSON.stringify(updatedFavourites));
  
      // Emit event to sync with details page
      DeviceEventEmitter.emit("favouritesUpdated", updatedFavourites);
    } catch (error) {
      console.error("Error updating favourites:", error);
    }
  };

  const deleteHistoryItem = async (item) => {
    const updatedHistory = history.filter((entry) => entry.url !== item.url);
    setHistory(updatedHistory);
    await AsyncStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
  };

  const openMenu = (index) => setVisibleMenu(index);
  const closeMenu = () => setVisibleMenu(null);

  const clearHistory = async () => {
    await AsyncStorage.removeItem("scanHistory");
    setHistory([]);
    setDialogVisible(false); // Close the dialog after clearing history
  };


  const renderData = activeTab === "History" ? history : favourites;

  const checkWithGoogleSafeBrowsing = async (url) => {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`;
  
    const payload = {
      client: { clientId: "safe-qr", clientVersion: "1.0.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }],
      },
    };
  
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
      if (data && data.matches) {
        return { safe: false, source: "Google Safe Browsing" };
      }
      return { safe: true };
    } catch (error) {
      console.error("Error checking Google Safe Browsing API:", error);
      return { safe: false, source: "Google Safe Browsing Error" };
    }
  };

  const checkWithVirusTotal = async (url) => {
    try {
      // Check if we already have a cached result
      const cachedResults = await AsyncStorage.getItem("virusTotalCache");
      const virusTotalCache = cachedResults ? JSON.parse(cachedResults) : {};
  
      if (virusTotalCache[url]) {
        console.log("Using cached VirusTotal result for:", url);
        return virusTotalCache[url]; // Return cached result instead of making a new API call
      }
  
      const encodedUrl = base64.encode(url).replace(/=+$/, "");
      const getEndpoint = `https://www.virustotal.com/api/v3/urls/${encodedUrl}`;
  
      const response = await axios.get(getEndpoint, {
        headers: { "x-apikey": VIRUS_TOTAL_API_KEY },
      });
  
      if (response.data?.data?.attributes) {
        const analysisStats = response.data.data.attributes.last_analysis_stats;
        const maliciousCount = analysisStats.malicious || 0;
  
        const result = maliciousCount > 0
          ? { safe: false, source: `VirusTotal (Flagged by ${maliciousCount} vendors)` }
          : { safe: true };
  
        // Cache the result to prevent unnecessary API calls
        virusTotalCache[url] = result;
        await AsyncStorage.setItem("virusTotalCache", JSON.stringify(virusTotalCache));
  
        return result;
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
  
    return { safe: true };
  };
  
  
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

  const checkWithTranco = async (url) => {
    try {
      await loadTrancoData();
      const normalizedUrl = url.startsWith("http://") || url.startsWith("https://")
          ? url
          : `https://${url}`;
  
      const domain = new URL(normalizedUrl).hostname;

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
        const higherPercentage = safety_percentage > unsafe_percentage ? `${safety_percentage}% Safe` : `${unsafe_percentage}% Unsafe`;

        return {
            safe,
            source: "ML Model",
            safetyStatus: higherPercentage,
        };
    } catch (error) {
        console.log("Error checking with ML model:", error);
        return {
            safe: false,
            source: "ML Model",
            safetyStatus: "Rechecking",
        };
    }
  };


  const isUrl = (url) => {
    // Check for full URLs with protocol
    const fullUrlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
    if (fullUrlPattern.test(url)) return true;
  
    // Check if it's a domain (e.g., example.com)
    const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return domainPattern.test(url);
  };

  const recheckQRCode = async (url) => {
    let isSafe = true;
    let source = "Plain Text / Number";
    let safetyStatus = "Plain Text / Number - Safe";
  
    try {

      if (isUrl(url)) {
        const googleResult = await checkWithGoogleSafeBrowsing(url);
        if (googleResult && !googleResult.safe) {
          isSafe = false;
          source = googleResult.source;
          safetyStatus = "100% Unsafe";
        }
    
        if (isSafe) {
          const virusTotalResult = await checkWithVirusTotal(url);
          if (virusTotalResult && !virusTotalResult.safe) {
            isSafe = false;
            source = virusTotalResult.source;
            safetyStatus = "100% Unsafe";
          }
        }
    
        if (isSafe) {
          const trancoResult = await checkWithTranco(url);
          if (trancoResult && trancoResult.safe) {
            isSafe = true;
            source = trancoResult.source;
            safetyStatus = "100% Safe";
          } else {
            const mlResult = await checkWithMLModel(url);
            if (mlResult && !mlResult.safe) {
              isSafe = false;
              source = mlResult.source;
              safetyStatus = mlResult.safetyStatus;
            }
          }
        }
      }
    } catch (error) {
      console.log("Error during rechecking:", error);
      return { isSafe: false, source: "Error", safetyStatus: "Error during recheck" };
    }
  
    return { isSafe, source, safetyStatus };
  };
  

  return (
    <Provider>
      <View style={[styles.container, { backgroundColor: isDarkMode ? "#333" : "#f8f8f8" }]}>
        <View style={[styles.navbar, { backgroundColor: isDarkMode ? "#222" : "#ddd" }]}>
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === "History" && styles.activeNavButton,
            ]}
            onPress={() => setActiveTab("History")}
          >
            <Text
              style={[
                styles.navButtonText,
                activeTab === "History" && styles.activeNavButtonText,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === "Favourites" && styles.activeNavButton,
            ]}
            onPress={() => setActiveTab("Favourites")}
          >
            <Text
              style={[
                styles.navButtonText,
                activeTab === "Favourites" && styles.activeNavButtonText,
              ]}
            >
              Favourites
            </Text>
          </TouchableOpacity>
        </View>

        {renderData.length > 0 ? (
          <FlatList
            data={renderData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.historyItem, { backgroundColor: isDarkMode ? "#444" : "#eee" }]}
                onPress={() =>
                  navigation.navigate("pages/details", {
                    qrCode: item.url,
                    safetyStatus: item.safetyStatus,
                    source: item.source,
                  })
                }
              >
                <MaterialIcons
                  name={item.safetyStatus.includes("Safe") ? "verified" : "dangerous"}
                  size={24}
                  color={item.safetyStatus.includes("Safe") ? "#4CAF50" : "red"}
                />
                <View style={styles.textContainer}>
                  <Text style={[styles.historyText, { color: isDarkMode ? "white" : "black" }]} numberOfLines={1}>{item.url}</Text>
                  <Text style={[styles.safetyText, { color: item.safetyStatus.includes("Safe") ? "#4CAF50" : "red" }]}>
                    {item.safetyStatus}
                  </Text>
                </View>

                {/* 3-Dot Menu Button */}
                <Menu
                  visible={visibleMenu === index}
                  onDismiss={closeMenu}
                  anchor={
                    <TouchableOpacity
                      style={styles.moreButton}
                      onPress={() => openMenu(index)}
                    >
                      <MaterialIcons name="more-vert" size={24} style={ { color: isDarkMode ? "white" : "black" }} />
                    </TouchableOpacity>
                  }
                >
                  {/* Dynamic Button Text: "Add to Favourites" or "Remove from Favourites" */}
                  <Menu.Item
                    onPress={() => {
                      toggleFavourite(item);
                      closeMenu();
                    }}
                    title={activeTab === "History" ? "Add to Favourites" : "Remove from Favourites"}
                    leadingIcon={activeTab === "History" ? "star" : "star-outline"}
                  />
                  {activeTab === "History" && (
                    <Menu.Item
                      onPress={() => {
                        deleteHistoryItem(item);
                        closeMenu();
                      }}
                      title="Delete"
                      leadingIcon="delete"
                    />
                  )}
                </Menu>
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text style={styles.placeholder}>
            {activeTab === "History" ? "No history available" : "No favourites yet"}
          </Text>
        )}
        {activeTab === "History" && history.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setDialogVisible(true)} // Opens the confirmation dialog
          >
            <Text style={styles.clearButtonText}>Clear History</Text>
          </TouchableOpacity>
        )}

        {/* Confirmation Dialog */}
        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Clear History</Dialog.Title>
            <Dialog.Content>
              <Text>Are you sure you want to delete all history?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
              <Button onPress={clearHistory} color="red">Confirm</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      </View>
    </Provider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "center",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: "center",
  },
  activeNavButton: {
    backgroundColor: "#FFC107",
    borderRadius: 10,
  },
  navButtonText: {
    fontSize: 16,
    color: "#AAA",
  },
  activeNavButtonText: {
    color: "black",
    fontWeight: "bold",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    justifyContent: "space-between",
    elevation: 2,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  historyText: {
    fontSize: 16,
    color: "white",
  },
  safetyText: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
  },
  moreButton: {
    padding: 5,
  },
  placeholder: {
    marginTop: 20,
    fontSize: 16,
    color: "#AAA",
    textAlign: "center",
  },
  clearButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  clearButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

