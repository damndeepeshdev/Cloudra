import { File, Folder, Download, Trash, Pencil, RotateCcw, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export interface FileItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: string;
    modified?: string;
    mimeType?: string;
    is_starred?: boolean;
}

interface FileCardProps {
    item: FileItem;
    onNavigate?: (folderId: string) => void;
    onDownload?: (fileId: string) => void;
    onDelete?: (id: string) => void;
    onRename?: (id: string) => void;
    onRestore?: (id: string) => void;
    onPreview?: (item: FileItem) => void;
    onToggleStar?: (item: FileItem) => void;
}

export default function FileCard({ item, onNavigate, onDownload, onDelete, onRename, onRestore, onPreview, onToggleStar }: FileCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="group relative p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/30 rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-sm shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            onClick={() => {
                if (item.type === 'folder') {
                    onNavigate?.(item.id);
                } else {
                    onPreview?.(item);
                }
            }}
        >
            <div className="flex flex-col gap-4 relative z-10">
                <div className="flex justify-between items-start">
                    <div className={`p-3.5 rounded-xl shadow-inner ${item.type === 'folder'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10'
                        : 'bg-white/5 text-gray-400 border border-white/5'}`}>
                        {item.type === 'folder' ? <Folder className="w-5 h-5 fill-current opacity-80" /> : <File className="w-5 h-5" />}
                    </div>

                    {/* Actions Overlay */}
                    <div className="flex gap-1">
                        {onToggleStar && (
                            <button
                                className={`p-2 rounded-full transition-all duration-200 ${item.is_starred
                                    ? 'text-yellow-400 bg-yellow-400/10 opacity-100'
                                    : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleStar(item);
                                }}
                                title={item.is_starred ? "Unstar" : "Star"}
                            >
                                <Star className={`w-4 h-4 ${item.is_starred ? 'fill-current' : ''}`} />
                            </button>
                        )}

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {onRename && (
                                <button
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRename(item.id);
                                    }}
                                    title="Rename"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {onRestore && (
                                <button
                                    className="p-2 hover:bg-green-500/10 rounded-full text-gray-400 hover:text-green-400 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestore(item.id);
                                    }}
                                    title="Restore"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {item.type === 'file' && onDownload && (
                                <button
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDownload(item.id);
                                    }}
                                    title="Download"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                            )}

                            <button
                                className="p-2 hover:bg-red-500/10 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(item.id);
                                }}
                                title="Delete"
                            >
                                <Trash className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="font-medium text-sm text-gray-200 truncate group-hover:text-white transition-colors" title={item.name}>{item.name}</h3>
                    <p className="text-[10px] text-gray-500 font-mono tracking-wide">
                        {item.type === 'folder' ? 'FOLDER' : item.size} • {item.modified || 'JUST NOW'}
                    </p>
                </div>
            </div>

            {/* Folder 'lip' effect purely visual */}
            {item.type === 'folder' && (
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                    <Folder className="w-24 h-24 rotate-12 translate-x-4 -translate-y-4" />
                </div>
            )}
        </motion.div>
    );
}
