# Kubernetes Pod Failure Detection - Production Grade Guide

## Overview
The updated `kubernetes_service.py` provides comprehensive pod failure detection across multiple failure scenarios. This guide explains the detection logic and how to test it.

## What's Fixed

### 1. **Multi-Level Pod Status Detection**
The new implementation checks three levels of pod status:

#### Level 1: Pod Phase
- Checks if pod is in `Failed` or `Unknown` phase
- These are global pod states that indicate problems

#### Level 2: Pod Conditions
- Checks pod Ready condition
- If Ready condition is False, extracts the reason from conditions

#### Level 3: Container State Analysis
- **Waiting State**: Checks for failure reasons like:
  - CrashLoopBackOff
  - ImagePullBackOff
  - OOMKilled
  - And 15+ other failure reasons
  
- **Terminated State**: Checks:
  - Exit code (non-zero = failure)
  - Termination reason
  - Termination message

### 2. **Comprehensive Failure Reason Detection**
Now detects these failure states:
```python
"CrashLoopBackOff"        # Container keeps crashing
"Error"                   # Generic error state
"ImagePullBackOff"        # Failed to pull image
"ImageInspectError"       # Cannot inspect image
"ErrImagePull"            # Image pull error
"RegistryUnavailable"     # Container registry down
"OOMKilled"               # Out of memory
"NodeUnreachable"         # Node network issue
"NodeNotReady"            # Node not healthy
"Evicted"                 # Pod evicted by kubelet
"ContainerCannotRun"      # Runtime error
"Failed"                  # Exit code non-zero
# ... and more
```

### 3. **Enhanced Data Model**
Returns complete incident objects with:
- `pod` - Pod name
- `namespace` - Pod namespace
- `status` - Current status
- `phase` - Pod phase (Pending/Running/Failed/Unknown)
- `possible_reason` - Detailed failure reason
- `suggestion` - Contextual remediation hint
- `logs` - Container logs (current + previous)
- `container` - Which container failed
- `timestamp` - When pod was created
- `ai_analysis` - AI-generated analysis (populated later)

### 4. **Better Log Retrieval**
- Tries to get current logs first
- Falls back to previous logs if crashed
- Combines both if available
- Limits to 2000 chars for frontend efficiency
- Better error handling

### 5. **Contextual Remediation Suggestions**
Based on failure reason, provides specific guidance:
```
CrashLoopBackOff → "Check container logs for errors..."
ImagePullBackOff → "Verify image name and registry credentials..."
OOMKilled → "Increase memory limits..."
NodeNotReady → "Restart node or check node conditions..."
```

## Testing the Fix

### Step 1: Verify Minikube has the crash-app pod
```bash
# Check pods
kubectl get pods -A

# Expected output should show something like:
# NAMESPACE     NAME                    READY   STATUS             ...
# default       crash-app-xxxx          0/1     Error              ...
```

### Step 2: Test the Backend Detection Directly
```bash
# SSH into backend container or run from host with kubeconfig
python3 -c "
from app.services.kubernetes_service import analyze_cluster_issues
import json

issues = analyze_cluster_issues()
print(json.dumps(issues, indent=2))
"

# Should output:
# [
#   {
#     "pod": "crash-app-xxxx",
#     "namespace": "default",
#     "status": "Failed",
#     "phase": "Failed",
#     "possible_reason": "Error: ...",
#     "suggestion": "Pod 'crash-app-xxxx' is in failed state...",
#     "logs": "[error logs here]",
#     "container": "crash-app",
#     "timestamp": "2026-05-25T10:30:00",
#     "ai_analysis": ""
#   }
# ]
```

### Step 3: Test the API Endpoint
```bash
# In browser or curl
curl http://127.0.0.1:8000/analyze

# Expected: JSON array with failing pods
```

### Step 4: Verify Frontend Display
1. Go to http://localhost:5173 (or your frontend URL)
2. Dashboard should show:
   - ❌ Failed Pods = 1 (not 0)
   - 🟡 Cluster Status = Degraded
   - ✅ Incident card showing crash-app details

### Step 5: Test With Multiple Scenarios

#### Test ImagePullBackOff
```bash
kubectl run test-bad-image --image=nonexistent-registry/nonexistent-image:v1
# Wait 10 seconds, check frontend
```

#### Test OOMKilled
```bash
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: oom-test
spec:
  containers:
  - name: memory-hog
    image: busybox
    resources:
      limits:
        memory: "10Mi"
    command: ["sh", "-c", "sleep 3600"]
EOF

# Wait, pod will get OOMKilled
```

#### Test CrashLoopBackOff
```bash
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: crash-test
spec:
  containers:
  - name: crasher
    image: busybox
    command: ["sh", "-c", "exit 1"]
EOF
```

## Debugging Tips

### If Pod Not Detected:

1. **Check if pod exists:**
   ```bash
   kubectl get pods -A
   kubectl describe pod <pod-name> -n <namespace>
   ```

2. **Check pod conditions:**
   ```bash
   kubectl get pod <pod-name> -o yaml | grep -A 20 conditions:
   ```

