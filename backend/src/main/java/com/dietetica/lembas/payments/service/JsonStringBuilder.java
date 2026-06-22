package com.dietetica.lembas.payments.service;

import java.util.List;
import java.util.Map;

/**
 * Minimal JSON string builder used by the webhook processor to build a
 * compact, single-line JSON payload for storage in the {@code payments.metadata}
 * JSONB column. Avoids pulling in another dependency and keeps the resulting
 * string small enough to fit in a {@code @Column} of any reasonable length.
 */
final class JsonStringBuilder {

    /** Returns the supplied map as a compact JSON string. Values are best-effort serialized. */
    static String build(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) {
                sb.append(',');
            }
            first = false;
            sb.append('"').append(escape(entry.getKey())).append('"').append(':');
            appendValue(sb, entry.getValue());
        }
        sb.append('}');
        return sb.toString();
    }

    /** Appends a single value to the supplied builder, escaping strings. */
    private static void appendValue(StringBuilder sb, Object value) {
        if (value == null) {
            sb.append("null");
        } else if (value instanceof Number || value instanceof Boolean) {
            sb.append(value);
        } else if (value instanceof Map<?, ?> nested) {
            Map<String, Object> typed = castMap(nested);
            sb.append(build(typed));
        } else if (value instanceof List<?> list) {
            sb.append('[');
            boolean first = true;
            for (Object item : list) {
                if (!first) {
                    sb.append(',');
                }
                first = false;
                appendValue(sb, item);
            }
            sb.append(']');
        } else {
            sb.append('"').append(escape(value.toString())).append('"');
        }
    }

    /** Best-effort cast for nested map serialization. */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Map<?, ?> raw) {
        Map<String, Object> typed = new java.util.LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : raw.entrySet()) {
            typed.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        return typed;
    }

    /** Escapes characters that would break a JSON string literal. */
    private static String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private JsonStringBuilder() {
    }
}
