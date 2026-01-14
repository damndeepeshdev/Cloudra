import { useState, useEffect } from 'react';
import {
    Folder as FolderIcon,
    File as FileIcon,
    Upload,
    Home,
    Clock,
    Star,
    Trash2,
    Search,
    LogOut,
    List,
    Cloud,

    ChevronRight,
    X,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    RotateCw,
    Plus,
    FolderPlus,
    LayoutGrid,
    Pencil,
    Music
} from 'lucide-react';
import FileCard, { FileItem } from './FileCard';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
// We will add opener import after we verify package.json
// For now, let's just wait.
import { FileMetadata, Folder } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfile {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    phone?: string;
}

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [folderName, setFolderName] = useState<string>("My Drive");
    const [folders, setFolders] = useState<Folder[]>([]);
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [refresh, setRefresh] = useState(0);
    const [currentSection, setCurrentSection] = useState<'drive' | 'recent' | 'starred' | 'trash'>('drive');
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, name: string }[]>([{ id: null, name: 'My Drive' }]);
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [renameItem, setRenameItem] = useState<{ id: string, type: 'file' | 'folder', name: string } | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [itemToDelete, setItemToDelete] = useState<{ id: string, isFolder: boolean, name: string, deleteType: 'soft' | 'hard' } | null>(null);
    const [isEmptyTrashOpen, setIsEmptyTrashOpen] = useState(false);
    const [storageUsage, setStorageUsage] = useState<string>("0 KB");
    const [isUploadProgressMinimized, setIsUploadProgressMinimized] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<{ folders: Folder[], files: FileMetadata[] }>({ folders: [], files: [] });
    const [previewingItem, setPreviewingItem] = useState<FileMetadata | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: FileItem } | null>(null);

    useEffect(() => {
        invoke<UserProfile>('get_current_user').then(setUser).catch(console.error);
    }, []);

    // Update Page Title
    useEffect(() => {
        document.title = `${folderName} - Paperfold`;
    }, [folderName]);

    // Search Effect
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ folders: [], files: [] });
            setIsSearchOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                console.log("Searching for:", searchQuery);
                const [folders, files] = await invoke<[Folder[], FileMetadata[]]>('search_items', { query: searchQuery });
                setSearchResults({ folders, files });
                setIsSearchOpen(true);
            } catch (e) {
                console.error("Search failed:", e);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchStorageUsage = async () => {
        try {
            const usage = await invoke<string>('get_storage_usage');
            setStorageUsage(usage);
        } catch (e) {
            console.error("Failed to fetch storage usage", e);
        }
    };

    const fetchFiles = async () => {
        try {
            fetchStorageUsage(); // Update storage stats whenever files are fetched
            if (currentSection === 'trash') {
                console.log("Fetching trash...");
                const data = await invoke<[Folder[], FileMetadata[]]>('fetch_trash');
                setFolders(data[0]);
                setFiles(data[1]);
                setFolders(data[0]);
                setFiles(data[1]);
            } else if (currentSection === 'starred') {
                console.log("Fetching starred items...");
                const data = await invoke<[Folder[], FileMetadata[]]>('fetch_starred');
                setFolders(data[0]);
                setFiles(data[1]);
            } else {
                console.log("Fetching files for folder:", currentFolder);
                const data = await invoke<[Folder[], FileMetadata[]]>('fetch_files', {
                    folder_id: currentFolder,
                    folderId: currentFolder
                });
                setFolders(data[0]);
                setFiles(data[1]);
            }
        } catch (e) {
            console.error("Fetch failed", e);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [currentFolder, refresh]);

    const handleNavigate = (folderId: string | null, folderName: string) => {
        console.log("Navigating to:", folderId, folderName);
        setCurrentFolder(folderId);
        setFolderName(folderName);
        // If navigating to root (null), reset or handle accordingly? 
        // Actually if folderId is null, it's root.
        if (folderId) {
            setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
        } else {
            // Reset to just Home? Or handle in breadcrumb click.
            // Usually handleNavigate is forward.
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        const item = breadcrumbs[index];
        console.log("Breadcrumb click:", item);
        setCurrentFolder(item.id === 'root' ? null : item.id);
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        setFolderName(item.name === 'Home' ? 'My Cloud' : item.name);
    };

    const [uploadQueue, setUploadQueue] = useState<{ path: string, name: string, status: 'pending' | 'uploading' | 'completed' | 'error', progress: number }[]>([]);

    // Real Progress Listener
    useEffect(() => {
        let unlisten: () => void;
        async function setupListener() {
            unlisten = await listen<{ path: string, progress: number }>('upload-progress', (event) => {
                setUploadQueue(prev => prev.map(item => {
                    if (item.path === event.payload.path && item.status === 'uploading') {
                        return { ...item, progress: event.payload.progress };
                    }
                    return item;
                }));
            });
        }
        setupListener();
        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    useEffect(() => {
        const processQueue = async () => {
            // Concurrency Control: Max 3 parallel files
            const activeuploads = uploadQueue.filter(item => item.status === 'uploading').length;
            if (activeuploads >= 3) return;

            const pendingItemIndex = uploadQueue.findIndex(item => item.status === 'pending');
            if (pendingItemIndex === -1) return;

            const item = uploadQueue[pendingItemIndex];

            // Mark as uploading immediately to prevent duplicate triggers
            setUploadQueue(prev => prev.map((q, i) => i === pendingItemIndex ? { ...q, status: 'uploading', progress: 0 } : q));

            try {
                console.log("Starting upload:", item.path, "Target Folder:", (item as any).targetFolderId);
                // We use the folder that was active WHEN the file was added. 
                // Currently, we just use 'currentFolder' from state, which might have changed since the file was added to queue?
                // The user complained about files appearing in wrong folders.
                // We should probably store the target folder IN the queue item.
                // For now, let's stick to the requested parallel change, but note that `currentFolder` here is risky if user navigates away.
                // BETTER: Use the currentFolder at the time of processing? Or should we have captured it?
                // Standard behavior: Upload to the folder you are IN when it starts? Or when you added it?
                // Usually when you added it. 
                // I'll leave `currentFolder` as is for now but this is a potential bug vector for the visibility issue.

                await invoke('upload_file', {
                    path: item.path,
                    folder_id: (item as any).targetFolderId,
                    folderId: (item as any).targetFolderId
                });

                // Mark as completed
                setUploadQueue(prev => prev.map((q, i) => i === pendingItemIndex ? { ...q, status: 'completed', progress: 100 } : q));
                setRefresh(prev => prev + 1);
            } catch (e) {
                console.error("Upload failed for", item.path, e);
                setUploadQueue(prev => prev.map((q, i) => i === pendingItemIndex ? { ...q, status: 'error', progress: 0 } : q));
                alert(`Failed to upload ${item.name}: ${e}`);
            }
        };

        processQueue();

    }, [uploadQueue]); // Re-run when queue changes

    // Helper Functions
    const formatSize = (bytes?: number | string) => {
        if (bytes === undefined) return '-';
        if (typeof bytes === 'string') return bytes;
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handlePreview = async (item: FileItem) => {
        if (item.type === 'file') {
            try {
                setIsPreviewLoading(true);
                const file = files.find(f => f.id === item.id);
                if (!file) return;

                const path = await invoke<string>('preview_file', {
                    fileId: file.message_id,
                    fileName: file.name
                });

                // Fallback attempt: Read file directly using FS plugin
                try {
                    const contents = await readFile(path);
                    const blob = new Blob([contents], { type: file.mime_type || 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    setPreviewUrl(url);
                } catch (readErr) {
                    console.error("Direct read failed, trying asset url:", readErr);
                    // Fallback to convertFileSrc if direct read fails (unlikely if plugin works)
                    setPreviewUrl(convertFileSrc(path));
                }

                setPreviewingItem(file);
            } catch (e) {
                console.error("Preview failed", e);
                alert("Failed to load preview");
            } finally {
                setIsPreviewLoading(false);
            }
        }
    };

    // Cleanup blob URLs
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);


    const handleTrash = (id: string, isFolder: boolean, name: string) => {
        setItemToDelete({ id, isFolder, name, deleteType: 'soft' });
    };

    const handleToggleStar = async (item: FileItem) => {
        try {
            const isFolder = item.type === 'folder';
            await invoke('toggle_star', { id: item.id, isFolder });

            // Optimistic update
            if (isFolder) {
                setFolders(prev => prev.map(f => f.id === item.id ? { ...f, is_starred: !f.is_starred } : f));
            } else {
                setFiles(prev => prev.map(f => f.id === item.id ? { ...f, is_starred: !f.is_starred } : f));
            }

            // If currently viewing starred items, we might want to remove it from view if unstarred
            // But immediate removal can be jarring. Let's see. 
            // If we unstar in starred view, it should probably disappear.
            if (currentSection === 'starred') {
                if (isFolder) {
                    setFolders(prev => prev.filter(f => f.id !== item.id));
                } else {
                    setFiles(prev => prev.filter(f => f.id !== item.id));
                }
            }
        } catch (e) {
            console.error("Failed to toggle star", e);
        }
    };


    const handleUpload = async () => {
        setIsNewMenuOpen(false);
        try {
            const selected = await open({
                multiple: true, // Enable multiple
                directory: false,
            });

            if (selected) {
                const paths = Array.isArray(selected) ? selected : [selected];
                // Add to queue with the CURRENT folder as the target
                const targetFolderId = currentFolder;
                const newItems = paths.map(path => ({
                    path,
                    name: path.split(/[/\\]/).pop() || 'Unknown File',
                    status: 'pending' as const,
                    progress: 0,
                    targetFolderId: targetFolderId // Store it!
                }));
                setUploadQueue(prev => [...prev, ...newItems]);
                // We don't trigger loading here, queue handles it visible logic
            }
        } catch (e) {
            console.error("Upload selection failed", e);
        }
    };

    const openCreateFolderModal = () => {
        setIsNewMenuOpen(false);
        setIsCreateFolderOpen(true);
        setNewFolderName("");
    };

    const handleCreateFolderSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            setIsLoading(true);
            setIsCreateFolderOpen(false);
            console.log("Invoking create_folder", { name: newFolderName, parent_id: currentFolder });
            await invoke('create_folder', {
                name: newFolderName,
                parent_id: currentFolder,
                parentId: currentFolder
            });
            console.log("Folder created successfully");
            setRefresh(prev => prev + 1);
        } catch (err) {
            console.error("Create folder failed", err);
            alert("Failed to create folder: " + err);
        } finally {
            setIsLoading(false);
        }
    };



    const handleRename = (id: string, currentName: string, isFolder: boolean) => {
        setRenameItem({ id, type: isFolder ? 'folder' : 'file', name: currentName });
        setIsRenameOpen(true);
    };

    const handleRestore = async (id: string, isFolder: boolean) => {
        try {
            await invoke('restore_item', { id, is_folder: isFolder, isFolder });
            setRefresh(prev => prev + 1);
        } catch (e) {
            console.error("Restore failed", e);
            alert("Restore failed: " + e);
        }
    };

    const handleEmptyTrash = async () => {
        setIsEmptyTrashOpen(false);
        try {
            setIsLoading(true);
            await invoke('empty_trash');
            setRefresh(prev => prev + 1);
        } catch (e) {
            console.error("Empty trash failed", e);
            alert("Empty trash failed: " + e);
        } finally {
            setIsLoading(false);
        }
    };



    const handleDeleteForever = (id: string, isFolder: boolean, name: string = "Item") => {
        setItemToDelete({ id, isFolder, name, deleteType: 'hard' });
    };



    useEffect(() => {
        fetchFiles();
    }, [currentFolder, refresh, currentSection]);



    const handleDownload = async (fileId: string) => {
        const file = files.find(f => f.id === fileId);
        if (!file) return;

        try {
            const savePath = await save({
                defaultPath: file.name,
            });

            if (savePath) {
                // Send both cases to be safe against Tauri's argument matching quirks
                await invoke('download_file_core', {
                    file_id: fileId,
                    fileId: fileId,
                    save_path: savePath,
                    savePath: savePath
                });
                alert("Download complete!");
            }
        } catch (e) {
            console.error("Download failed", e);
            alert("Download failed: " + e);
        }
    };

    const handleDelete = (id: string, name: string, isFolder: boolean) => {
        setItemToDelete({ id, isFolder, name, deleteType: 'soft' });
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            setIsLoading(true);
            if (itemToDelete.deleteType === 'hard') {
                await invoke('delete_item_permanently', {
                    id: itemToDelete.id,
                    is_folder: itemToDelete.isFolder,
                    isFolder: itemToDelete.isFolder
                });
            } else {
                await invoke('delete_item', {
                    id: itemToDelete.id,
                    is_folder: itemToDelete.isFolder,
                    isFolder: itemToDelete.isFolder
                });
            }
            setRefresh(prev => prev + 1);
            setItemToDelete(null);
        } catch (e) {
            console.error("Delete failed", e);
            alert("Delete failed: " + e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await invoke('logout');
            onLogout();
        } catch (e) {
            console.error("Logout failed", e);
            onLogout();
        }
    };

    const checkForUpdates = async () => {
        try {
            setIsCheckingUpdate(true);
            setUpdateStatus("Checking for updates...");

            const update = await check();

            if (update) {
                console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
                setUpdateStatus(`Update found: ${update.version}`);


                // Let's assume usage of window.confirm for now
                if (window.confirm(`Update to ${update.version}?`)) {
                    setUpdateStatus("Downloading update...");
                    let downloaded = 0;
                    let contentLength = 0;

                    await update.downloadAndInstall((event) => {
                        switch (event.event) {
                            case 'Started':
                                contentLength = event.data.contentLength || 0;
                                console.log(`started downloading ${contentLength} bytes`);
                                break;
                            case 'Progress':
                                downloaded += event.data.chunkLength;
                                console.log(`downloaded ${downloaded} from ${contentLength}`);
                                // Calculate percentage if needed
                                break;
                            case 'Finished':
                                console.log('download finished');
                                break;
                        }
                    });

                    setUpdateStatus("Update installed. Restarting...");
                    await relaunch();
                } else {
                    setUpdateStatus(null);
                }
            } else {
                setUpdateStatus("You are up to date!");
                setTimeout(() => setUpdateStatus(null), 3000);
            }
        } catch (e) {
            console.error("Update check failed", e);
            setUpdateStatus("Update check failed.");
            setTimeout(() => setUpdateStatus(null), 3000);
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const allItems: FileItem[] = [
        ...folders.map(f => ({ id: f.id, name: f.name, type: 'folder' as const, modified: 'Just now', is_starred: f.is_starred })),
        ...uploadQueue.filter(q => q.status === 'pending' || q.status === 'uploading').map((q, i) => ({
            id: `upload-${i}`,
            name: q.name,
            type: 'file' as const,
            size: q.status === 'uploading' ? 'Uploading...' : 'Queued',
            mimeType: 'application/octet-stream' // placeholder
        })),
        ...files.map(f => ({ id: f.id, name: f.name, type: 'file' as const, size: (f.size / 1024 / 1024).toFixed(2) + ' MB', mimeType: f.mime_type, is_starred: f.is_starred, thumbnail: f.thumbnail }))
    ];

    function itemsSection(items: FileItem[], title: string) {
        if (items.length === 0) return null;
        return (
            <div className="mb-8">
                <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">{title}</h2>
                <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                    {items.map(file => (
                        <FileCard
                            key={file.id}
                            item={file}
                            onNavigate={currentSection === 'trash' ? undefined : (id) => handleNavigate(id, file.name)}
                            onPreview={handlePreview}
                            onContextMenu={(e, item) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, item });
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#030712] text-foreground font-sans selection:bg-cyan-500/30 overflow-hidden relative">

            {/* Background Grid Pattern (Technical Look) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Loading Indicator */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 text-cyan-400 px-6 py-2 rounded-b-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] text-sm font-medium flex items-center gap-2"
                    >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className="w-72 bg-transparent flex flex-col pt-8 pb-6 z-20" data-tauri-drag-region>
                {/* Logo */}
                <div className="px-8 mb-10 flex items-center gap-3 select-none">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">P</div>
                    <span className="text-xl font-bold tracking-tight text-white/90">
                        Paperfold
                    </span>
                </div>

                {/* Primary Actions */}
                <div className="px-6 mb-8">
                    <div className="relative">
                        <button
                            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] w-full group backdrop-blur-sm"
                        >
                            <Plus className="w-5 h-5 text-cyan-400 group-hover:rotate-90 transition-transform" />
                            <span className="font-medium text-sm tracking-wide">New Upload</span>
                        </button>

                        {/* Dropdown */}
                        <AnimatePresence>
                            {isNewMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsNewMenuOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 w-full mt-2 bg-[#0A0A0A] border border-white/10 p-1.5 rounded-xl shadow-2xl z-20 backdrop-blur-xl"
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); openCreateFolderModal(); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/5 rounded-lg text-left text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                            <FolderPlus className="w-4 h-4 text-cyan-500/70" />
                                            New Folder
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleUpload(); }} className="flex items-center gap-3 w-full p-2.5 hover:bg-white/5 rounded-lg text-left text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                            <Upload className="w-4 h-4 text-cyan-500/70" />
                                            File Upload
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Create Folder Modal */}
                <AnimatePresence>
                    {isCreateFolderOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#0A0A0A] rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 w-96 border border-white/10"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                        <FolderIcon className="w-5 h-5 fill-current opacity-80" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">New Folder</h3>
                                </div>

                                <form onSubmit={handleCreateFolderSubmit}>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Folder Name"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium mb-6 placeholder:text-gray-600"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateFolderOpen(false)}
                                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors flex-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-cyan-500/20 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!newFolderName.trim()}
                                        >
                                            Create
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Modal */}


                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-4">
                    {[
                        { icon: Home, label: 'My Drive', id: 'drive' as const },
                        { icon: Clock, label: 'Recent', id: 'recent' as const },
                        { icon: Star, label: 'Starred', id: 'starred' as const },
                        { icon: Trash2, label: 'Trash', id: 'trash' as const },
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setCurrentSection(item.id);
                                if (item.id === 'drive') {
                                    setCurrentFolder(null); // Go to root when clicking My Drive
                                    setFolderName('My Drive');
                                } else if (item.id === 'trash') {
                                    setFolderName('Trash');
                                }
                            }}
                            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${currentSection === item.id
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <item.icon className={`w-[18px] h-[18px] transition-colors ${currentSection === item.id ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Storage Status */}
                <div className="px-6 mt-6">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
                        <div className="flex items-center gap-2 mb-3 text-cyan-400">
                            <Cloud className="w-4 h-4 fill-current opacity-80" />
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Storage</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1 mb-3 overflow-hidden">
                            <div className="bg-cyan-400 h-1 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-500" style={{ width: (storageUsage === '0.00 B' || storageUsage === '0.00 KB' || storageUsage === '0 B') ? '0%' : '5%' }}></div>
                        </div>
                        <div className="flex justify-between items-end">
                            <p className="text-sm font-mono text-white/90">{storageUsage}</p>
                            <p className="text-[10px] text-cyan-400 font-medium bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">USED</p>
                        </div>
                    </div>
                </div>
                {/* User Profile */}
                {user && (
                    <div className="px-6 pb-6 mt-auto">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {user.first_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white/90 text-sm truncate group-hover:text-white transition-colors">
                                    {user.first_name} {user.last_name || ''}
                                </p>
                                <p className="text-[10px] text-gray-500 font-mono truncate">
                                    ID: {user.id}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A] m-2 rounded-2xl border border-white/5 relative z-10 shadow-2xl">

                {/* Header */}
                <header className="h-20 px-8 flex items-center justify-between z-20">

                    {/* Search */}
                    <div className="flex-1 max-w-2xl mx-auto px-4 relative">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim().length > 0) setIsSearchOpen(true); }}
                                placeholder="Search your universe..."
                                className="w-full h-11 pl-11 pr-10 bg-white/5 hover:bg-white/[0.07] focus:bg-[#111] border border-white/5 focus:border-cyan-500/30 rounded-full text-sm transition-all outline-none focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-600 font-medium text-gray-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setIsSearchOpen(false);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                            {isSearchOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsSearchOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                        className="absolute top-full left-4 right-4 mt-2 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20 max-h-[60vh] flex flex-col backdrop-blur-3xl"
                                    >
                                        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                                            {searchResults.folders.length === 0 && searchResults.files.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">
                                                    <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm">No results found for "{searchQuery}"</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Folders Section */}
                                                    {searchResults.folders.length > 0 && (
                                                        <div className="mb-4">
                                                            <h3 className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Folders</h3>
                                                            {searchResults.folders.map(folder => (
                                                                <button
                                                                    key={folder.id}
                                                                    onClick={() => {
                                                                        setCurrentFolder(folder.id);
                                                                        setFolderName(folder.name);
                                                                        setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
                                                                        setIsSearchOpen(false);
                                                                        setSearchQuery('');
                                                                    }}
                                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group border border-transparent hover:border-white/5"
                                                                >
                                                                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                                                                        <FolderIcon className="w-4 h-4 fill-current" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-gray-200 text-sm group-hover:text-white transition-colors">{folder.name}</p>
                                                                        <p className="text-[10px] text-gray-500 font-mono">FOLDER</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Files Section */}
                                                    {searchResults.files.length > 0 && (
                                                        <div>
                                                            <h3 className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Files</h3>
                                                            {searchResults.files.map(file => (
                                                                <button
                                                                    key={file.id}
                                                                    onClick={() => {
                                                                        handlePreview({ ...file, type: 'file', size: formatSize(file.size) });
                                                                        setIsSearchOpen(false);
                                                                    }}
                                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group border border-transparent hover:border-white/5"
                                                                >
                                                                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-cyan-400 group-hover:scale-110 transition-transform">
                                                                        <FileIcon className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium text-gray-200 text-sm truncate group-hover:text-white transition-colors">{file.name}</p>
                                                                        <p className="text-[10px] text-gray-500 font-mono">{formatSize(file.size)} • {formatDate(new Date(file.created_at * 1000).toISOString())}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={async () => {
                                setIsRefreshing(true);
                                setRefresh(prev => prev + 1);
                                await fetchStorageUsage();
                                setTimeout(() => setIsRefreshing(false), 800);
                            }}
                            className="p-2.5 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-full text-gray-400 hover:text-cyan-400 transition-all disabled:opacity-50"
                            title="Refresh"
                            disabled={isRefreshing}
                        >
                            <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-[2px] shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:scale-105 transition-transform"
                            >
                                <div className="w-full h-full rounded-full bg-[#0A0A0A] flex items-center justify-center text-white font-bold text-sm uppercase">
                                    {user?.first_name ? user.first_name[0] : 'U'}
                                </div>
                            </button>

                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 top-14 w-64 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-2 z-20 backdrop-blur-xl flex flex-col gap-1"
                                        >
                                            <div className="p-3 border-b border-white/5 mb-1">
                                                <p className="font-bold text-white mb-0.5">{user?.first_name} {user?.last_name || ''}</p>
                                                {user?.username && <p className="text-xs text-gray-500 font-mono">@{user.username}</p>}
                                                {user?.id && <p className="text-[10px] text-gray-600 font-mono mt-1">ID: {user.id}</p>}
                                            </div>

                                            <button
                                                onClick={() => { checkForUpdates(); setIsUserMenuOpen(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                                            >
                                                <RotateCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                                                Check for Updates
                                            </button>

                                            {updateStatus && (
                                                <div className="px-3 py-2 text-xs text-cyan-400 font-mono break-words">
                                                    {updateStatus}
                                                </div>
                                            )}

                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Log Out
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        {/* Theme toggle removed intentionally as we are enforcing dark mode for this aesthetic, or hiding it */}
                    </div>
                </header>

                {/* Empty Trash Modal */}
                <AnimatePresence>
                    {isEmptyTrashOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#0A0A0A] rounded-2xl shadow-2xl p-6 w-96 border border-white/10"
                            >
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                        <Trash2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Empty Trash?</h3>
                                    <p className="text-sm text-gray-400 mt-2">
                                        Are you sure you want to delete <span className="font-medium text-white">all items</span> in the trash?
                                        <br /><span className="text-red-400 font-medium">This action cannot be undone.</span>
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setIsEmptyTrashOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors flex-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleEmptyTrash}
                                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-600/20 flex-1 border border-red-500/50"
                                    >
                                        Empty Trash
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Toolbar / Breadcrumbs */}
                <div className="px-8 py-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                        {breadcrumbs.map((crumb, index) => (
                            <div key={index} className="flex items-center gap-2">
                                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-600" />}
                                <button
                                    onClick={() => handleBreadcrumbClick(index)}
                                    className={`hover:bg-white/5 px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-white/5 ${index === breadcrumbs.length - 1
                                        ? 'text-white font-bold bg-white/5 border-white/5 shadow-sm'
                                        : 'hover:text-white'
                                        }`}
                                >
                                    {crumb.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        {currentSection === 'trash' && (
                            <button
                                onClick={() => setIsEmptyTrashOpen(true)}
                                disabled={allItems.length === 0}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all text-sm font-medium ${allItems.length === 0 ? 'opacity-50 cursor-not-allowed' : 'shadow-[0_0_10px_rgba(239,68,68,0.1)]'}`}
                            >
                                <Trash2 className="w-4 h-4" />
                                Empty Trash
                            </button>
                        )}

                        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-full shadow-inner">
                            <button
                                onClick={() => setView('list')}
                                className={`p-2 rounded-full transition-all duration-300 ${view === 'list'
                                    ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                    : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setView('grid')}
                                className={`p-2 rounded-full transition-all duration-300 ${view === 'grid'
                                    ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                    : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-auto px-8 pb-8 custom-scrollbar">
                    {view === 'grid' ? (
                        <>
                            {itemsSection(allItems.filter(f => f.type === 'folder'), "Folders")}
                            {itemsSection(allItems.filter(f => f.type === 'file'), "Files")}
                        </>
                    ) : (
                        <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.02]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white/5 text-gray-400 font-medium font-mono text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Size</th>
                                        <th className="px-6 py-4">Last Modified</th>
                                        <th className="px-6 py-4 w-32 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allItems.map(item => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-white/5 transition-colors group cursor-pointer"
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('button')) return;
                                                if (item.type === 'folder') {
                                                    setCurrentFolder(item.id);
                                                    setFolderName(item.name);
                                                } else {
                                                    handlePreview(item);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-3.5 font-medium text-gray-200 flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${item.type === 'folder' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-white/10 text-gray-400'}`}>
                                                    {item.type === 'folder' ? <FolderIcon className="w-4 h-4 fill-current" /> : <FileIcon className="w-4 h-4" />}
                                                </div>
                                                {item.name}
                                            </td>
                                            <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">
                                                {item.type === 'file' ? formatSize(item.size) : '-'}
                                            </td>
                                            <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">
                                                {item.modified ? formatDate(item.modified) : '-'}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRenameItem({ id: item.id, type: item.type, name: item.name });
                                                            setIsRenameOpen(true);
                                                        }}
                                                        className="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
                                                        title="Rename"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleStar(item);
                                                        }}
                                                        className={`p-1.5 hover:bg-yellow-500/10 rounded transition-colors ${item.is_starred ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}
                                                        title={item.is_starred ? "Unstar" : "Star"}
                                                    >
                                                        <Star className={`w-4 h-4 ${item.is_starred ? 'fill-current' : ''}`} />
                                                    </button>

                                                    {item.type === 'file' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(item.id);
                                                            }}
                                                            className="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
                                                            title="Download"
                                                        >
                                                            <Upload className="w-4 h-4 rotate-180" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTrash(item.id, item.type === 'folder', item.name);
                                                        }}
                                                        className="p-1.5 hover:bg-red-500/10 rounded text-gray-500 hover:text-red-500 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}


                </div>
            </main >

            {/* Upload Progress Panel (Google Drive Style) */}
            {/* Upload Progress Panel (Technical/Cyber) */}
            <AnimatePresence>
                {uploadQueue.length > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.95 }}
                        className="fixed bottom-6 right-6 w-96 bg-[#111] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 flex flex-col backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="bg-white/5 border-b border-white/5 px-4 py-3 flex items-center justify-between">
                            <span className="font-bold text-xs text-white uppercase tracking-wider">
                                {uploadQueue.filter(i => i.status === 'pending' || i.status === 'uploading').length === 0
                                    ? "Operations Complete"
                                    : `Processing ${uploadQueue.filter(i => i.status === 'pending' || i.status === 'uploading').length} Items`
                                }
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsUploadProgressMinimized(!isUploadProgressMinimized)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                                >
                                    {isUploadProgressMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setUploadQueue([])}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        {!isUploadProgressMinimized && (
                            <div className="max-h-60 overflow-y-auto bg-black/20 custom-scrollbar">
                                {uploadQueue.map((item, index) => (
                                    <div key={index} className="px-4 py-3 border-b border-white/5 flex items-center gap-3 last:border-0 hover:bg-white/5 transition-colors">
                                        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                                            <FileIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <p className="text-sm font-medium text-gray-200 truncate">{item.name}</p>
                                                {item.status === 'uploading' && (
                                                    <span className="text-xs text-cyan-400 font-mono">{Math.round(item.progress)}%</span>
                                                )}
                                            </div>

                                            {/* Progress Bar or Status Text */}
                                            {item.status === 'uploading' ? (
                                                <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                                                    <motion.div
                                                        className="bg-cyan-400 h-full rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.progress}%` }}
                                                        transition={{ duration: 0.1 }}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-gray-500 font-mono uppercase">
                                                    {item.status === 'pending' && "Queued"}
                                                    {item.status === 'completed' && <span className="text-green-400">Success</span>}
                                                    {item.status === 'error' && <span className="text-red-400">Failed</span>}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            {item.status === 'pending' && <div className="w-3 h-3 rounded-full border-2 border-gray-600" />}
                                            {item.status === 'uploading' && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                                            {item.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-400" />}
                                            {item.status === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>




            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {itemToDelete && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0A0A0A] rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 w-96 border border-white/10"
                        >
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white">
                                    {itemToDelete.deleteType === 'hard' ? 'Delete Permanently?' : 'Move to Trash?'}
                                </h3>
                                <p className="text-sm text-gray-400 mt-2">
                                    Are you sure you want to delete <span className="font-medium text-white">{itemToDelete.name}</span>?
                                    {itemToDelete.deleteType === 'hard' && (
                                        <><br /><span className="text-red-400 font-medium">This action cannot be undone.</span></>
                                    )}
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors flex-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-600/20 flex-1 border border-red-500/50"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rename Modal */}
            <AnimatePresence>
                {isRenameOpen && renameItem && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0A0A0A] rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 w-96 border border-white/10"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                    <Pencil className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Rename Item</h3>
                                    <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                                        {renameItem.type}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Name</label>
                                <input
                                    value={renameItem.name}
                                    onChange={(e) => setRenameItem({ ...renameItem, name: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                                    autoFocus
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (renameItem.name.trim()) {
                                                try {
                                                    await invoke('rename_item', {
                                                        id: renameItem.id,
                                                        new_name: renameItem.name,
                                                        newName: renameItem.name,
                                                        is_folder: renameItem.type === 'folder',
                                                        isFolder: renameItem.type === 'folder'
                                                    });
                                                    setRefresh(r => r + 1);
                                                    setIsRenameOpen(false);
                                                } catch (err) {
                                                    alert("Failed to rename: " + err);
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsRenameOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors flex-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (renameItem.name.trim()) {
                                            try {
                                                await invoke('rename_item', {
                                                    id: renameItem.id,
                                                    new_name: renameItem.name,
                                                    newName: renameItem.name,
                                                    is_folder: renameItem.type === 'folder',
                                                    isFolder: renameItem.type === 'folder'
                                                });
                                                setRefresh(r => r + 1);
                                                setIsRenameOpen(false);
                                            } catch (err) {
                                                alert("Failed to rename: " + err);
                                            }
                                        }
                                    }}
                                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-cyan-500/20 flex-1"
                                >
                                    Rename
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewingItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#0A0A0A] rounded-2xl border border-white/10 w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                                        <FileIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-sm">{previewingItem.name}</h3>
                                        <p className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">
                                            {formatSize(previewingItem.size)} • {previewingItem.mime_type}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownload(previewingItem.id)}
                                        className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                                        title="Download"
                                    >
                                        <Cloud className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPreviewingItem(null);
                                            setPreviewUrl(null);
                                        }}
                                        className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden bg-black/40 relative flex items-center justify-center p-4">
                                {isPreviewLoading ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                                        <p className="text-sm text-gray-400 animate-pulse">Fetching high-quality media from Telegram...</p>
                                    </div>
                                ) : previewUrl ? (
                                    <div className="w-full h-full flex items-center justify-center p-4">
                                        {(() => {
                                            const name = previewingItem.name.toLowerCase();
                                            const mime = (previewingItem.mime_type || '').toLowerCase();

                                            const isImage = (mime.startsWith('image/') ||
                                                /\.(jpg|jpeg|png|webp|svg|bmp)$/i.test(name)) && !name.endsWith('.gif'); // Exclude .gif here

                                            // Treated as video for playback control (looping)
                                            const isVideo = mime.startsWith('video/') ||
                                                /\.(mp4|mov|avi|wmv|flv|webm|mkv|gif)$/i.test(name);

                                            const isAudio = mime.startsWith('audio/') ||
                                                /\.(mp3|wav|ogg|m4a|flac)$/i.test(name);

                                            const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');

                                            if (isImage) {
                                                return (
                                                    <img
                                                        src={previewUrl}
                                                        alt={previewingItem.name}
                                                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                                    />
                                                );
                                            } else if (isVideo) {
                                                const isGif = name.endsWith('.gif');
                                                // If it's a small MP4 (Telegram often converts gifs to mp4), treat as gif
                                                // For now relying on extension is safest for "GIF user exp".

                                                return (
                                                    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 group flex items-center justify-center">
                                                        {/* Backdrop blur effect */}
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-blue-600/10 opacity-50" />

                                                        <video
                                                            src={previewUrl}
                                                            controls={!isGif}
                                                            autoPlay
                                                            loop={isGif}
                                                            muted={isGif}
                                                            playsInline
                                                            className="w-full h-full object-contain relative z-10"
                                                        />
                                                    </div>
                                                );
                                            } else if (isAudio) {
                                                return (
                                                    <div className="bg-white/5 p-12 rounded-3xl border border-white/5 flex flex-col items-center gap-8 w-full max-w-xl shadow-2xl backdrop-blur-sm">
                                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-pulse-slow">
                                                            <Music className="w-12 h-12 text-cyan-400 fill-current opacity-80" />
                                                        </div>
                                                        <div className="text-center w-full">
                                                            <h3 className="text-xl font-bold text-white mb-2 truncate px-4" title={previewingItem.name}>
                                                                {previewingItem.name}
                                                            </h3>
                                                            <p className="text-sm text-gray-400 font-mono">Audio Preview</p>
                                                        </div>
                                                        <audio
                                                            src={previewUrl}
                                                            controls
                                                            autoPlay
                                                            className="w-full"
                                                        />
                                                    </div>
                                                );
                                            } else if (isPdf) {
                                                return (
                                                    <iframe
                                                        src={previewUrl}
                                                        className="w-full h-full rounded-xl bg-white shadow-2xl border-none"
                                                        title="PDF Preview"
                                                    />
                                                );
                                            } else {
                                                return (
                                                    <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/5 max-w-md backdrop-blur-sm">
                                                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                                                            <AlertCircle className="w-10 h-10 text-gray-400" />
                                                        </div>
                                                        <h4 className="text-xl font-bold text-white mb-2">Preview Not Available</h4>
                                                        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                                                            We can't preview this file type directly in Paperfold yet.
                                                            <br />Please download it to view locally.
                                                        </p>
                                                        <button
                                                            onClick={() => handleDownload(previewingItem.id)}
                                                            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95"
                                                        >
                                                            Download File
                                                        </button>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                ) : null}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <>
                        {/* Backdrop to close menu */}
                        <div
                            className="fixed inset-0 z-50"
                            onClick={() => setContextMenu(null)}
                            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                        />

                        {/* Menu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="fixed z-50 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[180px] backdrop-blur-xl"
                            style={{
                                top: Math.min(contextMenu.y, window.innerHeight - 200),
                                left: Math.min(contextMenu.x, window.innerWidth - 180)
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                                <p className="text-xs font-medium text-gray-400 truncate max-w-[150px]">{contextMenu.item.name}</p>
                            </div>

                            {currentSection !== 'trash' ? (
                                <>
                                    <button
                                        onClick={() => { handleToggleStar(contextMenu.item); setContextMenu(null); }}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                                    >
                                        <Star className={`w-4 h-4 ${contextMenu.item.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                        {contextMenu.item.is_starred ? 'Unstar' : 'Star'}
                                    </button>

                                    <button
                                        onClick={() => {
                                            handleRename(contextMenu.item.id, contextMenu.item.name, contextMenu.item.type === 'folder');
                                            setContextMenu(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Rename
                                    </button>

                                    {contextMenu.item.type === 'file' && (
                                        <button
                                            onClick={() => { handleDownload(contextMenu.item.id); setContextMenu(null); }}
                                            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                                        >
                                            <Upload className="w-4 h-4 rotate-180" />
                                            Download
                                        </button>
                                    )}

                                    <div className="h-px bg-white/5 my-1" />

                                    <button
                                        onClick={() => { handleDelete(contextMenu.item.id, contextMenu.item.name, contextMenu.item.type === 'folder'); setContextMenu(null); }}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { handleRestore(contextMenu.item.id, contextMenu.item.type === 'folder'); setContextMenu(null); }}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors text-left"
                                    >
                                        <RotateCw className="w-4 h-4" />
                                        Restore
                                    </button>
                                    <button
                                        onClick={() => { handleDeleteForever(contextMenu.item.id, contextMenu.item.type === 'folder', contextMenu.item.name); setContextMenu(null); }}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Forever
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
}
