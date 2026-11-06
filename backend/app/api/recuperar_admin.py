"""Recuperacion de acceso del administrador.

Solo actua si en Railway existe la variable RESET_ADMIN_PASSWORD.
Al arrancar el servidor, fija esa clave para el usuario administrador
(por defecto fdamato@cnpv2.com; se puede cambiar con RESET_ADMIN_EMAIL).
Despues de entrar, hay que BORRAR la variable en Railway.
"""
import os


def _recuperar():
    clave = os.environ.get("RESET_ADMIN_PASSWORD")
    if not clave:
        return
    try:
        from sqlalchemy import func
        from sqlalchemy.orm import sessionmaker

        from ..auth import hash_password
        from ..database import engine
        from ..models import NivelPermiso, Permiso, Usuario

        email = (os.environ.get("RESET_ADMIN_EMAIL") or "fdamato@cnpv2.com").strip().lower()
        db = sessionmaker(bind=engine)()
        try:
            existentes = [u.email for u in db.query(Usuario).all()]
            print("RECUPERACION: usuarios existentes ->", existentes)

            u = db.query(Usuario).filter(func.lower(Usuario.email) == email).first()
            if u:
                u.password_hash = hash_password(clave)
                u.activo = True
                accion = "clave restablecida"
            else:
                u = Usuario(nombre="Administrador", email=email, password_hash=hash_password(clave), activo=True)
                db.add(u)
                db.flush()
                accion = "usuario creado"

            p = db.query(Permiso).filter(Permiso.usuario_id == u.id, Permiso.modulo == "*").first()
            if p:
                p.nivel = NivelPermiso.admin
            else:
                db.add(Permiso(usuario_id=u.id, modulo="*", nivel=NivelPermiso.admin))

            db.commit()
            print("RECUPERACION: " + accion + " para " + u.email + ". BORRA la variable RESET_ADMIN_PASSWORD en Railway.")
        except Exception as e:
            db.rollback()
            print("RECUPERACION: fallo ->", repr(e))
        finally:
            db.close()
    except Exception as e:
        print("RECUPERACION: no se pudo ejecutar ->", repr(e))


_recuperar()
