use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub created_at: i64,
    #[serde(default)]
    pub trashed: bool,
    #[serde(default)]
    pub trashed_at: Option<i64>,
    #[serde(default)]
    pub is_starred: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub size: i64,
    pub mime_type: String,
    pub message_id: i32,
    pub created_at: i64,
    #[serde(default)]
    pub trashed: bool,
    #[serde(default)]
    pub trashed_at: Option<i64>,
    #[serde(default)]
    pub is_starred: bool,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct DataStore {
    folders: Vec<Folder>,
    files: Vec<FileMetadata>,
}

pub struct Database {
    db_path: PathBuf,
    store: Mutex<DataStore>,
}

impl Database {
    pub fn new(app_dir: &str) -> Self {
        let db_path = std::path::Path::new(app_dir).join("metadata.json");
        let store = if db_path.exists() {
            let file = File::open(&db_path).unwrap();
            let reader = BufReader::new(file);
            serde_json::from_reader(reader).unwrap_or_default()
        } else {
            DataStore::default()
        };

        Database {
            db_path,
            store: Mutex::new(store),
        }
    }

    fn save(&self) {
        let file = File::create(&self.db_path).unwrap();
        let writer = BufWriter::new(file);
        serde_json::to_writer(writer, &*self.store.lock().unwrap()).unwrap();
    }

    pub fn create_folder(&self, name: &str, parent_id: Option<String>) -> String {
        let id = Uuid::new_v4().to_string();
        // timestamp
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
            
        let folder = Folder {
            id: id.clone(),
            parent_id,
            name: name.to_string(),
            created_at: now,
            trashed: false,
            trashed_at: None,
            is_starred: false,
        };
        
        {
            let mut store = self.store.lock().unwrap();
            store.folders.push(folder);
        }
        self.save();
        id
    }

    pub fn list_contents(&self, folder_id: Option<String>) -> (Vec<Folder>, Vec<FileMetadata>) {
        let store = self.store.lock().unwrap();
        let folders = store.folders.iter()
            .filter(|f| f.parent_id == folder_id && !f.trashed)
            .cloned()
            .collect();
        let files = store.files.iter()
            .filter(|f| f.folder_id == folder_id && !f.trashed)
            .cloned()
            .collect();
        (folders, files)
    }

    pub fn list_trash(&self) -> (Vec<Folder>, Vec<FileMetadata>) {
        let store = self.store.lock().unwrap();
        let folders = store.folders.iter()
            .filter(|f| f.trashed)
            .cloned()
            .collect();
        let files = store.files.iter()
            .filter(|f| f.trashed)
            .cloned()
            .collect();
        (folders, files)
    }

    pub fn get_file(&self, id: &str) -> Option<FileMetadata> {
        let store = self.store.lock().unwrap();
        store.files.iter().find(|f| f.id == id).cloned()
    }
    
    pub fn add_file(&self, folder_id: Option<String>, name: String, size: i64, mime_type: String, message_id: i32) -> FileMetadata {
        let id = Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let file = FileMetadata {
            id: id.clone(),
            folder_id,
            name,
            size,
            mime_type,
            message_id,
            created_at: now,
            trashed: false,
            trashed_at: None,
            is_starred: false,
        };
        
        {
            let mut store = self.store.lock().unwrap();
            store.files.push(file.clone());
        }
        self.save();
        file
    }

    // Soft delete
    pub fn trash_item(&self, id: &str, is_folder: bool) {
        let mut store = self.store.lock().unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        if is_folder {
            if let Some(f) = store.folders.iter_mut().find(|f| f.id == id) {
                f.trashed = true;
                f.trashed_at = Some(now);
                
                // Also trash children recursively? 
                // For simplicity now, let's just trash the folder. 
                // But logically, children should be hidden too.
                // If I trash a folder, list_contents won't show it. 
                // If I enter the folder by ID (if I had a link), list_contents(folder_id) would show children unless I filter them too?
                // list_contents only filters items WHERE parent_id == folder_id AND !trashed.
                // So children are effectively hidden because you can't navigate to the parent.
            }
        } else {
            if let Some(f) = store.files.iter_mut().find(|f| f.id == id) {
                f.trashed = true;
                f.trashed_at = Some(now);
            }
        }
        drop(store);
        self.save();
    }

    pub fn restore_item(&self, id: &str, is_folder: bool) {
        let mut store = self.store.lock().unwrap();
        if is_folder {
            if let Some(f) = store.folders.iter_mut().find(|f| f.id == id) {
                f.trashed = false;
                f.trashed_at = None;
            }
        } else {
            if let Some(f) = store.files.iter_mut().find(|f| f.id == id) {
                f.trashed = false;
                f.trashed_at = None;
            }
        }
        drop(store);
        self.save();
    }

