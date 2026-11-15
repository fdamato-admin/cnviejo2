from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from ..database import get_db
from ..models import Suministro, Configuracion, CompraSuministro
from ..schemas import SuministroCreate, SuministroUpdate, SuministroOut

router = APIRouter(prefix="/suministros", tags=["Suministros"])

def _monto_usd(s):
    m = s.moneda_pago or "Bs"
    if m == "Bs":
        if s.monto_total_bs is not None and s.tasa_cambio:
            return s.monto_total_bs / s.tasa_cambio
        return None
    if m == "Euros":
        return None
    return s.monto_total_divisa


def _registrar_compra(db, s):
    if not s.ultima_fecha_compra:
        return
    existe = db.query(CompraSuministro).filter(
        CompraSuministro.suministro_id == s.id,
        CompraSuministro.fecha_compra == s.ultima_fecha_compra,
    ).first()
    if existe:
        existe.cantidad = s.cantidad
        existe.monto_usd = _monto_usd(s)
        existe.nombre = s.nombre
    else:
        db.add(CompraSuministro(suministro_id=s.id, fecha_compra=s.ultima_fecha_compra, cantidad=s.cantidad, monto_usd=_monto_usd(s), nombre=s.nombre))


@router.get("/", response_model=List[SuministroOut])
def listar_suministros(
    categoria: Optional[str] = None,
    buscar: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Suministro)
    if categoria:
        q = q.filter(Suministro.categoria == categoria)
    if buscar:
        q = q.filter(or_(
            Suministro.nombre.ilike(f"%{buscar}%"),
            Suministro.categoria.ilike(f"%{buscar}%"),
            Suministro.proveedor.ilike(f"%{buscar}%")
        ))
    return q.order_by(Suministro.nombre).all()

