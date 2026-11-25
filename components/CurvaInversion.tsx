"use client";

import { useMemo, useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface CurvaInversionProps {
  movimientos: any[];
  moneda?: 'USD' | 'ARS';
  presupuestoTotal?: number;
  vistaRestringida?: boolean;
  titulo?: string;
  subtitulo?: string;
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function CurvaInversion({
  movimientos = [],
  moneda = 'USD',
  presupuestoTotal = 0,
  vistaRestringida = false,
  titulo = 'Curva de Inversión y Flujo de Caja',
  subtitulo = 'Evolución acumulada (Curva S) de ingresos cobrados, pendientes y egresos por período',
}: CurvaInversionProps) {
  const [modo, setModo] = useState<'acumulado' | 'mensual'>('acumulado');
  const [indiceHover, setIndiceHover] = useState<number | null>(null);

  const series = useMemo(() => {
    const mapa = new Map<
      string,
      {
        clave: string;
        etiqueta: string;
        ingresosCobrados: number;
        ingresosPendientes: number;
        egresos: number;
      }
    >();

    for (const m of movimientos) {
      if (!m?.fecha) continue;
      const fechaIso = String(m.fecha).split('T')[0];
      const [anio, mes] = fechaIso.split('-');
      if (!anio || !mes) continue;

      const clave = `${anio}-${mes}`;
      const mesIdx = Math.max(0, Math.min(11, Number(mes) - 1));
      const etiqueta = `${MESES_CORTOS[mesIdx]} ${anio.slice(2)}`;

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          etiqueta,
          ingresosCobrados: 0,
          ingresosPendientes: 0,
          egresos: 0,
        });
      }

      const item = mapa.get(clave)!;
      const imp = Number(m.importe ?? 0);
      const mon = Number(m.monto ?? 0);
      const valor = imp !== 0 ? imp : mon;

      const tipoStr = String(m.tipo || '').toLowerCase();
      const esEgreso = tipoStr === 'egreso' || tipoStr === 'gasto' || tipoStr === 'compra';

      if (esEgreso) {
        item.egresos += valor;
      } else {
        const est = String(m.estado || '').toLowerCase();
        const abonado =
          est === 'abonado' ||
          est === 'cobrado' ||
          est === 'pagado' ||
          est === 'finalizado' ||
          est === 'cobrado / pagado';
        if (abonado) {
          item.ingresosCobrados += valor;
        } else {
          item.ingresosPendientes += valor;
        }
      }
    }

    const ordenado = Array.from(mapa.values()).sort((a, b) => a.clave.localeCompare(b.clave));

    let acumCobrado = 0;
    let acumTotalIngresos = 0;
    let acumEgresos = 0;

    return ordenado.map((p) => {
      acumCobrado += p.ingresosCobrados;
      acumTotalIngresos += p.ingresosCobrados + p.ingresosPendientes;
      acumEgresos += p.egresos;

      return {
        ...p,
        ingresosMes: p.ingresosCobrados + p.ingresosPendientes,
        acumCobrado,
        acumTotalIngresos,
        acumEgresos,
        saldoAcumulado: acumCobrado - acumEgresos,
      };
    });
  }, [movimientos]);

  const formatearMonto = (num: number) => {
    if (vistaRestringida) return '••••••';
    return `${moneda} $${num.toLocaleString('es-AR', {
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatearEje = (num: number) => {
    if (vistaRestringida) return '•••';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${Math.round(num / 1_000)}k`;
    return `${Math.round(num)}`;
  };

  if (series.length === 0) {
    return (
      <div className="bg-[#242424] border border-white/10 rounded-2xl p-5 mb-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{titulo}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>
          </div>
          <span className="text-xs text-gray-400">
            Registrá movimientos con fecha en {moneda} para visualizar la curva
          </span>
        </div>
      </div>
    );
  }

  const width = 920;
  const height = 270;
  const padLeft = 58;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const valoresIngresos = series.map((s) =>
    modo === 'acumulado' ? s.acumTotalIngresos : s.ingresosMes
  );
  const valoresCobrados = series.map((s) =>
    modo === 'acumulado' ? s.acumCobrado : s.ingresosCobrados
  );
  const valoresEgresos = series.map((s) =>
    modo === 'acumulado' ? s.acumEgresos : s.egresos
  );

  const maximoBruto = Math.max(
    100,
    ...valoresIngresos,
    ...valoresCobrados,
    ...valoresEgresos,
    modo === 'acumulado' ? presupuestoTotal : 0
  );
  const maxY = maximoBruto * 1.12;

  const getX = (idx: number) => {
    if (series.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (series.length - 1)) * plotW;
  };

  const getY = (val: number) => padTop + plotH - (val / maxY) * plotH;

  const construirPath = (valores: number[]) => {
    if (valores.length === 0) return '';
    return valores
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`)
      .join(' ');
  };

  const construirArea = (valores: number[]) => {
    if (valores.length === 0) return '';
    const linea = construirPath(valores);
    const ultimoX = getX(valores.length - 1).toFixed(1);
    const primerX = getX(0).toFixed(1);
    const baseY = (padTop + plotH).toFixed(1);
    return `${linea} L ${ultimoX} ${baseY} L ${primerX} ${baseY} Z`;
  };

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((t) => maxY * t);
  const puntoActivo =
    indiceHover !== null && series[indiceHover] ? series[indiceHover] : series[series.length - 1];
  const idxActivo = indiceHover !== null ? indiceHover : series.length - 1;

  return (
    <div className="bg-[#242424] border border-white/10 rounded-2xl p-5 mb-5 shadow-xl">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#EAB308]" />
            <h3 className="text-sm font-bold text-white">{titulo}</h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>
        </div>

        <div className="flex items-center gap-2 bg-[#181818] border border-white/10 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setModo('acumulado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              modo === 'acumulado'
                ? 'bg-[#EAB308] text-black shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Curva S (Acumulada)
          </button>
          <button
            type="button"
            onClick={() => setModo('mensual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              modo === 'mensual'
                ? 'bg-[#EAB308] text-black shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Flujo Mensual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181818] border border-white/10 rounded-xl p-3 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
            Período ({puntoActivo.etiqueta})
          </span>
          <span className="text-xs font-extrabold text-white mt-0.5 block">
            {modo === 'acumulado' ? 'Acumulado al cierre' : 'Movimiento del mes'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            {modo === 'acumulado' ? 'Cobrado Acumulado' : 'Cobrado Mes'}
          </span>
          <span className="text-xs font-extrabold text-white mt-0.5 block">
            {formatearMonto(
              modo === 'acumulado' ? puntoActivo.acumCobrado : puntoActivo.ingresosCobrados
            )}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#EAB308] block">
            {modo === 'acumulado' ? 'Facturado + Cobrado' : 'Ingresos Totales Mes'}
          </span>
          <span className="text-xs font-extrabold text-white mt-0.5 block">
            {formatearMonto(
              modo === 'acumulado' ? puntoActivo.acumTotalIngresos : puntoActivo.ingresosMes
            )}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
            {modo === 'acumulado' ? 'Gastos Acumulados' : 'Gastos Mes'}
          </span>
          <span className="text-xs font-extrabold text-white mt-0.5 block">
            {formatearMonto(modo === 'acumulado' ? puntoActivo.acumEgresos : puntoActivo.egresos)}
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[560px] select-none"
          onMouseLeave={() => setIndiceHover(null)}
        >
          <defs>
            <linearGradient id="gradCobrado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradEgreso" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {ticksY.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#9CA3AF"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  {formatearEje(val)}
                </text>
              </g>
            );
          })}

          {modo === 'acumulado' && presupuestoTotal > 0 && (
            <g>
              <line
                x1={padLeft}
                y1={getY(presupuestoTotal)}
                x2={width - padRight}
                y2={getY(presupuestoTotal)}
                stroke="#60A5FA"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={width - padRight}
                y={getY(presupuestoTotal) - 6}
                textAnchor="end"
                fill="#60A5FA"
                fontSize="10"
                fontWeight="bold"
              >
                Presupuesto Pactado ({formatearEje(presupuestoTotal)})
              </text>
            </g>
          )}

          {series.length > 1 && (
            <>
              <path d={construirArea(valoresCobrados)} fill="url(#gradCobrado)" />
              <path d={construirArea(valoresEgresos)} fill="url(#gradEgreso)" />
            </>
          )}

          {series.length > 1 && (
            <path
              d={construirPath(valoresIngresos)}
              fill="none"
              stroke="#EAB308"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}

          {series.length > 1 && (
            <path
              d={construirPath(valoresCobrados)}
              fill="none"
              stroke="#34D399"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {series.length > 1 && (
            <path
              d={construirPath(valoresEgresos)}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          <line
            x1={getX(idxActivo)}
            y1={padTop}
            x2={getX(idxActivo)}
            y2={padTop + plotH}
            stroke="rgba(234,179,8,0.45)"
            strokeWidth="1.5"
          />

          {series.map((s, i) => {
            const x = getX(i);
            const yIng = getY(valoresIngresos[i]);
            const yCob = getY(valoresCobrados[i]);
            const yEgr = getY(valoresEgresos[i]);
            const esActivo = i === idxActivo;

            return (
              <g key={s.clave}>
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  fill={esActivo ? '#EAB308' : '#9CA3AF'}
                  fontSize="11"
                  fontWeight={esActivo ? 'bold' : 'normal'}
                >
                  {s.etiqueta}
                </text>

                <circle
                  cx={x}
                  cy={yIng}
                  r={esActivo ? 5 : 3.5}
                  fill="#EAB308"
                  stroke="#181818"
                  strokeWidth="1.5"
                />

                <circle
                  cx={x}
                  cy={yCob}
                  r={esActivo ? 5.5 : 4}
                  fill="#34D399"
                  stroke="#181818"
                  strokeWidth="1.5"
                />

                <circle
                  cx={x}
                  cy={yEgr}
                  r={esActivo ? 5 : 3.5}
                  fill="#F43F5E"
                  stroke="#181818"
                  strokeWidth="1.5"
                />

                <rect
                  x={x - plotW / Math.max(series.length, 2) / 2}
                  y={padTop}
                  width={plotW / Math.max(series.length, 2)}
                  height={plotH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setIndiceHover(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-6 mt-2 pt-3 border-t border-white/10 text-xs">
        <span className="inline-flex items-center gap-2 text-gray-300">
          <span className="w-3 h-1 rounded-full bg-emerald-400" />
          Cobrado ({moneda})
        </span>
        <span className="inline-flex items-center gap-2 text-gray-300">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-[#EAB308]" />
          Facturado + Cobrado ({moneda})
        </span>
        <span className="inline-flex items-center gap-2 text-gray-300">
          <span className="w-3 h-1 rounded-full bg-rose-500" />
          Gastos / Egresos ({moneda})
        </span>
      </div>
    </div>
  );
}