import React, { useState, useEffect } from 'react';
import API from '../../api';

const TIPO_CONFIG = {
  saldo_inicial: { label: 'Saldo inicial',      color: '#1565c0', bg: '#e3f2fd', signo: '+' },
  entrada_usd:   { label: 'Entrada USD',         color: '#2e7d32', bg: '#e8f5e9', signo: '+' },
  compra_usd:    { label: 'Compra USD (Bs->USD)',color: '#6a1b9a', bg: '#f3e5f5', signo: '+' },
  gasto_usd:     { label: 'Gasto USD',           color: '#c62828', bg: '#fce4ec', signo: '-' },
  venta_usd:     { label: 'Venta USD (USD->Bs)', color: '#e65100', bg: '#fff3e0', signo: '-' },
};

function fmt(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
}
function usd(n) {
  if (n == null) return '-';
  return '$ ' + Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function bs(n) {
  if (n == null) return '-';
  return 'Bs. ' + Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const VACIO = { tipo: '', monto_usd: '', monto_bs: '', tasa: '', descripcion: '', nota: '' };

export default function Caja() {
  const [movs, setMovs] = useState([]);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([API.get('/caja/'), API.get('/caja/saldo')]);
      setMovs(r1.data);
      setSaldo(r2.data.saldo_usd);
    } catch {
      setMovs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    if (!form.tipo) { setError('Selecciona el tipo de movimiento'); return; }
    setError('');
    setGuardando(true);
    try {
      const payload = { tipo: form.tipo };
      if (form.monto_usd !== '') payload.monto_usd = parseFloat(form.monto_usd);
      if (form.monto_bs !== '')  payload.monto_bs  = parseFloat(form.monto_bs);
      if (form.tasa !== '')      payload.tasa       = parseFloat(form.tasa);
      if (form.descripcion)      payload.descripcion = form.descripcion;
      if (form.nota)             payload.nota        = form.nota;
      await API.post('/caja/', payload);
      setForm(VACIO);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('Eliminar este movimiento? Se recalcularan los saldos posteriores.')) return;
    await API.delete(`/caja/${id}`);
    await cargar();
  };

  const tipo = form.tipo;
  const necesitaBs   = tipo === 'compra_usd';
  const necesitaTasa = tipo === 'compra_usd' || tipo === 'venta_usd';
  const necesitaUsd  = tipo !== 'compra_usd';

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Caja Chica</h1>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Fondo en dolares — entradas, salidas y conversiones</p>
        </div>
        <div style={{ background: '#1a3a5c', color: '#fff', borderRadius: 12, padding: '14px 24px', textAlign: 'right' }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>SALDO ACTUAL</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{usd(saldo)}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Registrar movimiento</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, minWidth: 240 }}>
            <option value="">— Tipo de movimiento —</option>
            <option value="saldo_inicial">Saldo inicial (entrega admin anterior)</option>
            <option value="entrada_usd">Entrada en USD (pago directo)</option>
            <option value="compra_usd">Compra USD con Bs. (Bs. a USD)</option>
            <option value="gasto_usd">Gasto pagado en USD</option>
            <option value="venta_usd">Venta de USD para obtener Bs.</option>
          </select>
        </div>
        {tipo && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {necesitaUsd && (
              <div>
                <label style={lbl}>Monto USD</label>
                <input type="number" step="0.01" value={form.monto_usd} onChange={e => set('monto_usd', e.target.value)}
                  placeholder="0.00" style={inp} />
              </div>
            )}
            {necesitaBs && (
              <div>
                <label style={lbl}>Monto Bs.</label>
                <input type="number" step="0.01" value={form.monto_bs} onChange={e => set('monto_bs', e.target.value)}
                  placeholder="0.00" style={inp} />
              </div>
            )}
            {necesitaTasa && (
              <div>
                <label style={lbl}>Tasa (Bs. por USD)</label>
                <input type="number" step="0.01" value={form.tasa} onChange={e => set('tasa', e.target.value)}
                  placeholder="0.00" style={inp} />
              </div>
            )}
            {necesitaBs && form.monto_bs && form.tasa && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                  = {usd(parseFloat(form.monto_bs) / parseFloat(form.tasa))}
                </span>
              </div>
            )}
            {tipo === 'venta_usd' && form.monto_usd && form.tasa && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#e65100', fontWeight: 600 }}>
                  = {bs(parseFloat(form.monto_usd) * parseFloat(form.tasa))}
                </span>
              </div>
            )}
            <div>
              <label style={lbl}>Descripcion</label>
              <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Ej: Pago proveedor limpieza" style={{ ...inp, width: 220 }} />
            </div>
            <div>
              <label style={lbl}>Nota</label>
              <input value={form.nota} onChange={e => set('nota', e.target.value)}
                placeholder="Opcional" style={{ ...inp, width: 160 }} />
            </div>
          </div>
        )}
        {error && <p style={{ color: '#c62828', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}
        {tipo && (
          <button onClick={guardar} disabled={guardando}
            style={{ padding: '9px 20px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Registrar'}
          </button>
        )}
      </div>

      {loading ? <p style={{ color: '#888' }}>Cargando...</p> : movs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
          <p style={{ fontSize: 40 }}>💵</p>
          <p>No hay movimientos registrados.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>Fecha</th>
                <th style={th}>Tipo</th>
                <th style={th}>USD</th>
                <th style={th}>Bs.</th>
                <th style={th}>Tasa</th>
                <th style={th}>Descripcion</th>
                <th style={th}>Saldo USD</th>
                <th style={th}>Por</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {movs.map(m => {
                const cfg = TIPO_CONFIG[m.tipo] || { label: m.tipo, color: '#333', bg: '#f5f5f5', signo: '' };
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ ...td, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{fmt(m.fecha)}</td>
                    <td style={td}>
                      <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 600, color: cfg.signo === '+' ? '#2e7d32' : '#c62828' }}>
                      {m.monto_usd != null ? `${cfg.signo} ${usd(m.monto_usd)}` : '-'}
                    </td>
                    <td style={td}>{m.monto_bs != null ? bs(m.monto_bs) : '-'}</td>
                    <td style={td}>{m.tasa != null ? m.tasa.toLocaleString('es-VE') : '-'}</td>
                    <td style={{ ...td, color: '#555', maxWidth: 200, wordBreak: 'break-word' }}>
                      {m.descripcion || ''}{m.nota ? <span style={{ color: '#aaa', fontSize: 11 }}> — {m.nota}</span> : ''}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: '#1a3a5c' }}>{usd(m.saldo_usd)}</td>
                    <td style={{ ...td, fontSize: 11, color: '#aaa' }}>{m.creado_por || '-'}</td>
                    <td style={td}>
                      <button onClick={() => eliminar(m.id)}
                        style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: 13 }}>
                        X
                      </button>
                    </td>
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

const lbl = { display: 'block', fontSize: 11, color: '#888', marginBottom: 4 };
const inp = { padding: '7px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13, width: 130 };
const th  = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#555' };
const td  = { padding: '10px 12px', verticalAlign: 'top' };
