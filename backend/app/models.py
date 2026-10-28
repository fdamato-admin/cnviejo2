from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
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
