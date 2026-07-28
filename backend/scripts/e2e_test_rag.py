"""
End-to-End RAG System Test

Tests the complete RAG flow from query to cited recommendations:
1. Seeds database with headphones and review chunks
2. Runs subjective and structured test queries
3. Verifies routing decisions
4. Checks retrieval quality
5. Validates citation accuracy
6. Reports comprehensive results

Usage:
    python scripts/e2e_test_rag.py
"""
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import settings
from app.models import Headphone, ReviewChunk, UserPreference, RecommendationSession
from app.services.recommendation_engine import RecommendationEngine
from app.services.rag_router import rag_router
from app.services.retrieval_engine import RetrievalEngine


class E2ETestRunner:
    """End-to-end RAG system test runner."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.engine = RecommendationEngine(db)
        self.retrieval_engine = RetrievalEngine(db)
        self.test_results = {
            "timestamp": time.time(),
            "tests": [],
            "summary": {},
        }

    async def check_data_seeded(self) -> Dict[str, int]:
        """Check if database has been seeded with required data."""
        headphone_count = await self.db.scalar(select(func.count()).select_from(Headphone))
        chunk_count = await self.db.scalar(select(func.count()).select_from(ReviewChunk))

        return {
            "headphones": headphone_count or 0,
            "review_chunks": chunk_count or 0,
        }

    async def test_subjective_query(self) -> Dict[str, Any]:
        """
        Test 1: Subjective query (should use RAG).

        Tests a query about bass quality for hip-hop - clearly subjective.
        Expects routing to RAG, retrieval of bass-related chunks, and citations.
        """
        print("\n" + "=" * 80)
        print("TEST 1: Subjective Query (Bass Quality for Hip-Hop)")
        print("=" * 80)

        # Create a test session ID
        import uuid
        session_id = str(uuid.uuid4())

        # Create test preference
        preference = UserPreference(
            session_id=session_id,
            genres=["hip-hop", "rap", "trap"],
            favorite_artists=["Kendrick Lamar", "Travis Scott"],
            favorite_tracks=[],
            hours_per_day=4,
            primary_source="streaming",
            listening_environment="home",
            sound_preferences={
                "bass": 0.9,
                "mids": 0.6,
                "treble": 0.5,
                "soundstage": 0.5,
                "detail": 0.7,
            },
            primary_use_case="casual",
            secondary_use_cases=["workout"],
            budget_min=100,
            budget_max=300,
            preferred_type=None,
            open_back_acceptable=False,
            wireless_required=True,
            anc_required=False,
            additional_notes="",
        )

        self.db.add(preference)
        await self.db.flush()

        start_time = time.time()

        try:
            # Test routing
            user_profile = self.engine._build_user_profile(preference)
            routing_decision = await self.engine._route_query(preference, user_profile)

            print(f"\n✓ Routing Decision:")
            print(f"  Needs RAG: {routing_decision.needs_rag}")
            print(f"  Confidence: {routing_decision.confidence:.2f}")
            print(f"  Query Type: {routing_decision.query_type}")
            print(f"  Reasoning: {routing_decision.reasoning}")

            routing_correct = routing_decision.needs_rag is True

            # Test retrieval
            candidates = await self.engine._fetch_candidate_headphones(preference)
            print(f"\n✓ Candidate Headphones: {len(candidates)}")

            retrieved_chunks = await self.engine._retrieve_context(preference, candidates)
            print(f"✓ Retrieved Chunks: {len(retrieved_chunks)}")

            if retrieved_chunks:
                print("\nTop Retrieved Chunks:")
                for i, chunk in enumerate(retrieved_chunks[:3], 1):
                    print(f"  {i}. {chunk['headphone_name']}")
                    print(f"     Similarity: {chunk['similarity_score']:.2f}")
                    print(f"     Source: {chunk['source_type']}")
                    print(f"     Text: {chunk['chunk_text'][:80]}...")

            # Generate recommendations
            session = await self.engine.generate_recommendations(preference, top_n=3)

            processing_time = time.time() - start_time

            print(f"\n✓ Recommendations Generated: {len(session.matches)} matches")
            print(f"✓ Processing Time: {processing_time:.2f}s")

            # Check citations
            citations_count = 0
            for match in session.matches:
                if match.citations:
                    citations_count += len(match.citations)

            print(f"✓ Total Citations: {citations_count}")

            if session.matches and session.matches[0].citations:
                print("\nExample Citation:")
                citation = session.matches[0].citations[0]
                print(f"  Claim: {citation['claim'][:80]}...")
                print(f"  Source: {citation['source_type']}")
                print(f"  URL: {citation['source_url']}")

            # Verify citations reference retrieved chunks
            citation_accuracy = 0.0
            if citations_count > 0 and retrieved_chunks:
                retrieved_urls = {c['source_url'] for c in retrieved_chunks}
                valid_citations = 0

                for match in session.matches:
                    if match.citations:
                        for citation in match.citations:
                            if citation['source_url'] in retrieved_urls:
                                valid_citations += 1

                citation_accuracy = valid_citations / citations_count if citations_count > 0 else 0
                print(f"\n✓ Citation Accuracy: {citation_accuracy:.1%} ({valid_citations}/{citations_count} valid)")

            result = {
                "test_name": "subjective_query",
                "passed": routing_correct and len(retrieved_chunks) > 0 and citations_count > 0,
                "routing_correct": routing_correct,
                "routing_confidence": routing_decision.confidence,
                "chunks_retrieved": len(retrieved_chunks),
                "recommendations_count": len(session.matches),
                "citations_count": citations_count,
                "citation_accuracy": citation_accuracy,
                "processing_time_sec": processing_time,
                "details": {
                    "routing_decision": routing_decision.to_dict(),
                    "top_match": session.matches[0].headphone.full_name if session.matches else None,
                },
            }

            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"\n{status} - Subjective Query Test")

            return result

        except Exception as e:
            print(f"\n❌ FAIL - Error: {str(e)}")
            return {
                "test_name": "subjective_query",
                "passed": False,
                "error": str(e),
                "processing_time_sec": time.time() - start_time,
            }

    async def test_structured_query(self) -> Dict[str, Any]:
        """
        Test 2: Structured query (should NOT use RAG).

        Tests a purely budget + feature query - no subjective elements.
        Expects routing to skip RAG, no retrieval, no citations.
        """
        print("\n" + "=" * 80)
        print("TEST 2: Structured Query (Budget + Features Only)")
        print("=" * 80)

        # Create a test session ID
        import uuid
        session_id = str(uuid.uuid4())

        # Create test preference
        preference = UserPreference(
            session_id=session_id,
            genres=["pop"],
            favorite_artists=[],
            favorite_tracks=[],
            hours_per_day=2,
            primary_source="streaming",
            listening_environment="home",
            sound_preferences={
                "bass": 0.5,
                "mids": 0.5,
                "treble": 0.5,
                "soundstage": 0.5,
                "detail": 0.5,
            },
            primary_use_case="casual",
            secondary_use_cases=[],
            budget_min=100,
            budget_max=200,
            preferred_type="over_ear",
            open_back_acceptable=False,
            wireless_required=True,
            anc_required=True,
            additional_notes="",
        )

        self.db.add(preference)
        await self.db.flush()

        start_time = time.time()

        try:
            # Test routing
            user_profile = self.engine._build_user_profile(preference)
            routing_decision = await self.engine._route_query(preference, user_profile)

            print(f"\n✓ Routing Decision:")
            print(f"  Needs RAG: {routing_decision.needs_rag}")
            print(f"  Confidence: {routing_decision.confidence:.2f}")
            print(f"  Query Type: {routing_decision.query_type}")
            print(f"  Reasoning: {routing_decision.reasoning}")

            routing_correct = routing_decision.needs_rag is False

            # Generate recommendations
            session = await self.engine.generate_recommendations(preference, top_n=3)

            processing_time = time.time() - start_time

            print(f"\n✓ Recommendations Generated: {len(session.matches)} matches")
            print(f"✓ Processing Time: {processing_time:.2f}s")

            # Check citations (should be empty or minimal)
            citations_count = 0
            for match in session.matches:
                if match.citations:
                    citations_count += len(match.citations)

            print(f"✓ Total Citations: {citations_count} (expected 0 for structured query)")

            result = {
                "test_name": "structured_query",
                "passed": routing_correct,
                "routing_correct": routing_correct,
                "routing_confidence": routing_decision.confidence,
                "recommendations_count": len(session.matches),
                "citations_count": citations_count,
                "processing_time_sec": processing_time,
                "details": {
                    "routing_decision": routing_decision.to_dict(),
                    "top_match": session.matches[0].headphone.full_name if session.matches else None,
                },
            }

            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"\n{status} - Structured Query Test")

            return result

        except Exception as e:
            print(f"\n❌ FAIL - Error: {str(e)}")
            return {
                "test_name": "structured_query",
                "passed": False,
                "error": str(e),
                "processing_time_sec": time.time() - start_time,
            }

    async def test_retrieval_performance(self) -> Dict[str, Any]:
        """
        Test 3: Retrieval Performance.

        Tests raw retrieval speed and quality without full recommendation flow.
        """
        print("\n" + "=" * 80)
        print("TEST 3: Retrieval Performance")
        print("=" * 80)

        query = "bass response and low-end extension for electronic music"
        filters = {
            "budget_min": 100,
            "budget_max": 500,
            "wireless_required": False,
        }

        start_time = time.time()

        try:
            results = await self.retrieval_engine.retrieve(
                query=query,
                filters=filters,
                top_k=10,
                similarity_threshold=0.5,
            )

            retrieval_time = time.time() - start_time

            print(f"\n✓ Query: {query}")
            print(f"✓ Retrieved: {len(results)} chunks")
            print(f"✓ Retrieval Time: {retrieval_time * 1000:.1f}ms")

            if results:
                avg_similarity = sum(r.similarity_score for r in results) / len(results)
                print(f"✓ Avg Similarity: {avg_similarity:.2f}")

                print("\nTop 5 Results:")
                for i, r in enumerate(results[:5], 1):
                    print(f"  {i}. {r.headphone_name} ({r.similarity_score:.2f})")
                    print(f"     {r.chunk_text[:60]}...")

            result = {
                "test_name": "retrieval_performance",
                "passed": len(results) > 0 and retrieval_time < 1.0,  # Should be < 1 second
                "chunks_retrieved": len(results),
                "retrieval_time_ms": retrieval_time * 1000,
                "avg_similarity": avg_similarity if results else 0,
                "details": {
                    "query": query,
                    "filters": filters,
                },
            }

            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"\n{status} - Retrieval Performance Test")

            return result

        except Exception as e:
            print(f"\n❌ FAIL - Error: {str(e)}")
            return {
                "test_name": "retrieval_performance",
                "passed": False,
                "error": str(e),
                "retrieval_time_ms": (time.time() - start_time) * 1000,
            }

    async def run_all_tests(self):
        """Run all E2E tests and generate report."""
        print("=" * 80)
        print("SonicMatch RAG System - End-to-End Test Suite")
        print("=" * 80)

        # Check data
        print("\nChecking database...")
        data_counts = await self.check_data_seeded()
        print(f"✓ Headphones: {data_counts['headphones']}")
        print(f"✓ Review Chunks: {data_counts['review_chunks']}")

        if data_counts['headphones'] == 0:
            print("\n❌ ERROR: No headphones in database. Please run:")
            print("   python seeds/seed_db.py")
            return

        if data_counts['review_chunks'] == 0:
            print("\n⚠️  WARNING: No review chunks in database. RAG will not work.")
            print("   Run: python seeds/seed_review_chunks.py")

        # Run tests
        test1 = await self.test_subjective_query()
        self.test_results["tests"].append(test1)

        test2 = await self.test_structured_query()
        self.test_results["tests"].append(test2)

        test3 = await self.test_retrieval_performance()
        self.test_results["tests"].append(test3)

        # Summary
        passed_tests = sum(1 for t in self.test_results["tests"] if t.get("passed", False))
        total_tests = len(self.test_results["tests"])

        self.test_results["summary"] = {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": total_tests - passed_tests,
            "pass_rate": passed_tests / total_tests if total_tests > 0 else 0,
        }

        # Print summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)

        for test in self.test_results["tests"]:
            status = "✅ PASS" if test.get("passed") else "❌ FAIL"
            print(f"\n{status} {test['test_name']}")
            if "error" in test:
                print(f"       Error: {test['error']}")
            else:
                for key, value in test.items():
                    if key not in ["test_name", "passed", "details", "error"]:
                        print(f"       {key}: {value}")

        print(f"\n{'=' * 80}")
        print(f"Overall: {passed_tests}/{total_tests} tests passed ({self.test_results['summary']['pass_rate']:.0%})")
        print(f"{'=' * 80}")

        # Save results
        output_file = Path(__file__).parent.parent / "e2e_test_results.json"
        with open(output_file, "w") as f:
            json.dump(self.test_results, f, indent=2, default=str)

        print(f"\nDetailed results saved to {output_file}")

        return self.test_results["summary"]["pass_rate"] >= 0.66  # Pass if ≥66% tests pass


async def main():
    """Main test runner."""
    # Create database session
    engine = create_async_engine(
        settings.database_url,
        echo=False,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        runner = E2ETestRunner(session)
        success = await runner.run_all_tests()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