@router.get("/{id}", response_model=SuministroOut)
def obtener_suministro(id: int, db: Session = Depends(get_db)):
    s = db.query(Suministro).filter(Suministro.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    return s

@router.post("/", response_model=SuministroOut, status_code=201)
def crear_suministro(data: SuministroCreate, db: Session = Depends(get_db)):
    s = Suministro(**data.model_dump())
    db.add(s)
    db.flush()
    _registrar_compra(db, s)
    db.commit()
    db.refresh(s)
    return s

@router.put("/{id}", response_model=SuministroOut)
def actualizar_suministro(id: int, data: SuministroUpdate, db: Session = Depends(get_db)):
    s = db.query(Suministro).filter(Suministro.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.flush()
    if "ultima_fecha_compra" in data.model_fields_set:
        _registrar_compra(db, s)
    db.commit()
    db.refresh(s)
    return s

@router.delete("/{id}", status_code=204)
def eliminar_suministro(id: int, db: Session = Depends(get_db)):
    s = db.query(Suministro).filter(Suministro.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Suministro no encontrado")
    db.delete(s)
    db.commit()


@router.get("/config/iva")
def obtener_iva(db: Session = Depends(get_db)):
    c = db.query(Configuracion).filter(Configuracion.clave == "iva_porcentaje").first()
    return {"iva_porcentaje": float(c.valor) if c else 16.0}


@router.put("/config/iva")
def guardar_iva(data: dict, db: Session = Depends(get_db)):
    try:
        valor = float(data.get("iva_porcentaje"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="IVA invalido")
    if valor < 0 or valor > 100:
        raise HTTPException(status_code=400, detail="IVA fuera de rango")
    c = db.query(Configuracion).filter(Configuracion.clave == "iva_porcentaje").first()
    if c:
        c.valor = str(valor)
    else:
        db.add(Configuracion(clave="iva_porcentaje", valor=str(valor)))
    db.commit()
    return {"iva_porcentaje": valor}


@router.get("/config/frecuencias")
def frecuencias_compra(db: Session = Depends(get_db)):
    historial = {}
    for c in db.query(CompraSuministro).all():
        historial.setdefault(c.suministro_id, set()).add(c.fecha_compra)
    salida = []
    for s in db.query(Suministro).all():
        fechas = set(historial.get(s.id, set()))
        if s.ultima_fecha_compra:
            fechas.add(s.ultima_fecha_compra)
        fechas = sorted(fechas)
        promedio = None
        if len(fechas) >= 2:
            promedio = (fechas[-1] - fechas[0]).days / (len(fechas) - 1)
        salida.append({
            "nombre": (s.nombre or "").strip().upper(),
            "promedio_dias": promedio,
            "compras": len(fechas),
        })
    return salida


# â”€â”€ Factura multi-item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class _ItemFacturaIn(BaseModel):
    nombre: str
    categoria: str
    unidad: Optional[str] = ""
    cantidad: float = 1
    precio_unitario: float = 0
    aplica_iva: bool = True
    iva_porcentaje: float = 16.0
    moneda_pago: str = "Dolares"
    tasa_cambio: float = 0

class _FacturaIn(BaseModel):
    fecha_compra: str
    tipo_documento: str
    documento_otro: Optional[str] = ""
    proveedor: Optional[str] = ""
    estado_recepcion: Optional[str] = "Recibido"
    notas: Optional[str] = ""
    items: List[_ItemFacturaIn] = []

@router.post("/factura", status_code=201)
def ingresar_factura(data: _FacturaIn, db: Session = Depends(get_db)):
    import math
    def rnd(n): return math.floor(n * 100 + 0.5) / 100

    try:
        from datetime import date as _d
        fecha = _d.fromisoformat(data.fecha_compra)
    except Exception:
        raise HTTPException(status_code=400, detail="Fecha invalida")

    resultado = []
    for it in data.items:
        precio = it.precio_unitario or 0
        qty = it.cantidad or 1
        iva_pct = it.iva_porcentaje if it.aplica_iva else 0
        sub = rnd(precio * qty)
        iva_monto = rnd(sub * iva_pct / 100)
        total = rnd(sub + iva_monto)
        esBs = (it.moneda_pago == "Bs")

        existente = db.query(Suministro).filter(
            Suministro.nombre.ilike(it.nombre.strip())
        ).first()

        campos = dict(
            nombre=it.nombre.strip().upper(),
            categoria=it.categoria,
            unidad=it.unidad or None,
            proveedor=(data.proveedor or "").strip().upper() or None,
            ultima_fecha_compra=fecha,
            cantidad=qty,
            ultimo_precio=precio,
            moneda_pago=it.moneda_pago,
            tipo_documento=data.tipo_documento,
            documento_otro=data.documento_otro or None,
            estado_recepcion=data.estado_recepcion or "Recibido",
            notas=data.notas or None,
            iva_porcentaje=iva_pct if it.aplica_iva else None,
        )
        if esBs:
            tasa = it.tasa_cambio or 0
            precio_bs = rnd(precio * tasa) if tasa else precio
            sub_bs = rnd(precio_bs * qty)
            iva_bs = rnd(sub_bs * iva_pct / 100)
            total_bs = rnd(sub_bs + iva_bs)
            campos.update(
                tasa_cambio=tasa or None,
                precio_bs=precio_bs,
                iva_bs=iva_bs,
                monto_total_bs=total_bs,
                iva_divisa=None,
                monto_total_divisa=None,
            )
        else:
            campos.update(
                tasa_cambio=None,
                precio_bs=None,
                iva_bs=None,
                monto_total_bs=None,
                iva_divisa=iva_monto,
                monto_total_divisa=total,
            )

        if existente:
            for k, v in campos.items():
                setattr(existente, k, v)
            s = existente
        else:
            s = Suministro(**campos)
            db.add(s)

        db.flush()
        _registrar_compra(db, s)
        resultado.append({"nombre": s.nombre, "id": s.id})

    db.commit()
    return {"ok": True, "registros": len(resultado), "items": resultado}
