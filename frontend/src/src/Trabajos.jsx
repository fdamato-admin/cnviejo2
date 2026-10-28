import React, { useState, useEffect } from 'react';
import API from '../../api';
import TrabajoForm from './TrabajoForm';
import TrabajoDetalle from './TrabajoDetalle';

const ESTADO_COLOR = {
  pendiente_cotizacion: { bg: '#fff3cd', color: '#856404', label: 'Pendiente cotización' },
  cotizaciones_recibidas: { bg: '#cfe2ff', color: '#084298', label: 'Cotizaciones recibidas' },
  aprobado: { bg: '#d1e7dd', color: '#0a3622', label: 'Aprobado' },
  en_ejecucion: { bg: '#d0e4ff', color: '#1a5276', label: 'En ejecución' },
  completado: { bg: '#d1e7dd', color: '#0a3622', label: 'Completado' },
  cancelado: { bg: '#f8d7da', color: '#842029', label: 'Cancelado' },
};

const PRIORIDAD_ICON = { urgente: '🔴', normal: '🟡', puede_esperar: '🟢' };

export default function Trabajos() {
  const [trabajos, setTrabajos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [trabajoEditar, setTrabajoEditar] = useState(null);
  const [trabajoDetalle, setTrabajoDetalle] = useState(null);

  const cargar = () => {
    setCargando(true);
    const params = filtroEstado ? `?estado=${filtroEstado}` : '';
    API.get(`/trabajos/${params}`)
      .then(r => setTrabajos(r.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [filtroEstado]);

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este trabajo?')) return;
    await API.delete(`/trabajos/${id}`);
    cargar();
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Trabajos</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>Gestión de trabajos y cotizaciones</p>
        </div>
        <button onClick={() => { setTrabajoEditar(null); setMostrarForm(true); }}
          style={{ padding: '10px 20px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          + Nuevo trabajo
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[['', 'Todos'], ['pendiente_cotizacion', 'Pendiente'], ['cotizaciones_recibidas', 'Con cotizaciones'],
          ['aprobado', 'Aprobado'], ['en_ejecucion', 'En ejecución'], ['completado', 'Completado']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFiltroEstado(val)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', fontSize: 13, cursor: 'pointer',
              background: filtroEstado === val ? '#2a78d6' : '#fff',
              color: filtroEstado === val ? '#fff' : '#555',
              borderColor: filtroEstado === val ? '#2a78d6' : '#ddd' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <p style={{ color: '#999' }}>Cargando...</p>
      ) : trabajos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
          <p style={{ fontSize: 40 }}>🔧</p>
          <p>No hay trabajos registrados.</p>
        </div>
      ) : (
        trabajos.map(t => {
          const est = ESTADO_COLOR[t.estado] || {};
          return (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{PRIORIDAD_ICON[t.prioridad]}</span>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t.titulo}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ background: est.bg, color: est.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{est.label}</span>
                    <span style={{ background: '#f0f0f0', color: '#555', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{t.categoria}</span>
                    <span style={{ background: '#e8f4fd', color: '#1a6ca8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{t.tipo}</span>
                  </div>
                  {t.ubicacion && <p style={{ margin: 0, fontSize: 12, color: '#888' }}>📍 {t.ubicacion}</p>}
                </div>

                <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                  <button onClick={() => setTrabajoDetalle(t)}
                    style={{ padding: '6px 14px', background: '#f0f4ff', color: '#2a4a8a', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Ver / Cotizaciones
                  </button>
                  <button onClick={() => { setTrabajoEditar(t); setMostrarForm(true); }}
                    style={{ padding: '6px 14px', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => eliminar(t.id)}
                    style={{ padding: '6px 14px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {mostrarForm && (
        <TrabajoForm
          trabajo={trabajoEditar}
          onClose={() => { setMostrarForm(false); setTrabajoEditar(null); cargar(); }}
        />
      )}

      {trabajoDetalle && (
        <TrabajoDetalle
          trabajo={trabajoDetalle}
          onClose={() => setTrabajoDetalle(null)}
          onCambio={cargar}
        />
      )}
    </div>
  );
}
