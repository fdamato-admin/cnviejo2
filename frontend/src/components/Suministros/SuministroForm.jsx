import React, { useState } from 'react';
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

const UNIDADES = [
  'UNIDAD', 'PAR', 'DOCENA', 'CIENTO', 'MILLAR', 'PIEZA', 'JUEGO', 'KIT', 'SET',
  'CAJA', 'PAQUETE', 'BOLSA', 'SACO', 'BULTO', 'FARDO', 'PALET',
  'ROLLO', 'BOBINA', 'CINTA', 'LÁMINA', 'PLANCHA', 'HOJA', 'RESMA', 'BARRA', 'TUBO', 'CABILLA', 'VARILLA',
  'LITRO', 'MILILITRO', 'GALÓN', 'CUÑETE', 'TAMBOR', 'BARRIL', 'BIDÓN', 'BOTELLA', 'LATA', 'ENVASE', 'FRASCO', 'POTE', 'BALDE', 'CARTUCHO', 'ESPRAY',
  'KILOGRAMO', 'GRAMO', 'LIBRA', 'ONZA', 'TONELADA',
  'METRO', 'METRO LINEAL', 'CENTÍMETRO', 'MILÍMETRO', 'PULGADA', 'PIE', 'YARDA',
  'METRO CUADRADO', 'METRO CÚBICO', 'PIE CUADRADO', 'PIE CÚBICO',
  'TABLETA', 'PASTILLA', 'SOBRE', 'SERVICIO', 'HORA', 'DÍA', 'MES',
];

const DOCUMENTOS = ['Nota de Entrega', 'Factura', 'Otro'];

const vacio = {
  nombre: '',
  categoria: '',
  unidad: '',
  frecuencia_compra: '',
  proveedor: '',
  ultima_fecha_compra: '',
  ultimo_precio: '',
  tasa_cambio: '',
  precio_bs: '',
  iva_bs: '',
  tipo_documento: '',
  documento_otro: '',
  notas: '',
};

const vacioONulo = (v) => v === '' || v === null || v === undefined;
const aNum = (v) => (vacioONulo(v) ? null : parseFloat(v));
const num = (v) => (vacioONulo(v) ? 0 : parseFloat(v) || 0);

const estiloInput = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const estiloLabel = { display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 };

export default function SuministroForm({ suministro, onClose }) {
  const [form, setForm] = useState(suministro ? { ...vacio, ...suministro } : { ...vacio });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const CAMPOS_TEXTO = ['nombre', 'proveedor', 'notas', 'documento_otro'];
  const set = (k, v) => setForm(f => ({ ...f, [k]: CAMPOS_TEXTO.includes(k) ? v.toUpperCase() : v }));

  const hayMontoBs = !vacioONulo(form.precio_bs) || !vacioONulo(form.iva_bs);
  const totalBs = hayMontoBs ? Math.round((num(form.precio_bs) + num(form.iva_bs)) * 100) / 100 : null;

  const unidades = form.unidad && !UNIDADES.includes(form.unidad) ? [form.unidad, ...UNIDADES] : UNIDADES;

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.categoria) { setError('Selecciona una categoría'); return; }
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
        ultimo_precio: aNum(form.ultimo_precio),
        tasa_cambio: aNum(form.tasa_cambio),
        precio_bs: aNum(form.precio_bs),
        iva_bs: aNum(form.iva_bs),
        monto_total_bs: totalBs,
        tipo_documento: form.tipo_documento || null,
        documento_otro: form.tipo_documento === 'Otro' ? (form.documento_otro || null) : null,
      };
      if (suministro) {
        await API.put(`/suministros/${suministro.id}`, payload);
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {suministro ? 'Editar suministro' : 'Nuevo suministro'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

          <div style={{ gridColumn: '1 / -1' }}>{campo('Nombre del suministro', 'nombre', 'text', true)}</div>

          {lista('Categoría', 'categoria', CATEGORIAS, true)}
          {lista('Unidad de medida', 'unidad', unidades)}

          {lista('Frecuencia de compra', 'frecuencia_compra', FRECUENCIAS)}
          {campo('Último proveedor', 'proveedor')}

          {campo('Fecha de compra', 'ultima_fecha_compra', 'date')}
          {campo('Precio (USD)', 'ultimo_precio', 'number', false, { step: '0.01', min: '0' })}

          {campo('Tasa de cambio (Bs por USD)', 'tasa_cambio', 'number', false, { step: '0.0001', min: '0' })}
          {campo('Precio en Bs (base imponible)', 'precio_bs', 'number', false, { step: '0.01', min: '0' })}

          {campo('IVA en Bs', 'iva_bs', 'number', false, { step: '0.01', min: '0' })}
          <div style={{ marginBottom: 16 }}>
            <label style={estiloLabel}>Monto total en Bs (base + IVA)</label>
            <input
              type="text"
              readOnly
              value={totalBs === null ? '' : totalBs.toFixed(2)}
              placeholder="Se calcula solo"
              style={{ ...estiloInput, background: '#f5f7fa', color: '#333', fontWeight: 600 }}
            />
          </div>

          {lista('Tipo de documento', 'tipo_documento', DOCUMENTOS)}
          {form.tipo_documento === 'Otro' && campo('ESPECIFIQUE', 'documento_otro', 'text', true)}

          <div style={{ gridColumn: '1 / -1', marginBottom: 16 }}>
            <label style={estiloLabel}>Notas</label>
            <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} rows={3}
              style={{ ...estiloInput, resize: 'vertical' }} />
          </div>
        </div>

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
