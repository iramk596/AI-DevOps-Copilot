from redis import Redis
from rq import Worker, Queue


redis_conn = Redis(
    host="localhost",
    port=6379
)

queue = Queue(
    "incident-analysis",
    connection=redis_conn
)

worker = Worker([queue], connection=redis_conn)

if __name__ == "__main__":
    worker.work()