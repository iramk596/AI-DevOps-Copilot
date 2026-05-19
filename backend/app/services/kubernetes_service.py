from kubernetes import client, config


def get_all_pods():

    config.load_kube_config()

    v1 = client.CoreV1Api()

    pods = v1.list_pod_for_all_namespaces(watch=False)

    pod_list = []

    for pod in pods.items:

        pod_list.append({
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": pod.status.phase
        })

    return pod_list


def get_pod_logs(namespace, pod_name):

    config.load_kube_config()

    v1 = client.CoreV1Api()

    try:

        logs = v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            tail_lines=20,
            previous=True
        )

        return logs

    except Exception as e:

        return str(e)


def analyze_cluster_issues():

    config.load_kube_config()

    v1 = client.CoreV1Api()

    pods = v1.list_pod_for_all_namespaces(watch=False)

    issues = []

    for pod in pods.items:

        pod_name = pod.metadata.name

        namespace = pod.metadata.namespace

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

                logs = get_pod_logs(namespace, pod_name)

                possible_reason = "Unknown issue"

                suggestion = "Check logs manually"

                if "exit" in logs.lower():

                    possible_reason = "Application exited unexpectedly"

                    suggestion = "Check application startup logic"

                elif "error" in logs.lower():

                    possible_reason = "Application runtime error"

                    suggestion = "Inspect stack trace in logs"

                elif "failed" in logs.lower():

                    possible_reason = "Application failed during startup"

                    suggestion = "Check startup configuration"

                issues.append({
                    "pod": pod_name,
                    "namespace": namespace,
                    "status": reason,
                    "logs": logs,
                    "possible_reason": possible_reason,
                    "suggestion": suggestion
                })

    return issues