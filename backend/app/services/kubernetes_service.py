from kubernetes import client, config


def get_all_pods():

    config.load_kube_config()

    v1 = client.CoreV1Api()

    pod_list = v1.list_pod_for_all_namespaces(watch=False)

    pods = []

    for pod in pod_list.items:

        pods.append({
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": pod.status.phase
        })

    return pods


def analyze_cluster_issues():

    config.load_kube_config()

    v1 = client.CoreV1Api()

    pod_list = v1.list_pod_for_all_namespaces(watch=False)

    issues = []

    for pod in pod_list.items:

        pod_name = pod.metadata.name
        namespace = pod.metadata.namespace

        if pod.status.container_statuses:

            for container in pod.status.container_statuses:

                waiting_state = container.state.waiting

                if waiting_state:

                    reason = waiting_state.reason

                    if reason == "CrashLoopBackOff":

                        issues.append({
                            "pod": pod_name,
                            "namespace": namespace,
                            "status": reason,
                            "possible_reason": "Container is crashing repeatedly",
                            "suggestion": "Check application logs and startup command"
                        })

    return issues