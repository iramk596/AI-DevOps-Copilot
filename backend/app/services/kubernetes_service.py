from kubernetes import client, config, watch
from kubernetes.config.config_exception import ConfigException

# Proper Kubernetes config loading

try:

    config.load_kube_config()

except ConfigException:

    config.load_incluster_config()


def get_k8s_client():

    """
    Create fresh Kubernetes client
    """

    return client.CoreV1Api()


def get_all_pods(namespace=None):

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


def get_pod_logs(namespace, pod_name, tail_lines=50):

    v1 = get_k8s_client()

    try:
        logs = v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            tail_lines=tail_lines,
            previous=True
        )

        return logs

    except Exception as e:

        return str(e)


def stream_pod_logs(namespace, pod_name, tail_lines=10):
    """
    Generator that yields pod logs line-by-line using Kubernetes watch stream.
    """
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
            # watch yields strings (lines)
            yield line

    except Exception as e:
        # propagate as string to caller
        yield f"__STREAM_ERROR__:{str(e)}"

    finally:
        try:
            w.stop()
        except Exception:
            pass


def get_cluster_metrics():
    """
    Query metrics.k8s.io for pod metrics and aggregate cluster CPU and memory usage.
    Returns dict with 'cpu_millicores' and 'memory_bytes' and sample counts.
    """
    api = client.CustomObjectsApi()

    metrics = {
        'cpu_millicores': 0,
        'memory_bytes': 0,
        'pod_count': 0
    }

    try:
        # list pod metrics across all namespaces
        res = api.list_cluster_custom_object(group="metrics.k8s.io", version="v1beta1", plural="pods")

        items = res.get('items', []) if isinstance(res, dict) else []

        for pod in items:
            # pod.metrics has containers with usage fields
            containers = pod.get('containers', [])
            for c in containers:
                usage = c.get('usage', {})
                cpu = usage.get('cpu')
                mem = usage.get('memory')

                # cpu may be in n or m format (e.g., '123456n' or '50m')
                if cpu:
                    try:
                        if cpu.endswith('n'):
                            # nanocores -> millicores
                            millicores = int(cpu[:-1]) / 1e6
                        elif cpu.endswith('m'):
                            millicores = float(cpu[:-1])
                        else:
                            # assume cores
                            millicores = float(cpu) * 1000
                        metrics['cpu_millicores'] += millicores
                    except Exception:
                        pass

                if mem:
                    try:
                        # memory formats like '123456Ki', '123Mi', '1234' (bytes)
                        if mem.endswith('Ki'):
                            bytes_val = int(float(mem[:-2]) * 1024)
                        elif mem.endswith('Mi'):
                            bytes_val = int(float(mem[:-2]) * 1024 * 1024)
                        elif mem.endswith('Gi'):
                            bytes_val = int(float(mem[:-2]) * 1024 * 1024 * 1024)
                        else:
                            bytes_val = int(mem)
                        metrics['memory_bytes'] += bytes_val
                    except Exception:
                        pass

            metrics['pod_count'] += 1

    except Exception:
        # metrics API may not be available; return zeros
        return metrics

    return metrics


def analyze_cluster_issues(namespace=None):

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

            # Waiting state
            if container.state.waiting:
                reason = container.state.waiting.reason

            # Terminated state
            elif container.state.terminated:
                reason = container.state.terminated.reason or "Error"

            # Detect failed pod phase
            if pod_phase == "Failed":
                reason = "Failed"

            # Detect unhealthy pods
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

                    suggestion = "Inspect stack trace in logs"

                elif "failed" in log_text:

                    possible_reason = "Application failed during startup"

                    suggestion = "Check startup configuration"

                elif "connection refused" in log_text:

                    possible_reason = "Service dependency unavailable"

                    suggestion = "Check database/service connectivity"

                elif "oomkilled" in log_text:

                    possible_reason = "Container ran out of memory"

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