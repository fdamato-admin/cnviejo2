import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import SuministroForm from './SuministroForm';

const CATEGORIAS = [
  'Químicos de piscina', 'Equipos de piscina', 'Jardinería y áreas verdes',
  'Electricidad', 'Plomería / Fontanería', 'Planta eléctrica',
  'Seguridad / Vigilancia', 'Pintura e impermeabilización',
  'Ferretería y materiales', 'Limpieza', 'Aire acondicionado',
  'Informática y tecnología', 'Otro',
];

function formatFecha(fecha) {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function formatPrecio(precio) {
  if (!precio && precio !== 0) return '—';
  return `$${parseFloat(precio).toFixed(2)}`;
}

function formatBs(valor) {
  if (!valor && valor !== 0) return '—';
  return `Bs ${Number(valor).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDocumento(s) {
  if (!s.tipo_documento) return '—';
  if (s.tipo_documento === 'Otro') return s.documento_otro || 'Otro';
  return s.tipo_documento;
}

export default function Suministros() {
  const [suministros, setSuministros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (buscar) params.buscar = buscar;
      if (categoria) params.categoria = categoria;
      const res = await API.get('/suministros/', { params });
      setSuministros(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [buscar, categoria]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => { setSeleccionado(null); setModalAbierto(true); };
  const abrirEditar = (s) => { setSeleccionado(s); setModalAbierto(true); };
  const cerrarModal = () => { setModalAbierto(false); setSeleccionado(null); cargar(); };

  const eliminar = async (id) => {
    try {
      await API.delete(`/suministros/${id}`);
      setConfirmEliminar(null);
      cargar();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1300, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Compras y Suministros</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>
            {suministros.length} suministro{suministros.length !== 1 ? 's' : ''} registrado{suministros.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirNuevo}
          style={{ padding: '10px 20px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          + Nuevo suministro
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar suministro o proveedor..."
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        />
        <select value={categoria} onChange={e => setCategoria(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, minWidth: 180 }}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : suministros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <p style={{ fontSize: 16 }}>No hay suministros registrados</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Presiona "Nuevo suministro" para agregar el primero</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Nombre', 'Categoría', 'Unidad', 'Frecuencia', 'Último proveedor', 'Fecha de compra', 'Precio (USD)', 'Total (Bs)', 'Documento', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suministros.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{s.nombre}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: '#e8f0fe', color: '#2a78d6', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {s.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{s.unidad || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{s.frecuencia_compra || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{s.proveedor || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{formatFecha(s.ultima_fecha_compra)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: s.ultimo_precio ? '#1a7a3c' : '#aaa', whiteSpace: 'nowrap' }}>
                    {formatPrecio(s.ultimo_precio)}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: s.monto_total_bs ? '#1a7a3c' : '#aaa', whiteSpace: 'nowrap' }}>
                    {formatBs(s.monto_total_bs)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{formatDocumento(s)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => abrirEditar(s)}
                      style={{ marginRight: 8, padding: '5px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#444' }}>
                      Editar
                    </button>
                    <button onClick={() => setConfirmEliminar(s)}
                      style={{ padding: '5px 12px', border: '1px solid #fcc', borderRadius: 6, background: '#fff8f8', fontSize: 13, cursor: 'pointer', color: '#c00' }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal formulario */}
      {modalAbierto && <SuministroForm suministro={seleccionado} onClose={cerrarModal} />}

      {/* Confirm eliminar */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>¿Eliminar suministro?</h3>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>
              Se eliminará <strong>{confirmEliminar.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmEliminar(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmEliminar.id)}
                style={{ padding: '10px 20px', background: '#c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
