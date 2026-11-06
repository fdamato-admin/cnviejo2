import React, { useState } from 'react';

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

export default function UnidadCombo({ value, onChange, opciones, estilo }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');

  const nq = norm(q);
  const lista = nq
    ? [
        ...opciones.filter(o => norm(o).startsWith(nq)),
        ...opciones.filter(o => !norm(o).startsWith(nq) && norm(o).includes(nq)),
      ]
    : opciones;

  const elegir = (o) => { onChange(o); setQ(''); setAbierto(false); };

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={abierto ? q : (value || '')}
        placeholder={abierto ? (value || 'Escribe para buscar') : 'Escribe para buscar'}
        onFocus={() => { setQ(''); setAbierto(true); }}
        onChange={e => setQ(e.target.value)}
        onBlur={() => { setAbierto(false); setQ(''); }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (lista.length) elegir(lista[0]);
          }
          if (e.key === 'Escape') setAbierto(false);
        }}
        autoComplete="off"
        style={{ ...estilo, paddingRight: 28 }}
      />
      {value && !abierto && (
        <button type="button" title="Quitar unidad"
          onMouseDown={e => { e.preventDefault(); onChange(''); }}
          style={{ position: 'absolute', right: 8, top: 6, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#888' }}>
          ×
        </button>
      )}
      {abierto && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 2,
          background: '#fff', border: '1px solid #ddd', borderRadius: 8, maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}>
          {lista.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 13, color: '#999' }}>Sin coincidencias</div>
          ) : lista.map(o => (
            <div key={o}
              onMouseDown={e => { e.preventDefault(); elegir(o); }}
              style={{ padding: '7px 12px', fontSize: 14, cursor: 'pointer', background: o === value ? '#e8f0fe' : '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f5ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = o === value ? '#e8f0fe' : '#fff'; }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
