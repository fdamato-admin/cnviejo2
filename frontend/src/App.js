import React, { useState } from 'react';
import ProveedoresList from './components/Proveedores/ProveedoresList';
import Trabajos from './components/Trabajos/Trabajos';

const MODULOS = [
  { id: 'trabajos', label: '🔧 Trabajos' },
  { id: 'proveedores', label: '🏢 Proveedores' },
];

function App() {
  const [modulo, setModulo] = useState('trabajos');

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3' }}>
      <nav style={{ background: '#1a3a5c', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, fontFamily: 'system-ui, sans-serif' }}>
          CN Pueblo Viejo 2 · Gestión
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {MODULOS.map(m => (
            <button key={m.id} onClick={() => setModulo(m.id)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer',
                background: modulo === m.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: modulo === m.id ? '#fff' : '#8ab4d4',
                fontWeight: modulo === m.id ? 600 : 400,
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </nav>

      {modulo === 'trabajos' && <Trabajos />}
      {modulo === 'proveedores' && <ProveedoresList />}
    </div>
  );
}

export default App;
