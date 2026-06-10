from kubernetes import client, config
from kubernetes.config.config_exception import ConfigException
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# ==========================================
# Kubernetes Config Loader
# ==========================================
try:
    # Running inside Kubernetes cluster
    config.load_incluster_config()
    logger.info("Loaded in-cluster Kubernetes config")

except ConfigException:
    # Running locally with Minikube
    config.load_kube_config()
    logger.info("Loaded local kubeconfig")

# Kubernetes Core API Client
v1 = client.CoreV1Api()
custom_api = client.CustomObjectsApi()


def _parse_cpu_to_mcores(value):
    if value is None:
        return 0.0

    raw = str(value).strip()
    try:
        if raw.endswith("n"):
            return float(raw[:-1]) / 1_000_000
        if raw.endswith("u"):
            return float(raw[:-1]) / 1_000
        if raw.endswith("m"):
            return float(raw[:-1])
        return float(raw) * 1000
    except ValueError:
        return 0.0


def _parse_memory_to_mb(value):
    if value is None:
        return 0.0

    raw = str(value).strip()
    units = {
        "Ki": 1 / 1024,
        "Mi": 1,
        "Gi": 1024,
        "Ti": 1024 * 1024,
        "K": 1 / 1000,
        "M": 1,
        "G": 1000,
        "T": 1000 * 1000,
    }

    for suffix, multiplier in units.items():
        if raw.endswith(suffix):
            try:
                return float(raw[:-len(suffix)]) * multiplier
            except ValueError:
                return 0.0

    try:
        return float(raw) / (1024 * 1024)
    except ValueError:
        return 0.0


def _get_node_capacity():
    total_cpu_mcores = 0.0
    total_memory_mb = 0.0

    for node in v1.list_node().items:
        allocatable = node.status.allocatable or {}
        total_cpu_mcores += _parse_cpu_to_mcores(allocatable.get("cpu"))
        total_memory_mb += _parse_memory_to_mb(allocatable.get("memory"))

    return total_cpu_mcores, total_memory_mb


# ==========================================
# Return Kubernetes Client
# ==========================================
def get_k8s_client():
    return v1


# ==========================================
# Get All Pods
# ==========================================
def get_all_pods():
    try:
        pods = v1.list_pod_for_all_namespaces(watch=False)

        pod_list = []

        for pod in pods.items:
            pod_list.append({
                "pod": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": pod.status.phase,
                "node": pod.spec.node_name,
                "restarts": sum(
                    cs.restart_count
                    for cs in (pod.status.container_statuses or [])
                ),
            })

        return pod_list

    except Exception as e:
        logger.error(f"Error fetching pods: {e}")
        return []


# ==========================================
# Analyze Cluster Issues
# ==========================================
def analyze_cluster_issues():
    try:
        pods = v1.list_pod_for_all_namespaces(watch=False)

        issues = []

        for pod in pods.items:
            pod_name = pod.metadata.name
            namespace = pod.metadata.namespace
            phase = pod.status.phase

            waiting_reason = None

            if pod.status.container_statuses:
                for container in pod.status.container_statuses:
                    if (
                        container.state
                        and container.state.waiting
                    ):
                        waiting_reason = (
                            container.state.waiting.reason
                        )

            # Detect unhealthy pods
            if (
                phase != "Running"
                or waiting_reason
            ):
                reason = waiting_reason or phase

                issues.append({
                    "pod": pod_name,
                    "namespace": namespace,
                    "status": reason,
                    "possible_reason": get_possible_reason(reason),
                    "suggestion": get_suggestion(reason),
                    "timestamp": datetime.now().strftime(
                        "%Y-%m-%d %H:%M:%S"
                    ),
                    "logs": get_pod_logs(
                        pod_name,
                        namespace
                    ),
                })

        return issues

    except Exception as e:
        logger.error(f"Error analyzing issues: {e}")
        return []


# ==========================================
# Get Pod Logs
# ==========================================
def get_pod_logs(pod_name, namespace):
    try:
        logs = v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            tail_lines=50,
        )

        return logs

    except Exception as e:
        return f"Unable to retrieve logs: {e}"


