import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const FORM_VACIO = { nombre: '', marca: '', categoria: '', unidad: '', proveedor_habitual_id: '', ultimo_precio: '', notas: '' };

export default function CatalogoInsumos() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  // Detección de duplicados
  const [duplicados, setDuplicados] = useState([]);
  const buscarDupTimer = useRef(null);

  useEffect(() => {
    API.get('/proveedores/').then(({ data }) => setProveedores(data)).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtroCategoria) params.categoria = filtroCategoria;
      if (buscar) params.q = buscar;
      const { data } = await API.get('/catalogo-insumos/', { params });
      setLista(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, [filtroCategoria, buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  // Búsqueda de duplicados en tiempo real al escribir nombre
  useEffect(() => {
    if (!form.nombre || form.nombre.length < 3) { setDuplicados([]); return; }
    clearTimeout(buscarDupTimer.current);
    buscarDupTimer.current = setTimeout(async () => {
      try {
        const { data } = await API.get('/catalogo-insumos/', { params: { q: form.nombre } });
        setDuplicados(editando ? data.filter(d => d.id !== editando.id) : data);
      } catch { /* silencioso */ }
    }, 350);
  }, [form.nombre, editando]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setDuplicados([]);
    setError('');
    setMostrarForm(true);
  };

  const abrirEditar = (item) => {
    setEditando(item);
    // Buscar el ID del proveedor por nombre para pre-seleccionar
    const prov = proveedores.find(p => p.nombre === item.proveedor_habitual || p.empresa === item.proveedor_habitual);
    setForm({
      nombre: item.nombre,
      marca: item.marca || '',
      categoria: item.categoria,
      unidad: item.unidad || '',
      proveedor_habitual_id: prov ? String(prov.id) : '',
      ultimo_precio: item.ultimo_precio ?? '',
      notas: item.notas || '',
    });
    setDuplicados([]);
    setError('');
    setMostrarForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.categoria) { setError('La categoría es obligatoria'); return; }
    setGuardando(true); setError('');
    try {
      const provSel = proveedores.find(p => String(p.id) === form.proveedor_habitual_id);
      const payload = {
        nombre: form.nombre.trim(),
        marca: form.marca.trim() || null,
        categoria: form.categoria,
        unidad: form.unidad || null,
        proveedor_habitual: provSel ? (provSel.empresa || provSel.nombre) : null,
        ultimo_precio: form.ultimo_precio !== '' ? parseFloat(form.ultimo_precio) : null,
        notas: form.notas.trim() || null,
      };
      if (editando) {
        await API.put(`/catalogo-insumos/${editando.id}`, payload);
      } else {
        await API.post('/catalogo-insumos/', payload);
      }
      setMostrarForm(false);
      cargar();
    } catch (e) {
      setError('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    await API.delete(`/catalogo-insumos/${id}`);
    setConfirmEliminar(null);
    cargar();
  };

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Catálogo de Insumos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
            {lista.length} producto{lista.length !== 1 ? 's' : ''} registrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirNuevo}
          style={{ padding: '10px 20px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Nuevo insumo
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input value={buscar} onChange={e => setBuscar(e.target.value)}
          placeholder="🔍 Buscar por nombre, código o marca..."
          style={{ flex: 1, minWidth: 220, padding: '8px 14px', border: '1px solid #ddd', borderRadius: 20, fontSize: 13 }} />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 20, fontSize: 13, minWidth: 180 }}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>{buscar || filtroCategoria ? 'Sin resultados' : 'El catálogo está vacío'}</p>
          {!buscar && !filtroCategoria && <p style={{ fontSize: 13, marginTop: 8 }}>Presiona "+ Nuevo insumo" para agregar el primero</p>}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto', borderRadius: 12, border: '1px solid #e8e8e8' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Código', 'Nombre', 'Marca', 'Categoría', 'Unidad', 'Proveedor habitual', 'Último precio', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#1a3a5c',
                    borderBottom: '2px solid #c5d8f7', whiteSpace: 'nowrap',
                    position: 'sticky', top: 0, background: '#e8f0fe', zIndex: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, background: '#e8f0fe', color: '#1a3a5c',
                      padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{item.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{item.nombre}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{item.marca || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: '#f0f4ff', color: '#3b5bdb', padding: '2px 10px',
                      borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {item.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{item.unidad || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{item.proveedor_habitual || '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: item.ultimo_precio ? '#1a7a3c' : '#aaa' }}>
                    {item.ultimo_precio ? `$${parseFloat(item.ultimo_precio).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => abrirEditar(item)}
                        style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#333' }}>
                        Editar
                      </button>
                      <button onClick={() => setConfirmEliminar(item)}
                        style={{ padding: '5px 10px', border: '1px solid #c00', borderRadius: 6, background: '#fff0f0', fontSize: 12, cursor: 'pointer', color: '#c00' }}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo/editar */}
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {editando ? `Editar — ${editando.codigo}` : 'Nuevo insumo'}
            </h2>

            {/* Alerta duplicados */}
            {duplicados.length > 0 && (
              <div style={{ background: '#fff8e1', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                  ⚠️ Ya existe{duplicados.length > 1 ? 'n' : ''} {duplicados.length} producto{duplicados.length > 1 ? 's' : ''} similar{duplicados.length > 1 ? 'es' : ''}:
                </p>
                {duplicados.map(d => (
                  <div key={d.id} style={{ fontSize: 13, color: '#78350f', padding: '2px 0' }}>
                    <strong>{d.codigo}</strong> — {d.nombre} {d.marca ? `(${d.marca})` : ''} · {d.categoria}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                style={inp} placeholder="Ej: CLORO GRANULADO" autoFocus />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Marca</label>
              <input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                style={inp} placeholder="Ej: BIOPLUS, GENERICO" />
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
                <label style={lbl}>Unidad</label>
                <UnidadCombo value={form.unidad} onChange={v => setForm(f => ({ ...f, unidad: v }))}
                  opciones={UNIDADES} estilo={inp} placeholder="Seleccionar unidad" />
              </div>
              <div>
                <label style={lbl}>Último precio (USD)</label>
                <input type="number" min="0" step="0.01" value={form.ultimo_precio}
                  onChange={e => setForm(f => ({ ...f, ultimo_precio: e.target.value }))}
                  style={inp} placeholder="0.00" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Proveedor habitual</label>
              <select value={form.proveedor_habitual_id} onChange={e => setForm(f => ({ ...f, proveedor_habitual_id: e.target.value }))} style={inp}>
                <option value="">— Sin proveedor —</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.empresa ? `${p.empresa} (${p.nombre})` : p.nombre}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Notas</label>
              <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                style={inp} placeholder="Observaciones adicionales" />
            </div>

            {error && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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

      {/* Confirm eliminar */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 380, width: '90%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>¿Eliminar este insumo?</h3>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
              <strong>{confirmEliminar.codigo}</strong> — {confirmEliminar.nombre}
            </p>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmEliminar(null)}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmEliminar.id)}
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
