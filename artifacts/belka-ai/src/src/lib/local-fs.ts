export interface LocalFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  handle?: FileSystemFileHandle;
  dirHandle?: FileSystemDirectoryHandle;
  children?: LocalFile[];
}

export interface LocalFSState {
  rootHandle: FileSystemDirectoryHandle | null;
  rootName: string;
}

let rootDirHandle: FileSystemDirectoryHandle | null = null;

export function isLocalFSSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function openLocalFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isLocalFSSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    rootDirHandle = handle;
    return handle;
  } catch {
    return null;
  }
}

export function getRootHandle(): FileSystemDirectoryHandle | null {
  return rootDirHandle;
}

export function setRootHandle(handle: FileSystemDirectoryHandle | null): void {
  rootDirHandle = handle;
}

const IGNORE_NAMES = new Set([
  "node_modules", ".git", ".DS_Store", "dist", "build", ".next",
  "__pycache__", ".cache", ".vscode", ".idea", "coverage"
]);

async function readDirRecursive(
  dirHandle: FileSystemDirectoryHandle,
  path: string,
  depth: number = 0
): Promise<LocalFile[]> {
  const items: LocalFile[] = [];
  if (depth > 5) return items;

  for await (const [name, handle] of dirHandle as any) {
    if (IGNORE_NAMES.has(name)) continue;
    const itemPath = path ? `${path}/${name}` : name;

    if (handle.kind === "directory") {
      const children = depth < 3 ? await readDirRecursive(handle as FileSystemDirectoryHandle, itemPath, depth + 1) : [];
      items.push({ name, path: itemPath, type: "directory", dirHandle: handle, children });
    } else {
      items.push({ name, path: itemPath, type: "file", handle: handle as FileSystemFileHandle });
    }
  }

  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function listLocalFiles(dirHandle?: FileSystemDirectoryHandle): Promise<LocalFile[]> {
  const handle = dirHandle || rootDirHandle;
  if (!handle) return [];
  try {
    return await readDirRecursive(handle, "");
  } catch {
    return [];
  }
}

export async function readLocalFile(filePath: string, dirHandle?: FileSystemDirectoryHandle): Promise<string | null> {
  const handle = dirHandle || rootDirHandle;
  if (!handle) return null;

  try {
    const parts = filePath.split("/").filter(Boolean);
    let current: FileSystemDirectoryHandle = handle;

    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }

    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

export async function writeLocalFile(
  filePath: string,
  content: string,
  dirHandle?: FileSystemDirectoryHandle
): Promise<boolean> {
  const handle = dirHandle || rootDirHandle;
  if (!handle) return false;

  try {
    const parts = filePath.split("/").filter(Boolean);
    let current: FileSystemDirectoryHandle = handle;

    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i], { create: true });
    }

    const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function deleteLocalFile(
  filePath: string,
  dirHandle?: FileSystemDirectoryHandle
): Promise<boolean> {
  const handle = dirHandle || rootDirHandle;
  if (!handle) return false;

  try {
    const parts = filePath.split("/").filter(Boolean);
    let current: FileSystemDirectoryHandle = handle;

    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }

    await current.removeEntry(parts[parts.length - 1], { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", java: "java", cpp: "cpp", c: "c",
    cs: "csharp", rb: "ruby", php: "php", swift: "swift", kt: "kotlin",
    css: "css", scss: "scss", html: "html", xml: "xml", json: "json",
    yaml: "yaml", yml: "yaml", md: "markdown", sh: "bash", sql: "sql",
    toml: "toml", env: "bash",
  };
  return map[ext] || "text";
}

export function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    ts: "🔷", tsx: "⚛️", js: "🟨", jsx: "⚛️", py: "🐍", rs: "🦀",
    go: "🐹", java: "☕", cpp: "⚙️", c: "⚙️", cs: "🔵", rb: "💎",
    php: "🐘", swift: "🍎", kt: "🟣", css: "🎨", scss: "🎨", html: "🌐",
    json: "📋", yaml: "📋", yml: "📋", md: "📝", sh: "🖥️", sql: "🗄️",
    toml: "⚙️", env: "🔒", png: "🖼️", jpg: "🖼️", jpeg: "🖼️", svg: "🎭",
    gif: "🎬", mp4: "🎬", mp3: "🎵",
  };
  return iconMap[ext] || "📄";
}

export interface FileDiff {
  path: string;
  oldContent: string | null;
  newContent: string | null;
  status: "added" | "modified" | "deleted";
  chunks: DiffChunk[];
}

export interface DiffChunk {
  type: "added" | "removed" | "unchanged";
  lines: string[];
  startLine: number;
}

export function computeDiff(oldContent: string | null, newContent: string | null, path: string): FileDiff {
  const status: FileDiff["status"] =
    oldContent === null ? "added" : newContent === null ? "deleted" : "modified";

  const oldLines = (oldContent || "").split("\n");
  const newLines = (newContent || "").split("\n");

  const chunks: DiffChunk[] = [];

  if (status === "added") {
    chunks.push({ type: "added", lines: newLines, startLine: 1 });
  } else if (status === "deleted") {
    chunks.push({ type: "removed", lines: oldLines, startLine: 1 });
  } else {
    let lineNum = 1;
    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        chunks.push({ type: "unchanged", lines: [oldLines[i]], startLine: lineNum });
        i++; j++; lineNum++;
      } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
        const addedLines: string[] = [];
        while (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
          addedLines.push(newLines[j]);
          j++;
        }
        chunks.push({ type: "added", lines: addedLines, startLine: lineNum });
        lineNum += addedLines.length;
      } else if (i < oldLines.length) {
        const removedLines: string[] = [];
        while (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
          removedLines.push(oldLines[i]);
          i++;
        }
        chunks.push({ type: "removed", lines: removedLines, startLine: lineNum });
      }
    }
  }

  return { path, oldContent, newContent, status, chunks };
}
