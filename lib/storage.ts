import { createClient } from '@/lib/supabase/client'

export async function uploadImage(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)
  return urlData.publicUrl
}
