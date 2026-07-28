"""
RAG Performance Metrics

Tracks and reports performance metrics for the RAG system:
- Routing decisions and confidence
- Retrieval latency and quality
- Citation counts and accuracy
- Cache hit rates
- Error rates

Integrates with structlog for JSON logging and can export to monitoring systems.
"""
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict
import structlog

logger = structlog.get_logger()


@dataclass
class RoutingMetrics:
    """Metrics for a single routing decision."""
    needs_rag: bool
    confidence: float
    query_type: str
    decision_time_ms: int
    reasoning: str


@dataclass
class RetrievalMetrics:
    """Metrics for a single retrieval operation."""
    query_length: int
    chunks_retrieved: int
    avg_similarity: float
    retrieval_time_ms: int
    cache_hit: bool
    candidates_filtered: int


@dataclass
class CitationMetrics:
    """Metrics for citations in recommendations."""
    total_citations: int
    recommendations_with_citations: int
    avg_citations_per_recommendation: float
    unique_sources: int


@dataclass
class RAGRequestMetrics:
    """Aggregated metrics for a complete RAG-enhanced request."""
    request_id: str
    timestamp: float
    routing: Optional[RoutingMetrics]
    retrieval: Optional[RetrievalMetrics]
    citations: Optional[CitationMetrics]
    total_time_ms: int
    success: bool
    error: Optional[str] = None


