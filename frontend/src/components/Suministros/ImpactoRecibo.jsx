import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';

const usd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mesActual = () => new Date().toLocaleDateString('en-CA').slice(0, 7);
const GRUPOS = ['Contratista', 'Administración', 'Servicios públicos', 'Materiales', 'Urbanización y aseo', 'Otros'];
const TIPOS = ['Fijo garantizado', 'Fijo variable'];
const ESTADOS = ['Realizado', 'Por realizar'];
const TIPOS_EXTRA = ['Gasto', 'Trabajo'];

const inp = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const btn = { padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#444' };
const btnAzul = { padding: '8px 16px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', fontSize: 13 };
const td = { padding: '9px 14px', borderBottom: '1px solid #eee', fontSize: 14 };
const caja = { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 20, marginBottom: 20 };

function Fila({ etiqueta, valor, signo, fuerte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: fuerte ? 16 : 14, fontWeight: fuerte ? 700 : 400, borderTop: fuerte ? '1px solid #ddd' : 'none', marginTop: fuerte ? 6 : 0 }}>
      <span style={{ color: fuerte ? '#222' : '#555' }}>{signo ? `${signo} ` : ''}{etiqueta}</span>
      <span>{usd(valor)}</span>
    </div>
  );
}

export default function ImpactoRecibo() {
  const [mes, setMes] = useState(mesActual());
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [incluirCompras, setIncluirCompras] = useState(true);
  const [incluirOtros, setIncluirOtros] = useState(true);
  const [incluirTrabajos, setIncluirTrabajos] = useState(true);
  const [incluirPorRealizar, setIncluirPorRealizar] = useState(true);
  const [villasEdit, setVillasEdit] = useState('84');
  const [fondoEdit, setFondoEdit] = useState('10');
  const [formFijo, setFormFijo] = useState(null);
  const [formExtra, setFormExtra] = useState({ concepto: '', monto: '', estado: 'Realizado', tipo: 'Gasto', nota: '' });
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const r = await API.get('/recibo/impacto', { params: { mes } });
      setData(r.data);
      setVillasEdit(String(r.data.villas));
      setFondoEdit(String(r.data.fondo_pct));
    } catch (e) {
      setError('No se pudo cargar el cálculo. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn, okMsg) => {
    setError(''); setAviso('');
    try {
      await fn();
      if (okMsg) setAviso(okMsg);
      await cargar();
    } catch (e) {
      const det = e.response && e.response.data && e.response.data.detail;
      setError(det ? String(det) : 'No se pudo guardar. Intenta de nuevo.');
    }
  };

  if (!data) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        {cargando ? <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p> : <p style={{ color: '#c00' }}>{error}</p>}
      </div>
    );
  }

  const villas = data.villas || 84;
  const factor = 1 + (data.fondo_pct || 0) / 100;
  const porVilla = (monto) => (Number(monto || 0) * factor) / villas;

  const totalFijos = data.fijos.filter(f => f.activo).reduce((a, f) => a + f.monto_usd, 0);
  const baseVilla = porVilla(totalFijos);
  const sumaExtras = (filtro) => data.extras.filter(filtro).reduce((a, e) => a + e.monto_usd, 0);
  const esTrabajo = (e) => e.tipo === 'Trabajo';
  const comprasVilla = incluirCompras ? porVilla(data.total_compras) : 0;
  const otrosVilla = incluirOtros ? porVilla(sumaExtras(e => !esTrabajo(e) && e.estado === 'Realizado')) : 0;
  const trabajosVilla = incluirTrabajos ? porVilla(sumaExtras(e => esTrabajo(e) && e.estado === 'Realizado')) : 0;
  const conRealizado = baseVilla + comprasVilla + otrosVilla + trabajosVilla;
  const porRealizarVilla = incluirPorRealizar
    ? porVilla(sumaExtras(e => e.estado === 'Por realizar' && (esTrabajo(e) ? incluirTrabajos : incluirOtros)))
    : 0;
  const mesTexto = new Date(`${mes}-02`).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
  const proyectado = conRealizado + porRealizarVilla;
  const sube = proyectado - baseVilla;
  const pctSube = baseVilla ? (sube / baseVilla) * 100 : 0;

  const guardarConfig = () => accion(
    () => API.put('/recibo/config', { villas: parseInt(villasEdit, 10), fondo_pct: parseFloat(fondoEdit) }),
    'Parámetros guardados.'
  );

  const guardarFijo = () => {
    const f = formFijo;
    if (!f.concepto.trim()) { setError('Escribe el concepto'); return; }
    const body = { concepto: f.concepto.trim(), grupo: f.grupo || null, tipo: f.tipo, monto_usd: parseFloat(f.monto_usd) || 0, activo: f.activo };
    accion(async () => {
      if (f.id) await API.put(`/recibo/fijos/${f.id}`, body);
      else await API.post('/recibo/fijos', body);
      setFormFijo(null);
    });
  };

  const alternarFijo = (f) => accion(() => API.put(`/recibo/fijos/${f.id}`, {
    concepto: f.concepto, grupo: f.grupo, tipo: f.tipo, monto_usd: f.monto_usd, activo: !f.activo,
  }));

  const borrarFijo = (f) => {
    if (window.confirm(`¿Eliminar "${f.concepto}"?`)) accion(() => API.delete(`/recibo/fijos/${f.id}`));
  };

  const agregarExtra = () => {
    const monto = parseFloat(formExtra.monto);
    if (!formExtra.concepto.trim()) { setError('Escribe el concepto del gasto'); return; }
    if (!monto || monto <= 0) { setError('El monto debe ser mayor a cero'); return; }
    accion(async () => {
      await API.post('/recibo/extras', {
        mes, concepto: formExtra.concepto.trim().toUpperCase(), monto_usd: monto,
        estado: formExtra.estado, tipo: formExtra.tipo, nota: formExtra.nota ? formExtra.nota.toUpperCase() : null,
      });
      setFormExtra({ concepto: '', monto: '', estado: formExtra.estado, tipo: formExtra.tipo, nota: '' });
    });
  };

  const borrarExtra = (e) => {
    if (window.confirm(`¿Eliminar "${e.concepto}"?`)) accion(() => API.delete(`/recibo/extras/${e.id}`));
  };

  const check = (valor, setValor, texto, deshabilitado, nota) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: deshabilitado ? '#aaa' : '#333', cursor: deshabilitado ? 'default' : 'pointer' }}>
      <input type="checkbox" checked={valor} disabled={deshabilitado} onChange={e => setValor(e.target.checked)} />
      {texto}{nota && <span style={{ fontSize: 12, color: '#aaa' }}> ({nota})</span>}
    </label>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Impacto Gastos en el Recibo</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
            Todo en dólares, por villa ({villas} villas, promedio sin alícuota exacta). Las compras en Bs se convierten con su tasa.
          </p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#777', marginBottom: 2 }}>Mes</label>
          <input type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} style={inp} />
        </div>
      </div>

      {error && <p style={{ background: '#fdecec', color: '#c00', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>{error}</p>}
      {aviso && <p style={{ background: '#e8f6ec', color: '#1a7a3c', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>{aviso}</p>}

      {/* BARRA FIJA CON EL RESULTADO */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#1b4f8f', color: '#fff', borderRadius: 10, padding: '10px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
        <span style={{ fontSize: 14 }}>El recibo de {mesTexto} llegaría a</span>
        <span>
          <strong style={{ fontSize: 24 }}>{usd(proyectado)}</strong>{' '}
          <span style={{ fontSize: 13, opacity: 0.85 }}>por villa{sube > 0 ? ` · sube ${usd(sube)}` : ''}</span>
        </span>
      </div>

      {/* RESULTADO */}
      <div style={{ ...caja, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0, background: '#eef5ff', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, color: '#2a78d6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>El recibo llegaría a</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: '#1b4f8f', lineHeight: 1.1, margin: '6px 0' }}>{usd(proyectado)}</div>
          <div style={{ fontSize: 14, color: '#335' }}>por villa al mes</div>
          <div style={{ marginTop: 12, fontSize: 14, color: sube > 0 ? '#a15c00' : '#1a7a3c', fontWeight: 600 }}>
            {sube > 0 ? `Sube ${usd(sube)} (+${pctSube.toFixed(1)}%) sobre el recibo base` : 'Sin aumento sobre el recibo base'}
          </div>
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Fila etiqueta={`Recibo base (gastos fijos + ${data.fondo_pct}% fondo de reserva)`} valor={baseVilla} />
          <Fila etiqueta="Compras y suministros del mes" valor={comprasVilla} signo="+" />
          <Fila etiqueta="Otros gastos realizados" valor={otrosVilla} signo="+" />
          <Fila etiqueta="Trabajos realizados" valor={trabajosVilla} signo="+" />
          <Fila etiqueta="Recibo con lo ya realizado" valor={conRealizado} fuerte />
          <Fila etiqueta="Por realizar (gastos y trabajos)" valor={porRealizarVilla} signo="+" />
          <Fila etiqueta="Recibo proyectado" valor={proyectado} fuerte />
        </div>
      </div>

      {/* QUÉ ENTRA */}
      <div style={caja}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Qué entra en el cálculo</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {check(true, () => {}, 'Gastos fijos mensuales', true, 'siempre')}
          {check(incluirCompras, setIncluirCompras, 'Compras y Suministros')}
          {check(incluirOtros, setIncluirOtros, 'Otros gastos')}
          {check(incluirTrabajos, setIncluirTrabajos, 'Trabajos')}
          {check(incluirPorRealizar, setIncluirPorRealizar, 'Los que están por realizar')}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#777', marginBottom: 2 }}>Villas</label>
            <input type="number" min="1" value={villasEdit} onChange={e => setVillasEdit(e.target.value)} style={{ ...inp, width: 90 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#777', marginBottom: 2 }}>Fondo de reserva (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={fondoEdit} onChange={e => setFondoEdit(e.target.value)} style={{ ...inp, width: 120 }} />
          </div>
          <button style={btn} onClick={guardarConfig}>Guardar parámetros</button>
        </div>
      </div>

      {/* GASTOS FIJOS */}
      <div style={caja}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 600 }}>Gastos fijos mensuales (base del recibo)</div>
          <button style={btn} onClick={() => setFormFijo({ concepto: '', grupo: 'Otros', tipo: 'Fijo garantizado', monto_usd: '', activo: true })}>+ Agregar concepto</button>
        </div>
        <div style={{ fontSize: 13, color: '#777', marginBottom: 10 }}>
          Valores iniciales tomados de los recibos de DEMCA (enero a septiembre 2026). Edítalos cuando llegue un recibo nuevo. Total activo: {usd(totalFijos)}
        </div>

        {formFijo && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: 12, background: '#f7f9fc', borderRadius: 8 }}>
            <input placeholder="Concepto" value={formFijo.concepto} onChange={e => setFormFijo(f => ({ ...f, concepto: e.target.value }))} style={{ ...inp, flex: '2 1 200px', minWidth: 0 }} />
            <select value={formFijo.grupo || ''} onChange={e => setFormFijo(f => ({ ...f, grupo: e.target.value }))} style={inp}>
              {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={formFijo.tipo} onChange={e => setFormFijo(f => ({ ...f, tipo: e.target.value }))} style={inp}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" min="0" step="0.01" placeholder="Monto USD" value={formFijo.monto_usd} onChange={e => setFormFijo(f => ({ ...f, monto_usd: e.target.value }))} style={{ ...inp, width: 130 }} />
            <button style={btnAzul} onClick={guardarFijo}>Guardar</button>
            <button style={btn} onClick={() => setFormFijo(null)}>Cancelar</button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Incluir', 'Concepto', 'Grupo', 'Tipo', 'Monto (USD)', 'Por villa', ''].map(h => <th key={h || 'acc'} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.fijos.map(f => (
                <tr key={f.id} style={{ opacity: f.activo ? 1 : 0.5 }}>
                  <td style={td}><input type="checkbox" checked={f.activo} onChange={() => alternarFijo(f)} /></td>
                  <td style={{ ...td, fontWeight: 500 }}>{f.concepto}</td>
                  <td style={{ ...td, color: '#666' }}>{f.grupo || '—'}</td>
                  <td style={{ ...td, color: '#666' }}>{f.tipo}</td>
                  <td style={td}>{usd(f.monto_usd)}</td>
                  <td style={td}>{usd(porVilla(f.monto_usd))}</td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={{ ...btn, marginRight: 8 }} onClick={() => setFormFijo({ ...f })}>Editar</button>
                    <button style={{ ...btn, border: '1px solid #fcc', background: '#fff8f8', color: '#c00' }} onClick={() => borrarFijo(f)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPRAS DEL MES */}
      <div style={caja}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Compras y suministros del mes</div>
        <div style={{ fontSize: 13, color: '#777', marginBottom: 10 }}>Vienen solas del módulo de Compras. Total: {usd(data.total_compras)}</div>
        {data.compras.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 14 }}>No hay compras registradas en este mes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Fecha', 'Suministro', 'Proveedor', 'Monto (USD)', 'Sube por villa'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.compras.map((c, i) => (
                  <tr key={i}>
                    <td style={td}>{c.fecha ? c.fecha.split('-').reverse().join('/') : '—'}</td>
                    <td style={{ ...td, fontWeight: 500 }}>{c.nombre}</td>
                    <td style={{ ...td, color: '#666' }}>{c.proveedor || '—'}</td>
                    <td style={td}>{c.convertido ? usd(c.monto_usd) : <span style={{ color: '#a15c00' }}>Sin convertir</span>}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{c.convertido ? `+${usd(porVilla(c.monto_usd))}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.compras_sin_convertir > 0 && (
          <p style={{ fontSize: 12, color: '#a15c00', marginTop: 8 }}>
            {data.compras_sin_convertir} compra(s) no se pudieron pasar a dólares (pagadas en euros o sin tasa) y no suman al cálculo.
          </p>
        )}
      </div>

      {/* OTROS GASTOS */}
      <div style={caja}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Otros gastos y trabajos del mes (realizados o por realizar)</div>
        <div style={{ fontSize: 13, color: '#777', marginBottom: 10 }}>
          Agrega aquí cualquier gasto, estimado o trabajo que vas a hacer (por ejemplo, una reparación) y mira arriba cuánto sube el recibo.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input placeholder="Concepto" value={formExtra.concepto} onChange={e => setFormExtra(f => ({ ...f, concepto: e.target.value.toUpperCase() }))} style={{ ...inp, flex: '2 1 200px', minWidth: 0 }} />
          <input type="number" min="0" step="0.01" placeholder="Monto USD" value={formExtra.monto} onChange={e => setFormExtra(f => ({ ...f, monto: e.target.value }))} style={{ ...inp, width: 130 }} />
          <select value={formExtra.tipo} onChange={e => setFormExtra(f => ({ ...f, tipo: e.target.value }))} style={inp}>
            {TIPOS_EXTRA.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={formExtra.estado} onChange={e => setFormExtra(f => ({ ...f, estado: e.target.value }))} style={inp}>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Nota (opcional)" value={formExtra.nota} onChange={e => setFormExtra(f => ({ ...f, nota: e.target.value.toUpperCase() }))} style={{ ...inp, flex: '2 1 160px', minWidth: 0 }} />
          <button style={btnAzul} onClick={agregarExtra}>Agregar</button>
        </div>
        {data.extras.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 14 }}>No hay otros gastos en este mes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Concepto', 'Tipo', 'Estado', 'Monto (USD)', 'Sube por villa', 'Nota', ''].map(h => <th key={h || 'acc'} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.extras.map(e => (
                  <tr key={e.id}>
                    <td style={{ ...td, fontWeight: 500 }}>{e.concepto}</td>
                    <td style={{ ...td, color: '#666' }}>{e.tipo || 'Gasto'}</td>
                    <td style={td}>
                      <span style={{ background: e.estado === 'Realizado' ? '#e8f6ec' : '#fff4e0', color: e.estado === 'Realizado' ? '#1a7a3c' : '#a15c00', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{e.estado}</span>
                    </td>
                    <td style={td}>{usd(e.monto_usd)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>+{usd(porVilla(e.monto_usd))}</td>
                    <td style={{ ...td, color: '#666' }}>{e.nota || '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button style={{ ...btn, border: '1px solid #fcc', background: '#fff8f8', color: '#c00' }} onClick={() => borrarExtra(e)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
