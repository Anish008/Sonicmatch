"""
Evaluation script for SonicMatch recommendation engine.

Runs hand-crafted test cases through the engine and reports pass rate.
A test passes if the expected headphone appears in the top 3 recommendations.
"""
import asyncio
import json
import sys
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import settings
from app.models import UserPreference, HeadphoneMatch
from app.services.recommendation_engine import RecommendationEngine


class EvaluationRunner:
    """Runs evaluation test cases and reports results."""

    def __init__(self, eval_set_path: Path):
        """
        Initialize evaluation runner.

        Args:
            eval_set_path: Path to eval_set.json
        """
        self.eval_set_path = eval_set_path
        self.results: List[Dict[str, Any]] = []

    def load_eval_set(self) -> List[Dict[str, Any]]:
        """Load evaluation test cases from JSON."""
        with open(self.eval_set_path) as f:
            return json.load(f)

    async def run_test_case(
        self,
        test_case: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Run a single test case through the recommendation engine.

        Args:
            test_case: Test case dict from eval_set.json
            db: Database session

        Returns:
            Result dict with test_id, passed, top_recommendations, etc.
        """
        test_id = test_case["test_id"]
        description = test_case["description"]
        pref_data = test_case["user_preference"]
        expected_slug = test_case["expected_top_match"]["slug"]
        expected_reason = test_case["expected_top_match"]["reason"]
        acceptable_alternatives = test_case.get("acceptable_alternatives", [])

        print(f"\n[{test_id}] {description}")
        print(f"  Expected: {expected_slug}")

        # Create UserPreference object
        preference = UserPreference(
            session_id=test_id,  # Use test_id as session_id for traceability
            genres=pref_data["genres"],
            favorite_artists=pref_data["favorite_artists"],
            favorite_tracks=[],  # Simplified for now
            hours_per_day=pref_data["hours_per_day"],
            primary_source=pref_data["primary_source"],
            listening_environment=pref_data["listening_environment"],
            sound_preferences=pref_data["sound_preferences"],
            primary_use_case=pref_data["primary_use_case"],
            secondary_use_cases=pref_data["secondary_use_cases"],
            budget_min=Decimal(str(pref_data["budget_min"])),
            budget_max=Decimal(str(pref_data["budget_max"])),
            preferred_type=pref_data["preferred_type"],
            open_back_acceptable=pref_data["open_back_acceptable"],
            wireless_required=pref_data["wireless_required"],
            anc_required=pref_data["anc_required"],
            additional_notes=pref_data.get("additional_notes", ""),
        )

        # Add to DB (transient, won't persist due to rollback)
        db.add(preference)
        await db.flush()

        # Run recommendation engine
        try:
            engine = RecommendationEngine(db)
            session = await engine.generate_recommendations(preference, top_n=5)

            # Get top 3 recommendation slugs
            # HeadphoneMatch objects are related to session
            await db.refresh(session, ["matches"])

            top_slugs = []
            for match in sorted(session.matches, key=lambda m: m.overall_score, reverse=True)[:3]:
                await db.refresh(match, ["headphone"])
                top_slugs.append(match.headphone.slug)

            # Check if expected match is in top 3 (or acceptable alternatives)
            passed = (
                expected_slug in top_slugs
                or any(alt in top_slugs for alt in acceptable_alternatives)
            )

            actual_match = None
            if expected_slug in top_slugs:
                actual_match = expected_slug
            else:
                for alt in acceptable_alternatives:
                    if alt in top_slugs:
                        actual_match = alt
                        break

            result = {
                "test_id": test_id,
                "description": description,
                "expected_slug": expected_slug,
                "expected_reason": expected_reason,
                "acceptable_alternatives": acceptable_alternatives,
                "top_3_slugs": top_slugs,
                "actual_match": actual_match,
                "passed": passed,
                "error": None,
            }

            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  Result: {status}")
            print(f"  Top 3: {', '.join(top_slugs)}")

            return result

        except Exception as e:
            print(f"  Result: ✗ ERROR - {str(e)}")
            return {
                "test_id": test_id,
                "description": description,
                "expected_slug": expected_slug,
                "expected_reason": expected_reason,
                "acceptable_alternatives": acceptable_alternatives,
                "top_3_slugs": [],
                "actual_match": None,
                "passed": False,
                "error": str(e),
            }

    async def run_all(self):
        """Run all test cases and report results."""
        print("=" * 80)
        print("SonicMatch Recommendation Engine Evaluation")
        print("=" * 80)

        # Load test cases
        test_cases = self.load_eval_set()
        print(f"\nLoaded {len(test_cases)} test cases from {self.eval_set_path.name}")

        # Create async database session
        engine = create_async_engine(
            settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
            echo=False,
        )
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        # Run each test case
        async with async_session() as db:
            for test_case in test_cases:
                result = await self.run_test_case(test_case, db)
                self.results.append(result)
                # Rollback after each test to avoid polluting DB
                await db.rollback()

        # Calculate statistics
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = sum(1 for r in self.results if not r["passed"] and r["error"] is None)
        errored = sum(1 for r in self.results if r["error"] is not None)
        pass_rate = (passed / total * 100) if total > 0 else 0

        # Print summary
        print("\n" + "=" * 80)
        print("EVALUATION SUMMARY")
        print("=" * 80)
        print(f"Total test cases:  {total}")
        print(f"Passed:            {passed} ({pass_rate:.1f}%)")
        print(f"Failed:            {failed}")
        print(f"Errors:            {errored}")
        print()

        if failed > 0:
            print("FAILED TESTS:")
            for r in self.results:
                if not r["passed"] and r["error"] is None:
                    print(f"  - [{r['test_id']}] Expected {r['expected_slug']}, got {r['top_3_slugs']}")

        if errored > 0:
            print("\nERRORED TESTS:")
            for r in self.results:
                if r["error"]:
                    print(f"  - [{r['test_id']}] {r['error']}")

        print("\n" + "=" * 80)

        # Save detailed results
        results_path = Path(__file__).parent / "eval_results.json"
        with open(results_path, "w") as f:
            json.dump({
                "summary": {
                    "total": total,
                    "passed": passed,
                    "failed": failed,
                    "errored": errored,
                    "pass_rate": pass_rate,
                },
                "results": self.results,
            }, f, indent=2)

        print(f"Detailed results saved to {results_path.name}")
        print()

        return pass_rate


async def main():
    """Main entry point."""
    eval_set_path = Path(__file__).parent / "eval_set.json"

    if not eval_set_path.exists():
        print(f"Error: {eval_set_path} not found")
        sys.exit(1)

    runner = EvaluationRunner(eval_set_path)
    pass_rate = await runner.run_all()

    # Exit with non-zero code if pass rate < 70%
    if pass_rate < 70:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