class RAGMetricsCollector:
    """
    Collects and aggregates RAG performance metrics.

    Usage:
        collector = RAGMetricsCollector()

        # Track routing
        collector.record_routing(needs_rag=True, confidence=0.92, ...)

        # Track retrieval
        collector.record_retrieval(chunks=5, latency=120, ...)

        # Get summary
        summary = collector.get_summary()
    """

    def __init__(self):
        self.requests: list[RAGRequestMetrics] = []
        self.routing_stats = {
            "total": 0,
            "rag_routed": 0,
            "structured_routed": 0,
            "avg_confidence": 0.0,
            "avg_decision_time_ms": 0.0,
        }
        self.retrieval_stats = {
            "total": 0,
            "cache_hits": 0,
            "avg_chunks": 0.0,
            "avg_similarity": 0.0,
            "avg_latency_ms": 0.0,
        }
        self.citation_stats = {
            "total_citations": 0,
            "recommendations_with_citations": 0,
            "avg_per_recommendation": 0.0,
        }
        self.error_count = 0

    def record_routing(
        self,
        needs_rag: bool,
        confidence: float,
        query_type: str,
        decision_time_ms: int,
        reasoning: str,
    ):
        """Record a routing decision."""
        metrics = RoutingMetrics(
            needs_rag=needs_rag,
            confidence=confidence,
            query_type=query_type,
            decision_time_ms=decision_time_ms,
            reasoning=reasoning,
        )

        # Update stats
        self.routing_stats["total"] += 1
        if needs_rag:
            self.routing_stats["rag_routed"] += 1
        else:
            self.routing_stats["structured_routed"] += 1

        # Running average for confidence and time
        n = self.routing_stats["total"]
        self.routing_stats["avg_confidence"] = (
            (self.routing_stats["avg_confidence"] * (n - 1) + confidence) / n
        )
        self.routing_stats["avg_decision_time_ms"] = (
            (self.routing_stats["avg_decision_time_ms"] * (n - 1) + decision_time_ms) / n
        )

        logger.info(
            "rag_routing_recorded",
            needs_rag=needs_rag,
            confidence=confidence,
            query_type=query_type,
            decision_time_ms=decision_time_ms,
        )

        return metrics

    def record_retrieval(
        self,
        query_length: int,
        chunks_retrieved: int,
        avg_similarity: float,
        retrieval_time_ms: int,
        cache_hit: bool,
        candidates_filtered: int,
    ):
        """Record a retrieval operation."""
        metrics = RetrievalMetrics(
            query_length=query_length,
            chunks_retrieved=chunks_retrieved,
            avg_similarity=avg_similarity,
            retrieval_time_ms=retrieval_time_ms,
            cache_hit=cache_hit,
            candidates_filtered=candidates_filtered,
        )

        # Update stats
        self.retrieval_stats["total"] += 1
        if cache_hit:
            self.retrieval_stats["cache_hits"] += 1

        n = self.retrieval_stats["total"]
        self.retrieval_stats["avg_chunks"] = (
            (self.retrieval_stats["avg_chunks"] * (n - 1) + chunks_retrieved) / n
        )
        self.retrieval_stats["avg_similarity"] = (
            (self.retrieval_stats["avg_similarity"] * (n - 1) + avg_similarity) / n
        )
        self.retrieval_stats["avg_latency_ms"] = (
            (self.retrieval_stats["avg_latency_ms"] * (n - 1) + retrieval_time_ms) / n
        )

        logger.info(
            "rag_retrieval_recorded",
            chunks_retrieved=chunks_retrieved,
            avg_similarity=avg_similarity,
            retrieval_time_ms=retrieval_time_ms,
            cache_hit=cache_hit,
        )

        return metrics

    def record_citations(
        self,
        total_citations: int,
        recommendations_with_citations: int,
        unique_sources: int,
    ):
        """Record citation metrics."""
        metrics = CitationMetrics(
            total_citations=total_citations,
            recommendations_with_citations=recommendations_with_citations,
            avg_citations_per_recommendation=(
                total_citations / recommendations_with_citations
                if recommendations_with_citations > 0
                else 0
            ),
            unique_sources=unique_sources,
        )

        # Update stats
        self.citation_stats["total_citations"] += total_citations
        self.citation_stats["recommendations_with_citations"] += recommendations_with_citations

        if recommendations_with_citations > 0:
            self.citation_stats["avg_per_recommendation"] = (
                self.citation_stats["total_citations"] /
                self.citation_stats["recommendations_with_citations"]
            )

        logger.info(
            "rag_citations_recorded",
            total_citations=total_citations,
            recommendations_with_citations=recommendations_with_citations,
            unique_sources=unique_sources,
        )

        return metrics

    def record_error(self, error_type: str, error_message: str):
        """Record an error in the RAG system."""
        self.error_count += 1

        logger.error(
            "rag_error_recorded",
            error_type=error_type,
            error_message=error_message,
            total_errors=self.error_count,
        )

    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics for all collected metrics."""
        cache_hit_rate = (
            self.retrieval_stats["cache_hits"] / self.retrieval_stats["total"]
            if self.retrieval_stats["total"] > 0
            else 0
        )

        rag_routing_rate = (
            self.routing_stats["rag_routed"] / self.routing_stats["total"]
            if self.routing_stats["total"] > 0
            else 0
        )

        return {
            "routing": {
                **self.routing_stats,
                "rag_routing_rate": rag_routing_rate,
            },
            "retrieval": {
                **self.retrieval_stats,
                "cache_hit_rate": cache_hit_rate,
            },
            "citations": self.citation_stats,
            "errors": {
                "total_errors": self.error_count,
                "error_rate": (
                    self.error_count / self.routing_stats["total"]
                    if self.routing_stats["total"] > 0
                    else 0
                ),
            },
        }

    def export_prometheus(self) -> str:
        """
        Export metrics in Prometheus format.

        Returns:
            Prometheus-formatted metrics string
        """
        summary = self.get_summary()
        lines = []

        # Routing metrics
        lines.append(f"# HELP rag_routing_total Total routing decisions")
        lines.append(f"# TYPE rag_routing_total counter")
        lines.append(f"rag_routing_total {summary['routing']['total']}")

        lines.append(f"# HELP rag_routing_rag_rate Rate of queries routed to RAG")
        lines.append(f"# TYPE rag_routing_rag_rate gauge")
        lines.append(f"rag_routing_rag_rate {summary['routing']['rag_routing_rate']}")

        lines.append(f"# HELP rag_routing_confidence_avg Average routing confidence")
        lines.append(f"# TYPE rag_routing_confidence_avg gauge")
        lines.append(f"rag_routing_confidence_avg {summary['routing']['avg_confidence']}")

        # Retrieval metrics
        lines.append(f"# HELP rag_retrieval_total Total retrieval operations")
        lines.append(f"# TYPE rag_retrieval_total counter")
        lines.append(f"rag_retrieval_total {summary['retrieval']['total']}")

        lines.append(f"# HELP rag_retrieval_cache_hit_rate Cache hit rate")
        lines.append(f"# TYPE rag_retrieval_cache_hit_rate gauge")
        lines.append(f"rag_retrieval_cache_hit_rate {summary['retrieval']['cache_hit_rate']}")

        lines.append(f"# HELP rag_retrieval_latency_ms_avg Average retrieval latency")
        lines.append(f"# TYPE rag_retrieval_latency_ms_avg gauge")
        lines.append(f"rag_retrieval_latency_ms_avg {summary['retrieval']['avg_latency_ms']}")

        # Citation metrics
        lines.append(f"# HELP rag_citations_total Total citations generated")
        lines.append(f"# TYPE rag_citations_total counter")
        lines.append(f"rag_citations_total {summary['citations']['total_citations']}")

        lines.append(f"# HELP rag_citations_per_recommendation_avg Average citations per recommendation")
        lines.append(f"# TYPE rag_citations_per_recommendation_avg gauge")
        lines.append(f"rag_citations_per_recommendation_avg {summary['citations']['avg_per_recommendation']}")

        # Error metrics
        lines.append(f"# HELP rag_errors_total Total errors")
        lines.append(f"# TYPE rag_errors_total counter")
        lines.append(f"rag_errors_total {summary['errors']['total_errors']}")

        return "\n".join(lines)


# Global metrics collector instance
rag_metrics = RAGMetricsCollector()


def track_routing(
    needs_rag: bool,
    confidence: float,
    query_type: str,
    decision_time_ms: int,
    reasoning: str,
):
    """Convenience function to track routing metrics."""
    return rag_metrics.record_routing(
        needs_rag=needs_rag,
        confidence=confidence,
        query_type=query_type,
        decision_time_ms=decision_time_ms,
        reasoning=reasoning,
    )


def track_retrieval(
    query_length: int,
    chunks_retrieved: int,
    avg_similarity: float,
    retrieval_time_ms: int,
    cache_hit: bool,
    candidates_filtered: int,
):
    """Convenience function to track retrieval metrics."""
    return rag_metrics.record_retrieval(
        query_length=query_length,
        chunks_retrieved=chunks_retrieved,
        avg_similarity=avg_similarity,
        retrieval_time_ms=retrieval_time_ms,
        cache_hit=cache_hit,
        candidates_filtered=candidates_filtered,
    )


def track_citations(
    total_citations: int,
    recommendations_with_citations: int,
    unique_sources: int,
):
    """Convenience function to track citation metrics."""
    return rag_metrics.record_citations(
        total_citations=total_citations,
        recommendations_with_citations=recommendations_with_citations,
        unique_sources=unique_sources,
    )


def get_metrics_summary() -> Dict[str, Any]:
    """Get current metrics summary."""
    return rag_metrics.get_summary()
