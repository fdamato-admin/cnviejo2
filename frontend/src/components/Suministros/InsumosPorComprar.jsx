import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import UnidadCombo from './UnidadCombo';
import { UNIDADES } from './SuministroForm';

const CATEGORIAS = [
  'Químicos de piscina', 'Equipos de piscina', 'Jardinería y áreas verdes',
  'Electricidad', 'Plomería / Fontanería', 'Planta eléctrica',
  'Seguridad / Vigilancia', 'Pintura e impermeabilización',
  'Ferretería y materiales', 'Limpieza', 'Aire acondicionado',
  'Informática y tecnología', 'Otro',
];

const ESTADOS = ['Pendiente', 'Comprado', 'Donado'];
const ESTADO_COLOR = {
  Pendiente: { bg: '#fff3cd', color: '#856404' },
  Comprado:  { bg: '#d1f5e0', color: '#145a32' },
  Donado:    { bg: '#ede9fe', color: '#5b21b6' },
};

export default function InsumosPorComprar() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('Pendiente');
  const [buscar, setBuscar] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', cantidad: '', unidad: '', nota: '', estado: 'Pendiente', categoria: '' });
  const [guardando, setGuardando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [modalCotizacion, setModalCotizacion] = useState(false);
  const [formCot, setFormCot] = useState({ nro_solicitud: '', obra: 'Condominio Náutico Pueblo Viejo II', fecha_requerida: '', observaciones: '' });
  const [enviandoCot, setEnviandoCot] = useState(false);
  const [avisoCot, setAvisoCot] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const { data } = await API.get('/pedidos-suministros/', { params });
      setLista(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    API.get('/catalogo-insumos/').then(({ data }) => setCatalogo(data)).catch(() => {});
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '', cantidad: '', unidad: '', nota: '', estado: 'Pendiente', categoria: '' });
    setMostrarForm(true);
  };

  const abrirEditar = (item) => {
    setEditando(item);
    setForm({ nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad || '', nota: item.nota || '', estado: item.estado, categoria: item.categoria || '' });
    setMostrarForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    if (!form.cantidad || isNaN(form.cantidad) || parseFloat(form.cantidad) <= 0) return;
    setGuardando(true);
    try {
      const nombreUpper = form.nombre.trim().toUpperCase();
      const payload = { ...form, nombre: nombreUpper, cantidad: parseFloat(form.cantidad) };
      if (editando) {
        await API.put(`/pedidos-suministros/${editando.id}`, payload);
      } else {
        await API.post('/pedidos-suministros/', payload);
      }
      // El backend auto-agrega al catálogo; refrescar lista local
      try {
        const { data } = await API.get('/catalogo-insumos/');
        setCatalogo(data);
      } catch { /* silencioso */ }
      setMostrarForm(false);
      cargar();
    } catch { /* silencioso */ }
    finally { setGuardando(false); }
  };

  const marcarComprado = async (item) => {
    const nuevoEstado = item.estado === 'Comprado' ? 'Pendiente' : 'Comprado';
    await API.put(`/pedidos-suministros/${item.id}`, { estado: nuevoEstado });
    cargar();
  };

  const marcarDonado = async (item) => {
    const nuevoEstado = item.estado === 'Donado' ? 'Pendiente' : 'Donado';
    await API.put(`/pedidos-suministros/${item.id}`, { estado: nuevoEstado });
    cargar();
  };

  const eliminar = async (id) => {
    await API.delete(`/pedidos-suministros/${id}`);
    setConfirmEliminar(null);
    cargar();
  };

  const listaFiltrada = lista.filter(i =>
    !buscar || i.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === listaFiltrada.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(listaFiltrada.map(i => i.id)));
    }
  };

  const abrirModalCotizacion = () => {
    const nro = `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    setFormCot({ nro_solicitud: nro, obra: 'Condominio Náutico Pueblo Viejo II', fecha_requerida: '', observaciones: '' });
    setAvisoCot('');
    setModalCotizacion(true);
  };

  const enviarCotizacion = async () => {
    if (!formCot.nro_solicitud.trim() || !formCot.obra.trim()) {
      setAvisoCot('Completa el número de solicitud y la obra.'); return;
    }
    setEnviandoCot(true);
    try {
      const itemsSeleccionados = listaFiltrada.filter(i => seleccionados.has(i.id));
      await API.post('/pedidos-cotizacion/', {
        nro_solicitud: formCot.nro_solicitud.trim().toUpperCase(),
        obra: formCot.obra.trim().toUpperCase(),
        fecha_requerida: formCot.fecha_requerida || null,
        observaciones: formCot.observaciones ? formCot.observaciones.trim().toUpperCase() : null,
        items: itemsSeleccionados.map(i => ({
          descripcion: i.nombre,
          cantidad: String(i.cantidad),
          unidad: i.unidad || null,
        })),
      });
      setModalCotizacion(false);
      setSeleccionados(new Set());
      setAvisoCot('');
      alert(`Solicitud de cotización creada exitosamente.`);
    } catch (e) {
      const det = e.response?.data?.detail;
      setAvisoCot(det || 'Error al crear la solicitud.');
    } finally {
      setEnviandoCot(false);
    }
  };

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Insumos por Comprar</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>Lista de materiales e insumos pendientes de adquisición</p>
        </div>
        <button onClick={abrirNuevo}
          style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Agregar insumo
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {[['', 'Todos'], ['Pendiente', 'Pendientes'], ['Comprado', 'Comprados'], ['Donado', 'Donados']].map(([val, lab]) => (
          <button key={val} onClick={() => setFiltroEstado(val)}
            style={{ padding: '7px 16px', borderRadius: 20, border: '1px solid', fontSize: 13, cursor: 'pointer', fontWeight: 500,
              background: filtroEstado === val ? '#2a78d6' : '#fff',
              color: filtroEstado === val ? '#fff' : '#555',
              borderColor: filtroEstado === val ? '#2a78d6' : '#ddd' }}>
            {lab}
          </button>
        ))}
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="🔍 Buscar insumo..."
          style={{ flex: 1, minWidth: 180, padding: '7px 12px', border: '1px solid #ddd', borderRadius: 20, fontSize: 13 }} />
      </div>

      {/* Barra de cotización */}
      {seleccionados.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1b4f8f', color: '#fff', padding: '10px 16px', borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{seleccionados.size} insumo(s) seleccionado(s)</span>
          <button onClick={abrirModalCotizacion}
            style={{ padding: '7px 18px', background: '#fff', color: '#1b4f8f', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📋 Solicitar Cotización
          </button>
          <button onClick={() => setSeleccionados(new Set())}
            style={{ padding: '7px 12px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
            Limpiar
          </button>
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : listaFiltrada.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>{filtroEstado === 'Pendiente' ? 'No hay insumos pendientes' : 'No hay registros'}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#1a3a5c', borderBottom: '2px solid #c5d8f7', position: 'sticky', top: 0, background: '#e8f0fe', zIndex: 1, width: 40 }}>
                  <input type="checkbox" checked={seleccionados.size === listaFiltrada.length && listaFiltrada.length > 0} onChange={toggleTodos} title="Seleccionar todos" />
                </th>
                {['Insumo / Material', 'Cantidad', 'Unidad', 'Nota', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#1a3a5c',
                    borderBottom: '2px solid #c5d8f7', whiteSpace: 'nowrap',
                    position: 'sticky', top: 0, background: '#e8f0fe', zIndex: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((item, i) => {
                const ec = ESTADO_COLOR[item.estado] || {};
                return (
                  <tr key={item.id} style={{ background: seleccionados.has(item.id) ? '#eef5ff' : i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee',
                    opacity: item.estado === 'Comprado' || item.estado === 'Donado' ? 0.6 : 1 }}>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <input type="checkbox" checked={seleccionados.has(item.id)} onChange={() => toggleSeleccion(item.id)} />
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: item.estado === 'Comprado' || item.estado === 'Donado' ? '#888' : '#1a1a1a',
                      textDecoration: item.estado === 'Comprado' || item.estado === 'Donado' ? 'line-through' : 'none' }}>
                      {item.nombre}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a3a5c' }}>{item.cantidad}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{item.unidad || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#666', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.nota || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: ec.bg, color: ec.color }}>
                        {item.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {item.estado !== 'Donado' && (
                          <button onClick={() => marcarComprado(item)}
                            title={item.estado === 'Comprado' ? 'Volver a pendiente' : 'Marcar como comprado'}
                            style={{ padding: '5px 10px', border: '1px solid', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                              background: item.estado === 'Comprado' ? '#fff3cd' : '#d1f5e0',
                              color: item.estado === 'Comprado' ? '#856404' : '#145a32',
                              borderColor: item.estado === 'Comprado' ? '#f0c040' : '#52c77a' }}>
                            {item.estado === 'Comprado' ? '↩ Pendiente' : '✓ Comprado'}
                          </button>
                        )}
                        {item.estado !== 'Comprado' && (
                          <button onClick={() => marcarDonado(item)}
                            title={item.estado === 'Donado' ? 'Volver a pendiente' : 'Marcar como donado'}
                            style={{ padding: '5px 10px', border: '1px solid', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                              background: item.estado === 'Donado' ? '#fff3cd' : '#ede9fe',
                              color: item.estado === 'Donado' ? '#856404' : '#5b21b6',
                              borderColor: item.estado === 'Donado' ? '#f0c040' : '#a78bfa' }}>
                            {item.estado === 'Donado' ? '↩ Pendiente' : '🎁 Donado'}
                          </button>
                        )}
                        <button onClick={() => abrirEditar(item)}
                          style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#333' }}>
                          Editar
                        </button>
                        <button onClick={() => setConfirmEliminar(item.id)}
                          style={{ padding: '5px 10px', border: '1px solid #c00', borderRadius: 6, background: '#fff0f0', fontSize: 12, cursor: 'pointer', color: '#c00' }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal agregar/editar */}
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {editando ? 'Editar insumo' : 'Agregar insumo'}
            </h2>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Insumo / Material *</label>
              <input
                value={form.nombre}
                onChange={e => {
                  const val = e.target.value;
                  const cat = catalogo.find(c => c.nombre.toUpperCase() === val.toUpperCase());
                  setForm(f => ({
                    ...f,
                    nombre: val,
                    unidad: cat && !f.unidad ? (cat.unidad || f.unidad) : f.unidad,
                    categoria: cat && !f.categoria ? (cat.categoria || f.categoria) : f.categoria,
                  }));
                }}
                list="lista-catalogo-insumos"
                style={inp}
                placeholder="Escribe o elige del catálogo"
                autoComplete="off"
              />
              <datalist id="lista-catalogo-insumos">
                {catalogo.map(c => (
                  <option key={c.id} value={c.nombre} label={`[${c.codigo}] ${c.categoria}`} />
                ))}
              </datalist>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Categoría *</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={inp}>
                <option value="">— Seleccionar —</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Cantidad *</label>
                <input type="number" min="0" step="0.01" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} style={inp} placeholder="Ej: 10" />
              </div>
              <div>
                <label style={lbl}>Unidad</label>
                <UnidadCombo value={form.unidad} onChange={v => setForm(f => ({ ...f, unidad: v }))} opciones={UNIDADES} estilo={inp} placeholder="Seleccionar unidad" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Nota (opcional)</label>
              <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} style={inp} placeholder="Ej: Para obra Bloque 3" />
            </div>
            {editando && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} style={inp}>
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setMostrarForm(false)}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                style={{ padding: '9px 24px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal solicitud de cotización */}
      {modalCotizacion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Solicitar Cotización</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#777' }}>{seleccionados.size} insumo(s) seleccionado(s)</p>

            {avisoCot && <p style={{ background: '#fdecec', color: '#c00', padding: '8px 12px', borderRadius: 7, fontSize: 13, marginBottom: 12 }}>{avisoCot}</p>}

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Nº de Solicitud *</label>
              <input value={formCot.nro_solicitud} onChange={e => setFormCot(f => ({ ...f, nro_solicitud: e.target.value.toUpperCase() }))} style={inp} placeholder="Ej: COT-2026-001" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Obra / Proyecto *</label>
              <input value={formCot.obra} onChange={e => setFormCot(f => ({ ...f, obra: e.target.value.toUpperCase() }))} style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Fecha requerida (opcional)</label>
              <input type="date" value={formCot.fecha_requerida} onChange={e => setFormCot(f => ({ ...f, fecha_requerida: e.target.value }))} style={inp} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Observaciones (opcional)</label>
              <input value={formCot.observaciones} onChange={e => setFormCot(f => ({ ...f, observaciones: e.target.value.toUpperCase() }))} style={inp} placeholder="Ej: Urgente para mantenimiento de piscina" />
            </div>

            <div style={{ background: '#f7f9fc', borderRadius: 8, padding: 12, marginBottom: 18, maxHeight: 150, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>INSUMOS INCLUIDOS:</div>
              {listaFiltrada.filter(i => seleccionados.has(i.id)).map(i => (
                <div key={i.id} style={{ fontSize: 13, color: '#333', padding: '2px 0' }}>• {i.nombre} — {i.cantidad} {i.unidad || ''}</div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalCotizacion(false)}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={enviarCotizacion} disabled={enviandoCot}
                style={{ padding: '9px 22px', background: '#1b4f8f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {enviandoCot ? 'Creando...' : 'Crear Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm eliminar */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>¿Eliminar este insumo?</h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmEliminar(null)}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmEliminar)}
                style={{ padding: '9px 20px', background: '#c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
