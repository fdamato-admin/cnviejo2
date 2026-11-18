import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import { UNIDADES } from './SuministroForm';
import UnidadCombo from './UnidadCombo';

const BACKEND = 'https://cnviejo2-production-46d5.up.railway.app';
const thS = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap', fontSize: 13, position: 'sticky', top: 0, background: '#f5f7fa', zIndex: 1 };
const tdS = { padding: '10px 14px', verticalAlign: 'middle' };
const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };

function HistorialSolicitudes() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { const r = await API.get('/pedidos-cotizacion/'); setLista(r.data); }
    catch {} finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const mostrarAviso = (msg) => { setAviso(msg); setTimeout(() => setAviso(''), 3500); };

  const copiarEnlace = async (p) => {
    const paramsItems = p.items.map(it =>
      `i=${encodeURIComponent((it.descripcion||'')+'|'+(it.cantidad||'')+'|'+(it.unidad||''))}`
    ).join('&');
    const url = `${BACKEND}/solicitud?modo=proveedor&obra=${encodeURIComponent(p.obra)}&ref=${encodeURIComponent(p.nro_solicitud)}&${paramsItems}`;
    try { await navigator.clipboard.writeText(url); mostrarAviso('Enlace copiado.'); }
    catch { mostrarAviso('No se pudo copiar.'); }
  };

  const eliminar = async (id, nro) => {
    if (!window.confirm(`¿Eliminar solicitud #${nro}?`)) return;
    try { await API.delete(`/pedidos-cotizacion/${id}`); setDetalle(null); cargar(); }
    catch { alert('Error al eliminar.'); }
  };

  const abrirEdicion = (p) => {
    setEditando({ id: p.id, nro_solicitud: p.nro_solicitud, obra: p.obra, fecha_requerida: p.fecha_requerida||'', observaciones: p.observaciones||'', items: p.items.map(it=>({...it})) });
    setDetalle(null);
  };

  const agregarItem = () => setEditando(prev => ({ ...prev, items: [...prev.items, { descripcion:'', cantidad:'', unidad:'und' }] }));
  const quitarItem = (idx) => setEditando(prev => ({ ...prev, items: prev.items.filter((_,i)=>i!==idx) }));
  const cambiarItem = (idx, campo, valor) => setEditando(prev => ({ ...prev, items: prev.items.map((it,i)=>i===idx?{...it,[campo]:valor}:it) }));

  const guardarEdicion = async () => {
    if (!editando.obra.trim()) { alert('Indique la obra.'); return; }
    setGuardando(true);
    try {
      await API.put(`/pedidos-cotizacion/${editando.id}`, {
        nro_solicitud: editando.nro_solicitud, obra: editando.obra,
        fecha_requerida: editando.fecha_requerida||null, observaciones: editando.observaciones||null,
        items: editando.items.filter(it=>it.descripcion.trim()).map(it=>({ descripcion:it.descripcion, cantidad:it.cantidad, unidad:it.unidad })),
      });
      mostrarAviso('Solicitud actualizada.'); setEditando(null); cargar();
    } catch { alert('Error al guardar.'); }
    finally { setGuardando(false); }
  };

  if (cargando) return <p style={{ color:'#aaa', fontSize:13, padding:'12px 0' }}>Cargando historial...</p>;
  if (lista.length === 0) return (
    <p style={{ color:'#aaa', fontSize:13, padding:'12px 0' }}>Aún no hay solicitudes de cotización guardadas.</p>
  );

  return (
    <div>
      {aviso && <span style={{ background:'#e8f6ec', color:'#1a7a3c', padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:600, display:'inline-block', marginBottom:10 }}>{aviso}</span>}
      <div style={{ overflowX:'auto', maxHeight:'60vh', overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:'#f5f7fa' }}>
              {['Nro.','Fecha','Obra / Trabajo','Ítems',''].map(h=><th key={h} style={thS}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {lista.map((p,i)=>(
              <tr key={p.id} style={{ background: i%2===0?'#fff':'#fafbfd', borderBottom:'1px solid #eee' }}>
                <td style={tdS}>
                  <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#1a3a5c', background:'#e8f0fe', padding:'2px 8px', borderRadius:5 }}>#{p.nro_solicitud}</span>
                </td>
                <td style={{ ...tdS, color:'#666', whiteSpace:'nowrap', fontSize:13 }}>{p.creado_en?p.creado_en.slice(0,10):'—'}</td>
                <td style={{ ...tdS, fontWeight:500 }}>{p.obra}</td>
                <td style={{ ...tdS, color:'#666', fontSize:13 }}>{p.items.length} ítem{p.items.length!==1?'s':''}</td>
                <td style={{ ...tdS, whiteSpace:'nowrap' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>setDetalle(p)} style={{ padding:'4px 10px', border:'1px solid #2a78d6', borderRadius:6, background:'#fff', fontSize:12, cursor:'pointer', color:'#2a78d6', fontWeight:500 }}>Ver</button>
                    <button onClick={()=>abrirEdicion(p)} style={{ padding:'4px 10px', border:'1px solid #1a7a3c', borderRadius:6, background:'#fff', fontSize:12, cursor:'pointer', color:'#1a7a3c', fontWeight:500 }}>Editar</button>
                    <button onClick={()=>copiarEnlace(p)} title="Copiar enlace para proveedores" style={{ padding:'4px 8px', border:'1px solid #ff8c00', borderRadius:6, background:'#fff', fontSize:12, cursor:'pointer', color:'#ff8c00' }}>🔗</button>
                    <button onClick={()=>eliminar(p.id,p.nro_solicitud)} style={{ padding:'4px 8px', border:'1px solid #c00', borderRadius:6, background:'#fff', fontSize:12, cursor:'pointer', color:'#c00' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1100, padding:'24px 16px', overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:600, marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Solicitud #{detalle.nro_solicitud}</h2>
                <p style={{ margin:'4px 0 0', fontSize:13, color:'#777' }}>{detalle.obra}</p>
              </div>
              <button onClick={()=>setDetalle(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            {detalle.fecha_requerida && <p style={{ fontSize:13, color:'#666', marginBottom:6 }}>Fecha requerida: <strong>{detalle.fecha_requerida}</strong></p>}
            {detalle.observaciones && <p style={{ fontSize:13, color:'#666', marginBottom:12 }}>Obs: {detalle.observaciones}</p>}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#f5f7fa' }}>{['#','Producto solicitado','Cant.','Unidad'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{detalle.items.map((it,i)=>(
                <tr key={it.id} style={{ borderBottom:'1px solid #eee', background:i%2===0?'#fff':'#fafbfd' }}>
                  <td style={tdS}>{i+1}</td>
                  <td style={{ ...tdS, fontWeight:500 }}>{it.descripcion}</td>
                  <td style={tdS}>{it.cantidad||'—'}</td>
                  <td style={tdS}>{it.unidad||'—'}</td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{ marginTop:18, display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>copiarEnlace(detalle)} style={{ padding:'9px 18px', background:'#ff8c00', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>🔗 Copiar enlace</button>
              <button onClick={()=>abrirEdicion(detalle)} style={{ padding:'9px 18px', background:'#1a7a3c', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Editar</button>
              <button onClick={()=>setDetalle(null)} style={{ padding:'9px 18px', border:'1px solid #ddd', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1100, padding:'24px 16px', overflowY:'auto' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:'100%', maxWidth:620, marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Editar Solicitud #{editando.nro_solicitud}</h2>
              <button onClick={()=>setEditando(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#888' }}>✕</button>
            </div>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Obra / Trabajo</label>
            <input style={{ ...inp, marginBottom:12 }} value={editando.obra} onChange={e=>setEditando(p=>({...p,obra:e.target.value}))} />
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Fecha requerida</label>
            <input type="date" style={{ ...inp, marginBottom:12 }} value={editando.fecha_requerida} onChange={e=>setEditando(p=>({...p,fecha_requerida:e.target.value}))} />
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Observaciones</label>
            <textarea style={{ ...inp, marginBottom:16, minHeight:50, resize:'vertical' }} value={editando.observaciones} onChange={e=>setEditando(p=>({...p,observaciones:e.target.value}))} />
            <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', marginBottom:8 }}>Materiales</div>
            {editando.items.map((it,idx)=>(
              <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 70px 90px 30px', gap:6, marginBottom:6, alignItems:'center' }}>
                <input style={inp} placeholder="Descripción" value={it.descripcion} onChange={e=>cambiarItem(idx,'descripcion',e.target.value)} />
                <input style={inp} placeholder="Cant." type="number" min="0" value={it.cantidad} onChange={e=>cambiarItem(idx,'cantidad',e.target.value)} />
                <select style={inp} value={it.unidad} onChange={e=>cambiarItem(idx,'unidad',e.target.value)}>
                  {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={()=>quitarItem(idx)} style={{ background:'none', border:'none', color:'#e53935', fontSize:18, cursor:'pointer', padding:0 }}>×</button>
              </div>
            ))}
            <button onClick={agregarItem} style={{ width:'100%', padding:9, border:'2px dashed #b0c4de', background:'none', borderRadius:8, color:'#1a3a5c', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4, marginBottom:18 }}>+ Agregar ítem</button>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setEditando(null)} style={{ padding:'9px 18px', border:'1px solid #ddd', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} style={{ padding:'9px 22px', background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', opacity:guardando?0.7:1 }}>
                {guardando?'Guardando...':'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [frecuencias, setFrecuencias] = useState({});
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
    API.get('/suministros/config/frecuencias')
      .then(r => {
        const m = {};
        (Array.isArray(r.data) ? r.data : []).forEach(f => { m[f.nombre] = f; });
        setFrecuencias(m);
      })
      .catch(() => {});
  }, []);

  const textoFrecuencia = (nombre) => {
    const f = frecuencias[(nombre || '').trim().toUpperCase()];
    if (!f || f.promedio_dias === null || f.promedio_dias === undefined) return 'Sin datos aún';
    const d = Math.round(f.promedio_dias);
    return `Cada ${d} día${d !== 1 ? 's' : ''} (${f.compras} compras)`;
  };

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
          <button onClick={() => window.open('https://cnviejo2-production-46d5.up.railway.app/solicitud', '_blank')}
            style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            📋 Solicitud de Materiales
          </button>
        </div>
      </div>

      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : pedidos.length === 0 ? (
        <div style={{ padding: '4px 0' }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Fecha de solicitud', 'Suministro', 'Cantidad', 'Unidad', 'Nota', 'Estado', '', 'Frecuencia de compra'].map(h => (
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
                  <td style={{ padding: '10px 14px', color: '#777', fontSize: 13, whiteSpace: 'nowrap' }}>{textoFrecuencia(p.nombre)}</td>
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

      {/* HISTORIAL DE SOLICITUDES DE COTIZACIÓN */}
      <div style={{ marginTop: 20, borderTop: '2px solid #e8e8e8', paddingTop: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Historial de Solicitudes de Cotización</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#777' }}>Solicitudes enviadas a proveedores</p>
        <HistorialSolicitudes />
      </div>

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


