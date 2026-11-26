import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return createClient(url, key);
}

async function obtenerModelosDisponibles(apiKey: string): Promise<string[]> {
  const preferidos = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview',
  ];

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!res.ok) return preferidos;

    const data = await res.json();
    const activos = (Array.isArray(data?.models) ? data.models : [])
      .filter((m: any) =>
        Array.isArray(m?.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m: any) => String(m.name || '').replace(/^models\//, ''))
      .filter((n: string) => n.includes('gemini') && !n.includes('embedding') && !n.includes('tts'));

    const ordenados = [
      ...preferidos.filter((p) => activos.includes(p)),
      ...activos.filter((a: string) => !preferidos.includes(a) && a.includes('flash')),
      ...activos.filter((a: string) => !preferidos.includes(a) && !a.includes('flash')),
    ];

    return ordenados.length > 0 ? ordenados.slice(0, 5) : preferidos;
  } catch {
    return preferidos;
  }
}

function resolverProyecto(proyectosList: any[], nombreOCodigo: string | null | undefined) {
  const q = String(nombreOCodigo || '').trim().toLowerCase();
  if (!q || q === 'general' || q === 'sin proyecto' || q === 'null') return null;

  return (
    proyectosList.find(
      (p) =>
        String(p.codigo || '').trim().toLowerCase() === q ||
        String(p.nombre || '').trim().toLowerCase() === q
    ) ||
    proyectosList.find(
      (p) =>
        String(p.nombre || '').toLowerCase().includes(q) ||
        q.includes(String(p.nombre || '').toLowerCase()) ||
        String(p.codigo || '').toLowerCase().includes(q)
    ) ||
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          respuesta:
            'Falta configurar la variable GEMINI_API_KEY en .env.local (y en Vercel).',
        },
        { status: 200 }
      );
    }

    const body = await req.json();
    const mensajeUsuario = String(body?.mensaje || '').trim();
    const historial = Array.isArray(body?.historial) ? body.historial.slice(-8) : [];
    const usuarioActual = String(body?.usuario || 'Alejandro Fego');

    if (!mensajeUsuario) {
      return NextResponse.json({ respuesta: 'Escribí una consulta o instrucción para Nexa.' });
    }

    const supabase = getSupabaseServer();

    const [
      { data: proyectos },
      { data: tareas },
      { data: visitas },
      { data: movimientos },
      { data: compras },
      { data: proveedores },
      { data: clientes },
      { data: equipo },
    ] = await Promise.all([
      supabase
        .from('proyectos')
        .select('id, codigo, nombre, estado, etapa_actual, superficie, responsable, cliente_id')
        .limit(60),
      supabase.from('tareas').select('*').limit(100),
      supabase.from('visitas').select('*').limit(60),
      supabase
        .from('movimientos')
        .select('id, tipo, proyecto_codigo, proyecto_nombre, categoria, concepto, moneda, importe, importe_usd, fecha, estado')
        .order('fecha', { ascending: false })
        .limit(100),
      supabase
        .from('compras')
        .select('id, proyecto_codigo, proyecto_nombre, proveedor, concepto, nro_orden, moneda, importe, importe_usd, fecha, estado')
        .order('fecha', { ascending: false })
        .limit(80),
      supabase
        .from('proveedores')
        .select('id, codigo, nombre, rubro, cuit, telefono, email')
        .limit(80),
      supabase
        .from('clientes')
        .select('id, nombre, email, telefono')
        .limit(80),
      supabase
        .from('equipo')
        .select('id, nombre, rol, email')
        .limit(30),
    ]);

    const hoyIso = new Date().toISOString().split('T')[0];

    const contextoWorkspace = {
      fecha_hoy: hoyIso,
      usuario_activo: usuarioActual,
      resumen_datos: {
        proyectos: proyectos || [],
        tareas: tareas || [],
        visitas_agenda: visitas || [],
        finanzas_movimientos: movimientos || [],
        compras_pedidos: compras || [],
        proveedores: proveedores || [],
        clientes: clientes || [],
        equipo: equipo || [],
      },
    };

    const systemInstruction = `Sos Nexa, la agente inteligente integrada en el workspace de gestión de "MB Arquitectura SA".
Respondés siempre en español rioplatense profesional, claro, directo y con formato ordenado (listas con viñetas, negritas y montos formateados).
Tenés acceso en tiempo real a todos los módulos del estudio: Proyectos, Tareas, Visitas y Agenda, Finanzas, Compras y Pedidos, Proveedores, Clientes y Equipo.
La fecha de hoy es ${hoyIso}. El usuario que te habla es ${usuarioActual}.

REGLAS DE RESPUESTA Y ACCIONES:
1. Respondé SIEMPRE devolviendo un JSON válido con esta estructura exacta (sin bloques markdown \`\`\`json):
{
  "respuesta": "Texto de respuesta para el usuario en Markdown limpio",
  "accion": null
}
2. Si el usuario te pide EJECUTAR UNA ACCIÓN concreta, incluí SIEMPRE el objeto "accion" correspondiente (nunca digas "Listo" o "Hecho" sin devolver el objeto "accion"):

- Para CREAR una tarea nueva ("creá una tarea...", "recordame...", "agregá una tarea nueva..."):
  "accion": {
    "tipo": "crear_tarea",
    "datos": {
      "titulo": "Título breve",
      "descripcion": "Detalle opcional",
      "fecha_vencimiento": "YYYY-MM-DD",
      "prioridad": "Alta" | "Media" | "Baja",
      "rubro": "Proyecto y Diseño",
      "responsable": "Nombre del responsable (por defecto ${usuarioActual})",
      "proyecto_nombre": "Nombre o código del proyecto si se mencionó, o null"
    }
  }

- Para ACTUALIZAR / MODIFICAR una o varias tareas existentes:
  "accion": {
    "tipo": "actualizar_tareas",
    "items": [
      {
        "id": 123,
        "titulo": "Título de la tarea",
        "proyecto_nombre": "Nombre o código del proyecto (incluir si pidió asignar o cambiar proyecto)",
        "fecha_vencimiento": "YYYY-MM-DD (incluir si pidió cambiar fecha)",
        "estado": "Por Realizar | En Curso | Finalizado (incluir solo si pidió cambiarlo)",
        "prioridad": "Alta | Media | Baja (incluir solo si pidió cambiarla)",
        "responsable": "Nombre (incluir solo si pidió cambiarlo)"
      }
    ]
  }

- Para AGENDAR una visita o reunión ("agendá una visita...", "programá reunión en obra..."):
  "accion": {
    "tipo": "crear_visita",
    "datos": {
      "titulo": "Motivo o título de la visita",
      "fecha": "YYYY-MM-DD",
      "hora": "HH:MM",
      "proyecto_nombre": "Nombre o código del proyecto si se mencionó, o null",
      "responsable": "${usuarioActual}",
      "notas": "Detalle o recordatorio/alarma si se mencionó"
    }
  }

3. Si es una consulta informativa, dejá "accion": null y calculá los números exactos usando los datos del workspace.`;

    const contenidos = [
      ...historial.map((h: any) => ({
        role: h.rol === 'user' ? 'user' : 'model',
        parts: [{ text: String(h.texto || '') }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: `DATOS ACTUALES DEL WORKSPACE:\n${JSON.stringify(
              contextoWorkspace
            )}\n\nCONSULTA DEL USUARIO:\n${mensajeUsuario}`,
          },
        ],
      },
    ];

    const modelos = await obtenerModelosDisponibles(apiKey);
    let textoModelo = '';
    let ultimoError = '';

    for (const modelo of modelos) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: contenidos,
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        textoModelo = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (textoModelo) break;
      } else {
        ultimoError = await res.text();
      }
    }

    if (!textoModelo) {
      return NextResponse.json({
        respuesta: `No pude conectar con Gemini en este momento. Verificá tu GEMINI_API_KEY. (${ultimoError.slice(
          0,
          160
        )})`,
      });
    }

    let parsed: { respuesta?: string; accion?: any } = {};
    try {
      const limpio = textoModelo.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(limpio);
    } catch {
      parsed = { respuesta: textoModelo, accion: null };
    }

    let accionEjecutada = false;
    let errorAccion: string | null = null;
    const sampleTarea = (tareas && tareas[0]) || {};
    const sampleVisita = (visitas && visitas[0]) || {};

    // 1. Crear tarea nueva
    if (parsed.accion?.tipo === 'crear_tarea' && parsed.accion?.datos?.titulo) {
      const d = parsed.accion.datos;
      const proyMatch = resolverProyecto(proyectos || [], d.proyecto_nombre);

      const nuevoRegistro: Record<string, any> = {
        titulo: d.titulo,
        descripcion: d.descripcion || '',
        estado: 'Por Realizar',
        prioridad: d.prioridad || 'Media',
        rubro: d.rubro || 'Proyecto y Diseño',
        responsable: d.responsable || usuarioActual,
        fecha_vencimiento: d.fecha_vencimiento || hoyIso,
        proyecto_nombre: proyMatch ? proyMatch.nombre : d.proyecto_nombre || null,
      };

      if (proyMatch) {
        if ('proyecto_codigo' in sampleTarea) nuevoRegistro.proyecto_codigo = proyMatch.codigo;
        if ('proyecto_id' in sampleTarea) nuevoRegistro.proyecto_id = proyMatch.id;
      }
      if ('fecha_fin' in sampleTarea) nuevoRegistro.fecha_fin = d.fecha_vencimiento || hoyIso;
      if ('fecha_entrega' in sampleTarea) nuevoRegistro.fecha_entrega = d.fecha_vencimiento || hoyIso;

      const { error } = await supabase.from('tareas').insert([nuevoRegistro]);
      if (!error) accionEjecutada = true;
      else errorAccion = error.message;
    }

    // 2. Actualizar una o varias tareas existentes
    if (parsed.accion?.tipo === 'actualizar_tareas' && Array.isArray(parsed.accion?.items)) {
      let actualizadasOk = 0;

      for (const item of parsed.accion.items) {
        const tareaExistente = (tareas || []).find(
          (t: any) =>
            String(t.id) === String(item.id) ||
            String(t.titulo || '').trim().toLowerCase() ===
              String(item.titulo || '').trim().toLowerCase()
        );

        if (!tareaExistente) continue;

        const cambios: Record<string, any> = {};

        if (item.proyecto_nombre !== undefined && item.proyecto_nombre !== null) {
          const proyMatch = resolverProyecto(proyectos || [], item.proyecto_nombre);
          if (proyMatch) {
            if ('proyecto_nombre' in tareaExistente) cambios.proyecto_nombre = proyMatch.nombre;
            if ('proyecto_codigo' in tareaExistente) cambios.proyecto_codigo = proyMatch.codigo;
            if ('proyecto_id' in tareaExistente) cambios.proyecto_id = proyMatch.id;
          } else if ('proyecto_nombre' in tareaExistente) {
            cambios.proyecto_nombre = item.proyecto_nombre;
          }
        }

        if (item.fecha_vencimiento) {
          if ('fecha_vencimiento' in tareaExistente) cambios.fecha_vencimiento = item.fecha_vencimiento;
          if ('fecha_fin' in tareaExistente) cambios.fecha_fin = item.fecha_vencimiento;
          if ('fecha_entrega' in tareaExistente) cambios.fecha_entrega = item.fecha_vencimiento;
        }
        if (item.estado) cambios.estado = item.estado;
        if (item.prioridad) cambios.prioridad = item.prioridad;
        if (item.responsable) cambios.responsable = item.responsable;

        if (Object.keys(cambios).length > 0) {
          const { error } = await supabase
            .from('tareas')
            .update(cambios)
            .eq('id', tareaExistente.id);

          if (!error) actualizadasOk++;
          else errorAccion = error.message;
        }
      }

      if (actualizadasOk > 0) accionEjecutada = true;
    }

    // 3. Agendar visita (adaptado dinámicamente a las columnas reales de la tabla visitas)
    if (parsed.accion?.tipo === 'crear_visita' && parsed.accion?.datos?.titulo) {
      const d = parsed.accion.datos;
      const proyMatch = resolverProyecto(proyectos || [], d.proyecto_nombre);
      const horaLimpia = String(d.hora || '10:00').slice(0, 5);
      const fechaBase = String(d.fecha || hoyIso).split('T')[0];

      // Si fecha en visitas ya guarda timestamp (contiene 'T'), combinar fecha + hora
      const fechaEsTimestamp =
        typeof sampleVisita.fecha === 'string' && sampleVisita.fecha.includes('T');

      const nuevaVisita: Record<string, any> = {
        titulo: d.titulo,
        fecha: fechaEsTimestamp ? `${fechaBase}T${horaLimpia}:00` : fechaBase,
        proyecto_nombre: proyMatch ? proyMatch.nombre : d.proyecto_nombre || null,
        responsable: d.responsable || usuarioActual,
        estado: 'Programada',
      };

      if ('motivo' in sampleVisita) nuevaVisita.motivo = d.titulo;
      if ('hora' in sampleVisita) nuevaVisita.hora = horaLimpia;
      if ('hora_inicio' in sampleVisita) nuevaVisita.hora_inicio = horaLimpia;
      if ('proyecto_codigo' in sampleVisita && proyMatch) {
        nuevaVisita.proyecto_codigo = proyMatch.codigo;
      }
      if ('notas' in sampleVisita) {
        nuevaVisita.notas = d.notas ? `${horaLimpia} hs · ${d.notas}` : `${horaLimpia} hs`;
      }
      if ('descripcion' in sampleVisita) {
        nuevaVisita.descripcion = d.notas ? `${horaLimpia} hs · ${d.notas}` : `${horaLimpia} hs`;
      }

      const { error } = await supabase.from('visitas').insert([nuevaVisita]);
      if (!error) accionEjecutada = true;
      else errorAccion = error.message;
    }

    let respuestaFinal = parsed.respuesta || 'Listo.';
    if (errorAccion && !accionEjecutada) {
      respuestaFinal += `\n\n⚠️ No se pudo guardar en la base de datos: ${errorAccion}`;
    }

    return NextResponse.json({
      respuesta: respuestaFinal,
      accionEjecutada,
    });
  } catch (err: any) {
    return NextResponse.json({
      respuesta: 'Ocurrió un error al procesar tu consulta: ' + (err?.message || 'Error interno'),
    });
  }
}