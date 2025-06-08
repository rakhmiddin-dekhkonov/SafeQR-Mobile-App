from flask import Flask, request, jsonify
import joblib
import pandas as pd
import re
import nltk
from nltk.corpus import words

# ✅ Download word list if not downloaded
nltk.download('words')

# ✅ Load dictionary of English words
english_words = set(words.words())

# ✅ Load the trained Random Forest model
model = joblib.load("random_forest_model.pkl")

# ✅ Load saved feature columns (ensures feature order is correct)
feature_columns = joblib.load("feature_columns.pkl")

# ✅ Define suspicious keyword lists
phishing_keywords = [
    'login', 'secure', 'verify', 'update', 'account', 'banking', 'password', 
    'signin', 'confirm', 'validate', 'reset', 'support', 'auth', 'authentication'
]
suspicious_domains = [
    'paypal', 'ebay', 'amazon', 'bankofamerica', 'facebook', 'google', 'apple', 
    'microsoft', 'gov', 'crypto', 'wallet', 'bitcoin', 'investment'
]
obfuscation_words = ['free', 'bonus', 'offer', 'win', 'prize', 'cheap', 'discount', 'gift']

# ✅ Feature extraction function (same as used in training)
def extract_features(url):
    features = {}
    
    # Basic length features
    features['url_length'] = len(url)
    features['domain_length'] = len(re.findall(r"https?://([^/]+)", url)[0]) if re.findall(r"https?://([^/]+)", url) else 0
    features['path_length'] = len(url.split('/')) - 3  # Excluding protocol and domain

    # Special character counts
    features['num_dots'] = url.count('.')
    features['num_slashes'] = url.count('/')
    features['num_double_slash'] = url.count('//') - 1
    features['num_dashes'] = url.count('-')
    features['num_at'] = url.count('@')
    features['num_percent'] = url.count('%')
    features['num_ampersand'] = url.count('&')
    features['num_hash'] = url.count('#')

    # Numeric characters count
    features['num_digits'] = sum(c.isdigit() for c in url)

    # ✅ IP Address presence
    features['has_ip_address'] = 1 if re.match(r"https?://(\d+\.\d+\.\d+\.\d+)", url) else 0

    # ✅ Check for phishing-related words
    features['phishing_keyword_found'] = any(word in url.lower() for word in phishing_keywords)

    # ✅ Check for suspicious domain-related words
    features['suspicious_domain_found'] = any(word in url.lower() for word in suspicious_domains)

    # ✅ Check for obfuscation-related words
    features['obfuscation_keyword_found'] = any(word in url.lower() for word in obfuscation_words)

    # ✅ Presence of sensitive words
    sensitive_words = ['login', 'secure', 'bank', 'verify', 'account', 'password']
    features['has_sensitive_word'] = any(word in url.lower() for word in sensitive_words)

    # ✅ Calculate "Valid Word Ratio"
    words_list = re.split(r'[-_/\.]', re.sub(r"https?://", "", url))  # Split by separators
    total_words = len(words_list)
    valid_words = sum(1 for word in words_list if word.lower() in english_words)
    features['valid_word_ratio'] = valid_words / total_words if total_words > 0 else 0

    return features

# ✅ Initialize Flask app
app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        # ✅ Get JSON input from the request
        data = request.json
        url = data.get("url", "").strip()
        
        if not url:
            return jsonify({"error": "No URL provided"}), 400
        
        # ✅ Extract features from URL
        extracted_features = extract_features(url)

        # ✅ Convert features into a DataFrame
        features_df = pd.DataFrame([extracted_features])

        # ✅ Ensure feature order matches the training set
        features_df = features_df.reindex(columns=feature_columns, fill_value=0)

        # ✅ Predict probabilities
        probabilities = model.predict_proba(features_df)[0]  # [P(unsafe), P(safe)]

        # ✅ Calculate safety and unsafe percentages
        safety_percentage = round(probabilities[1] * 100, 2)
        unsafe_percentage = round(probabilities[0] * 100, 2)

        return jsonify({
            "url": url,
            "safety_percentage": f"{safety_percentage}%",
            "unsafe_percentage": f"{unsafe_percentage}%"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)
