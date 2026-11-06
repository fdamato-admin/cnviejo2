import React, { useState, useEffect } from 'react';
import API from '../../api';

const CATEGORIAS = [
  'Químicos de piscina',
  'Equipos de piscina',
  'Jardinería y áreas verdes',
  'Electricidad',
  'Plomería / Fontanería',
  'Planta eléctrica',
  'Seguridad / Vigilancia',
  'Pintura e impermeabilización',
  'Ferretería y materiales',
  'Limpieza',
  'Aire acondicionado',
  'Informática y tecnología',
  'Otro',
];

const FRECUENCIAS = [
  'Semanal',
  'Quincenal',
  'Mensual',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
  'Según consumo',
];

const UNIDADES_BASE = [
  'UNIDAD', 'PAR', 'DOCENA', 'CIENTO', 'MILLAR', 'PIEZA', 'JUEGO', 'KIT', 'SET',
  'CAJA', 'PAQUETE', 'BOLSA', 'SACO', 'BULTO', 'FARDO', 'PALET',
  'ROLLO', 'BOBINA', 'CINTA', 'LÁMINA', 'PLANCHA', 'HOJA', 'RESMA', 'BARRA', 'TUBO', 'CABILLA', 'VARILLA',
  'LITRO', 'MILILITRO', 'GALÓN', 'CUÑETE', 'TAMBOR', 'BARRIL', 'BIDÓN', 'BOTELLA', 'LATA', 'ENVASE', 'FRASCO', 'POTE', 'BALDE', 'CARTUCHO', 'ESPRAY',
  'KILOGRAMO', 'GRAMO', 'LIBRA', 'ONZA', 'TONELADA',
  'METRO', 'METRO LINEAL', 'CENTÍMETRO', 'MILÍMETRO', 'PULGADA', 'PIE', 'YARDA',
  'METRO CUADRADO', 'METRO CÚBICO', 'PIE CUADRADO', 'PIE CÚBICO',
  'TABLETA', 'PASTILLA', 'SOBRE', 'SERVICIO', 'HORA', 'DÍA', 'MES',
];

export const UNIDADES = [...UNIDADES_BASE].sort((a, b) => a.localeCompare(b, 'es'));

const DOCUMENTOS = ['Nota de Entrega', 'Factura', 'Otro'];
const MONEDAS = ['Bs', 'Dólares', 'Euros', 'USDT'];
const SIMBOLO = { 'Dólares': '$', 'Euros': '€', 'USDT': 'USDT ' };

const vacio = {
  nombre: '',
  categoria: '',
  unidad: '',
  frecuencia_compra: '',
  proveedor: '',
  ultima_fecha_compra: '',
  moneda_pago: '',
  ultimo_precio: '',
  tasa_cambio: '',
  precio_bs: '',
  iva_porcentaje: '',
  tipo_documento: '',
  documento_otro: '',
  notas: '',
};

const vacioONulo = (v) => v === '' || v === null || v === undefined;
const aNum = (v) => (vacioONulo(v) ? null : parseFloat(v));
const num = (v) => (vacioONulo(v) ? 0 : parseFloat(v) || 0);
const redondear = (n) => Math.round(n * 100) / 100;

const estiloInput = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const estiloLabel = { display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 };
const estiloCalculado = { ...estiloInput, background: '#f5f7fa', color: '#333', fontWeight: 600 };

