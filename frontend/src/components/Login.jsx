import React, { useState } from 'react';
import API from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const r = await API.post('/auth/login', form);
      login(r.data.access_token, r.data.usuario);
    } catch {
      setError('Email o contrasena incorrectos.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a3a5c' }}>CN Pueblo Viejo 2</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>Sistema de Gestion</p>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Email</label>
            <input type="email" required autoFocus value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>Contrasena</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ color: '#e24b4a', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={cargando}
            style={{ width: '100%', padding: '12px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: cargando ? 0.7 : 1 }}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
