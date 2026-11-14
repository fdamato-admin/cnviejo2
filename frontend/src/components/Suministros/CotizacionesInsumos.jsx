import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';

const ESTADOS_COLOR = {
  pendiente:  { bg: '#fff4e0', color: '#a15c00' },
  cotizada:   { bg: '#e8f0fe', color: '#2a78d6' },
  aprobada:   { bg: '#e8f6ec', color: '#1a7a3c' },
  convertida: { bg: '#f0f0f0', color: '#555' },
  cancelada:  { bg: '#fff0f0', color: '#c00' },
};

function Badge({ estado }) {
  const s = ESTADOS_COLOR[estado] || { bg: '#eee', color: '#555' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {estado}
    </span>
  );
}

function fmt(n, dec = 2) {
  if (n === null || n === undefined || n === '') return '—';
  return '$' + parseFloat(n).toFixed(dec);
}

function fmtBs(n) {
  if (!n) return '';
  return ' / Bs. ' + parseFloat(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CotizacionesInsumos() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState(null);       // cotizacion seleccionada
  const [aprobados, setAprobados] = useState({});     // { itemId: bool }
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const res = await API.get('/solicitudes-insumos/', { params });
      setLista(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirDetalle = (cot) => {
    const ini = {};
    (cot.items || []).forEach(it => { ini[it.id] = !!it.aprobado; });
    setAprobados(ini);
    setAviso('');
    setDetalle(cot);
  };

  const toggleItem = (id) => setAprobados(prev => ({ ...prev, [id]: !prev[id] }));

  const aprobarItems = async () => {
    setGuardando(true);
    setAviso('');
    try {
      const idsAprobados = Object.keys(aprobados).filter(id => aprobados[id]).map(Number);
      await API.patch(`/solicitudes-insumos/${detalle.id}/aprobar-items`, { item_ids: idsAprobados });
      setAviso('Items aprobados guardados.');
      await cargar();
      // refrescar detalle con datos nuevos
      const res = await API.get('/solicitudes-insumos/');
      const nuevo = res.data.find(c => c.id === detalle.id);
      if (nuevo) setDetalle(nuevo);
    } catch (e) {
      setAviso('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const convertirCompra = async () => {
    if (!window.confirm('¿Convertir esta cotización en orden de compra? El estado cambiará a "convertida".')) return;
    setGuardando(true);
    setAviso('');
    try {
      await API.patch(`/solicitudes-insumos/${detalle.id}/convertir-compra`);
      setAviso('Convertida a compra exitosamente.');
      setDetalle(null);
      cargar();
    } catch (e) {
      setAviso('Error al convertir.');
    } finally {
      setGuardando(false);
    }
  };

  const hayAprobados = Object.values(aprobados).some(Boolean);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Cotizaciones de Insumos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
            {lista.length} cotización{lista.length !== 1 ? 'es' : ''} recibida{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="cotizada">Cotizada</option>
          <option value="aprobada">Aprobada</option>
          <option value="convertida">Convertida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>No hay cotizaciones recibidas aún</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Los proveedores envían cotizaciones desde el enlace generado en la solicitud</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Fecha', 'Proveedor', 'Teléfono', 'Obra', 'Subtotal USD', 'IVA', 'Total USD', 'Estado', ''].map(h => (
                  <th key={h || 'acc'} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{c.fecha_creacion ? c.fecha_creacion.slice(0, 10) : '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.proveedor_nombre || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{c.proveedor_telefono || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{c.obra || '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a3a5c' }}>{fmt(c.subtotal_usd)}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{c.iva_usd ? fmt(c.iva_usd) : '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1a7a3c' }}>{fmt(c.total_usd)}</td>
                  <td style={{ padding: '10px 14px' }}><Badge estado={c.estado} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => abrirDetalle(c)}
                      style={{ padding: '5px 14px', border: '1px solid #2a78d6', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#2a78d6', fontWeight: 500 }}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 820, marginBottom: 24 }}>

            {/* Cabecera modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Cotización #{detalle.id}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>{detalle.obra || 'Sin obra'} · {detalle.fecha_creacion ? detalle.fecha_creacion.slice(0, 10) : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge estado={detalle.estado} />
                <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Datos del proveedor */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px', background: '#f5f7fa', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 14 }}>
              <div><span style={{ color: '#888' }}>Proveedor: </span><strong>{detalle.proveedor_nombre || '—'}</strong></div>
              <div><span style={{ color: '#888' }}>Teléfono: </span>{detalle.proveedor_telefono || '—'}</div>
              {detalle.validez && <div><span style={{ color: '#888' }}>Validez: </span>{detalle.validez}</div>}
              {detalle.tiempo_entrega && <div><span style={{ color: '#888' }}>Entrega: </span>{detalle.tiempo_entrega}</div>}
              {detalle.condicion_pago && <div><span style={{ color: '#888' }}>Pago: </span>{detalle.condicion_pago}</div>}
              {detalle.banco && <div><span style={{ color: '#888' }}>Banco: </span>{detalle.banco}</div>}
              {detalle.titular && <div><span style={{ color: '#888' }}>Titular: </span>{detalle.titular}</div>}
              {detalle.cuenta && <div><span style={{ color: '#888' }}>Cuenta: </span>{detalle.cuenta} {detalle.tipo_cuenta ? `(${detalle.tipo_cuenta})` : ''}</div>}
              {detalle.rif && <div><span style={{ color: '#888' }}>RIF/CI: </span>{detalle.rif}</div>}
              {detalle.observaciones_prov && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#888' }}>Obs: </span>{detalle.observaciones_prov}</div>}
            </div>

            {/* Tabla de ítems */}
            <p style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>
              Selecciona los ítems que vas a aprobar/comprar:
            </p>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f5f7fa' }}>
                    <th style={thS}>✓</th>
                    <th style={thS}>#</th>
                    <th style={thS}>Descripción</th>
                    <th style={thS}>Cant.</th>
                    <th style={thS}>Unidad</th>
                    <th style={thS}>Alternativa</th>
                    <th style={thS}>Precio/u USD</th>
                    <th style={thS}>Subtotal USD</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalle.items || []).map((it, i) => {
                    const sel = !!aprobados[it.id];
                    return (
                      <tr key={it.id} onClick={() => toggleItem(it.id)}
                        style={{ background: sel ? '#edf7ee' : (i % 2 === 0 ? '#fff' : '#fafbfd'), borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                        <td style={tdS}>
                          <input type="checkbox" checked={sel} onChange={() => toggleItem(it.id)} onClick={e => e.stopPropagation()} style={{ width: 16, height: 16 }} />
                        </td>
                        <td style={tdS}>{i + 1}</td>
                        <td style={{ ...tdS, fontWeight: 500 }}>{it.descripcion || '—'}</td>
                        <td style={tdS}>{it.cantidad || '—'}</td>
                        <td style={tdS}>{it.unidad || '—'}</td>
                        <td style={{ ...tdS, color: '#666' }}>{it.alternativa || '—'}</td>
                        <td style={{ ...tdS, fontWeight: 600 }}>{fmt(it.precio_usd)}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: '#1a7a3c' }}>{fmt(it.subtotal_usd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div style={{ textAlign: 'right', background: '#1a3a5c', color: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Subtotal USD</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(detalle.subtotal_usd)}</div>
              {detalle.iva_usd > 0 && (
                <>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>IVA 16%</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{fmt(detalle.iva_usd)}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>TOTAL CON IVA</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(detalle.total_usd)}</div>
                </>
              )}
            </div>

            {aviso && (
              <p style={{ fontSize: 13, color: aviso.includes('Error') ? '#c00' : '#1a7a3c', marginBottom: 16, textAlign: 'center' }}>{aviso}</p>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => setDetalle(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cerrar
              </button>
              <button onClick={aprobarItems} disabled={guardando || !hayAprobados}
                style={{ padding: '10px 22px', background: hayAprobados ? '#2a78d6' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: hayAprobados ? 'pointer' : 'not-allowed', opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar ítems aprobados'}
              </button>
              {detalle.estado !== 'convertida' && detalle.estado !== 'cancelada' && (
                <button onClick={convertirCompra} disabled={guardando}
                  style={{ padding: '10px 22px', background: '#1a7a3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  Convertir en compra
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thS = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', fontSize: 13 };
const tdS = { padding: '10px 12px', verticalAlign: 'middle' };
