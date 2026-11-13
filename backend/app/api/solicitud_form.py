from fastapi import APIRouter
from fastapi.responses import HTMLResponse
import os

router = APIRouter()

@router.get('/solicitud', response_class=HTMLResponse)
def get_solicitud():
    path = os.path.join(os.path.dirname(__file__), '..', '..', 'solicitud.html')
    with open(os.path.abspath(path), 'r', encoding='utf-8') as f:
        return f.read()