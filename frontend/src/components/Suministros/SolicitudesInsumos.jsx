import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';

const BACKEND = 'https://cnviejo2-production-46d5.up.railway.app';
const thS = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', fontSize: 13 };
const tdS = { padding: '10px 14px', verticalAlign: 'middle' };
const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const UNIDADES = ['und','m2','m3','ml','kg','lt','1/2 lt','1/4 lt','galon','1/2 galon','1/4 galon','cunete','garrafa','tambor','bidon','saco','bolsa','rollo','caja','paquete','par','global'];

export default function SolicitudesInsumos() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);   // copia editable del pedido
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await API.get('/pedidos-cotizacion/');
      setLista(res.data);
    } catch { } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const mostrarAviso = (msg) => { setAviso(msg); setTimeout(() => setAviso(''), 3500); };

  const copiarEnlace = async (p) => {
    const paramsItems = p.items.map(it =>
      `i=${encodeURIComponent((it.descripcion || '') + '|' + (it.cantidad || '') + '|' + (it.unidad || ''))}`
    ).join('&');
    const url = `${BACKEND}/solicitud?modo=proveedor&obra=${encodeURIComponent(p.obra)}&ref=${encodeURIComponent(p.nro_solicitud)}&${paramsItems}`;
    try { await navigator.clipboard.writeText(url); mostrarAviso('Enlace copiado.'); }
    catch { mostrarAviso('No se pudo copiar: ' + url); }
  };

  const eliminar = async (id, nro) => {
    if (!window.confirm(`Eliminar solicitud #${nro}? Esta acción no se puede deshacer.`)) return;
    try {
      await API.delete(`/pedidos-cotizacion/${id}`);
      setDetalle(null);
      cargar();
    } catch { alert('Error al eliminar.'); }
  };

  const abrirEdicion = (p) => {
    setEditando({
      id: p.id,
      nro_solicitud: p.nro_solicitud,
      obra: p.obra,
      fecha_requerida: p.fecha_requerida || '',
      observaciones: p.observaciones || '',
      items: p.items.map(it => ({ ...it })),
    });
    setDetalle(null);
  };

  const agregarItem = () => setEditando(prev => ({
    ...prev, items: [...prev.items, { descripcion: '', cantidad: '', unidad: 'und' }]
  }));

  const quitarItem = (idx) => setEditando(prev => ({
    ...prev, items: prev.items.filter((_, i) => i !== idx)
  }));

  const cambiarItem = (idx, campo, valor) => setEditando(prev => {
    const items = prev.items.map((it, i) => i === idx ? { ...it, [campo]: valor } : it);
    return { ...prev, items };
  });

  const guardarEdicion = async () => {
    if (!editando.obra.trim()) { alert('Indique la obra.'); return; }
    if (editando.items.filter(it => it.descripcion.trim()).length === 0) { alert('Agregue al menos un ítem.'); return; }
    setGuardando(true);
    try {
      await API.put(`/pedidos-cotizacion/${editando.id}`, {
        nro_solicitud: editando.nro_solicitud,
        obra: editando.obra,
        fecha_requerida: editando.fecha_requerida || null,
        observaciones: editando.observaciones || null,
        items: editando.items.filter(it => it.descripcion.trim()).map(it => ({
          descripcion: it.descripcion, cantidad: it.cantidad, unidad: it.unidad
        })),
      });
      mostrarAviso('Solicitud actualizada.');
      setEditando(null);
      cargar();
    } catch { alert('Error al guardar.'); }
    finally { setGuardando(false); }
  };

  if (cargando) return <p style={{ padding: 40, textAlign: 'center', color: '#888' }}>Cargando...</p>;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Solicitudes de Materiales</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>{lista.length} solicitud{lista.length !== 1 ? 'es' : ''}</p>
        </div>
        {aviso && <span style={{ background: '#e8f6ec', color: '#1a7a3c', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{aviso}</span>}
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>No hay solicitudes registradas aún</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Al generar un enlace desde "Solicitud de Materiales", la solicitud queda guardada aquí</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Nro. Sol.', 'Fecha', 'Obra / Trabajo', 'Ítems', ''].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={tdS}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1a3a5c', background: '#e8f0fe', padding: '3px 10px', borderRadius: 6 }}>
                      #{p.nro_solicitud}
                    </span>
                  </td>
                  <td style={{ ...tdS, color: '#666', whiteSpace: 'nowrap' }}>
                    {p.creado_en ? p.creado_en.slice(0, 10) : '—'}
                  </td>
                  <td style={{ ...tdS, fontWeight: 500 }}>{p.obra}</td>
                  <td style={{ ...tdS, color: '#666' }}>{p.items.length} ítem{p.items.length !== 1 ? 's' : ''}</td>
                  <td style={{ ...tdS, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDetalle(p)}
                        style={{ padding: '5px 12px', border: '1px solid #2a78d6', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#2a78d6', fontWeight: 500 }}>
                        Ver
                      </button>
                      <button onClick={() => abrirEdicion(p)}
                        style={{ padding: '5px 12px', border: '1px solid #1a7a3c', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#1a7a3c', fontWeight: 500 }}>
                        Editar
                      </button>
                      <button onClick={() => copiarEnlace(p)}
                        title="Copiar enlace para proveedores"
                        style={{ padding: '5px 10px', border: '1px solid #ff8c00', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#ff8c00' }}>
                        🔗
                      </button>
                      <button onClick={() => eliminar(p.id, p.nro_solicitud)}
                        style={{ padding: '5px 10px', border: '1px solid #c00', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#c00' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL VER */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 700, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Solicitud #{detalle.nro_solicitud}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>{detalle.obra}</p>
              </div>
              <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
            </div>

            {detalle.fecha_requerida && <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Fecha requerida: <strong>{detalle.fecha_requerida}</strong></p>}
            {detalle.observaciones && <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Observaciones: {detalle.observaciones}</p>}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f7fa' }}>
                  {['#', 'Producto solicitado', 'Cant.', 'Unidad'].map(h => <th key={h} style={thS}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((it, i) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                    <td style={tdS}>{i + 1}</td>
                    <td style={{ ...tdS, fontWeight: 500 }}>{it.descripcion}</td>
                    <td style={tdS}>{it.cantidad || '—'}</td>
                    <td style={tdS}>{it.unidad || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => copiarEnlace(detalle)}
                style={{ padding: '10px 20px', background: '#ff8c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                🔗 Copiar enlace para proveedor
              </button>
              <button onClick={() => { abrirEdicion(detalle); }}
                style={{ padding: '10px 20px', background: '#1a7a3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Editar
              </button>
              <button onClick={() => setDetalle(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 700, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Editar Solicitud #{editando.nro_solicitud}</h2>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&#x2715;</button>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Obra / Trabajo</label>
            <input style={{ ...inp, marginBottom: 12 }} value={editando.obra}
              onChange={e => setEditando(prev => ({ ...prev, obra: e.target.value }))} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Fecha requerida</label>
            <input type="date" style={{ ...inp, marginBottom: 12 }} value={editando.fecha_requerida}
              onChange={e => setEditando(prev => ({ ...prev, fecha_requerida: e.target.value }))} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Observaciones</label>
            <textarea style={{ ...inp, marginBottom: 16, minHeight: 60, resize: 'vertical' }} value={editando.observaciones}
              onChange={e => setEditando(prev => ({ ...prev, observaciones: e.target.value }))} />

            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3a5c', marginBottom: 8 }}>Materiales</div>
            {editando.items.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 36px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input style={inp} placeholder="Descripción" value={it.descripcion}
                  onChange={e => cambiarItem(idx, 'descripcion', e.target.value)} />
                <input style={inp} placeholder="Cant." type="number" min="0" value={it.cantidad}
                  onChange={e => cambiarItem(idx, 'cantidad', e.target.value)} />
                <select style={inp} value={it.unidad} onChange={e => cambiarItem(idx, 'unidad', e.target.value)}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => quitarItem(idx)}
                  style={{ background: 'none', border: 'none', color: '#e53935', fontSize: 20, cursor: 'pointer', padding: 0 }}>×</button>
              </div>
            ))}
            <button onClick={agregarItem}
              style={{ width: '100%', padding: 10, border: '2px dashed #b0c4de', background: 'none', borderRadius: 8, color: '#1a3a5c', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4, marginBottom: 20 }}>
              + Agregar ítem
            </button>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditando(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={guardando}
                style={{ padding: '10px 24px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