    // Hard delete (Permanent)
    pub fn delete_file(&self, id: &str) -> bool {
        let mut store = self.store.lock().unwrap();
        let len_before = store.files.len();
        store.files.retain(|f| f.id != id);
        let deleted = store.files.len() < len_before;
        if deleted {
            drop(store);
            self.save();
        }
        deleted
    }

    pub fn delete_folder(&self, id: &str) -> Vec<FileMetadata> {
        let mut store = self.store.lock().unwrap();
        
        // 1. Find all files in this folder (recursive TODO later, for now flat)
        let deleted_files: Vec<FileMetadata> = store.files.iter()
            .filter(|f| f.folder_id.as_deref() == Some(id))
            .cloned()
            .collect();
            
        // 2. Remove files
        store.files.retain(|f| f.folder_id.as_deref() != Some(id));
        
        // 3. Remove folder
        store.folders.retain(|f| f.id != id);
        
        drop(store);
        self.save();
        
        deleted_files
    }

    pub fn rename_file(&self, id: &str, new_name: &str) -> bool {
        let mut store = self.store.lock().unwrap();
        if let Some(file) = store.files.iter_mut().find(|f| f.id == id) {
            file.name = new_name.to_string();
            drop(store); // release lock before save
            self.save();
            true
        } else {
            false
        }
    }

    pub fn rename_folder(&self, id: &str, new_name: &str) -> bool {
        let mut store = self.store.lock().unwrap();
        if let Some(folder) = store.folders.iter_mut().find(|f| f.id == id) {
            folder.name = new_name.to_string();
            drop(store);
            self.save();
            true
        } else {
            false
        }
    }

    pub fn cleanup_trash(&self, days: i64) -> Vec<FileMetadata> {
         let mut store = self.store.lock().unwrap();
         let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
         
         let limit = now - (days * 24 * 60 * 60);

         // Collect files to be deleted (for telegram deletion)
         let mut deleted_files = Vec::new();

         // 1. Identify valid trash items to remove
         // Note: If we remove a folder, we need to return its files too?
         // This is getting complex for auto-cleanup.
         // Let's just implement individual item cleanup for now.
         
         // Files older than limit
         let files_to_remove: Vec<String> = store.files.iter()
            .filter(|f| f.trashed && f.trashed_at.unwrap_or(0) < limit)
            .map(|f| f.id.clone())
            .collect();

         for id in &files_to_remove {
             if let Some(f) = store.files.iter().find(|f| f.id == *id) {
                 deleted_files.push(f.clone());
             }
         }
         store.files.retain(|f| !files_to_remove.contains(&f.id));

         // Folders older than limit
         let folders_to_remove: Vec<String> = store.folders.iter()
            .filter(|f| f.trashed && f.trashed_at.unwrap_or(0) < limit)
            .map(|f| f.id.clone())
            .collect();
            
         // If folder is removed, its children must be removed too
         // But children might not be marked trashed? 
         // For now, let's assume if you trash a folder, we don't necessarily trash children in DB
         // but they become inaccessible.
         // When cleaning up a folder, we should delete its children.
         
         for fid in folders_to_remove.clone() {
             let children_files: Vec<FileMetadata> = store.files.iter()
                .filter(|f| f.folder_id.as_deref() == Some(&fid))
                .cloned()
                .collect();
             deleted_files.extend(children_files);
             store.files.retain(|f| f.folder_id.as_deref() != Some(&fid));
         }

         store.folders.retain(|f| !folders_to_remove.contains(&f.id));

         drop(store);
         self.save();
         
         deleted_files
    }


    pub fn toggle_star(&self, id: &str, is_folder: bool) -> bool {
        let mut store = self.store.lock().unwrap();
        let mut found = false;
        
        if is_folder {
             if let Some(f) = store.folders.iter_mut().find(|f| f.id == id) {
                 f.is_starred = !f.is_starred;
                 found = true;
             }
        } else {
             if let Some(f) = store.files.iter_mut().find(|f| f.id == id) {
                 f.is_starred = !f.is_starred;
                 found = true;
             }
        }
        
        if found {
            drop(store);
            self.save();
        }
        found
    }

    pub fn get_starred(&self) -> (Vec<Folder>, Vec<FileMetadata>) {
        let store = self.store.lock().unwrap();
        let folders = store.folders.iter()
            .filter(|f| f.is_starred && !f.trashed)
            .cloned()
            .collect();
        let files = store.files.iter()
            .filter(|f| f.is_starred && !f.trashed)
            .cloned()
            .collect();
        (folders, files)
    }


    pub fn get_total_usage(&self) -> i64 {
        let store = self.store.lock().unwrap();
        // Sum size of all NON-TRASHED files
        store.files.iter()
            .filter(|f| !f.trashed)
            .map(|f| f.size)
            .sum()
    }

}
