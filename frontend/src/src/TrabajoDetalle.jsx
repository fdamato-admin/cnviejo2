import React, { useState, useEffect } from 'react';
import API from '../../api';
import CotizacionForm from './CotizacionForm';

const ESTADO_COLOR = {
  pendiente_cotizacion: { bg: '#fff3cd', color: '#856404', label: 'Pendiente cotización' },
  cotizaciones_recibidas: { bg: '#cfe2ff', color: '#084298', label: 'Cotizaciones recibidas' },
  aprobado: { bg: '#d1e7dd', color: '#0a3622', label: 'Aprobado' },
  en_ejecucion: { bg: '#d0e4ff', color: '#1a5276', label: 'En ejecución' },
  completado: { bg: '#d1e7dd', color: '#0a3622', label: 'Completado' },
  cancelado: { bg: '#f8d7da', color: '#842029', label: 'Cancelado' },
};

const ESTADO_COT_COLOR = {
  pendiente: { bg: '#fff3cd', color: '#856404', label: 'Pendiente' },
  recibida: { bg: '#cfe2ff', color: '#084298', label: 'Recibida' },
  aprobada: { bg: '#d1e7dd', color: '#0a3622', label: 'Aprobada' },
  rechazada: { bg: '#f8d7da', color: '#842029', label: 'Rechazada' },
};

const badge = (texto, bg, color) => (
  <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{texto}</span>
);

export default function TrabajoDetalle({ trabajo, onClose, onCambio }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cotEditar, setCotEditar] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = () => {
    setCargando(true);
    API.get(`/trabajos/${trabajo.id}/cotizaciones`)
      .then(r => setCotizaciones(r.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [trabajo.id]);

  const aprobarCotizacion = async (cot) => {
    await API.put(`/trabajos/cotizaciones/${cot.id}`, { estado: 'aprobada' });
    // Rechazar las demás del mismo tipo
    for (const c of cotizaciones) {
      if (c.id !== cot.id && c.tipo === cot.tipo && c.estado !== 'rechazada') {
        await API.put(`/trabajos/cotizaciones/${c.id}`, { estado: 'rechazada' });
      }
    }
    await API.put(`/trabajos/${trabajo.id}`, { estado: 'aprobado' });
    cargar();
    onCambio && onCambio();
  };

  const eliminarCotizacion = async (id) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;
    await API.delete(`/trabajos/cotizaciones/${id}`);
    cargar();
  };

  const est = ESTADO_COLOR[trabajo.estado] || {};

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>{trabajo.titulo}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {badge(est.label, est.bg, est.color)}
              {badge(trabajo.categoria, '#f0f0f0', '#333')}
              {badge(trabajo.tipo, '#e8f4fd', '#1a6ca8')}
              {trabajo.prioridad === 'urgente' && badge('🔴 Urgente', '#fff0f0', '#c00')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        {/* Info */}
        {trabajo.ubicacion && <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>📍 {trabajo.ubicacion}</p>}
        {trabajo.descripcion && <p style={{ fontSize: 14, color: '#444', margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>{trabajo.descripcion}</p>}

        {/* Cotizaciones */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Cotizaciones ({cotizaciones.length})</h3>
            <button onClick={() => { setCotEditar(null); setMostrarForm(true); }}
              style={{ padding: '6px 16px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              + Agregar
            </button>
          </div>

          {cargando ? (
            <p style={{ color: '#999', fontSize: 13 }}>Cargando...</p>
          ) : cotizaciones.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>Sin cotizaciones aún.</p>
          ) : (
            cotizaciones.map(cot => {
              const ce = ESTADO_COT_COLOR[cot.estado] || {};
              return (
                <div key={cot.id} style={{ border: '1px solid #e8e8e8', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14 }}>
                        {cot.proveedor_nombre || 'Sin nombre'}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {badge(ce.label, ce.bg, ce.color)}
                        {badge(cot.tipo, '#f0f4ff', '#2a4a8a')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {cot.monto ? (
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>
                          {cot.moneda} {parseFloat(cot.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </p>
                      ) : (
                        <p style={{ margin: 0, color: '#999', fontSize: 13 }}>Sin monto</p>
                      )}
                    </div>
                  </div>

                  {cot.descripcion && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>{cot.descripcion}</p>}

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {cot.estado !== 'aprobada' && cot.estado !== 'rechazada' && (
                      <button onClick={() => aprobarCotizacion(cot)}
                        style={{ padding: '5px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                        ✓ Aprobar
                      </button>
                    )}
                    <button onClick={() => { setCotEditar(cot); setMostrarForm(true); }}
                      style={{ padding: '5px 14px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => eliminarCotizacion(cot.id)}
                      style={{ padding: '5px 14px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>

      {mostrarForm && (
        <CotizacionForm
          trabajoId={trabajo.id}
          cotizacion={cotEditar}
          onClose={() => { setMostrarForm(false); setCotEditar(null); cargar(); }}
        />
      )}
    </div>
  );
}
