from kubernetes import client, config


def get_k8s_client():

    """
    Load fresh Kubernetes config every time
    """

    config.load_kube_config()

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

            if container.state.waiting:
                reason = container.state.waiting.reason

            elif container.state.terminated:
                reason = "Error"

            if reason in ["CrashLoopBackOff", "Error"]:

                logs = get_pod_logs(
                    pod_namespace,
                    pod_name
                )

                issues.append({
                    "pod": pod_name,
                    "namespace": pod_namespace,
                    "status": reason,
                    "phase": pod_phase,
                    "logs": logs
                })

    return issues