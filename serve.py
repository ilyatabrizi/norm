#!/usr/bin/env python3
"""Local preview. Static files, no build step, correct MIME for .webmanifest.

    python3 serve.py          # http://localhost:8101
"""
import functools
import http.server
import pathlib
import socketserver

PORT = 8101
ROOT = pathlib.Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript",
        ".woff2": "font/woff2",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        # Never cache while developing — the service worker is confusing enough.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "GET" in fmt % args and " 200 " not in fmt % args:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), functools.partial(Handler, directory=str(ROOT))) as srv:
        print(f"NORM → http://localhost:{PORT}")
        srv.serve_forever()
