FROM python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --uid 10001 --create-home appuser && mkdir /app/runtime && chown appuser:appuser /app/runtime
COPY --chown=appuser:appuser . .
USER appuser
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HANDOFF_DB=/app/runtime/handoffs.sqlite3
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
