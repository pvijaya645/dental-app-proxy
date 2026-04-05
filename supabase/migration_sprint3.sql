-- Sprint 3: pgvector similarity search function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION match_knowledge_base(
    query_embedding vector(1536),
    match_business_id uuid,
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    category text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.title,
        kb.content,
        kb.category,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.business_id = match_business_id
      AND kb.is_active = true
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
