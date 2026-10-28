import React, { useEffect, useState } from 'react';
import API from '../../api';
import ProveedorForm from './ProveedorForm';

const TIPO_LABEL = { servicio: 'Servicio', insumo: 'Insumo', ambos: 'Ambos' };
const ESTADO_COLOR = { activo: '#1baf7a', inactivo: '#e24b4a', en_evaluacion: '#eda100' };
const ESTADO_LABEL = { activo: 'Activo', inactivo: 'Inactivo', en_evaluacion: 'En evaluación' };

export default function ProveedoresList() {
  const [proveedores, setProveedores] = useState([]);
  const [filtros, setFiltros] = useState({ tipo: '', estado: '', buscar: '' });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editar, setEditar] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.buscar) params.buscar = filtros.buscar;
      const { data } = await API.get('/proveedores/', { params });
      setProveedores(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [filtros]);

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    await API.delete(`/proveedores/${id}`);
    cargar();
  };

  const abrirEditar = (p) => { setEditar(p); setMostrarForm(true); };
  const cerrarForm = () => { setEditar(null); setMostrarForm(false); cargar(); };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#1a1a1a' }}>Base de Proveedores</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>CN Pueblo Viejo 2 · Gestión</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          style={{ background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          + Nuevo proveedor
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por nombre, empresa o categoría..."
          value={filtros.buscar}
          onChange={e => setFiltros(f => ({ ...f, buscar: e.target.value }))}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        />
        <select
          value={filtros.tipo}
          onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        >
          <option value="">Todos los tipos</option>
          <option value="servicio">Servicio</option>
          <option value="insumo">Insumo</option>
          <option value="ambos">Ambos</option>
        </select>
        <select
          value={filtros.estado}
          onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="en_evaluacion">En evaluación</option>
        </select>
      </div>

      {/* Contador */}
      <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
        {cargando ? 'Cargando...' : `${proveedores.length} proveedor${proveedores.length !== 1 ? 'es' : ''}`}
      </p>

      {/* Tabla */}
      {!cargando && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #e8e8e8' }}>
                {['Nombre / Empresa', 'Categoría', 'Tipo', 'Teléfono', 'Referido por', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#555', fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>No hay proveedores registrados</td></tr>
              ) : proveedores.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{p.nombre}</div>
                    {p.empresa && <div style={{ fontSize: 12, color: '#888' }}>{p.empresa}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>{p.categoria}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#f0f4ff', color: '#2a78d6', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                      {TIPO_LABEL[p.tipo]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>{p.telefono || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>{p.referido_por || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: ESTADO_COLOR[p.estado] + '22', color: ESTADO_COLOR[p.estado], borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                      {ESTADO_LABEL[p.estado]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => abrirEditar(p)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#444' }}>Editar</button>
                      <button onClick={() => eliminar(p.id)} style={{ background: 'none', border: '1px solid #fdd', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#e24b4a' }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal formulario */}
      {mostrarForm && (
        <ProveedorForm proveedor={editar} onClose={cerrarForm} />
      )}
    </div>
  );
}
