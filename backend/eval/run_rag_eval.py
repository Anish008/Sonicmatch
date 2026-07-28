"""
RAG Evaluation Script

Evaluates the RAG system on three key metrics:
1. Retrieval Precision@k: Are relevant chunks retrieved?
2. Citation Accuracy: Do cited sources actually support claims?
3. Routing Accuracy: Does the router correctly identify RAG-needed queries?

Usage:
    python eval/run_rag_eval.py
"""
import asyncio
import json
import sys
import os
from pathlib import Path
from typing import List, Dict, Any
from decimal import Decimal

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import Headphone, UserPreference, ReviewChunk
from app.services.recommendation_engine import RecommendationEngine
from app.services.rag_router import rag_router
from app.services.retrieval_engine import RetrievalEngine


class RAGEvaluator:
    """Evaluates RAG system performance."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.engine = RecommendationEngine(db_session)
        self.retrieval_engine = RetrievalEngine(db_session)

    async def evaluate_retrieval_precision(
        self,
        test_case: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate retrieval precision@k for a test case.

        Checks if expected relevant chunks are retrieved in top-k results.

        Args:
            test_case: Test case with user preference and expected chunks

        Returns:
            Dictionary with precision metrics
        """
        preference_data = test_case["user_preference"]
        expected_chunks = test_case.get("expected_relevant_chunks", [])

        if not expected_chunks:
            return {
                "precision_at_k": None,
                "reason": "No expected chunks specified",
                "retrieved_count": 0,
            }

        # Build retrieval query
        query_parts = []
        if preference_data.get("genres"):
            query_parts.append(f"sound quality for {', '.join(preference_data['genres'][:2])}")

        prefs = preference_data.get("sound_preferences", {})
        if prefs.get("bass", 0.5) > 0.7:
            query_parts.append("bass response")
        if prefs.get("mids", 0.5) > 0.7:
            query_parts.append("midrange clarity")
        if prefs.get("soundstage", 0.5) > 0.7:
            query_parts.append("soundstage")

        retrieval_query = " ".join(query_parts) or "overall sound quality"

        # Retrieve chunks
        filters = {
            "budget_min": preference_data.get("budget_min", 0),
            "budget_max": preference_data.get("budget_max", 10000),
            "wireless_required": preference_data.get("wireless_required", False),
            "anc_required": preference_data.get("anc_required", False),
        }

        try:
            results = await self.retrieval_engine.retrieve(
                query=retrieval_query,
                filters=filters,
                top_k=10,
                similarity_threshold=settings.rag_similarity_threshold,
            )

            # Check how many expected chunks were retrieved
            retrieved_headphones = {r.headphone_name.lower() for r in results}
            expected_headphones = {chunk["headphone"].lower() for chunk in expected_chunks}

            matches = retrieved_headphones.intersection(expected_headphones)
            precision_at_k = len(matches) / len(expected_headphones) if expected_headphones else 0

            return {
                "precision_at_k": precision_at_k,
                "expected_count": len(expected_headphones),
                "retrieved_count": len(results),
                "matches": list(matches),
                "passed": precision_at_k >= 0.5,  # Pass if at least 50% of expected chunks retrieved
            }

        except Exception as e:
            return {
                "precision_at_k": 0.0,
                "error": str(e),
                "passed": False,
            }

    async def evaluate_routing_accuracy(
        self,
        test_case: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate routing decision accuracy.

        Checks if the router correctly identifies whether a query needs RAG.

        Args:
            test_case: Test case with expected routing decision

        Returns:
            Dictionary with routing accuracy metrics
        """
        expected_rag = test_case.get("should_route_to_rag", None)

        if expected_rag is None:
            return {
                "correct": None,
                "reason": "No expected routing specified",
            }

        preference_data = test_case["user_preference"]

        # Build query for routing
        query_parts = []
        if preference_data.get("primary_use_case"):
            query_parts.append(f"Primary use: {preference_data['primary_use_case']}")

        if preference_data.get("genres"):
            query_parts.append(f"Genres: {', '.join(preference_data['genres'][:3])}")

        prefs = preference_data.get("sound_preferences", {})
        if prefs.get("bass", 0.5) > 0.7:
            query_parts.append("strong bass")
        if prefs.get("soundstage", 0.5) > 0.7:
            query_parts.append("wide soundstage")

        query = " | ".join(query_parts)

        context = {
            "budget": f"${preference_data.get('budget_min', 0)}-${preference_data.get('budget_max', 1000)}",
            "genres": preference_data.get("genres", []),
        }

        try:
            decision = await rag_router.route_query(query=query, context=context)

            actual_rag = rag_router.should_use_rag(decision)
            correct = actual_rag == expected_rag

            return {
                "correct": correct,
                "expected": expected_rag,
                "actual": actual_rag,
                "confidence": decision.confidence,
                "query_type": decision.query_type,
                "reasoning": decision.reasoning,
                "passed": correct,
            }

        except Exception as e:
            return {
                "correct": False,
                "error": str(e),
                "passed": False,
            }

    def evaluate_citation_accuracy(
        self,
        recommendation: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Evaluate citation accuracy (spot-check).

        Checks if cited sources exist in retrieved chunks and have relevant content.

        Args:
            recommendation: Recommendation with citations
            retrieved_chunks: Chunks that were retrieved

        Returns:
            Dictionary with citation accuracy metrics
        """
        citations = recommendation.get("citations", [])

        if not citations:
            return {
                "accuracy": None,
                "reason": "No citations provided",
                "total_citations": 0,
                "passed": True,  # No citations is acceptable if no RAG context
            }

        if not retrieved_chunks:
            return {
                "accuracy": 0.0,
                "reason": "Citations present but no retrieved chunks",
                "total_citations": len(citations),
                "passed": False,  # Hallucinated citations
            }

        # Build lookup of retrieved sources
        source_urls = {chunk["source_url"] for chunk in retrieved_chunks}

        # Check each citation
        valid_citations = 0
        for citation in citations:
            source_url = citation.get("source_url", "")

            # Check if citation references a retrieved source
            if source_url in source_urls:
                valid_citations += 1

        accuracy = valid_citations / len(citations) if citations else 0

        return {
            "accuracy": accuracy,
            "total_citations": len(citations),
            "valid_citations": valid_citations,
            "passed": accuracy >= 0.8,  # Pass if at least 80% of citations are valid
        }

    async def run_eval_case(
        self,
        test_case: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run all evaluations for a single test case."""
        test_id = test_case["test_id"]
        description = test_case["description"]

        print(f"\n[{test_id}] {description}")
        print(f"  Query type: {test_case.get('query_type', 'unknown')}")

        results = {
            "test_id": test_id,
            "description": description,
            "query_type": test_case.get("query_type"),
        }

        # Evaluate routing
        routing_result = await self.evaluate_routing_accuracy(test_case)
        results["routing"] = routing_result

        routing_status = "✓ PASS" if routing_result.get("passed") else "✗ FAIL"
        print(f"  Routing: {routing_status}")
        print(f"    Expected RAG: {routing_result.get('expected')}, Actual: {routing_result.get('actual')}")
        print(f"    Confidence: {routing_result.get('confidence', 0):.2f}, Type: {routing_result.get('query_type')}")

        # Evaluate retrieval precision (only for RAG-needed queries)
        if test_case.get("should_route_to_rag", False):
            retrieval_result = await self.evaluate_retrieval_precision(test_case)
            results["retrieval"] = retrieval_result

            retrieval_status = "✓ PASS" if retrieval_result.get("passed") else "✗ FAIL"
            precision = retrieval_result.get("precision_at_k", 0)
            print(f"  Retrieval Precision@k: {retrieval_status}")
            print(f"    Precision: {precision:.2f} ({retrieval_result.get('expected_count', 0)} expected)")
            print(f"    Matches: {', '.join(retrieval_result.get('matches', []))}")
        else:
            results["retrieval"] = {"precision_at_k": None, "reason": "Structured query, no retrieval expected"}

        # Note: Citation accuracy requires actual recommendation generation
        # For now, we mark it as pending
        results["citation"] = {"accuracy": None, "reason": "Requires full recommendation generation"}

        overall_pass = routing_result.get("passed", False)
        if test_case.get("should_route_to_rag", False):
            overall_pass = overall_pass and results["retrieval"].get("passed", False)

        results["overall_pass"] = overall_pass

        return results


async def main():
    """Run RAG evaluation."""
    print("=" * 80)
    print("SonicMatch RAG System Evaluation")
    print("=" * 80)

    # Load test cases
    eval_file = Path(__file__).parent / "rag_eval_set.json"
    with open(eval_file, "r") as f:
        test_cases = json.load(f)

    print(f"\nLoaded {len(test_cases)} RAG test cases from rag_eval_set.json")

    # Create async database session
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        evaluator = RAGEvaluator(session)

        results = []
        routing_correct = 0
        retrieval_passed = 0
        retrieval_total = 0

        for test_case in test_cases:
            result = await evaluator.run_eval_case(test_case)
            results.append(result)

            # Aggregate metrics
            if result["routing"].get("passed"):
                routing_correct += 1

            if test_case.get("should_route_to_rag", False):
                retrieval_total += 1
                if result["retrieval"].get("passed"):
                    retrieval_passed += 1

    # Print summary
    print("\n" + "=" * 80)
    print("RAG EVALUATION SUMMARY")
    print("=" * 80)

    print(f"\nTotal test cases:           {len(test_cases)}")
    print(f"\n1. Routing Accuracy:        {routing_correct}/{len(test_cases)} ({routing_correct/len(test_cases)*100:.1f}%)")
    print(f"   - Target: ≥85% (route queries correctly)")

    if retrieval_total > 0:
        print(f"\n2. Retrieval Precision@k:   {retrieval_passed}/{retrieval_total} ({retrieval_passed/retrieval_total*100:.1f}%)")
        print(f"   - Target: ≥70% (retrieve relevant chunks)")
    else:
        print(f"\n2. Retrieval Precision@k:   N/A (no RAG queries)")

    print(f"\n3. Citation Accuracy:       Pending (requires full recommendation)")
    print(f"   - Target: ≥80% (cite real sources)")

    # Overall pass rate
    overall_passed = sum(1 for r in results if r.get("overall_pass", False))
    print(f"\nOverall Pass Rate:          {overall_passed}/{len(test_cases)} ({overall_passed/len(test_cases)*100:.1f}%)")
    print(f"   - Target: ≥70%")

    # Save results
    output_file = Path(__file__).parent / "rag_eval_results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\nDetailed results saved to {output_file}")

    # Pass/fail determination
    routing_pass = (routing_correct / len(test_cases)) >= 0.85
    retrieval_pass = (retrieval_passed / retrieval_total) >= 0.70 if retrieval_total > 0 else True

    print("\n" + "=" * 80)
    if routing_pass and retrieval_pass:
        print("✓ RAG EVALUATION PASSED")
    else:
        print("✗ RAG EVALUATION FAILED")
        if not routing_pass:
            print("  - Routing accuracy below 85%")
        if not retrieval_pass:
            print("  - Retrieval precision below 70%")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
