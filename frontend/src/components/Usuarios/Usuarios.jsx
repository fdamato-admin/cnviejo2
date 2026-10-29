import React, { useState, useEffect } from 'react';
import API from '../../api';
import UsuarioForm from './UsuarioForm';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const cargar = () => {
    setCargando(true);
    API.get('/auth/usuarios')
      .then(r => setUsuarios(r.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const eliminar = async (id) => {
    if (!window.confirm('Eliminar este usuario?')) return;
    await API.delete(`/auth/usuarios/${id}`);
    cargar();
  };

  const NIVEL_LABEL = { admin: 'Admin', operador: 'Operador', consulta: 'Consulta' };
  const NIVEL_COLOR = { admin: '#198754', operador: '#0d6efd', consulta: '#6c757d' };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Usuarios</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>Gestion de accesos y permisos</p>
        </div>
        <button onClick={() => { setUsuarioEditar(null); setMostrarForm(true); }}
          style={{ padding: '10px 20px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          + Nuevo usuario
        </button>
      </div>
      {cargando ? <p style={{ color: '#999' }}>Cargando...</p> : (
        usuarios.map(u => (
          <div key={u.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 15 }}>{u.nombre}</p>
                <p style={{ margin: '0 0 8px', color: '#888', fontSize: 13 }}>{u.email}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {u.permisos.map(p => (
                    <span key={p.id} style={{ background: '#f0f4ff', color: NIVEL_COLOR[p.nivel], fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: `1px solid ${NIVEL_COLOR[p.nivel]}30` }}>
                      {p.modulo === '*' ? 'Global' : p.modulo} · {NIVEL_LABEL[p.nivel]}
                    </span>
                  ))}
                  {!u.activo && <span style={{ background: '#f8d7da', color: '#842029', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>Inactivo</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setUsuarioEditar(u); setMostrarForm(true); }}
                  style={{ padding: '6px 14px', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Editar</button>
                <button onClick={() => eliminar(u.id)}
                  style={{ padding: '6px 14px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Eliminar</button>
              </div>
            </div>
          </div>
        ))
      )}
      {mostrarForm && (
        <UsuarioForm usuario={usuarioEditar}
          onClose={() => { setMostrarForm(false); setUsuarioEditar(null); cargar(); }} />
      )}
    </div>
  );
}
