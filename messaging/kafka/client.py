"""
Kafka client for Python services in the Events Platform
Handles event streaming, analytics data pipeline, and ML training data
"""

import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from uuid import uuid4

import aiokafka
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
from aiokafka.errors import KafkaError

logger = logging.getLogger(__name__)

# Kafka topics for the Events Platform
TOPICS = {
    # Analytics events
    'ANALYTICS_EVENTS': 'analytics-events',
    'USER_INTERACTIONS': 'user-interactions',
    'EVENT_METRICS': 'event-metrics',
    
    # ML and recommendations
    'ML_TRAINING_DATA': 'ml-training-data',
    'MODEL_UPDATES': 'model-updates',
    'RECOMMENDATION_EVENTS': 'recommendation-events',
    
    # System events
    'SYSTEM_METRICS': 'system-metrics',
    'AUDIT_LOGS': 'audit-logs',
    'ERROR_EVENTS': 'error-events',
    
    # Batch processing
    'BATCH_PROCESSING': 'batch-processing',
    'DATA_PIPELINE': 'data-pipeline',
    'ETL_EVENTS': 'etl-events',
}

@dataclass
class KafkaMessage:
    """Standard message format for Kafka events"""
    id: str
    topic: str
    event_type: str
    source: str
    timestamp: datetime
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None
    
    @classmethod
    def create(cls, topic: str, event_type: str, source: str, data: Dict[str, Any], 
               metadata: Optional[Dict[str, Any]] = None) -> 'KafkaMessage':
        return cls(
            id=str(uuid4()),
            topic=topic,
            event_type=event_type,
            source=source,
            timestamp=datetime.utcnow(),
            data=data,
            metadata=metadata or {}
        )
    
    def to_json(self) -> str:
        """Convert message to JSON string"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return json.dumps(data)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'KafkaMessage':
        """Create message from JSON string"""
        data = json.loads(json_str)
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)


class KafkaProducerClient:
    """Kafka producer client for publishing events"""
    
    def __init__(self, bootstrap_servers: str = 'localhost:9092', **kwargs):
        self.bootstrap_servers = bootstrap_servers
        self.producer_config = {
            'bootstrap_servers': bootstrap_servers,
            'value_serializer': lambda x: x.encode('utf-8'),
            'key_serializer': lambda x: x.encode('utf-8') if x else None,
            'compression_type': 'lz4',
            'batch_size': 65536,
            'linger_ms': 10,
            'max_request_size': 1048576,
            'retries': 3,
            'acks': 1,
            **kwargs
        }
        self.producer: Optional[AIOKafkaProducer] = None
        self._closed = False
    
    async def start(self):
        """Start the producer"""
        if self.producer is None:
            self.producer = AIOKafkaProducer(**self.producer_config)
            await self.producer.start()
            logger.info("Kafka producer started")
    
    async def stop(self):
        """Stop the producer"""
        if self.producer and not self._closed:
            await self.producer.stop()
            self._closed = True
            logger.info("Kafka producer stopped")
    
    async def send_message(self, message: KafkaMessage, key: Optional[str] = None) -> bool:
        """Send a message to Kafka"""
        if not self.producer:
            raise RuntimeError("Producer not started")
        
        try:
            await self.producer.send_and_wait(
                message.topic,
                message.to_json(),
                key=key
            )
            logger.debug(f"Message sent to {message.topic}: {message.id}")
            return True
        except KafkaError as e:
            logger.error(f"Failed to send message to {message.topic}: {e}")
            return False
    
    async def send_analytics_event(self, event_type: str, source: str, 
                                 data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Send an analytics event"""
        message = KafkaMessage.create(
            topic=TOPICS['ANALYTICS_EVENTS'],
            event_type=event_type,
            source=source,
            data=data,
            metadata={'user_id': user_id} if user_id else None
        )
        return await self.send_message(message, key=user_id)
    
    async def send_user_interaction(self, user_id: str, event_id: str, 
                                  interaction_type: str, properties: Dict[str, Any]) -> bool:
        """Send a user interaction event"""
        message = KafkaMessage.create(
            topic=TOPICS['USER_INTERACTIONS'],
            event_type=interaction_type,
            source='user_service',
            data={
                'user_id': user_id,
                'event_id': event_id,
                'interaction_type': interaction_type,
                'properties': properties
            }
        )
        return await self.send_message(message, key=user_id)
    
    async def send_ml_training_data(self, model_type: str, data: Dict[str, Any], 
                                  version: str = 'latest') -> bool:
        """Send ML training data"""
        message = KafkaMessage.create(
            topic=TOPICS['ML_TRAINING_DATA'],
            event_type='training_data',
            source='ml_service',
            data=data,
            metadata={'model_type': model_type, 'version': version}
        )
        return await self.send_message(message, key=model_type)
    
    async def send_system_metrics(self, service_name: str, metrics: Dict[str, Any]) -> bool:
        """Send system metrics"""
        message = KafkaMessage.create(
            topic=TOPICS['SYSTEM_METRICS'],
            event_type='system_metrics',
            source=service_name,
            data=metrics
        )
        return await self.send_message(message, key=service_name)
    
    async def send_batch_job(self, job_type: str, job_data: Dict[str, Any], 
                           priority: str = 'normal') -> bool:
        """Send a batch processing job"""
        message = KafkaMessage.create(
            topic=TOPICS['BATCH_PROCESSING'],
            event_type=job_type,
            source='batch_service',
            data=job_data,
            metadata={'priority': priority}
        )
        return await self.send_message(message, key=job_type)


