from kubernetes import client, config

# Load kube config once
config.load_kube_config()

# Initialize Kubernetes API client once
v1 = client.CoreV1Api()


def get_all_pods(namespace=None):

    """
    Get all pods.
    If namespace is provided -> fetch only that namespace.
    Otherwise fetch all namespaces.
    """

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

    """
    Fetch logs from a pod
    """

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


def analyze_cluster_issues(namespace=None):

    """
    Detect problematic pods and analyze logs
    """

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
                reason = "Error"

            if reason in ["CrashLoopBackOff", "Error"]:

                logs = get_pod_logs(
                    pod_namespace,
                    pod_name
                )

                # Simple AI-like rule analysis
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