// Armazenamento local de arquivos (documentos e PDFs de cotação) em
// IndexedDB, num store separado do banco. O SQLite guarda só os metadados.
import { createStore, get, set, del } from "idb-keyval";
import { uuid } from "./database";

const store = createStore("seguropwa-files", "files");

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

export async function saveFile(file: File): Promise<StoredFile> {
  const rec: StoredFile = {
    id: uuid(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
  };
  await set(rec.id, rec, store);
  return rec;
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  return get<StoredFile>(id, store);
}

export async function deleteFile(id: string | null | undefined) {
  if (id) await del(id, store);
}

/** Abre o arquivo numa nova aba (URL temporária de blob). */
export async function openFile(id: string) {
  const rec = await getFile(id);
  if (!rec) return;
  const url = URL.createObjectURL(rec.blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Baixa o arquivo com o nome original. */
export async function downloadFile(id: string, fallbackName = "arquivo") {
  const rec = await getFile(id);
  if (!rec) return;
  const url = URL.createObjectURL(rec.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = rec.name || fallbackName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// --- helpers de backup (base64) -------------------------------------------
export async function fileToBase64(rec: StoredFile): Promise<string> {
  const buf = await rec.blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function saveFileFromBase64(rec: {
  id: string;
  name: string;
  type: string;
  data_base64: string;
}): Promise<void> {
  const bin = atob(rec.data_base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: rec.type });
  const stored: StoredFile = {
    id: rec.id,
    name: rec.name,
    type: rec.type,
    size: blob.size,
    blob,
  };
  await set(stored.id, stored, store);
}
