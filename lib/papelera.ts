import { supabase } from '@/lib/supabase';

export interface ItemPapelera {
  id: string;
  tabla: string;
  modulo: string;
  titulo: string;
  subtitulo: string | null;
  datos: Record<string, any>;
  eliminado_en: string;
}

export async function moverAPapelera({
  tabla,
  modulo,
  titulo,
  subtitulo = '',
  registro,
}: {
  tabla: string;
  modulo: string;
  titulo: string;
  subtitulo?: string;
  registro: Record<string, any>;
}) {
  const { error: insertError } = await supabase.from('papelera').insert([
    {
      tabla,
      modulo,
      titulo,
      subtitulo,
      datos: registro,
    },
  ]);

  if (insertError) throw insertError;

  const { error: deleteError } = await supabase
    .from(tabla)
    .delete()
    .eq('id', registro.id);

  if (deleteError) throw deleteError;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mb_papelera_updated'));
  }
}

export async function obtenerCantidadPapelera(): Promise<number> {
  const { count, error } = await supabase
    .from('papelera')
    .select('*', { count: 'exact', head: true });

  if (error) return 0;
  return count || 0;
}