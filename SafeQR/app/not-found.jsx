import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
        404 - Page Not Found
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 20 }}>
        The page you are looking for does not exist.
      </Text>
      <Button title="Go Home" onPress={() => router.push("/")} />
    </View>
  );
}
