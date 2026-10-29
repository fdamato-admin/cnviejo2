import React, { createContext, useContext, useState, useEffect } from 'react';
import API from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      API.get('/auth/me')
        .then(r => setUsuario(r.data))
        .catch(() => { localStorage.removeItem('token'); })
        .finally(() => setCargando(false));
    } else {
      setCargando(false);
    }
  }, []);

  const login = (token, user) => {
    localStorage.setItem('token', token);
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUsuario(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete API.defaults.headers.common['Authorization'];
    setUsuario(null);
  };

  const nivelEn = (modulo) => {
    if (!usuario) return null;
    const permisos = usuario.permisos || [];
    const global = permisos.find(p => p.modulo === '*');
    const especifico = permisos.find(p => p.modulo === modulo);
    const orden = { consulta: 0, operador: 1, admin: 2 };
    const candidatos = [global, especifico].filter(Boolean);
    if (!candidatos.length) return null;
    return candidatos.reduce((a, b) => orden[a.nivel] >= orden[b.nivel] ? a : b).nivel;
  };

  const puede = (modulo, accion) => {
    const nivel = nivelEn(modulo);
    if (!nivel) return false;
    if (accion === 'ver') return true;
    if (accion === 'editar') return nivel === 'operador' || nivel === 'admin';
    if (accion === 'eliminar') return nivel === 'admin';
    if (accion === 'admin') return nivel === 'admin';
    return false;
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, puede, nivelEn, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
