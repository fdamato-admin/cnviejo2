import React, { useState } from 'react';
import API from '../../api';

const CATEGORIAS = [
  'Aire acondicionado',
  'Químicos de piscina',
  'Equipos de piscina',
  'Jardinería y áreas verdes',
  'Electricidad',
  'Plomería / Fontanería',
  'Planta eléctrica',
  'Seguridad / Vigilancia',
  'Pintura e impermeabilización',
  'Ferretería y materiales',
  'Limpieza',
  'Informática y tecnología',
  'Otro',
];

const ESTADOS = [
  { value: 'pendiente_cotizacion', label: 'Pendiente cotización' },
  { value: 'cotizaciones_recibidas', label: 'Cotizaciones recibidas' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'en_ejecucion', label: 'En ejecución' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const vacio = {
  titulo: '', descripcion: '', categoria: '', tipo: 'servicio',
  prioridad: 'normal', ubicacion: '', notas: '', estado: 'pendiente_cotizacion',
};

const CAMPOS_TEXTO = ['titulo', 'descripcion', 'ubicacion', 'notas'];

export default function TrabajoForm({ trabajo, onClose }) {
  const [form, setForm] = useState(trabajo ? { ...trabajo } : { ...vacio });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: CAMPOS_TEXTO.includes(k) ? v.toUpperCase() : v }));

  const guardar = async () => {
    if (!form.titulo.trim()) { setError('El título es obligatorio'); return; }
    if (!form.categoria) { setError('Selecciona una categoría'); return; }
    setGuardando(true);
    setError('');
    try {
      if (trabajo) {
        await API.put(`/trabajos/${trabajo.id}`, form);
      } else {
        await API.post('/trabajos/', form);
      }
      onClose();
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = (label, key, requerido = false) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>
        {label}{requerido && <span style={{ color: '#e24b4a' }}> *</span>}
      </label>
      <input
        type="text"
        value={form[key] || ''}
        onChange={e => set(key, e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
      />
    </div>
  );

  const select = (label, key, opciones, requerido = false) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>
        {label}{requerido && <span style={{ color: '#e24b4a' }}> *</span>}
      </label>
      <select value={form[key]} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
        {opciones.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {trabajo ? 'Editar trabajo' : 'Nuevo trabajo'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>{campo('Título', 'titulo', true)}</div>

          {select('Categoría', 'categoria', ['', ...CATEGORIAS].map(c => ({ value: c, label: c || 'Seleccionar...' })), true)}

          {select('Tipo', 'tipo', [
            { value: 'servicio', label: 'Servicio (mano de obra)' },
            { value: 'insumo', label: 'Insumo (materiales / equipos)' },
            { value: 'ambos', label: 'Ambos' },
          ])}

          {select('Prioridad', 'prioridad', [
            { value: 'urgente', label: '🔴 Urgente' },
            { value: 'normal', label: '🟡 Normal' },
            { value: 'puede_esperar', label: '🟢 Puede esperar' },
          ])}

          {select('Estado', 'estado', ESTADOS)}

          <div style={{ gridColumn: '1 / -1' }}>{campo('Ubicación (villa o área)', 'ubicacion')}</div>

          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Descripción del problema</label>
            <textarea value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} rows={3}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Notas internas</label>
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
