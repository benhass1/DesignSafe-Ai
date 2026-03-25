# DesignSafe AI - Chrome Extension Setup

This project is built as a production-ready Chrome Extension. While it runs as a web application here for demonstration, you can easily package it for Chrome.

## 🚀 Setup Instructions (Chrome Extension)

1. **Export the Project**:
   - Click the **Settings** (gear icon) in the top right of AI Studio.
   - Select **Export to ZIP**.
   - Extract the ZIP file on your computer.

2. **Install Dependencies**:
   - Open your terminal in the extracted folder.
   - Run: `npm install`

3. **Build the Project**:
   - Run: `npm run build`
   - This will create a `dist` folder.

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (top right toggle).
   - Click **Load unpacked**.
   - Select the `dist` folder from your project directory.

## 🧠 Features

- **Capture**: Screenshot, upload, or **paste** any design directly from your clipboard.
- **Analyze**: Gemini Vision analyzes the design for copyright and trademark risks.
- **Generate**: Generates a high-fidelity, professional T-shirt design **directly inside the app**.
- **Transparent Background**: All generated designs feature a transparent background for apparel readiness.
- **Ultra-Faithful**: The AI is instructed to maintain the exact subject matter (e.g., specific dog breeds) and avoid adding unnecessary text.

## ⚖️ Legal Disclaimer

DesignSafe AI uses generative AI models to assist in design transformation. Users are responsible for final legal verification of any generated assets.
