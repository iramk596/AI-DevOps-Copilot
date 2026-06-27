from kubernetes import client, config, watch
from kubernetes.config.config_exception import ConfigException

# ---------------------------------------------------
# Kubernetes Configuration
# ---------------------------------------------------

KUBERNETES_AVAILABLE = False

try:
    config.load_kube_config()
    KUBERNETES_AVAILABLE = True
    print("Loaded local kubeconfig")

except ConfigException:
    try:
        config.load_incluster_config()
        KUBERNETES_AVAILABLE = True
        print("Loaded in-cluster Kubernetes config")

    except ConfigException:
        print("Kubernetes configuration not found. Running without Kubernetes.")
        KUBERNETES_AVAILABLE = False


# ---------------------------------------------------
# Client
# ---------------------------------------------------

def get_k8s_client():
    if not KUBERNETES_AVAILABLE:
        return None

    return client.CoreV1Api()


# ---------------------------------------------------
# Pods
# ---------------------------------------------------

def get_all_pods(namespace=None):

    if not KUBERNETES_AVAILABLE:
        return []

    v1 = get_k8s_client()

    if namespace:
        pods = v1.list_namespaced_pod(namespace)
    else:
        pods = v1.list_pod_for_all_namespaces(watch=False)

    pod_list = []

    for pod in pods.items:
        pod_list.append({
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": pod.status.phase
        })

    return pod_list


# ---------------------------------------------------
# Logs
# ---------------------------------------------------

def get_pod_logs(namespace, pod_name, tail_lines=50):

    if not KUBERNETES_AVAILABLE:
        return "Kubernetes unavailable"

    v1 = get_k8s_client()

    try:
        return v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            tail_lines=tail_lines,
            previous=True
        )

    except Exception as e:
        return str(e)


# ---------------------------------------------------
# Live Log Streaming
# ---------------------------------------------------

def stream_pod_logs(namespace, pod_name, tail_lines=10):

    if not KUBERNETES_AVAILABLE:
        yield "Kubernetes unavailable"
        return

    v1 = get_k8s_client()
    w = watch.Watch()

    try:
        for line in w.stream(
            v1.read_namespaced_pod_log,
            name=pod_name,
            namespace=namespace,
            tail_lines=tail_lines,
            follow=True,
        ):
            yield line

    except Exception as e:
        yield f"__STREAM_ERROR__:{e}"

    finally:
        try:
            w.stop()
        except Exception:
            pass


# ---------------------------------------------------
# Metrics
# ---------------------------------------------------

def get_cluster_metrics():

    metrics = {
        "cpu_millicores": 0,
        "memory_bytes": 0,
        "pod_count": 0
    }

    if not KUBERNETES_AVAILABLE:
        return metrics

    api = client.CustomObjectsApi()

    try:

        res = api.list_cluster_custom_object(
            group="metrics.k8s.io",
            version="v1beta1",
            plural="pods"
        )

        items = res.get("items", [])

        for pod in items:

            metrics["pod_count"] += 1

            for c in pod.get("containers", []):

                usage = c.get("usage", {})

                cpu = usage.get("cpu")
                mem = usage.get("memory")

                if cpu:

                    try:

                        if cpu.endswith("n"):
                            metrics["cpu_millicores"] += int(cpu[:-1]) / 1_000_000

                        elif cpu.endswith("m"):
                            metrics["cpu_millicores"] += float(cpu[:-1])

                        else:
                            metrics["cpu_millicores"] += float(cpu) * 1000

                    except:
                        pass

                if mem:

                    try:

                        if mem.endswith("Ki"):
                            metrics["memory_bytes"] += int(float(mem[:-2]) * 1024)

                        elif mem.endswith("Mi"):
                            metrics["memory_bytes"] += int(float(mem[:-2]) * 1024 * 1024)

                        elif mem.endswith("Gi"):
                            metrics["memory_bytes"] += int(float(mem[:-2]) * 1024 * 1024 * 1024)

                    except:
                        pass

    except Exception:
        pass

    return metrics


# ---------------------------------------------------
# Incident Analysis
# ---------------------------------------------------

def analyze_cluster_issues(namespace=None):

    if not KUBERNETES_AVAILABLE:
        return []

    v1 = get_k8s_client()

    if namespace:
        pods = v1.list_namespaced_pod(namespace)
    else:
        pods = v1.list_pod_for_all_namespaces(watch=False)

    issues = []

    for pod in pods.items:

        pod_name = pod.metadata.name
        pod_namespace = pod.metadata.namespace
        pod_phase = pod.status.phase

        container_statuses = pod.status.container_statuses

        if not container_statuses:
            continue

        for container in container_statuses:

            reason = None

            if container.state.waiting:
                reason = container.state.waiting.reason

            elif container.state.terminated:
                reason = container.state.terminated.reason or "Error"

            if pod_phase == "Failed":
                reason = "Failed"

            if reason in [
                "CrashLoopBackOff",
                "Error",
                "Failed",
                "OOMKilled",
                "ContainerCannotRun",
                "ImagePullBackOff"
            ]:

                logs = get_pod_logs(
                    pod_namespace,
                    pod_name
                )

                possible_reason = "Unknown issue"
                suggestion = "Check logs manually"

                log_text = logs.lower()

                if "exit" in log_text:
                    possible_reason = "Application exited unexpectedly"
                    suggestion = "Check application startup logic"

                elif "error" in log_text:
                    possible_reason = "Application runtime error"
                    suggestion = "Inspect stack trace"

                elif "failed" in log_text:
                    possible_reason = "Application failed during startup"
                    suggestion = "Check startup configuration"

                elif "connection refused" in log_text:
                    possible_reason = "Dependency unavailable"
                    suggestion = "Check service connectivity"

                elif "oomkilled" in log_text:
                    possible_reason = "Out of memory"
                    suggestion = "Increase memory limits"

                issues.append({
                    "pod": pod_name,
                    "namespace": pod_namespace,
                    "status": reason,
                    "phase": pod_phase,
                    "logs": logs,
                    "possible_reason": possible_reason,
                    "suggestion": suggestion
                })

    return issues