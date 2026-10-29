import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import Proveedores from './components/Proveedores/Proveedores';
import Trabajos from './components/Trabajos/Trabajos';
import Cotizaciones from './components/Cotizaciones/Cotizaciones';
import Usuarios from './components/Usuarios/Usuarios';

const TABS = [
  { key: 'trabajos', label: 'Trabajos', modulo: 'trabajos' },
  { key: 'cotizaciones', label: 'Cotizaciones', modulo: 'cotizaciones' },
  { key: 'proveedores', label: 'Proveedores', modulo: 'proveedores' },
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
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginRight: 16, padding: '16px 0' }}>CN Pueblo Viejo 2</span>
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
        {tab === 'cotizaciones' && <Cotizaciones />}
        {tab === 'proveedores' && <Proveedores />}
        {tab === 'usuarios' && <Usuarios />}
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
