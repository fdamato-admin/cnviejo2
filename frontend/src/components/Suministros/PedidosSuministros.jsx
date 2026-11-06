import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import { UNIDADES } from './SuministroForm';
import UnidadCombo from './UnidadCombo';

const ESTADOS = ['Pendiente', 'Comprado'];
const hoy = () => new Date().toLocaleDateString('en-CA');
const vacio = { nombre: '', cantidad: '', unidad: '', nota: '', fecha_pedido: '' };

const estiloInput = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const estiloLabel = { display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 };
const btn = { padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#444' };

function formatFecha(fecha) {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

export default function PedidosSuministros({ onComprar }) {
  const [pedidos, setPedidos] = useState([]);
  const [existentes, setExistentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('Pendiente');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ ...vacio });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = filtro ? { estado: filtro } : {};
      const res = await API.get('/pedidos-suministros/', { params });
      setPedidos(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    API.get('/suministros/')
      .then(r => setExistentes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const abrirNuevo = () => {
    setEditando(null); setForm({ ...vacio, fecha_pedido: hoy() }); setError(''); setAviso(''); setModal(true);
  };
  const abrirEditar = (p) => {
    setEditando(p);
    setForm({ nombre: p.nombre || '', cantidad: p.cantidad ?? '', unidad: p.unidad || '', nota: p.nota || '', fecha_pedido: p.fecha_pedido || hoy() });
    setError(''); setAviso(''); setModal(true);
  };

  const set = (k, v) => setForm(f => {
    const nf = { ...f, [k]: ['nombre', 'nota', 'unidad'].includes(k) ? v.toUpperCase() : v };
    if (k === 'nombre' && !nf.unidad) {
      const m = existentes.find(x => (x.nombre || '').trim().toUpperCase() === nf.nombre.trim());
      if (m && m.unidad) nf.unidad = m.unidad;
    }
    return nf;
  });

  const guardar = async (cerrar) => {
    if (!form.nombre.trim()) { setError('Escribe o elige el suministro'); return; }
    const cant = parseFloat(form.cantidad);
    if (!cant || cant <= 0) { setError('La cantidad debe ser mayor a cero'); return; }
    if (form.unidad && !UNIDADES.includes(form.unidad) && !(editando && editando.unidad === form.unidad)) {
      setError('Elige una unidad de la lista');
      return;
    }
    setGuardando(true); setError(''); setAviso('');
    try {
      const payload = { nombre: form.nombre.trim(), cantidad: cant, unidad: form.unidad || null, nota: form.nota || null, fecha_pedido: form.fecha_pedido || hoy() };
      if (editando) {
        await API.put(`/pedidos-suministros/${editando.id}`, payload);
      } else {
        await API.post('/pedidos-suministros/', payload);
      }
      await cargar();
      if (cerrar || editando) {
        setModal(false);
      } else {
        setForm({ ...vacio, fecha_pedido: form.fecha_pedido || hoy() });
        setAviso('Agregado. Puedes cargar otro.');
      }
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (p) => {
    try {
      await API.put(`/pedidos-suministros/${p.id}`, { estado: p.estado === 'Pendiente' ? 'Comprado' : 'Pendiente' });
      cargar();
    } catch (e) { console.error(e); }
  };

  const eliminar = async (id) => {
    try {
      await API.delete(`/pedidos-suministros/${id}`);
      setConfirmEliminar(null);
      cargar();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Pedido de Suministros</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
            {pedidos.length} línea{pedidos.length !== 1 ? 's' : ''} {filtro ? filtro.toLowerCase() + (pedidos.length !== 1 ? 's' : '') : 'en total'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
            <option value="">Todos</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}s</option>)}
          </select>
          <button onClick={abrirNuevo}
            style={{ padding: '10px 20px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + Agregar al pedido
          </button>
        </div>
      </div>

      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>No hay suministros en el pedido</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Presiona "Agregar al pedido" para cargar lo que se necesita</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Fecha de solicitud', 'Suministro', 'Cantidad', 'Unidad', 'Nota', 'Estado', ''].map(h => (
                  <th key={h || 'acc'} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{formatFecha(p.fecha_pedido)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.nombre}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.cantidad}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{p.unidad || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{p.nota || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: p.estado === 'Comprado' ? '#e8f6ec' : '#fff4e0',
                      color: p.estado === 'Comprado' ? '#1a7a3c' : '#a15c00',
                      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    }}>{p.estado}</span>
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button style={{ ...btn, marginRight: 8 }} onClick={() => ((p.estado === 'Pendiente' && onComprar) ? onComprar(p) : cambiarEstado(p))}>
                      {p.estado === 'Pendiente' ? 'Marcar comprado' : 'Volver a pendiente'}
                    </button>
                    <button style={{ ...btn, marginRight: 8 }} onClick={() => abrirEditar(p)}>Editar</button>
                    <button style={{ ...btn, border: '1px solid #fcc', background: '#fff8f8', color: '#c00' }} onClick={() => setConfirmEliminar(p)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{editando ? 'Editar línea del pedido' : 'Agregar al pedido'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={estiloLabel}>Suministro <span style={{ color: '#e24b4a' }}>*</span></label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} list="lista-pedido"
                autoComplete="off" placeholder="Elige uno de la lista o escribe uno nuevo" style={estiloInput} />
              <datalist id="lista-pedido">
                {existentes.map(x => <option key={x.id} value={x.nombre} />)}
              </datalist>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={estiloLabel}>Cantidad <span style={{ color: '#e24b4a' }}>*</span></label>
                <input type="number" min="0" step="0.01" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} style={estiloInput} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={estiloLabel}>Unidad</label>
                <UnidadCombo value={form.unidad} onChange={v => set('unidad', v)} opciones={UNIDADES} estilo={estiloInput} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={estiloLabel}>Nota</label>
              <textarea value={form.nota} onChange={e => set('nota', e.target.value)} rows={3} style={{ ...estiloInput, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={estiloLabel}>Fecha de solicitud</label>
              <input type="date" value={form.fecha_pedido || ''} onChange={e => set('fecha_pedido', e.target.value)} style={estiloInput} />
            </div>

            {aviso && <p style={{ color: '#1a7a3c', fontSize: 13, marginBottom: 16 }}>{aviso}</p>}
            {error && <p style={{ color: '#e24b4a', fontSize: 13, marginBottom: 16 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                {editando ? 'Cancelar' : 'Cerrar'}
              </button>
              {!editando && (
                <button onClick={() => guardar(false)} disabled={guardando}
                  style={{ padding: '10px 20px', border: '1px solid #2a78d6', borderRadius: 8, background: '#fff', color: '#2a78d6', fontSize: 14, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  Guardar y agregar otro
                </button>
              )}
              <button onClick={() => guardar(true)} disabled={guardando}
                style={{ padding: '10px 24px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>¿Eliminar esta línea?</h3>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>
              Se eliminará <strong>{confirmEliminar.nombre}</strong> del pedido.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmEliminar.id)} style={{ padding: '10px 20px', background: '#c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
