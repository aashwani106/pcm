const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;



export async function markAttendance(accessToken: string) {

    const res = await fetch(`${BACKEND_URL}/attendance/mark`, {
        
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    const data = await res.json();
  
    if (!res.ok) {
      throw new Error(data.error || 'Failed to mark attendance');
    }
  
    return data;
  }