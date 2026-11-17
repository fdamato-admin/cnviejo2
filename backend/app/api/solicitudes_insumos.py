from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime
from ..database import get_db
from ..models import (SolicitudInsumos, SolicitudInsumoItem, Proveedor,
                      EstadoSolicitudInsumos, EstadoProveedor, TipoProveedor,
                      CompraSuministro, Suministro, NivelPermiso)
from ..auth import get_current_user, require_permiso
from ..models import Usuario

router = APIRouter(prefix="/solicitudes-insumos", tags=["Solicitudes de Insumos"])

# --- Schemas inline ---
class ItemIn(BaseModel):
    descripcion: str
    cantidad: Optional[str] = None
    unidad: Optional[str] = None
    alternativa: Optional[str] = None
    precio_usd: Optional[float] = None
    tasa_bs: Optional[float] = None
    subtotal_usd: Optional[float] = None

class SolicitudInsumoIn(BaseModel):
    obra: str
    fecha_requerida: Optional[str] = None
    observaciones: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    proveedor_telefono: Optional[str] = None
    validez: Optional[str] = None
    tiempo_entrega: Optional[str] = None
    condicion_pago: Optional[str] = None
    subtotal_usd: Optional[float] = None
    iva_usd: Optional[float] = None
    total_usd: Optional[float] = None
    banco: Optional[str] = None
    titular: Optional[str] = None
    cuenta: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    rif: Optional[str] = None
    observaciones_prov: Optional[str] = None
    items: List[ItemIn] = []

class ItemOut(ItemIn):
    id: int
    aprobado: bool
    class Config: from_attributes = True

class SolicitudInsumoOut(BaseModel):
    id: int
    obra: str
    proveedor_nombre: Optional[str]
    proveedor_telefono: Optional[str]
    condicion_pago: Optional[str]
    subtotal_usd: Optional[float]
    iva_usd: Optional[float]
    total_usd: Optional[float]
    estado: str
    creado_en: Optional[object] = None
    items: List[ItemOut] = []
    class Config:
        from_attributes = True
        json_encoders = {object: str}

class AprobarItemsIn(BaseModel):
    item_ids: List[int]

# --- Endpoints ---
@router.post("/", response_model=SolicitudInsumoOut, status_code=201)
def crear_solicitud(data: SolicitudInsumoIn, db: Session = Depends(get_db)):
    proveedor_id = None
    if data.proveedor_telefono:
        tel = data.proveedor_telefono.strip()
        prov = db.query(Proveedor).filter(
            or_(Proveedor.telefono == tel, Proveedor.telefono_alt == tel)
        ).first()
        if not prov and data.proveedor_nombre:
            prov = Proveedor(
                nombre=data.proveedor_nombre,
                empresa=data.proveedor_nombre,
                tipo=TipoProveedor.insumo,
                categoria="General",
                telefono=tel,
                estado=EstadoProveedor.activo
            )
            db.add(prov)
            db.flush()
        if prov:
            proveedor_id = prov.id

    s = SolicitudInsumos(
        obra=data.obra,
        fecha_requerida=data.fecha_requerida,
        observaciones=data.observaciones,
        proveedor_id=proveedor_id,
        proveedor_nombre=data.proveedor_nombre,
        proveedor_telefono=data.proveedor_telefono,
        validez=data.validez,
        tiempo_entrega=data.tiempo_entrega,
        condicion_pago=data.condicion_pago,
        subtotal_usd=data.subtotal_usd,
        iva_usd=data.iva_usd,
        total_usd=data.total_usd,
        banco=data.banco,
        titular=data.titular,
        cuenta=data.cuenta,
        tipo_cuenta=data.tipo_cuenta,
        rif=data.rif,
        observaciones_prov=data.observaciones_prov,
        estado=EstadoSolicitudInsumos.cotizada if data.proveedor_nombre else EstadoSolicitudInsumos.pendiente
    )
    db.add(s)
    db.flush()

    for it in data.items:
        item = SolicitudInsumoItem(
            solicitud_id=s.id,
            descripcion=it.descripcion,
            cantidad=it.cantidad,
            unidad=it.unidad,
            alternativa=it.alternativa,
            precio_usd=it.precio_usd,
            tasa_bs=it.tasa_bs,
            subtotal_usd=it.subtotal_usd
        )
        db.add(item)

    db.commit()
    db.refresh(s)
    return s

@router.get("/", response_model=List[SolicitudInsumoOut])
def listar_solicitudes(db: Session = Depends(get_db)):
    return db.query(SolicitudInsumos).order_by(SolicitudInsumos.creado_en.desc()).all()

@router.get("/{id}", response_model=SolicitudInsumoOut)
def obtener_solicitud(id: int, db: Session = Depends(get_db)):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")
    return s

@router.patch("/{id}/aprobar-items")
def aprobar_items(id: int, body: AprobarItemsIn, db: Session = Depends(get_db)):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")
    for item in s.items:
        item.aprobado = item.id in body.item_ids
    s.estado = EstadoSolicitudInsumos.aprobada
    db.commit()
    return {"ok": True}

@router.patch("/{id}/convertir-compra")
def convertir_compra(id: int, db: Session = Depends(get_db)):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")

    hoy = date.today()
    items_aprobados = [it for it in s.items if it.aprobado]

    if not items_aprobados:
        raise HTTPException(400, "No hay items aprobados para convertir")

    for it in items_aprobados:
        try:
            cant = float(it.cantidad) if it.cantidad else None
        except (ValueError, TypeError):
            cant = None

        # Crear el suministro en la BD (solo al momento de convertir)
        nuevo_sum = Suministro(
            nombre=it.alternativa or it.descripcion,
            categoria="Cotizacion",
            unidad=it.unidad or "und",
            proveedor=s.proveedor_nombre,
            ultima_fecha_compra=hoy,
            ultimo_precio=it.precio_usd,
            tasa_cambio=it.tasa_bs,
            precio_bs=(it.precio_usd * it.tasa_bs) if (it.precio_usd and it.tasa_bs) else None,
            tipo_documento=s.condicion_pago or None,
            numero_documento=f"COT-{s.id}"
        )
        db.add(nuevo_sum)
        db.flush()  # obtener nuevo_sum.id

        compra = CompraSuministro(
            suministro_id=nuevo_sum.id,
            fecha_compra=hoy,
            cantidad=cant,
            monto_usd=it.subtotal_usd,
            nombre=it.alternativa or it.descripcion
        )
        db.add(compra)

    s.estado = EstadoSolicitudInsumos.convertida
    db.commit()
    return {"id": s.id, "estado": s.estado}

@router.delete("/{id}")
def eliminar_solicitud(
    id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("*", NivelPermiso.admin))
):
    s = db.query(SolicitudInsumos).filter(SolicitudInsumos.id == id).first()
    if not s:
        raise HTTPException(404, "No encontrada")
    db.delete(s)
    db.commit()
    return {"ok": True}
