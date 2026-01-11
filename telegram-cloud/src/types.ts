export interface FileMetadata {
    id: string;
    folder_id: string | null;
    name: string;
    size: number;
    mime_type: string;
    created_at: number;
    is_starred?: boolean;
}

export interface Folder {
    id: string;
    parent_id: string | null;
    name: string;
    created_at: number;
    is_starred?: boolean;
}
