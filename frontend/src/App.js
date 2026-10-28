import React from 'react';
import ProveedoresList from './components/Proveedores/ProveedoresList';

function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3' }}>
      <nav style={{ background: '#1a3a5c', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, fontFamily: 'system-ui, sans-serif' }}>
          CN Pueblo Viejo 2 · Gestión
        </span>
        <span style={{ color: '#8ab4d4', fontSize: 13 }}>Módulo: Proveedores</span>
      </nav>
      <ProveedoresList />
    </div>
  );
}

export default App;
