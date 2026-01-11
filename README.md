# Cloudra ☁️

**Unlimited Cloud Storage, Powered by Telegram.**

Cloudra is a modern, privacy-focused desktop cloud storage client that leverages Telegram's unlimited file storage API. Built with **Tauri (Rust)** and **React**, it offers a premium, Google Drive-like experience for managing your files without the storage limits.

## 🌟 Features

### 🚀 Unlimited Cloud Storage
- **Zero Types Limits**: Upload files of any type (Documents, Photos, Videos, etc.).
- **2GB Single File Limit**: Upload individual files up to 2GB (4GB for Premium users).
- **Unlimited Total Space**: No cap on the total amount of data you can store.

### 🎨 Modern & Premium UI
- **Google Drive-Inspired Design**: Familiar, intuitive, and clean interface with a focus on usability.
- **Adaptive Dark/Light Mode**: Fully responsive theme that respects system settings and persists your preference.
- **Micro-Interactions**: Smooth animations using `framer-motion` for a polished feel.
- **View Options**: Toggle between **Grid** and **List** views with sortable columns.

### 🔍 Powerful Search & Organization
- **Real-Time Search**: Instantly find files and folders with a type-ahead dropdown search.
- **Smart Folder System**: Create nested folders to organize your content (metadata stored locally).
- **Starred Items**: Mark important files or folders with a star for quick access in the "Starred" tab.
- **Recent Files**: Quickly access your most recently uploaded or modified files.

### ⚡ Advanced File Management
- **Drag & Drop Uploads**: Seamlessly upload files by dragging them into the app.
- **Multi-File Queue**: Robust upload queue with real-time progress, concurrent processing, and status indicators.
- **File Previews**: Click to preview supported files directly within the app.
- **Rename & Edit**: Full support for renaming files and folders.

### 🗑️ Trash & Recovery
- **Soft Delete**: Deleted items move to a Trash bin first, preventing accidental data loss.
- **Instant Restore**: Restore files or folders to their original location with one click.
- **Empty Trash**: Permanently clear space when you're sure.

### 🔒 Privacy & Security
- **Direct MTProto Connection**: Connects directly to Telegram servers from your local machine. **No middleman servers.**
- **Local Metadata**: Folder structures and file names are stored in a local encrypted database (`metadata.json`), ensuring your organization structure remains private.
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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

## 📄 License

This project is licensed under the MIT License.

---
*Disclaimer: Cloudra is a third-party client and is not affiliated with Telegram.*