# ==========================================
# Stream Pod Logs
# ==========================================
def stream_pod_logs(pod_name, namespace="default"):
    try:
        logs = v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            follow=True,
            tail_lines=10,
            _preload_content=False,
        )

        for line in logs.stream():
            yield line.decode("utf-8")

    except Exception as e:
        yield f"Error streaming logs: {str(e)}"


# ==========================================
# Cluster Metrics
# ==========================================
def get_cluster_metrics():
    try:
        pods = get_all_pods()

        running = len([
            p for p in pods
            if p["status"] == "Running"
        ])

        failed = len([
            p for p in pods
            if p["status"] != "Running"
        ])

        try:
            pod_metrics = custom_api.list_cluster_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                plural="pods",
            )

            cpu_mcores = 0.0
            memory_mb = 0.0

            for item in pod_metrics.get("items", []):
                for container in item.get("containers", []):
                    usage = container.get("usage", {})
                    cpu_mcores += _parse_cpu_to_mcores(usage.get("cpu"))
                    memory_mb += _parse_memory_to_mb(usage.get("memory"))

            capacity_cpu_mcores, capacity_memory_mb = _get_node_capacity()
            cpu_usage_percent = (
                (cpu_mcores / capacity_cpu_mcores) * 100
                if capacity_cpu_mcores > 0
                else 0
            )
            memory_usage_percent = (
                (memory_mb / capacity_memory_mb) * 100
                if capacity_memory_mb > 0
                else 0
            )

            return {
                "running_pods": running,
                "failed_pods": failed,
                "total_pods": len(pods),
                "cpu_mcores": round(cpu_mcores, 2),
                "memory_mb": round(memory_mb, 2),
                "cpu_usage_percent": round(cpu_usage_percent, 2),
                "memory_usage_percent": round(memory_usage_percent, 2),
                "metrics_source": "metrics-server",
                "estimated": False,
            }

        except Exception as metrics_error:
            logger.warning(
                "metrics-server unavailable; using estimated metrics: %s",
                metrics_error,
            )
            cpu_mcores = running * 50
            memory_mb = running * 128

            return {
                "running_pods": running,
                "failed_pods": failed,
                "total_pods": len(pods),
                "cpu_mcores": cpu_mcores,
                "memory_mb": memory_mb,
                "cpu_usage_percent": min(100, running * 5),
                "memory_usage_percent": min(100, running * 8),
                "metrics_source": "estimated",
                "estimated": True,
            }

        return {
            "running_pods": running,
            "failed_pods": failed,
            "total_pods": len(pods),
        }

    except Exception as e:
        logger.error(f"Error fetching metrics: {e}")

        return {
            "running_pods": 0,
            "failed_pods": 0,
            "total_pods": 0,
            "cpu_mcores": 0,
            "memory_mb": 0,
            "cpu_usage_percent": 0,
            "memory_usage_percent": 0,
            "metrics_source": "unavailable",
            "estimated": True,
        }


# ==========================================
# AI Reason Mapping
# ==========================================
def get_possible_reason(reason):
    reason_map = {
        "CrashLoopBackOff":
            "Container repeatedly crashing during startup.",

        "ImagePullBackOff":
            "Docker image could not be pulled.",

        "ErrImagePull":
            "Invalid or inaccessible image.",

        "Pending":
            "Pod waiting for resources or scheduling.",

        "Failed":
            "Pod terminated unexpectedly.",
    }

    return reason_map.get(
        reason,
        "Unknown issue detected."
    )


# ==========================================
# AI Suggestions
# ==========================================
def get_suggestion(reason):
    suggestion_map = {
        "CrashLoopBackOff":
            "Check application logs and startup configuration.",

        "ImagePullBackOff":
            "Verify Docker image name and registry access.",

        "ErrImagePull":
            "Check image existence and credentials.",

        "Pending":
            "Check cluster resources and scheduler events.",

        "Failed":
            "Inspect pod logs and Kubernetes events.",
    }

    return suggestion_map.get(
        reason,
        "Check pod logs manually."
    )

