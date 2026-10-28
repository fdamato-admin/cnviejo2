from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class TipoProveedor(str, enum.Enum):
    servicio = "servicio"      # mano de obra, técnicos
    insumo = "insumo"          # materiales, equipos, químicos
    ambos = "ambos"

class EstadoProveedor(str, enum.Enum):
    activo = "activo"
    inactivo = "inactivo"
    en_evaluacion = "en_evaluacion"

class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    empresa = Column(String(150), nullable=True)          # opcional — puede ser informal
    tipo = Column(Enum(TipoProveedor), nullable=False)
    categoria = Column(String(100), nullable=False)       # ej: "Aire acondicionado", "Químicos piscina"
    telefono = Column(String(30), nullable=True)
    telefono_alt = Column(String(30), nullable=True)
    email = Column(String(120), nullable=True)
    ubicacion = Column(String(150), nullable=True)        # ciudad/zona
    estado = Column(Enum(EstadoProveedor), default=EstadoProveedor.activo)
    rif = Column(String(30), nullable=True)                # RIF / cédula fiscal
    direccion = Column(String(250), nullable=True)         # dirección física
    referido_por = Column(String(150), nullable=True)     # quién lo recomendó
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    cotizaciones = relationship("Cotizacion", back_populates="proveedor")


# ── Trabajos ────────────────────────────────────────────────────────────────

class TipoTrabajo(str, enum.Enum):
    servicio = "servicio"
    insumo = "insumo"
    ambos = "ambos"

class PrioridadTrabajo(str, enum.Enum):
    urgente = "urgente"
    normal = "normal"
    puede_esperar = "puede_esperar"

class EstadoTrabajo(str, enum.Enum):
    pendiente_cotizacion = "pendiente_cotizacion"
    cotizaciones_recibidas = "cotizaciones_recibidas"
    aprobado = "aprobado"
    en_ejecucion = "en_ejecucion"
    completado = "completado"
    cancelado = "cancelado"

class Trabajo(Base):
    __tablename__ = "trabajos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(String(100), nullable=False)
    tipo = Column(Enum(TipoTrabajo), nullable=False)
    prioridad = Column(Enum(PrioridadTrabajo), default=PrioridadTrabajo.normal)
    estado = Column(Enum(EstadoTrabajo), default=EstadoTrabajo.pendiente_cotizacion)
    ubicacion = Column(String(150), nullable=True)       # villa o área común
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    cotizaciones = relationship("Cotizacion", back_populates="trabajo")


# ── Cotizaciones ────────────────────────────────────────────────────────────

class EstadoCotizacion(str, enum.Enum):
    pendiente = "pendiente"        # enviada, esperando respuesta
    recibida = "recibida"          # proveedor respondió
    aprobada = "aprobada"
    rechazada = "rechazada"

class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id = Column(Integer, primary_key=True, index=True)
    trabajo_id = Column(Integer, ForeignKey("trabajos.id"), nullable=False)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    proveedor_nombre = Column(String(150), nullable=True)   # por si es manual sin proveedor registrado
    tipo = Column(Enum(TipoTrabajo), nullable=False)        # servicio o insumo
    estado = Column(Enum(EstadoCotizacion), default=EstadoCotizacion.pendiente)
    monto = Column(Numeric(12, 2), nullable=True)
    moneda = Column(String(10), default="USD")
    descripcion = Column(Text, nullable=True)               # detalle de lo cotizado
    es_manual = Column(Boolean, default=True)               # False = enviada por email
    email_enviado_a = Column(String(120), nullable=True)
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    trabajo = relationship("Trabajo", back_populates="cotizaciones")
    proveedor = relationship("Proveedor", back_populates="cotizaciones")
