"""
Seed script for review chunks with embeddings.

Reads review_chunks.json and populates the review_chunks table with
embedded content for RAG retrieval.
"""
import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import settings
from app.models import Headphone, ReviewChunk, SourceType
from app.services.embedding_service import embedding_service


async def load_headphone_mapping(session: AsyncSession) -> Dict[str, str]:
    """
    Load mapping of headphone slugs to UUIDs.

    Args:
        session: Database session

    Returns:
        Dictionary mapping slug -> UUID string
    """
    result = await session.execute(select(Headphone.slug, Headphone.id))
    return {slug: str(uuid) for slug, uuid in result.all()}


def chunk_text(text: str, max_tokens: int = 300, min_tokens: int = 150) -> List[str]:
    """
    Split text into chunks if it exceeds max_tokens.

    Simple word-based chunking with overlap to avoid splitting mid-sentence.
    For embedding purposes, we use approximate token count (words / 0.75).

    Args:
        text: Text to chunk
        max_tokens: Maximum tokens per chunk
        min_tokens: Minimum tokens per chunk

    Returns:
        List of text chunks
    """
    words = text.split()
    approx_tokens = len(words) / 0.75  # Rough approximation

    if approx_tokens <= max_tokens:
        return [text]

    # Split into chunks with 20% overlap
    max_words = int(max_tokens * 0.75)
    overlap_words = int(max_words * 0.2)
    chunks = []
    start = 0

    while start < len(words):
        end = min(start + max_words, len(words))
        chunk_words = words[start:end]
        chunks.append(' '.join(chunk_words))

        if end >= len(words):
            break

        start = end - overlap_words

    return chunks


async def seed_review_chunks():
    """Main seeding function."""
    print("=" * 80)
    print("SonicMatch Review Chunks Seeding")
    print("=" * 80)

    # Load review chunks JSON
    json_path = Path(__file__).parent / "review_chunks.json"
    if not json_path.exists():
        print(f"ERROR: {json_path} not found")
        sys.exit(1)

    print(f"\nLoading review chunks from {json_path.name}...")
    with open(json_path) as f:
        chunks_data = json.load(f)

    print(f"Loaded {len(chunks_data)} review chunks")

    # Create database session
    engine = create_async_engine(
        settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
        echo=False,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Load headphone mapping
        print("\nLoading headphone mapping from database...")
        headphone_map = await load_headphone_mapping(session)
        print(f"Found {len(headphone_map)} headphones in database")

        # Validate all slugs exist
        missing_slugs = set()
        for chunk_data in chunks_data:
            slug = chunk_data["headphone_slug"]
            if slug not in headphone_map:
                missing_slugs.add(slug)

        if missing_slugs:
            print(f"\nERROR: Found chunks for non-existent headphones: {missing_slugs}")
            print("Please seed headphones first using seed_headphones.py")
            sys.exit(1)

        # Check if review_chunks table already has data
        result = await session.execute(select(ReviewChunk))
        existing_chunks = result.scalars().all()

        if existing_chunks:
            print(f"\nWARNING: Found {len(existing_chunks)} existing review chunks")
            response = input("Delete existing chunks and re-seed? (y/N): ")
            if response.lower() == 'y':
                print("Deleting existing chunks...")
                for chunk in existing_chunks:
                    await session.delete(chunk)
                await session.commit()
                print(f"Deleted {len(existing_chunks)} chunks")
            else:
                print("Keeping existing chunks, exiting.")
                return

        # Process chunks: split if needed, collect texts for embedding
        processed_chunks = []
        all_texts = []

        print("\nProcessing and chunking text...")
        for chunk_data in chunks_data:
            text = chunk_data["chunk_text"]
            sub_chunks = chunk_text(text, max_tokens=300, min_tokens=150)

            for sub_chunk in sub_chunks:
                processed_chunks.append({
                    "headphone_id": headphone_map[chunk_data["headphone_slug"]],
                    "source_type": SourceType(chunk_data["source_type"]),
                    "source_url": chunk_data["source_url"],
                    "chunk_text": sub_chunk,
                })
                all_texts.append(sub_chunk)

        print(f"After chunking: {len(processed_chunks)} total chunks")

        # Generate embeddings in batches
        print(f"\nGenerating embeddings for {len(all_texts)} chunks...")
        print(f"Using {settings.embedding_provider} - {settings.embedding_model}")
        print(f"Batch size: {settings.embedding_batch_size}")

        try:
            embeddings = await embedding_service.embed_batch(all_texts)
            print(f"Successfully generated {len(embeddings)} embeddings")
        except Exception as e:
            print(f"ERROR generating embeddings: {e}")
            sys.exit(1)

        # Insert chunks with embeddings
        print("\nInserting review chunks into database...")
        for i, (chunk_data, embedding) in enumerate(zip(processed_chunks, embeddings)):
            review_chunk = ReviewChunk(
                headphone_id=chunk_data["headphone_id"],
                source_type=chunk_data["source_type"],
                source_url=chunk_data["source_url"],
                chunk_text=chunk_data["chunk_text"],
                embedding=embedding,
            )
            session.add(review_chunk)

            if (i + 1) % 50 == 0:
                print(f"  Inserted {i + 1}/{len(processed_chunks)} chunks...")

        await session.commit()
        print(f"\n✓ Successfully inserted {len(processed_chunks)} review chunks")

        # Print summary stats
        print("\nSummary by source type:")
        source_counts = {}
        for chunk in processed_chunks:
            source_type = chunk["source_type"].value
            source_counts[source_type] = source_counts.get(source_type, 0) + 1

        for source_type, count in sorted(source_counts.items()):
            print(f"  {source_type}: {count} chunks")

        # Print per-headphone stats
        print("\nChunks per headphone:")
        headphone_counts = {}
        for chunk in processed_chunks:
            headphone_id = chunk["headphone_id"]
            headphone_counts[headphone_id] = headphone_counts.get(headphone_id, 0) + 1

        # Get headphone names
        headphone_names = {v: k for k, v in headphone_map.items()}
        for headphone_id, count in sorted(headphone_counts.items(), key=lambda x: -x[1])[:10]:
            slug = headphone_names.get(headphone_id, "unknown")
            print(f"  {slug}: {count} chunks")

    print("\n" + "=" * 80)
    print("Seeding completed successfully!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(seed_review_chunks())
