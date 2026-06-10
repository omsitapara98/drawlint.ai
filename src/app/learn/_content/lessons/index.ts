import type { ComponentType } from "react";

import WhatIsSystemDesign from "./what-is-system-design";
import LatencyVsThroughput from "./latency-vs-throughput";
import AvailabilityAndSlas from "./availability-and-slas";
import CapTheorem from "./cap-theorem";
import ConsistencyModels from "./consistency-models";
import ScalingVerticalHorizontal from "./scaling-vertical-horizontal";
import LoadBalancingBasics from "./load-balancing-basics";
import CachingBasics from "./caching-basics";
import CapacityEstimation from "./capacity-estimation";

// Module 2 — Core Building Blocks
import SqlVsNosql from "./sql-vs-nosql";
import DatabaseReplication from "./database-replication";
import ShardingPartitioning from "./sharding-partitioning";
import CachingSystems from "./caching-systems";
import MessageQueues from "./message-queues";
import ContentDeliveryNetworks from "./content-delivery-networks";
import ObjectStorage from "./object-storage";
import SearchEngines from "./search-engines";
import ApiGateway from "./api-gateway";
import RateLimiting from "./rate-limiting";

// Module 3 — Design Patterns
import PatternBlobPresignedUrls from "./pattern-blob-presigned-urls";
import PatternRelationalDbReplicas from "./pattern-relational-db-replicas";
import PatternCassandra from "./pattern-cassandra";
import PatternRedis from "./pattern-redis";
import PatternElasticsearch from "./pattern-elasticsearch";
import PatternOutboxCdc from "./pattern-outbox-cdc";
import PatternKafka from "./pattern-kafka";
import PatternStreamProcessing from "./pattern-stream-processing";
import PatternTwoStageFanout from "./pattern-two-stage-fanout";
import PatternConsistentHashing from "./pattern-consistent-hashing";
import PatternCdn from "./pattern-cdn";
import PatternFanoutWriteRead from "./pattern-fanout-write-read";
import PatternHotKey from "./pattern-hot-key";
import PatternGeospatialIndexing from "./pattern-geospatial-indexing";
import PatternIdempotencyKeys from "./pattern-idempotency-keys";
import PatternDistributedLocking from "./pattern-distributed-locking";
import PatternCircuitBreaker from "./pattern-circuit-breaker";
import PatternSaga from "./pattern-saga";
import PatternWalQuorum from "./pattern-wal-quorum";
import PatternWebsocketsPresence from "./pattern-websockets-presence";
import PatternAdaptiveStreaming from "./pattern-adaptive-streaming";
import PatternSseVsPolling from "./pattern-sse-vs-polling";
import PatternSnowflakeId from "./pattern-snowflake-id";
import PatternSoftDelete from "./pattern-soft-delete";
import PatternEventSourcing from "./pattern-event-sourcing";
import PatternCapacityNumbers from "./pattern-capacity-numbers";
import PatternCapacityChain from "./pattern-capacity-chain";

// Maps a lesson slug to its body component. Keep in sync with registry.ts.
export const LESSON_COMPONENTS: Record<string, ComponentType> = {
  "what-is-system-design": WhatIsSystemDesign,
  "latency-vs-throughput": LatencyVsThroughput,
  "availability-and-slas": AvailabilityAndSlas,
  "cap-theorem": CapTheorem,
  "consistency-models": ConsistencyModels,
  "scaling-vertical-horizontal": ScalingVerticalHorizontal,
  "load-balancing-basics": LoadBalancingBasics,
  "caching-basics": CachingBasics,
  "capacity-estimation": CapacityEstimation,

  // Module 2 — Core Building Blocks
  "sql-vs-nosql": SqlVsNosql,
  "database-replication": DatabaseReplication,
  "sharding-partitioning": ShardingPartitioning,
  "caching-systems": CachingSystems,
  "message-queues": MessageQueues,
  "content-delivery-networks": ContentDeliveryNetworks,
  "object-storage": ObjectStorage,
  "search-engines": SearchEngines,
  "api-gateway": ApiGateway,
  "rate-limiting": RateLimiting,

  // Module 3 — Design Patterns
  "pattern-blob-presigned-urls": PatternBlobPresignedUrls,
  "pattern-relational-db-replicas": PatternRelationalDbReplicas,
  "pattern-cassandra": PatternCassandra,
  "pattern-redis": PatternRedis,
  "pattern-elasticsearch": PatternElasticsearch,
  "pattern-outbox-cdc": PatternOutboxCdc,
  "pattern-kafka": PatternKafka,
  "pattern-stream-processing": PatternStreamProcessing,
  "pattern-two-stage-fanout": PatternTwoStageFanout,
  "pattern-consistent-hashing": PatternConsistentHashing,
  "pattern-cdn": PatternCdn,
  "pattern-fanout-write-read": PatternFanoutWriteRead,
  "pattern-hot-key": PatternHotKey,
  "pattern-geospatial-indexing": PatternGeospatialIndexing,
  "pattern-idempotency-keys": PatternIdempotencyKeys,
  "pattern-distributed-locking": PatternDistributedLocking,
  "pattern-circuit-breaker": PatternCircuitBreaker,
  "pattern-saga": PatternSaga,
  "pattern-wal-quorum": PatternWalQuorum,
  "pattern-websockets-presence": PatternWebsocketsPresence,
  "pattern-adaptive-streaming": PatternAdaptiveStreaming,
  "pattern-sse-vs-polling": PatternSseVsPolling,
  "pattern-snowflake-id": PatternSnowflakeId,
  "pattern-soft-delete": PatternSoftDelete,
  "pattern-event-sourcing": PatternEventSourcing,
  "pattern-capacity-numbers": PatternCapacityNumbers,
  "pattern-capacity-chain": PatternCapacityChain,
};
