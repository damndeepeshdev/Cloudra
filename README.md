# Paperfold ☁️

[![Release](https://github.com/damndeepeshdev/Paperfold/actions/workflows/release.yml/badge.svg)](https://github.com/damndeepeshdev/Paperfold/actions/workflows/release.yml)

**Unlimited Cloud Storage, Powered by Telegram.**

Paperfold is a modern, privacy-focused desktop cloud storage client that leverages Telegram's unlimited file storage API. Built with **Tauri (Rust)** and **React**, it offers a premium, high-performance experience with a stunning "Technical Galaxy" aesthetic.

## 🌟 Features

### 🚀 Unlimited Cloud Storage
- **Zero Types Limits**: Upload files of any type (Documents, Photos, Videos, etc.).
- **2GB Single File Limit**: Upload individual files up to 2GB (4GB for Premium users).
- **Unlimited Total Space**: No cap on the total amount of data you can store.

### 🎨 Modern UI & Design
- **Premium Dark Aesthetic**: A deeply immersive dark theme with cyan accents, glassmorphism, and subtle glow effects.
- **Glassmorphic Interface**: Panels and sidebars feature blurred backdrops for a modern, depth-rich feel.
- **Micro-Interactions**: Fluid animations powered by `framer-motion` for every interaction.
- **View Options**: Toggle between **Grid** and **List** views with sortable columns.
- **Enhanced Thumbnails**: Large, clear visual previews for your media files.

### 🔍 Powerful Search & Organization
- **Real-Time Search**: Instantly find files and folders with a type-ahead dropdown search.
- **Smart Folder System**: Create nested folders to organize your content (metadata stored locally).
- **Starred Context**: referencing the original location of your starred items.
- **Refined Navigation**: Context-aware breadcrumbs and sidebar navigation that keeps you oriented.
- **Recent Files**: Quickly access your most recently uploaded or modified files.

### ⚡ Advanced File Management
- **Drag & Drop Uploads**: Seamlessly upload files by dragging them into the app.
- **Multi-File Queue**: specific visual design for upload progress with "Command Terminal" aesthetics.
- **Context Menu**: Right-click on any file or folder to **Star**, **Rename**, **Delete**, or **Download**.
- **Custom Interaction Modals**: Replaced native system prompts with beautiful, theme-consistent modals.
- **File Previews**: Click to preview supported files directly within the app.

### 🔄 Seamless Auto-Updates
- **Always Up-to-Date**: Built-in auto-update functionality ensures you're always on the latest version with new features and fixes.

### 🗑️ Trash & Recovery
- **Soft Delete**: Deleted items move to a Trash bin first.
- **Instant Restore**: Restore files or folders to their original location with one click.
- **Empty Trash**: Permanently clear space when you're sure.

### 🔒 Privacy & Security
- **Direct MTProto Connection**: Connects directly to Telegram servers from your local machine. **No middleman servers.**
- **Local Metadata**: Folder structures and file names are stored in a local encrypted database (`metadata.json`).
- **Encrypted Session**: Your Telegram session is stored securely locally.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Framer Motion, Lucide Icons.
- **Backend (Core)**: Rust, Tauri v2.
- **Telegram Client**: `grammers` (Rust MTProto implementation).
- **State Management**: React Hooks & Local State.
- **Build Tool**: Vite.

## 📦 Installation & Setup

### Prerequisites
- **Rust**: Ensure you have the latest stable Rust installed (`rustup`).
- **Node.js**: LTS version recommended.
- **Telegram API Credentials**: You need your own `App api_id` and `App api_hash`. Get them from [my.telegram.org](https://my.telegram.org).

### Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/damndeepeshdev/Paperfold.git
    cd Paperfold
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the `src-tauri` directory with your Telegram credentials:
    ```env
    TELEGRAM_API_ID=your_api_id
    TELEGRAM_API_HASH=your_api_hash
    ```
    *Note: Never commit your `.env` file!*

4.  **Run Development Mode**
    ```bash
    npm run tauri dev
    ```

5.  **Build for Production**
    ```bash
    npm run tauri build
    ```

### 🌍 Cross-Platform Release Builds
We use **GitHub Actions** to automate builds for Windows, macOS, and Linux.

1.  **Trigger a Release**:
    Simply push a tag starting with `v` (e.g., `v1.0.0`).
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```

2.  **Download Assets**:
    Go to the **Actions** tab or **Releases** section in your GitHub repository to download the compiled binaries:
    - **Windows**: `.exe` / `.msi`
    - **macOS**: `.dmg` / `.app`
    - **Linux**: `.deb` / `.AppImage`

### 🔧 Common Installation Issues

Since Paperfold is a free, open-source project, it is not code-signed with paid certificates. You might encounter security warnings during installation. Here is how to resolve them:

**macOS ("App is damaged" error)**
1.  Open Terminal.
2.  Run the following command to remove the quarantine attribute:
    ```bash
    xattr -cr /path/to/Paperfold.app
    ```
    *(Replace `/path/to/Paperfold.app` with the actual path, usually in your `Downloads` or `Applications` folder).*
3.  Alternatively, **Right-Click** the app icon and select **Open**.

**Windows ("Windows protected your PC")**
1.  Click **More info** on the Microsoft Defender SmartScreen popup.
2.  Click **Run anyway**.

**Linux (App won't open)**
1.  Right-click the `.AppImage` file.
2.  Go to **Properties** → **Permissions**.
3.  Check **Allow executing file as program**.
4.  Alternatively, run: `chmod +x Paperfold.AppImage`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

## 📄 License

This project is licensed under the MIT License.

---
*Disclaimer: Paperfold is a third-party client and is not affiliated with Telegram.*
