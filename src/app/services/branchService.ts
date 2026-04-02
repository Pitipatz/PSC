import { supabase } from '../utils/auth';

export const getBranchLineGroupId = async (branchName: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('branches')
    .select('line_group_id')
    .eq('name_th', branchName) // เปลี่ยนเป็นชื่อ column ที่คุณใช้จริง
    .single();

  if (error || !data) {
    console.error('Error fetching branch group ID:', error);
    return null;
  }

  return data.line_group_id;
};