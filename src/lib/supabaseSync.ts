import { getSupabase, isSupabaseConfigured } from './supabase';

const TABLE_NAME = 'room_data';

export async function supabaseGet<T>(roomId: string, collection: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('data')
      .eq('room_id', roomId)
      .eq('collection', collection)
      .maybeSingle();
    if (error) {
      console.error('supabaseGet error:', error);
      return null;
    }
    return data ? (data.data as T) : null;
  } catch (e) {
    console.error('supabaseGet error:', e);
    return null;
  }
}

export async function supabaseSet<T>(roomId: string, collection: string, data: T): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabase();
    const { error: selectError, data: existing } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('room_id', roomId)
      .eq('collection', collection)
      .maybeSingle();

    if (selectError) {
      console.error('supabaseSet select error:', selectError);
      return;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) console.error('supabaseSet update error:', updateError);
    } else {
      const { error: insertError } = await supabase
        .from(TABLE_NAME)
        .insert({ room_id: roomId, collection, data });
      if (insertError) console.error('supabaseSet insert error:', insertError);
    }
  } catch (e) {
    console.error('supabaseSet error:', e);
  }
}

export function supabaseOn(roomId: string, collection: string, callback: (data: any) => void): () => void {
  if (!isSupabaseConfigured()) return () => {};

  const supabase = getSupabase();
  const channel = supabase
    .channel(`room_data:${roomId}:${collection}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        if (payload.new && (payload.new as any).collection === collection) {
          callback((payload.new as any).data);
        } else if (payload.eventType === 'DELETE') {
          callback(null);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
