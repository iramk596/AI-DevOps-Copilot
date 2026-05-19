from redis import Redis
from rq import Queue


redis_conn = Redis(
    host="localhost",
    port=6379
)

incident_queue = Queue(
    "incident-analysis",
    connection=redis_conn
)