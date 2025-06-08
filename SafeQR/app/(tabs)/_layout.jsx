import { Tabs } from "expo-router";
import React from "react";
import { MaterialCommunityIcons, AntDesign, Feather } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export default function TabLayout() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeKey, setThemeKey] = useState(0);
  
  useFocusEffect(
    React.useCallback(() => {
      const loadTheme = async () => {
        const savedTheme = await AsyncStorage.getItem("theme");
        const newIsDarkMode = savedTheme === "dark";
        if (newIsDarkMode !== isDarkMode) {
          setIsDarkMode(newIsDarkMode);
          setThemeKey((prevKey) => prevKey + 1); // Change key to force re-render
        }
      };
      loadTheme();
    }, [isDarkMode]) // Re-run only if theme state changes
  );
    
  return (
    <Tabs
      key={themeKey} // Forces re-render when theme changes
      screenOptions={{
        tabBarActiveTintColor: "#FFC107",
        tabBarInactiveTintColor: isDarkMode ? "white" : "black",
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#000" : "#fff",
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerShown: false,
      }}
    >
      {/* Scan Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="qrcode-scan" size={size} color={color} />
          ),
        }}
      />
      {/* Create Tab */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="qrcode-plus" size={size} color={color} />
          ),
        }}
      />
      {/* History Tab */}
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="clockcircleo" size={size} color={color} />
          ),
        }}
      />
      {/* Settings Tab */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
