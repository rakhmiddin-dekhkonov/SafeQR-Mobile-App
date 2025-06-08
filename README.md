# 🛡️ SafeQR

**SafeQR** is a mobile application that scans QR codes and evaluates the safety of the underlying URLs using machine learning and threat intelligence APIs. It helps users **avoid phishing sites, scams, and malicious links** before they even open them — providing a layer of security for everyday QR code usage.

---

## 🔒 Why SafeQR?

With QR codes becoming common in payments, menus, and promotions, attackers often embed dangerous links into them. SafeQR acts as a **real-time safety scanner**, helping users know whether it's safe to click — before it's too late.

---

## 🚀 Features

- 📷 **Scan QR Codes Instantly**  
  Uses your device's camera to scan and decode QR codes.

- 🧠 **URL Safety Prediction via ML**  
  Analyzes the decoded URL using a custom-trained machine learning model.

- 🌐 **Threat Intelligence API Integration**  
  Verifies the scanned link against public threat feeds and databases.

- 🚨 **Instant Risk Feedback**  
  Displays a warning or green light with safety explanation.

- 📊 **Explainable Results**  
  Shows why a URL was classified as suspicious or safe using model insights.

---

## 🛠 Tech Stack

| Component         | Technology                                                               |
|------------------|---------------------------------------------------------------------------|
| Platform          | React Native (cross-platform mobile app)                                 |
| ML Model          | Scikit-learn / TensorFlow (URL classification based on lexical & WHOIS features) |
| Backend APIs      | Python + FastAPI / Flask (API to call ML model and fetch threat data)    |
| Threat Intel APIs | Google Safe Browsing, VirusTotal API             |
| Data Storage      | Firebase                  |

---
