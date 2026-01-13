"""
Database seeding script.

Populates the database with initial headphone catalog data.

Usage:
    python seeds/seed_db.py

Requirements:
    - Database must be created and migrated
    - Run from project root directory
"""
import asyncio
import json
import sys
from pathlib import Path
from decimal import Decimal

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import settings
from app.models import Headphone, HeadphoneType, BackType, PriceTier


async def load_headphones_data() -> list[dict]:
    """Load headphones from JSON file."""
    json_path = Path(__file__).parent / "headphones.json"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"✅ Loaded {len(data)} headphones from {json_path.name}")
    return data


async def seed_headphones(session: AsyncSession, headphones_data: list[dict]):
    """
    Seed headphones into database.

    Args:
        session: Database session
        headphones_data: List of headphone dictionaries
    """
    # Check if headphones already exist
    result = await session.execute(select(Headphone))
    existing = result.scalars().all()

    if existing:
        print(f"⚠️  Database already contains {len(existing)} headphones")
        response = input("Do you want to clear and re-seed? (y/N): ")

        if response.lower() == "y":
            # Delete all existing headphones
            for hp in existing:
                await session.delete(hp)
            await session.commit()
            print(f"🗑️  Deleted {len(existing)} existing headphones")
        else:
            print("❌ Seeding cancelled")
            return

    # Create headphone objects
    headphones = []
    for data in headphones_data:
        headphone = Headphone(
            brand=data["brand"],
            model=data["model"],
            full_name=data["full_name"],
            slug=data["slug"],
            headphone_type=HeadphoneType(data["headphone_type"]),
            back_type=BackType(data["back_type"]),
            is_wireless=data["is_wireless"],
            has_anc=data["has_anc"],
            price_usd=Decimal(str(data["price_usd"])),
            price_tier=PriceTier(data["price_tier"]),
            image_url=data["image_url"],
            sound_signature=data["sound_signature"],
            description=data["description"],
            key_features=data["key_features"],
            pros=data["pros"],
            cons=data["cons"],
            detailed_specs=data["detailed_specs"],
            target_genres=data["target_genres"],
            target_use_cases=data["target_use_cases"],
        )
        headphones.append(headphone)
        session.add(headphone)

    # Commit all headphones
    await session.commit()

    print(f"✅ Successfully seeded {len(headphones)} headphones!")
    print("\n📊 Breakdown by price tier:")

    # Count by tier
    tier_counts = {}
    for hp in headphones:
        tier = hp.price_tier.value
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

    for tier, count in sorted(tier_counts.items()):
        print(f"   - {tier}: {count}")


async def verify_seed(session: AsyncSession):
    """Verify seeded data."""
    result = await session.execute(select(Headphone))
    headphones = result.scalars().all()

    print(f"\n✅ Verification: {len(headphones)} headphones in database")

    # Show some examples
    if headphones:
        print("\n🎧 Sample headphones:")
        for hp in headphones[:5]:
            print(f"   - {hp.full_name} (${hp.price_usd}) - {hp.price_tier.value}")


async def main():
    """Main seeding function."""
    print("=" * 60)
    print("SonicMatch Database Seeding")
    print("=" * 60)
    print()

    # Create async engine
    engine = create_async_engine(
        settings.database_url,
        echo=False,
    )

    # Create session factory
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    try:
        # Load data
        headphones_data = await load_headphones_data()

        # Seed database
        async with async_session() as session:
            await seed_headphones(session, headphones_data)
            await verify_seed(session)

        print("\n" + "=" * 60)
        print("✅ Seeding complete!")
        print("=" * 60)

    except FileNotFoundError as e:
        print(f"❌ Error: Could not find headphones.json file")
        print(f"   Make sure you're running from the project root directory")
        sys.exit(1)

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
