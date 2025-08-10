"""Logging configuration"""
import logging
import logging.config
from app.config import get_settings

settings = get_settings()


def setup_logging():
    """Setup logging configuration"""
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'standard': {
                'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
            },
            'detailed': {
                'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s'
            }
        },
        'handlers': {
            'console': {
                'level': 'DEBUG',
                'class': 'logging.StreamHandler',
                'formatter': 'standard'
            },
            'file': {
                'level': 'INFO',
                'class': 'logging.FileHandler',
                'filename': 'analytics-service.log',
                'formatter': 'detailed'
            }
        },
        'loggers': {
            '': {
                'handlers': ['console', 'file'],
                'level': settings.LOG_LEVEL,
                'propagate': False
            }
        }
    }
    
    logging.config.dictConfig(logging_config)