class KafkaConsumerClient:
    """Kafka consumer client for consuming events"""
    
    def __init__(self, group_id: str, bootstrap_servers: str = 'localhost:9092', **kwargs):
        self.group_id = group_id
        self.bootstrap_servers = bootstrap_servers
        self.consumer_config = {
            'bootstrap_servers': bootstrap_servers,
            'group_id': group_id,
            'value_deserializer': lambda x: x.decode('utf-8'),
            'key_deserializer': lambda x: x.decode('utf-8') if x else None,
            'auto_offset_reset': 'earliest',
            'enable_auto_commit': True,
            'auto_commit_interval_ms': 1000,
            'max_poll_records': 500,
            'session_timeout_ms': 30000,
            'heartbeat_interval_ms': 3000,
            **kwargs
        }
        self.consumers: Dict[str, AIOKafkaConsumer] = {}
        self.handlers: Dict[str, List[Callable]] = {}
        self._running = False
    
    async def start(self):
        """Start the consumer"""
        self._running = True
        logger.info(f"Kafka consumer group '{self.group_id}' started")
    
    async def stop(self):
        """Stop all consumers"""
        self._running = False
        for consumer in self.consumers.values():
            await consumer.stop()
        self.consumers.clear()
        logger.info(f"Kafka consumer group '{self.group_id}' stopped")
    
    async def subscribe(self, topics: List[str], handler: Callable[[KafkaMessage], None]):
        """Subscribe to topics with a handler"""
        consumer_key = ','.join(sorted(topics))
        
        if consumer_key in self.consumers:
            # Add handler to existing consumer
            self.handlers[consumer_key].append(handler)
        else:
            # Create new consumer
            consumer = AIOKafkaConsumer(
                *topics,
                **self.consumer_config
            )
            await consumer.start()
            
            self.consumers[consumer_key] = consumer
            self.handlers[consumer_key] = [handler]
            
            # Start consumption task
            asyncio.create_task(self._consume_messages(consumer_key))
        
        logger.info(f"Subscribed to topics: {topics}")
    
    async def _consume_messages(self, consumer_key: str):
        """Consume messages from Kafka"""
        consumer = self.consumers[consumer_key]
        handlers = self.handlers[consumer_key]
        
        while self._running:
            try:
                async for msg in consumer:
                    if not self._running:
                        break
                    
                    try:
                        # Parse message
                        message = KafkaMessage.from_json(msg.value)
                        
                        # Process with all handlers
                        for handler in handlers:
                            try:
                                if asyncio.iscoroutinefunction(handler):
                                    await handler(message)
                                else:
                                    handler(message)
                            except Exception as e:
                                logger.error(f"Handler error: {e}")
                    
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                
            except Exception as e:
                logger.error(f"Consumer error: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def subscribe_analytics_events(self, handler: Callable[[KafkaMessage], None]):
        """Subscribe to analytics events"""
        await self.subscribe([TOPICS['ANALYTICS_EVENTS']], handler)
    
    async def subscribe_user_interactions(self, handler: Callable[[KafkaMessage], None]):
        """Subscribe to user interaction events"""
        await self.subscribe([TOPICS['USER_INTERACTIONS']], handler)
    
    async def subscribe_ml_training_data(self, handler: Callable[[KafkaMessage], None]):
        """Subscribe to ML training data"""
        await self.subscribe([TOPICS['ML_TRAINING_DATA']], handler)
    
    async def subscribe_batch_processing(self, handler: Callable[[KafkaMessage], None]):
        """Subscribe to batch processing jobs"""
        await self.subscribe([TOPICS['BATCH_PROCESSING']], handler)


class KafkaClient:
    """Combined Kafka client with producer and consumer capabilities"""
    
    def __init__(self, service_name: str, bootstrap_servers: str = 'localhost:9092'):
        self.service_name = service_name
        self.bootstrap_servers = bootstrap_servers
        
        # Create producer and consumer
        self.producer = KafkaProducerClient(bootstrap_servers)
        self.consumer = KafkaConsumerClient(
            group_id=f"{service_name}-group",
            bootstrap_servers=bootstrap_servers
        )
        
        self._started = False
    
    async def start(self):
        """Start both producer and consumer"""
        if not self._started:
            await self.producer.start()
            await self.consumer.start()
            self._started = True
            logger.info(f"Kafka client started for service: {self.service_name}")
    
    async def stop(self):
        """Stop both producer and consumer"""
        if self._started:
            await self.producer.stop()
            await self.consumer.stop()
            self._started = False
            logger.info(f"Kafka client stopped for service: {self.service_name}")
    
    async def health_check(self) -> bool:
        """Check if Kafka is healthy"""
        try:
            # Try to send a health check message
            message = KafkaMessage.create(
                topic=TOPICS['SYSTEM_METRICS'],
                event_type='health_check',
                source=self.service_name,
                data={'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}
            )
            return await self.producer.send_message(message)
        except Exception as e:
            logger.error(f"Kafka health check failed: {e}")
            return False
    
    async def __aenter__(self):
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()


# Event type constants for analytics
class EventTypes:
    # User events
    USER_REGISTRATION = 'user_registration'
    USER_LOGIN = 'user_login'
    USER_LOGOUT = 'user_logout'
    USER_PROFILE_UPDATE = 'user_profile_update'
    
    # Event interactions
    EVENT_VIEW = 'event_view'
    EVENT_REGISTRATION = 'event_registration'
    EVENT_CANCELLATION = 'event_cancellation'
    EVENT_FAVORITE = 'event_favorite'
    EVENT_SHARE = 'event_share'
    
    # Search events
    SEARCH_QUERY = 'search_query'
    SEARCH_RESULT_CLICK = 'search_result_click'
    SEARCH_FILTER_APPLIED = 'search_filter_applied'
    
    # Recommendation events
    RECOMMENDATION_VIEW = 'recommendation_view'
    RECOMMENDATION_CLICK = 'recommendation_click'
    RECOMMENDATION_CONVERSION = 'recommendation_conversion'
    
    # Payment events
    PAYMENT_INITIATED = 'payment_initiated'
    PAYMENT_COMPLETED = 'payment_completed'
    PAYMENT_FAILED = 'payment_failed'
    
    # System events
    SERVICE_STARTED = 'service_started'
    SERVICE_STOPPED = 'service_stopped'
    ERROR_OCCURRED = 'error_occurred'
    
    # ML events
    MODEL_TRAINED = 'model_trained'
    MODEL_DEPLOYED = 'model_deployed'
    PREDICTION_MADE = 'prediction_made'


# Helper functions for common operations
async def create_kafka_topics(bootstrap_servers: str = 'localhost:9092'):
    """Create required Kafka topics"""
    from aiokafka.admin import AIOKafkaAdminClient, NewTopic
    
    admin_client = AIOKafkaAdminClient(bootstrap_servers=bootstrap_servers)
    await admin_client.start()
    
    topics_to_create = [
        NewTopic(name=topic, num_partitions=6, replication_factor=1)
        for topic in TOPICS.values()
    ]
    
    try:
        await admin_client.create_topics(topics_to_create)
        logger.info("Kafka topics created successfully")
    except Exception as e:
        logger.warning(f"Some topics may already exist: {e}")
    finally:
        await admin_client.close()


async def get_topic_info(bootstrap_servers: str = 'localhost:9092'):
    """Get information about Kafka topics"""
    from aiokafka.admin import AIOKafkaAdminClient
    
    admin_client = AIOKafkaAdminClient(bootstrap_servers=bootstrap_servers)
    await admin_client.start()
    
    try:
        metadata = await admin_client.list_topics()
        logger.info(f"Available topics: {list(metadata)}")
        return metadata
    finally:
        await admin_client.close()


# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_kafka_client():
        """Test the Kafka client"""
        async with KafkaClient("test-service") as client:
            # Test producer
            success = await client.producer.send_analytics_event(
                event_type=EventTypes.USER_REGISTRATION,
                source="test-service",
                data={"user_id": "test-user", "email": "test@example.com"},
                user_id="test-user"
            )
            print(f"Message sent: {success}")
            
            # Test health check
            health = await client.health_check()
            print(f"Kafka health: {health}")
    
    # Run test
    asyncio.run(test_kafka_client())