export default function SuministroForm({ suministro, onClose }) {
  const [form, setForm] = useState(suministro ? { ...vacio, ...suministro } : { ...vacio });
  const [ivaDefecto, setIvaDefecto] = useState(16);
  const [existentes, setExistentes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    API.get('/suministros/config/iva')
      .then(r => { if (r.data && r.data.iva_porcentaje !== undefined) setIvaDefecto(r.data.iva_porcentaje); })
      .catch(() => {});
    API.get('/suministros/')
      .then(r => setExistentes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const CAMPOS_TEXTO = ['nombre', 'proveedor', 'notas', 'documento_otro', 'unidad'];

  const set = (k, v) => setForm(f => {
    const nf = { ...f, [k]: CAMPOS_TEXTO.includes(k) ? v.toUpperCase() : v };
    // Si hay precio en dólares y tasa, el precio en Bs se calcula solo
    if ((k === 'ultimo_precio' || k === 'tasa_cambio') && !vacioONulo(nf.ultimo_precio) && !vacioONulo(nf.tasa_cambio)) {
      nf.precio_bs = String(redondear(num(nf.ultimo_precio) * num(nf.tasa_cambio)));
    }
    // Si el nombre coincide con un suministro ya creado, se traen sus datos fijos
    if (k === 'nombre' && !suministro) {
      const m = existentes.find(x => (x.nombre || '').trim().toUpperCase() === nf.nombre.trim());
      if (m) {
        ['categoria', 'unidad', 'frecuencia_compra', 'proveedor'].forEach(c => {
          if (vacioONulo(nf[c]) && !vacioONulo(m[c])) nf[c] = m[c];
        });
      }
    }
    return nf;
  });

  const coincide = suministro ? null : existentes.find(
    x => (x.nombre || '').trim().toUpperCase() === (form.nombre || '').trim().toUpperCase()
  );

  const esBs = !form.moneda_pago || form.moneda_pago === 'Bs';
  const pct = vacioONulo(form.iva_porcentaje) ? ivaDefecto : num(form.iva_porcentaje);
  const simbolo = SIMBOLO[form.moneda_pago] || '';

  // Cálculos en Bs
  const hayBase = !vacioONulo(form.precio_bs);
  const ivaBs = hayBase ? redondear(num(form.precio_bs) * pct / 100) : null;
  const totalBs = hayBase ? redondear(num(form.precio_bs) + ivaBs) : null;

  // Cálculos en la moneda de pago (dólares, euros, USDT)
  const hayPrecio = !vacioONulo(form.ultimo_precio);
  const ivaDivisa = hayPrecio ? redondear(num(form.ultimo_precio) * pct / 100) : null;
  const totalDivisa = hayPrecio ? redondear(num(form.ultimo_precio) + ivaDivisa) : null;

  const guardarIvaDefecto = async () => {
    setError(''); setAviso('');
    try {
      await API.put('/suministros/config/iva', { iva_porcentaje: pct });
      setIvaDefecto(pct);
      setAviso(`IVA por defecto guardado: ${pct}%`);
    } catch (e) {
      setError('No se pudo guardar el IVA por defecto.');
    }
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.categoria) { setError('Selecciona una categoría'); return; }
    if (form.unidad && !UNIDADES.includes(form.unidad) && !(suministro && suministro.unidad === form.unidad)) {
      setError('Elige una unidad de la lista');
      return;
    }
    if (form.tipo_documento === 'Otro' && !(form.documento_otro || '').trim()) {
      setError('Especifique el tipo de documento');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const payload = {
        ...form,
        unidad: form.unidad || null,
        frecuencia_compra: form.frecuencia_compra || null,
        ultima_fecha_compra: form.ultima_fecha_compra || null,
        moneda_pago: form.moneda_pago || null,
        ultimo_precio: aNum(form.ultimo_precio),
        iva_porcentaje: pct,
        tasa_cambio: esBs ? aNum(form.tasa_cambio) : null,
        precio_bs: esBs ? aNum(form.precio_bs) : null,
        iva_bs: esBs ? ivaBs : null,
        monto_total_bs: esBs ? totalBs : null,
        iva_divisa: esBs ? null : ivaDivisa,
        monto_total_divisa: esBs ? null : totalDivisa,
        tipo_documento: form.tipo_documento || null,
        documento_otro: form.tipo_documento === 'Otro' ? (form.documento_otro || null) : null,
      };
      const destino = suministro || coincide;
      if (destino) {
        await API.put(`/suministros/${destino.id}`, payload);
      } else {
        await API.post('/suministros/', payload);
      }
      onClose();
    } catch (e) {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = (label, key, tipo = 'text', requerido = false, extra = {}) => (
    <div style={{ marginBottom: 16 }}>
      <label style={estiloLabel}>
        {label}{requerido && <span style={{ color: '#e24b4a' }}> *</span>}
      </label>
      <input
        type={tipo}
        value={form[key] ?? ''}
        onChange={e => set(key, e.target.value)}
        style={estiloInput}
        {...extra}
      />
    </div>
  );

  const lista = (label, key, opciones, requerido = false) => (
    <div style={{ marginBottom: 16 }}>
      <label style={estiloLabel}>
        {label}{requerido && <span style={{ color: '#e24b4a' }}> *</span>}
      </label>
      <select value={form[key] || ''} onChange={e => set(key, e.target.value)} style={estiloInput}>
        <option value="">Seleccionar...</option>
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const calculado = (label, valor, prefijo = '') => (
    <div style={{ marginBottom: 16 }}>
      <label style={estiloLabel}>{label}</label>
      <input
        type="text"
        readOnly
        value={valor === null ? '' : `${prefijo}${valor.toFixed(2)}`}
        placeholder="Se calcula solo"
        style={estiloCalculado}
      />
    </div>
  );

  const etiquetaPrecio = form.moneda_pago === 'Euros' ? 'Precio (EUR)'
    : form.moneda_pago === 'USDT' ? 'Precio (USDT)' : 'Precio (USD)';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {suministro ? 'Editar suministro' : 'Ingresar compra'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

          <div style={{ gridColumn: '1 / -1' }}>
            {campo('Nombre del suministro', 'nombre', 'text', true, { list: 'lista-suministros', autoComplete: 'off', placeholder: 'Escribe o elige uno ya creado' })}
            <datalist id="lista-suministros">
              {existentes.map(x => <option key={x.id} value={x.nombre} />)}
            </datalist>
            {coincide && (
              <div style={{ marginTop: -8, marginBottom: 16, fontSize: 12, color: '#1a7a3c' }}>
                Este suministro ya existe: se actualizará con esta compra, no se creará otro.
              </div>
            )}
          </div>

          {lista('Categoría', 'categoria', CATEGORIAS, true)}
          <div>
            {campo('Unidad de medida', 'unidad', 'text', false, { list: 'lista-unidades', autoComplete: 'off', placeholder: 'Escribe para buscar' })}
            <datalist id="lista-unidades">
              {UNIDADES.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>

          {lista('Frecuencia de compra', 'frecuencia_compra', FRECUENCIAS)}
          {campo('Último proveedor', 'proveedor')}

          {campo('Fecha de compra', 'ultima_fecha_compra', 'date')}
          {lista('Pagado en', 'moneda_pago', MONEDAS)}

          {campo(etiquetaPrecio, 'ultimo_precio', 'number', false, { step: '0.01', min: '0' })}

          {esBs ? (
            <>
              {campo('Tasa de cambio (Bs por USD)', 'tasa_cambio', 'number', false, { step: '0.0001', min: '0' })}
              {campo('Precio en Bs (base imponible)', 'precio_bs', 'number', false, { step: '0.01', min: '0' })}
              <div style={{ gridColumn: '1 / -1', marginTop: -8, marginBottom: 16, fontSize: 12, color: '#888' }}>
                Si escribes el precio en dólares y la tasa, el Precio en Bs se calcula solo. Si el precio ya está en Bs, escríbelo directo.
              </div>
            </>
          ) : (
            <div />
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={estiloLabel}>IVA (%)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" step="0.01" min="0" max="100"
                value={vacioONulo(form.iva_porcentaje) ? ivaDefecto : form.iva_porcentaje}
                onChange={e => set('iva_porcentaje', e.target.value)}
                style={estiloInput}
              />
              <button type="button" onClick={guardarIvaDefecto}
                style={{ padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#444', whiteSpace: 'nowrap' }}>
                Guardar como defecto
              </button>
            </div>
          </div>

          {esBs ? (
            <>
              {calculado('IVA en Bs', ivaBs)}
              {calculado('Monto total en Bs (base + IVA)', totalBs)}
            </>
          ) : (
            <>
              {calculado(`IVA (${form.moneda_pago})`, ivaDivisa, simbolo)}
              {calculado(`Monto total (${form.moneda_pago})`, totalDivisa, simbolo)}
            </>
          )}

          {lista('Tipo de documento', 'tipo_documento', DOCUMENTOS)}
          {form.tipo_documento === 'Otro' && campo('ESPECIFIQUE', 'documento_otro', 'text', true)}

          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={estiloLabel}>Notas</label>
            <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} rows={3}
              style={{ ...estiloInput, resize: 'vertical' }} />
          </div>
        </div>

        {aviso && <p style={{ color: '#1a7a3c', fontSize: 13, marginBottom: 16 }}>{aviso}</p>}
        {error && <p style={{ color: '#e24b4a', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            style={{ padding: '10px 24px', background: '#2a78d6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
