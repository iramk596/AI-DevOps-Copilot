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

