import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import ProveedoresList from './components/Proveedores/ProveedoresList';
import Trabajos from './components/Trabajos/Trabajos';
import Usuarios from './components/Usuarios/Usuarios';
import Suministros from './components/Suministros/Suministros';
import Respaldo from './components/Respaldo/Respaldo';
import Auditoria from './components/Auditoria/Auditoria';
import Caja from './components/Caja/Caja';

const TABS = [
  { key: 'trabajos', label: 'Mantenimiento', modulo: 'trabajos' },
  { key: 'proveedores', label: 'Proveedores', modulo: 'proveedores' },
  { key: 'suministros', label: 'Suministros', modulo: 'suministros' },
];

function AppInner() {
  const { usuario, logout, puede, cargando } = useAuth();
  const [tab, setTab] = useState('trabajos');

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
      <p style={{ color: '#888' }}>Cargando...</p>
    </div>
  );

  if (!usuario) return <Login />;

  const tabsVisibles = TABS.filter(t => puede(t.modulo, 'ver'));

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: '#1a3a5c', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo.jpg" alt="Logo" style={{ height: 40, marginRight: 12, borderRadius: 4 }} /><span style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginRight: 16, padding: "16px 0" }}>CN Pueblo Viejo 2</span>
        {tabsVisibles.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '16px 16px', background: 'none', border: 'none', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: tab === t.key ? 600 : 400, fontSize: 14, cursor: 'pointer', borderBottom: tab === t.key ? '2px solid #fff' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
        {puede('*', 'admin') && (
          <button onClick={() => setTab('usuarios')}
            style={{ padding: '16px 16px', background: 'none', border: 'none', color: tab === 'usuarios' ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: tab === 'usuarios' ? 600 : 400, fontSize: 14, cursor: 'pointer', borderBottom: tab === 'usuarios' ? '2px solid #fff' : '2px solid transparent' }}>
            Usuarios
          </button>
        )}
        {puede('*', 'admin') && (
          <button onClick={() => setTab('respaldo')}
            style={{ padding: '16px 16px', background: 'none', border: 'none', color: tab === 'respaldo' ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: tab === 'respaldo' ? 600 : 400, fontSize: 14, cursor: 'pointer', borderBottom: tab === 'respaldo' ? '2px solid #fff' : '2px solid transparent' }}>
            Respaldo
          </button>
        )}
        {puede('*', 'admin') && (
          <button onClick={() => setTab('auditoria')}
            style={{ padding: '16px 16px', background: 'none', border: 'none', color: tab === 'auditoria' ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: tab === 'auditoria' ? 600 : 400, fontSize: 14, cursor: 'pointer', borderBottom: tab === 'auditoria' ? '2px solid #fff' : '2px solid transparent' }}>
            Auditoria
          </button>
        )}
        {puede('*', 'admin') && (
          <button onClick={() => setTab('caja')}
            style={{ padding: '16px 16px', background: 'none', border: 'none', color: tab === 'caja' ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: tab === 'caja' ? 600 : 400, fontSize: 14, cursor: 'pointer', borderBottom: tab === 'caja' ? '2px solid #fff' : '2px solid transparent' }}>
            Caja
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{usuario.nombre}</span>
          <button onClick={logout}
            style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </nav>
      <main>
        {tab === 'trabajos' && <Trabajos />}
        {tab === 'proveedores' && <ProveedoresList />}
        {tab === 'suministros' && <Suministros />}
        {tab === 'usuarios' && <Usuarios />}
        {tab === 'respaldo' && <Respaldo />}
        {tab === 'auditoria' && <Auditoria />}
        {tab === 'caja' && <Caja />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