3. **Check container state:**
   ```bash
   kubectl get pod <pod-name> -o yaml | grep -A 10 "state:"
   ```

4. **Check backend logs:**
   - If running in Docker: `docker logs <backend-container>`
   - If running locally: Check terminal output

5. **Test with verbose logging:**
   ```python
   # In kubernetes_service.py, add prints to analyze_cluster_issues():
   for pod in pods.items:
       print(f"Checking pod: {pod.metadata.name}")
       print(f"  Phase: {pod.status.phase}")
       print(f"  Conditions: {pod.status.conditions}")
       print(f"  Container Statuses: {pod.status.container_statuses}")
   ```

### If AI Analysis Not Working:

- Check if Ollama service is running: `ollama serve`
- Check if LLM model available: `ollama pull llama3` (or your model)
- Check backend logs for AI service errors
- Verify `OLLAMA_API_BASE_URL` in environment

### If Logs Not Appearing:

1. Pod might not have any logs yet
2. Pod might have been deleted
3. Try: `kubectl logs <pod-name> -n <namespace> --tail=50`

## Architecture Diagram

```
┌─────────────────┐
│   Minikube K8s  │
│   (crash-app)   │
└────────┬────────┘
         │
         │ List Pods, Get Status
         │
    ┌────▼─────────────────────────────────┐
    │  analyze_cluster_issues()             │
    │                                       │
    │  Level 1: Check Pod Phase             │
    │  Level 2: Check Pod Conditions        │
    │  Level 3: Check Container Status      │
    │           - Waiting state             │
    │           - Terminated state          │
    │                                       │
    │  Get failure reason + logs            │
    │  Generate remediation suggestion      │
    └────┬──────────────────────────────────┘
         │
         │ [IncidentIssue objects]
         │
    ┌────▼────────────────────┐
    │  /analyze endpoint       │
    │  (routes.py)             │
    │                          │
    │  Send logs to AI         │
    │  Get analysis            │
    │  Return to Frontend      │
    └────┬────────────────────┘
         │
         │ JSON Array
         │
    ┌────▼────────────────┐
    │  React Dashboard    │
    │  - Shows incident   │
    │  - Shows reason     │
    │  - Shows suggestion │
    │  - Shows AI analysis│
    └─────────────────────┘
```

## Configuration Options

### In `analyze_cluster_issues()`:

**FAILURE_REASONS** - Add/remove specific reasons to detect
```python
FAILURE_REASONS = {
    "CrashLoopBackOff",
    "ImagePullBackOff",
    # ... add more as needed
}
```

**FAILURE_PHASES** - Pod phases that indicate failure
```python
FAILURE_PHASES = {"Failed", "Unknown"}
```

**Log tail lines** - Get last N lines of logs
```python
logs = get_pod_logs(pod_namespace, pod_name, tail_lines=100)  # Change 100 to desired value
```

**Log size limit** - Limit logs sent to frontend
```python
"logs": logs[:2000],  # Change 2000 to desired max bytes
```

## Performance Considerations

- **Async Analysis**: For large clusters, consider running analysis in background job
- **Caching**: Cache pod status for 10 seconds to avoid rapid API calls
- **Filtering**: Can add namespace filter to focus on specific namespaces
- **Batch Size**: For 100+ pods, consider processing in batches

## Security Considerations

- ✅ RBAC: Ensure service account has minimal permissions
- ✅ Log Filtering: Logs might contain secrets - consider redacting
- ✅ Error Handling: Never expose internal k8s errors to frontend
- ✅ Access Control: Protect /restart-pod and /delete-pod endpoints

## Migration Checklist

- [ ] Update `kubernetes_service.py` with new implementation
- [ ] Update `routes.py` with HTTPException error handling
- [ ] Create/update `models/incident.py` with IncidentIssue model
- [ ] Test with single failing pod
- [ ] Test with multiple failure scenarios
- [ ] Verify frontend dashboard updates
- [ ] Verify AI analysis kicks in
- [ ] Test pod restart/delete buttons
- [ ] Check logs in browser console
- [ ] Load test with 50+ pods

## Troubleshooting Checklist

- [ ] Minikube/K8s cluster running?
- [ ] Pod actually in Error state?
- [ ] Backend service running and accessible?
- [ ] Frontend connected to correct API endpoint?
- [ ] Kubernetes kubeconfig loaded in backend?
- [ ] Ollama running if using AI analysis?
- [ ] Network connectivity between services?
- [ ] Check terminal logs for errors?
- [ ] Try pod logs manually: `kubectl logs <pod>`?
- [ ] Try API manually: `curl http://127.0.0.1:8000/analyze`?

## Success Indicators

✅ **Fix is working when:**
1. `kubectl get pods` shows crash-app in Error state
2. `/analyze` API returns non-empty array
3. Frontend dashboard shows "Failed Pods = 1"
4. Incident cards display with reason and suggestion
5. AI analysis appears below incident details
6. Restart/Delete buttons work
7. New failures are detected within 10 seconds (refetch interval)
