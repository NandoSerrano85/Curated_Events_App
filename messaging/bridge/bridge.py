"""
NATS-Kafka Bridge Service
Bridges communication between Go services (NATS) and Python services (Kafka)
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass

import nats
from nats.errors import ConnectionClosedError, TimeoutError, NoServersError
import aiokafka
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BridgeConfig:
    """Configuration for the NATS-Kafka bridge"""
    # NATS configuration
    nats_servers: str = "nats://localhost:4222"
    nats_name: str = "nats-kafka-bridge"
    
    # Kafka configuration
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_group_id: str = "nats-kafka-bridge-group"
    
    # Bridge settings
    enable_nats_to_kafka: bool = True
    enable_kafka_to_nats: bool = True
    max_retries: int = 3
    retry_delay: float = 5.0


class EventBridge:
    """Bridge between NATS and Kafka for cross-service communication"""
    
    def __init__(self, config: BridgeConfig):
        self.config = config
        self.nats_client = None
        self.kafka_producer = None
        self.kafka_consumer = None
        self.running = False
        
        # Subject/topic mappings
        self.nats_to_kafka_mappings = {
            # User events from Go services -> Analytics events in Kafka
            "events.user.registered": "analytics-events",
            "events.user.login": "analytics-events", 
            "events.user.updated": "analytics-events",
            
            # Event events from Go services -> Analytics events in Kafka
            "events.event.created": "analytics-events",
            "events.event.updated": "analytics-events",
            "events.event.published": "analytics-events",
            
            # Payment events from Go services -> Analytics events in Kafka
            "events.payment.completed": "analytics-events",
            "events.payment.failed": "analytics-events",
            
            # Registration events from Go services -> User interactions in Kafka
            "events.registration.created": "user-interactions",
            "events.registration.cancelled": "user-interactions",
            
            # Search events from Go services -> Analytics events in Kafka
            "events.search.query": "analytics-events",
        }
        
        self.kafka_to_nats_mappings = {
            # ML model updates from Python services -> System events in NATS
            "model-updates": "events.ml.model.updated",
            
            # Analytics insights from Python services -> Notifications in NATS
            "system-metrics": "events.system.metrics",
            
            # Recommendation results from Python services -> Notifications in NATS
            "recommendation-events": "events.recommendation.generated",
            
            # Batch job results from Python services -> System events in NATS
            "batch-processing": "events.batch.completed",
        }
    
    async def start(self):
        """Start the bridge service"""
        logger.info("Starting NATS-Kafka bridge...")
        
        try:
            # Connect to NATS
            await self._connect_nats()
            
            # Connect to Kafka
            await self._connect_kafka()
            
            self.running = True
            
            # Start bridge tasks
            tasks = []
            
            if self.config.enable_nats_to_kafka:
                tasks.append(asyncio.create_task(self._nats_to_kafka_bridge()))
            
            if self.config.enable_kafka_to_nats:
                tasks.append(asyncio.create_task(self._kafka_to_nats_bridge()))
            
            logger.info("NATS-Kafka bridge started successfully")
            
            # Wait for all tasks
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
        
        except Exception as e:
            logger.error(f"Failed to start bridge: {e}")
            await self.stop()
            raise
    
    async def stop(self):
        """Stop the bridge service"""
        logger.info("Stopping NATS-Kafka bridge...")
        self.running = False
        
        # Close connections
        if self.nats_client:
            await self.nats_client.close()
        
        if self.kafka_producer:
            await self.kafka_producer.stop()
        
        if self.kafka_consumer:
            await self.kafka_consumer.stop()
        
        logger.info("NATS-Kafka bridge stopped")
    
    async def _connect_nats(self):
        """Connect to NATS server"""
        try:
            self.nats_client = await nats.connect(
                servers=self.config.nats_servers,
                name=self.config.nats_name,
                max_reconnect_attempts=self.config.max_retries,
                reconnect_time_wait=self.config.retry_delay
            )
            logger.info(f"Connected to NATS: {self.config.nats_servers}")
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
            raise
    
    async def _connect_kafka(self):
        """Connect to Kafka"""
        try:
            # Create Kafka producer
            self.kafka_producer = AIOKafkaProducer(
                bootstrap_servers=self.config.kafka_bootstrap_servers,
                value_serializer=lambda x: x.encode('utf-8'),
                compression_type='lz4',
                retries=self.config.max_retries
            )
            await self.kafka_producer.start()
            
            # Create Kafka consumer
            self.kafka_consumer = AIOKafkaConsumer(
                *self.kafka_to_nats_mappings.keys(),
                bootstrap_servers=self.config.kafka_bootstrap_servers,
                group_id=self.config.kafka_group_id,
                value_deserializer=lambda x: x.decode('utf-8'),
                auto_offset_reset='latest'
            )
            await self.kafka_consumer.start()
            
            logger.info(f"Connected to Kafka: {self.config.kafka_bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            raise
    
    async def _nats_to_kafka_bridge(self):
        """Bridge NATS messages to Kafka"""
        logger.info("Starting NATS->Kafka bridge")
        
        async def nats_handler(msg):
            """Handle NATS message and forward to Kafka"""
            try:
                # Parse NATS message
                subject = msg.subject
                data = json.loads(msg.data.decode())
                
                # Get corresponding Kafka topic
                kafka_topic = self.nats_to_kafka_mappings.get(subject)
                if not kafka_topic:
                    logger.debug(f"No Kafka mapping for NATS subject: {subject}")
                    return
                
                # Transform message for Kafka
                kafka_message = self._transform_nats_to_kafka(subject, data)
                
                # Send to Kafka
                await self.kafka_producer.send(
                    kafka_topic,
                    json.dumps(kafka_message)
                )
                
                logger.debug(f"Bridged NATS->Kafka: {subject} -> {kafka_topic}")
                
            except Exception as e:
                logger.error(f"Error bridging NATS->Kafka: {e}")
        
        # Subscribe to all mapped NATS subjects
        for nats_subject in self.nats_to_kafka_mappings.keys():
            await self.nats_client.subscribe(nats_subject, cb=nats_handler)
            logger.info(f"Subscribed to NATS subject: {nats_subject}")
        
        # Keep the bridge running
        while self.running:
            await asyncio.sleep(1)
    
    async def _kafka_to_nats_bridge(self):
        """Bridge Kafka messages to NATS"""
        logger.info("Starting Kafka->NATS bridge")
        
        while self.running:
            try:
                async for msg in self.kafka_consumer:
                    if not self.running:
                        break
                    
                    try:
                        # Parse Kafka message
                        topic = msg.topic
                        data = json.loads(msg.value)
                        
                        # Get corresponding NATS subject
                        nats_subject = self.kafka_to_nats_mappings.get(topic)
                        if not nats_subject:
                            logger.debug(f"No NATS mapping for Kafka topic: {topic}")
                            continue
                        
                        # Transform message for NATS
                        nats_message = self._transform_kafka_to_nats(topic, data)
                        
                        # Send to NATS
                        await self.nats_client.publish(
                            nats_subject,
                            json.dumps(nats_message).encode()
                        )
                        
                        logger.debug(f"Bridged Kafka->NATS: {topic} -> {nats_subject}")
                        
                    except Exception as e:
                        logger.error(f"Error processing Kafka message: {e}")
            
            except Exception as e:
                logger.error(f"Error in Kafka->NATS bridge: {e}")
                await asyncio.sleep(self.config.retry_delay)
    
    def _transform_nats_to_kafka(self, subject: str, nats_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform NATS message format to Kafka format"""
        return {
            "id": nats_data.get("id", ""),
            "topic": self.nats_to_kafka_mappings[subject],
            "event_type": self._extract_event_type_from_subject(subject),
            "source": f"nats-bridge-{nats_data.get('source', 'unknown')}",
            "timestamp": nats_data.get("timestamp", datetime.utcnow().isoformat()),
            "data": nats_data.get("data", {}),
            "metadata": {
                "original_subject": subject,
                "bridge_timestamp": datetime.utcnow().isoformat(),
                **nats_data.get("metadata", {})
            }
        }
    
    def _transform_kafka_to_nats(self, topic: str, kafka_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform Kafka message format to NATS format"""
        return {
            "id": kafka_data.get("id", ""),
            "type": kafka_data.get("event_type", ""),
            "source": f"kafka-bridge-{kafka_data.get('source', 'unknown')}",
            "timestamp": kafka_data.get("timestamp", datetime.utcnow().isoformat()),
            "data": kafka_data.get("data", {}),
            "metadata": {
                "original_topic": topic,
                "bridge_timestamp": datetime.utcnow().isoformat(),
                **kafka_data.get("metadata", {})
            }
        }
    
    def _extract_event_type_from_subject(self, subject: str) -> str:
        """Extract event type from NATS subject"""
        # Convert NATS subject to event type
        # e.g., "events.user.registered" -> "user_registered"
        parts = subject.split(".")
        if len(parts) >= 3:
            return f"{parts[1]}_{parts[2]}"
        return "unknown"
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the bridge"""
        health = {
            "status": "healthy" if self.running else "stopped",
            "nats_connected": self.nats_client and self.nats_client.is_connected,
            "kafka_producer_ready": self.kafka_producer is not None,
            "kafka_consumer_ready": self.kafka_consumer is not None,
            "mappings": {
                "nats_to_kafka": len(self.nats_to_kafka_mappings),
                "kafka_to_nats": len(self.kafka_to_nats_mappings)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Overall health status
        if not all([
            health["nats_connected"],
            health["kafka_producer_ready"],
            health["kafka_consumer_ready"]
        ]):
            health["status"] = "unhealthy"
        
        return health


class BridgeService:
    """Main bridge service that can be run as a standalone application"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config = self._load_config(config_file)
        self.bridge = EventBridge(self.config)
    
    def _load_config(self, config_file: Optional[str]) -> BridgeConfig:
        """Load configuration from file or environment"""
        # For now, use default config with environment overrides
        config = BridgeConfig()
        
        # Override with environment variables
        config.nats_servers = os.getenv("NATS_SERVERS", config.nats_servers)
        config.kafka_bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", config.kafka_bootstrap_servers)
        
        return config
    
    async def run(self):
        """Run the bridge service"""
        try:
            await self.bridge.start()
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        except Exception as e:
            logger.error(f"Bridge service error: {e}")
        finally:
            await self.bridge.stop()
    
    async def health(self) -> Dict[str, Any]:
        """Get bridge health status"""
        return await self.bridge.health_check()


# CLI interface
if __name__ == "__main__":
    import argparse
    import os
    
    parser = argparse.ArgumentParser(description="NATS-Kafka Bridge Service")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--nats-servers", default="nats://localhost:4222", help="NATS servers")
    parser.add_argument("--kafka-servers", default="localhost:9092", help="Kafka bootstrap servers")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    
    args = parser.parse_args()
    
    # Configure logging
    logging.getLogger().setLevel(getattr(logging, args.log_level.upper()))
    
    # Set environment variables
    os.environ["NATS_SERVERS"] = args.nats_servers
    os.environ["KAFKA_BOOTSTRAP_SERVERS"] = args.kafka_servers
    
    # Run service
    service = BridgeService(args.config)
    
    try:
        asyncio.run(service.run())
    except KeyboardInterrupt:
        print("\nShutting down bridge service...")
    except Exception as e:
        print(f"Error: {e}")
        exit(1)