"""
Widget route — serves the embeddable JavaScript chat widget.

GET /widget.js  — returns the widget script (dental offices embed this)
GET /widget-demo — demo page to test the widget
"""

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, HTMLResponse, Response
import os

router = APIRouter(tags=["widget"])

WIDGET_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "public")


@router.get("/widget.js")
def serve_widget():
    path = os.path.join(WIDGET_DIR, "widget.js")
    return FileResponse(path, media_type="application/javascript")


@router.get("/widget-demo", response_class=HTMLResponse)
def widget_demo():
    path = os.path.join(WIDGET_DIR, "widget-demo.html")
    with open(path, encoding="utf-8") as f:
        return f.read()
