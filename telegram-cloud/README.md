# Cloudra ☁️

**Unlimited Cloud Storage, Powered by Telegram.**

Cloudra is a modern, privacy-focused desktop cloud storage client that leverages Telegram's unlimited file storage API. Built with **Tauri (Rust)** and **React**, it offers a premium, Google Drive-like experience for managing your files without the storage limits.

## 🌟 Features

### 🚀 unlimited Storage
- **Zero Types Limits**: Upload files of any type.
- **2GB Single File Limit**: Upload individual files up to 2GB (4GB for Premium users).
- **Unlimited Total Space**: No cap on the total amount of data you can store.

### 🎨 Modern & Beautiful UI
- **Google Drive-Inspired Design**: Familiar, intuitive, and clean interface.
- **Seamless Dark Mode**: Fully responsive dark/light theme that adapts to your system preferences.
- **Interactive Elements**: Smooth animations using `framer-motion` for a premium feel.
- **Grid & List Views**: Flexible viewing options with sortable columns in List view.

### 📂 Advanced File Management
- **Smart Folder System**: Organize files into nested local folders (metadata stored locally).
- **Drag & Drop Uploads**: Seamlessly upload files by dragging them into the window.
- **Multi-File Queue**: Robust upload queue with real-time progress rings and byte-level accuracy.
- **Rename & Organize**: full rename support for both files and folders.
- **Star Important Items**: Mark frequently used files/folders with a Star for quick access.

### 🗑️ Trash & Recovery
- **Safe Deletion**: Deleted items move to a Trash bin first (Soft Delete).
- **Restore Capability**: Accidentally deleted something? Restore it instantly.
- **Auto-Cleanup**: Intelligent system to clean up old trash items (configurable).
- **Empty Trash**: One-click option to permanently clear space.

### 🔒 Privacy & Security
- **Direct MTProto Connection**: Connects directly to Telegram servers from your local machine. No middleman servers.
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
    git clone https://github.com/damndeepeshdev/Cloudra.git
    cd Cloudra
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in `src-tauri` directory (or set environment variables) with your Telegram credentials:
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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---
*Disclaimer: Cloudra is a third-party client and is not affiliated with Telegram.*
