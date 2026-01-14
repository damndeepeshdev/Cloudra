export interface FileMetadata {
    id: string;
    folder_id: string | null;
    name: string;
    size: number;
    mime_type: string;
    message_id: number;
    created_at: number;
    is_starred?: boolean;
    thumbnail?: string;
}

export interface Folder {
    id: string;
    parent_id: string | null;
    name: string;
    created_at: number;
    is_starred?: boolean;
}
