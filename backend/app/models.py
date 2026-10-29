from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class NivelPermiso(str, enum.Enum):
    admin = "admin"
    operador = "operador"
    consulta = "consulta"

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    permisos = relationship("Permiso", back_populates="usuario", cascade="all, delete-orphan")

class Permiso(Base):
    __tablename__ = "permisos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    modulo = Column(String(50), nullable=False)
    nivel = Column(Enum(NivelPermiso), nullable=False)
    usuario = relationship("Usuario", back_populates="permisos")

class Proveedor(Base):
    __tablename__ = "proveedores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    rif = Column(String(20), unique=True, nullable=True)
    telefono = Column(String(30), nullable=True)
    email = Column(String(120), nullable=True)
    direccion = Column(Text, nullable=True)
    especialidad = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    trabajos = relationship("Trabajo", back_populates="proveedor")

class Trabajo(Base):
    __tablename__ = "trabajos"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    estado = Column(String(30), default="pendiente")
    fecha_inicio = Column(DateTime(timezone=True), nullable=True)
    fecha_fin = Column(DateTime(timezone=True), nullable=True)
    monto = Column(String(50), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    proveedor = relationship("Proveedor", back_populates="trabajos")

class Cotizacion(Base):
    __tablename__ = "cotizaciones"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    monto = Column(String(50), nullable=True)
    estado = Column(String(30), default="pendiente")
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    proveedor = relationship("Proveedor")
