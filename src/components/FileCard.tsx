import { File as FileIcon, Folder, Star, FileText, Music, Video, Image as ImageIcon, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export interface FileItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: string;
    modified?: string;
    thumbnail?: string;
    mimeType?: string;
    is_starred?: boolean;
    path_display?: string;
}

interface FileCardProps {
    item: FileItem;
    isSelected?: boolean;
    onNavigate?: (id: string) => void;
    onPreview?: (item: FileItem) => void;
    onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
    onClick?: (e: React.MouseEvent, item: FileItem) => void;
}

export default function FileCard({ item, isSelected, onNavigate, onPreview, onContextMenu, onClick }: FileCardProps) {
    const getFileIcon = () => {
        const name = item.name.toLowerCase();
        const mime = (item.mimeType || '').toLowerCase();

        if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)) {
            return <ImageIcon className="w-1/3 h-1/3 text-purple-400 opacity-80" />;
        }
        if (mime.startsWith('video/') || /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(name)) {
            return <Video className="w-1/3 h-1/3 text-red-400 opacity-80" />;
        }
        if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(name)) {
            return <Music className="w-1/3 h-1/3 text-yellow-400 opacity-80" />;
        }
        if (mime === 'application/pdf' || name.endsWith('.pdf')) {
            return <FileText className="w-1/3 h-1/3 text-orange-400 opacity-80" />;
        }
        return <FileIcon className="w-1/3 h-1/3 text-gray-500" />;
    };

    const isVideo = (item.mimeType || '').startsWith('video/') || /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(item.name);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: 1,
                scale: isSelected ? 0.95 : 1,
                backgroundColor: isSelected ? 'rgba(6,182,212,0.1)' : 'transparent'
            }}
            whileHover={{ scale: isSelected ? 0.97 : 1.02 }}
            className={`group relative flex flex-col items-center gap-3 cursor-pointer p-2 rounded-xl transition-all duration-200 hover:bg-white/5 ${isSelected ? 'ring-2 ring-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : ''
                }`}
            onClick={(e) => {
                if (onClick) {
                    onClick(e, item);
                } else if (item.type === 'folder') {
                    onNavigate?.(item.id);
                } else {
                    onPreview?.(item);
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu?.(e, item);
            }}
        >
            {/* Thumbnail / Icon Container - Main Visual */}
            <div className={`w-full aspect-square rounded-2xl shadow-sm relative overflow-hidden flex items-center justify-center transition-all duration-300 ${item.thumbnail
                ? 'bg-black/50'
                : item.type === 'folder'
                    ? 'bg-cyan-500/10 border border-cyan-500/20'
                    : 'bg-white/5 border border-white/5'
                }`}>
                {item.type === 'folder' ? (
                    <Folder className="w-1/3 h-1/3 fill-current text-cyan-400 opacity-90" />
                ) : item.thumbnail ? (
                    <div className="relative w-full h-full">
                        <img
                            src={`data:image/jpeg;base64,${item.thumbnail}`}
                            alt={item.name}
                            className="w-full h-full object-cover"
                        />
                        {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl">
                                    <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    getFileIcon()
                )}

                {/* Star Overlay Indicator */}
                {item.is_starred && (
                    <div className="absolute top-2 right-2 text-yellow-400">
                        <Star className="w-4 h-4 fill-current drop-shadow-md" />
                    </div>
                )}
            </div>

            {/* Name */}
            <div className="text-center w-full px-1">
                <h3 className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate" title={item.name}>
                    {item.name}
                </h3>
            </div>
        </motion.div>
    );
}
