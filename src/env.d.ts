/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // เพิ่มตัวแปรอื่นๆ ที่คุณมีใน .env ตรงนี้ได้เลย
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}