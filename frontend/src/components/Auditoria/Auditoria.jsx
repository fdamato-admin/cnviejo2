import React, { useState, useEffect } from 'react';
import API from '../../api';

const ACCION_COLOR = {
  crear:   { bg: '#e8f5e9', color: '#2e7d32', label: '+ Creo' },
  editar:  { bg: '#e3f2fd', color: '#1565c0', label: 'E Edito' },
  eliminar:{ bg: '#fce4ec', color: '#c62828', label: 'X Elimino' },
  aprobar: { bg: '#f3e5f5', color: '#6a1b9a', label: 'V Aprobo' },
};

const MODULOS = ['', 'trabajo', 'cotizacion', 'proveedor'];

function fmt(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroModulo) params.modulo = filtroModulo;
      if (filtroUsuario) params.usuario_id = filtroUsuario;
      const r = await API.get('/auditoria/', { params });
      setLogs(r.data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const r = await API.get('/auth/usuarios');
      setUsuarios(r.data);
    } catch {}
  };

  useEffect(() => { cargarUsuarios(); }, []);
  useEffect(() => { cargar(); }, [filtroModulo, filtroUsuario]); // eslint-disable-line

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Auditoria</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Registro de todas las acciones realizadas en el sistema</p>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
          <option value="">Todos los modulos</option>
          {MODULOS.filter(m => m).map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
          <option value="">Todos los usuarios</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <button onClick={cargar}
          style={{ padding: '8px 16px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
          Actualizar
        </button>
      </div>
      {loading ? (
        <p style={{ color: '#888' }}>Cargando...</p>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
          <p style={{ fontSize: 40 }}>📋</p>
          <p>No hay registros de auditoria.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>Fecha</th>
                <th style={th}>Usuario</th>
                <th style={th}>Accion</th>
                <th style={th}>Modulo</th>
                <th style={th}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const a = ACCION_COLOR[log.accion] || { bg: '#f5f5f5', color: '#333', label: log.accion };
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: '#888', fontSize: 12 }}>{fmt(log.fecha)}</td>
                    <td style={td}>
                      <span style={{ fontWeight: 600 }}>{log.usuario_nombre || 'Sistema'}</span>
                      {log.usuario_email && <div style={{ fontSize: 11, color: '#aaa' }}>{log.usuario_email}</div>}
                    </td>
                    <td style={td}>
                      <span style={{ background: a.bg, color: a.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {a.label}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ background: '#f0f4ff', color: '#1a3a5c', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                        {log.modulo}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#555', maxWidth: 320, wordBreak: 'break-word' }}>{log.detalle || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#555' };
const td = { padding: '10px 14px', verticalAlign: 'top' };
