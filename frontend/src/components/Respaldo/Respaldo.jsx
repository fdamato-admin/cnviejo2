import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';

const TIPOS = {
  auto: 'Automático',
  manual: 'Manual',
  'pre-restauracion': 'Antes de restaurar',
};

const TEXTO_AUTO = 'Copias automáticas todos los días a las 12:00 y 18:00 (hora de Venezuela). Se conservan 14 días.';

function formatPeso(b) {
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas',
  });
}

const btn = { padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#444' };

export default function Respaldo() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [palabra, setPalabra] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await API.get('/respaldos/');
      setLista(res.data);
    } catch (e) {
      setError('No se pudo cargar la lista de respaldos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const aviso = (ok, texto) => {
    setMensaje(ok ? texto : '');
    setError(ok ? '' : texto);
  };

  const crear = async () => {
    setOcupado(true);
    try {
      await API.post('/respaldos/');
      aviso(true, 'Respaldo creado.');
      await cargar();
    } catch (e) {
      aviso(false, 'No se pudo crear el respaldo.');
    } finally {
      setOcupado(false);
    }
  };

  const descargar = async (nombre) => {
    try {
      const res = await API.get(`/respaldos/${nombre}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      aviso(false, 'No se pudo descargar el respaldo.');
    }
  };

  const cerrarModal = () => { setModal(null); setPalabra(''); };

  const confirmar = async () => {
    const m = modal;
    cerrarModal();
    setOcupado(true);
    try {
      if (m.tipo === 'borrar') {
        await API.delete(`/respaldos/${m.nombre}`);
        aviso(true, 'Respaldo borrado.');
        await cargar();
      } else {
        if (m.tipo === 'restaurar') {
          await API.post(`/respaldos/${m.nombre}/restaurar`);
        } else {
          const datos = new FormData();
          datos.append('file', m.archivo);
          await API.post('/respaldos/restaurar-archivo', datos);
        }
        aviso(true, 'Restauración completada. La página se recargará en unos segundos.');
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch (e) {
      const det = e.response && e.response.data && e.response.data.detail;
      aviso(false, det ? String(det) : 'La operación falló.');
    } finally {
      setOcupado(false);
    }
  };

  const elegirArchivo = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) setModal({ tipo: 'archivo', archivo: f });
  };

  const pideTexto = modal && modal.tipo !== 'borrar';
  const textoModal = !modal ? '' : modal.tipo === 'borrar'
    ? `Se borrará ${modal.nombre}. Esta acción no se puede deshacer.`
    : 'Esto reemplaza TODOS los datos actuales por los del respaldo. Antes se guarda una copia de lo que hay ahora.';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Respaldo</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#777' }}>{TEXTO_AUTO}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ ...btn, padding: '10px 16px', fontSize: 14 }}>
            Restaurar desde archivo
            <input type="file" accept=".zip" onChange={elegirArchivo} disabled={ocupado} style={{ display: 'none' }} />
          </label>
          <button onClick={crear} disabled={ocupado}
            style={{ padding: '10px 20px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: ocupado ? 0.7 : 1 }}>
            {ocupado ? 'Trabajando...' : 'Crear respaldo ahora'}
          </button>
        </div>
      </div>

      {mensaje && <p style={{ background: '#e8f6ec', color: '#1a7a3c', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>{mensaje}</p>}
      {error && <p style={{ background: '#fdecec', color: '#c00', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>{error}</p>}

      {cargando ? (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : lista.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Todav&iacute;a no hay respaldos. Presiona "Crear respaldo ahora".</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {['Fecha y hora', 'Tipo', 'Peso', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #e8e8e8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((r, i) => (
                <tr key={r.nombre} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{formatFecha(r.fecha)}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{TIPOS[r.tipo] || r.tipo}</td>
                  <td style={{ padding: '10px 14px', color: '#666' }}>{formatPeso(r.tamano)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button style={{ ...btn, marginRight: 8 }} onClick={() => descargar(r.nombre)}>Descargar</button>
                    <button style={{ ...btn, marginRight: 8 }} disabled={ocupado} onClick={() => setModal({ tipo: 'restaurar', nombre: r.nombre })}>Restaurar</button>
                    <button style={{ ...btn, border: '1px solid #fcc', background: '#fff8f8', color: '#c00' }} disabled={ocupado} onClick={() => setModal({ tipo: 'borrar', nombre: r.nombre })}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 440, width: '100%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>{modal.tipo === 'borrar' ? 'Borrar respaldo' : 'Restaurar datos'}</h3>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>{textoModal}</p>
            {pideTexto && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 4 }}>Escribe RESTAURAR para confirmar</label>
                <input value={palabra} onChange={e => setPalabra(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={cerrarModal} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmar} disabled={pideTexto && palabra !== 'RESTAURAR'}
                style={{ padding: '10px 20px', background: modal.tipo === 'borrar' ? '#c00' : '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: pideTexto && palabra !== 'RESTAURAR' ? 0.5 : 1 }}>
                {modal.tipo === 'borrar' ? 'Borrar' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
