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

const vacio = {
  nombre: '', empresa: '', tipo: 'servicio', categoria: '',
  telefono: '', telefono_alt: '', email: '', ubicacion: '',
  estado: 'activo', referido_por: '', notas: '',
};

export default function ProveedorForm({ proveedor, onClose }) {
  const [form, setForm] = useState(proveedor ? { ...proveedor } : { ...vacio });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const CAMPOS_TEXTO = ['nombre','empresa','telefono','telefono_alt','ubicacion','referido_por','notas'];
  const set = (k, v) => setForm(f => ({ ...f, [k]: CAMPOS_TEXTO.includes(k) ? v.toUpperCase() : v }));

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.categoria) { setError('Selecciona una categoría'); return; }
    setGuardando(true);
    setError('');
    try {
      if (proveedor) {
        await API.put(`/proveedores/${proveedor.id}`, form);
      } else {
        await API.post('/proveedores/', form);
      }
      onClose();
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = (label, key, tipo = 'text', requerido = false) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>
        {label}{requerido && <span style={{ color: '#e24b4a' }}> *</span>}
      </label>
      <input
        type={tipo}
        value={form[key] || ''}
        onChange={e => set(key, e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>{campo('Nombre', 'nombre', 'text', true)}</div>
          <div style={{ gridColumn: '1 / -1' }}>{campo('Empresa (opcional)', 'empresa')}</div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Tipo <span style={{ color: '#e24b4a' }}>*</span></label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
              <option value="servicio">Servicio (mano de obra)</option>
              <option value="insumo">Insumo (materiales / equipos)</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>

          {/* Categoría */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Categoría <span style={{ color: '#e24b4a' }}>*</span></label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
              <option value="">Seleccionar...</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {campo('Teléfono principal', 'telefono')}
          {campo('Teléfono alternativo', 'telefono_alt')}
          {campo('Email', 'email', 'email')}
          {campo('Ubicación / Zona', 'ubicacion')}
          {campo('Referido por', 'referido_por')}

          {/* Estado */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Estado</label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}>
              <option value="activo">Activo</option>
              <option value="en_evaluacion">En evaluación</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          {/* Notas */}
          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Notas</label>
            <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} rows={3}
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
