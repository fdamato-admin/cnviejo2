import React, { useState } from 'react';
import API from '../../api';

const MODULOS = [
  { value: '*', label: 'Global (todos los modulos)' },
  { value: 'proveedores', label: 'Proveedores' },
  { value: 'trabajos', label: 'Trabajos' },
  { value: 'cotizaciones', label: 'Cotizaciones' },
];

const NIVELES = [
  { value: 'admin', label: 'Admin - crear, editar, eliminar' },
  { value: 'operador', label: 'Operador - crear y editar' },
  { value: 'consulta', label: 'Consulta - solo ver' },
];

export default function UsuarioForm({ usuario, onClose }) {
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    password: '',
    activo: usuario?.activo ?? true,
    permisos: usuario?.permisos?.map(p => ({ modulo: p.modulo, nivel: p.nivel })) || [],
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const agregarPermiso = () => setForm(f => ({ ...f, permisos: [...f.permisos, { modulo: 'proveedores', nivel: 'consulta' }] }));
  const quitarPermiso = (i) => setForm(f => ({ ...f, permisos: f.permisos.filter((_, idx) => idx !== i) }));
  const setPermiso = (i, key, val) => setForm(f => {
    const permisos = [...f.permisos];
    permisos[i] = { ...permisos[i], [key]: val };
    return { ...f, permisos };
  });

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.email.trim()) { setError('El email es obligatorio'); return; }
    if (!usuario && !form.password.trim()) { setError('La contrasena es obligatoria'); return; }
    setGuardando(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (usuario) { await API.put(`/auth/usuarios/${usuario.id}`, payload); }
      else { await API.post('/auth/usuarios', payload); }
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar.');
    } finally { setGuardando(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>x</button>
        </div>
        {[['Nombre','nombre','text'],['Email','email','email'],[usuario?'Nueva contrasena (vacio = no cambiar)':'Contrasena','password','password']].map(([label,key,type]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        ))}
        {usuario && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
            <label htmlFor="activo" style={{ fontSize: 14 }}>Usuario activo</label>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>Permisos por modulo</label>
            <button onClick={agregarPermiso} style={{ padding: '4px 12px', background: '#e8f4fd', color: '#1a6ca8', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>+ Agregar</button>
          </div>
          {form.permisos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select value={p.modulo} onChange={e => setPermiso(i,'modulo',e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}>
                {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={p.nivel} onChange={e => setPermiso(i,'nivel',e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }}>
                {NIVELES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
              <button onClick={() => quitarPermiso(i)} style={{ padding: '6px 10px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>x</button>
            </div>
          ))}
          {form.permisos.length === 0 && <p style={{ color: '#999', fontSize: 13, margin: 0 }}>Sin permisos asignados.</p>}
        </div>
        {error && <p style={{ color: '#e24b4a', fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ padding: '10px 24px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
