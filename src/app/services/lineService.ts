const EDGE_FUNCTION_URL = 'https://rysfrrqqznrfhbsftfjz.supabase.co/functions/v1/line-notify';

export const sendLinePush = async (to: string, messages: any[]) => {
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to: to,
        messages: messages 
      }),
    });

    const result = await response.json();
    
    if (!response.ok) throw new Error(result.error || 'Failed to send');
    
    return { success: true, ...result };
  } catch (error) {
    console.error('LineService Error:', error);
    throw error;
  }
};