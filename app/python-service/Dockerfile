FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-5001}"
