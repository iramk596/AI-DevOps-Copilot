from fastapi import APIRouter, HTTPException
from kubernetes import config
from kubernetes.client import CoreV1Api
from kubernetes.config.config_exception import ConfigException

router = APIRouter()


def load_kube_config():
    try:
        config.load_kube_config()
    except ConfigException:
        config.load_incluster_config()


def get_pod_status(pod):
    status = getattr(pod.status, 'phase', None) or 'Unknown'

    container_statuses = getattr(pod.status, 'container_statuses', None) or []
    for container in container_statuses:
        waiting = getattr(container.state, 'waiting', None)
        if waiting and getattr(waiting, 'reason', None):
            return waiting.reason

    for container in container_statuses:
        terminated = getattr(container.state, 'terminated', None)
        if terminated and getattr(terminated, 'reason', None):
            return terminated.reason

    return status


def get_all_pods():
    load_kube_config()
    v1 = CoreV1Api()
    pods = v1.list_pod_for_all_namespaces(watch=False)
    return [
        {
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": get_pod_status(pod),
        }
        for pod in pods.items
    ]


@router.get("/pods")
async def pods_list():
    try:
        return get_all_pods()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pods: {str(exc)}")
