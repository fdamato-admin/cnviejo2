import React, { useState, useEffect } from 'react';
import API from '../../api';

const vacio = {
  proveedor_id: '', proveedor_nombre: '', tipo: 'servicio',
  monto: '', moneda: 'USD', descripcion: '', es_manual: true, notas: '',
};

const CAMPOS_TEXTO = ['proveedor_nombre', 'descripcion', 'notas'];

export default function CotizacionForm({ trabajoId, cotizacion, onClose }) {
  const [form, setForm] = useState(cotizacion ? { ...cotizacion } : { ...vacio });
  const [proveedores, setProveedores] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/proveedores/').then(r => setProveedores(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: CAMPOS_TEXTO.includes(k) ? v.toUpperCase() : v }));

  const guardar = async () => {
    if (!form.tipo) { setError('Selecciona el tipo'); return; }
    setGuardando(true);
    setError('');
    try {
      const payload = { ...form, trabajo_id: trabajoId };
      if (form.monto === '') payload.monto = null;
      if (cotizacion) {
        await API.put(`/trabajos/cotizaciones/${cotizacion.id}`, payload);
      } else {
        await API.post(`/trabajos/${trabajoId}/cotizaciones`, payload);
      }
      onClose();
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // Al seleccionar proveedor, rellenar nombre automáticamente
  const onProveedorChange = (id) => {
    const p = proveedores.find(p => p.id === parseInt(id));
    setForm(f => ({ ...f, proveedor_id: id, proveedor_nombre: p ? (p.empresa || p.nombre).toUpperCase() : f.proveedor_nombre }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {cotizacion ? 'Editar cotización' : 'Agregar cotización'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

          {/* Proveedor registrado */}
          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Proveedor registrado (opcional)</label>
            <select value={form.proveedor_id || ''} onChange={e => onProveedorChange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
              <option value="">Sin seleccionar</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}{p.empresa ? ` — ${p.empresa}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Nombre libre si no está registrado */}
          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Nombre del proveedor</label>
            <input type="text" value={form.proveedor_nombre || ''} onChange={e => set('proveedor_nombre', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Tipo <span style={{ color: '#e24b4a' }}>*</span></label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
              <option value="servicio">Servicio</option>
              <option value="insumo">Insumo</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>

          {/* Moneda */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Moneda</label>
            <select value={form.moneda} onChange={e => set('moneda', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
              <option value="USD">USD</option>
              <option value="BS">Bs.</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          {/* Monto */}
          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Monto cotizado</label>
            <input type="number" step="0.01" min="0" value={form.monto || ''} onChange={e => set('monto', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          {/* Descripción */}
          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Detalle de lo cotizado</label>
            <textarea value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} rows={3}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Notas */}
          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Notas</label>
            <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} rows={2}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>

        {error && <p style={{ color: '#e24b4a', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            style={{ padding: '10px 24px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
