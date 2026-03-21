-- AI call observability: logs every Gemini API call for debugging and monitoring
CREATE TABLE IF NOT EXISTS ai_call_logs (
    id              SERIAL PRIMARY KEY,
    request_id      TEXT,
    operation       TEXT NOT NULL,
    model_requested TEXT,
    model_used      TEXT,
    prompt_hash     TEXT,
    latency_ms      INT,
    status          TEXT NOT NULL,
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_operation ON ai_call_logs(operation);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_call_logs(status);
