# Quick Reference Card - Kubernetes Pod Detection

## 🎯 What Was Fixed

**BEFORE:** Frontend shows `Failed Pods = 0` even when K8s has failing pods ❌

**AFTER:** Frontend correctly shows failing pods and displays incident cards ✅

---

## 🔍 Detection Logic (3-Level Check)

```
┌─────────────────────────────────────┐
│ Kubernetes Pod                      │
└────────┬────────────────────────────┘
         │
         ├─→ LEVEL 1: Pod Phase Check
         │   ├─ Failed? → ISSUE DETECTED
         │   └─ Unknown? → ISSUE DETECTED
         │
         ├─→ LEVEL 2: Pod Conditions Check
         │   └─ Ready = False? → ISSUE DETECTED
         │
         └─→ LEVEL 3: Container Status Check
             ├─ Waiting state with failure reason?
             │  └─ CrashLoopBackOff, ImagePullBackOff, OOMKilled, etc. → ISSUE
             │
             └─ Terminated state?
                ├─ Exit code != 0? → ISSUE
                └─ Reason != Completed? → ISSUE
```

---

## 📋 Failure States Detected (16 Total)

| State | Meaning | Common Fix |
|-------|---------|-----------|
| CrashLoopBackOff | App crashes, restarts, crashes | Fix app bug |
| ImagePullBackOff | Can't download image | Fix registry/credentials |
| OOMKilled | Out of memory | Increase limit |
| Error | Generic failure | Check logs |
| Failed (phase) | Pod overall failed | Check why |
| Unknown (phase) | Node/kubelet problem | Check node |
| ErrImagePull | Image pull failed | Verify image exists |
| RegistryUnavailable | Registry down | Wait or fix registry |
| NodeUnreachable | Node network down | Check network |
| NodeNotReady | Node unhealthy | Restart node |
| Evicted | Resource pressure | Add resources |
| DeadlineExceeded | Startup timeout | Increase timeout |
| +5 more | See code | Check pod events |

---

## 🚀 Quick Test

```bash
# 1. Check if pod exists and is failing
kubectl get pods
# Should see something in Error or other failed state

# 2. Test API directly
curl http://127.0.0.1:8000/analyze | python -m json.tool

# 3. Check frontend
# http://localhost:5173 (should show incident cards)
```

---

## 🐛 Debugging Checklist

### Issue: API returns empty array `[]`

**Checklist:**
```bash
# 1. Does failing pod exist?
kubectl get pods -A
# Must show at least one pod NOT Running/Succeeded

# 2. Check pod details
kubectl describe pod <pod-name> -n <namespace>
# Look for: Status, Conditions, Container States

# 3. Check backend can access K8s
python3 -c "from kubernetes import config; config.load_kube_config(); print('✓ K8s connected')"

# 4. Check backend logs
docker logs <backend-container>
# or terminal where backend runs

# 5. Test function directly
python3 << 'EOF'
from app.services.kubernetes_service import analyze_cluster_issues
import json
print(json.dumps(analyze_cluster_issues(), indent=2))
EOF
```

### Issue: Frontend shows `Failed Pods = 0`

**Checklist:**
```
□ Backend running? → Check terminal/docker logs
□ API responding? → curl http://127.0.0.1:8000/health
□ API has data? → curl http://127.0.0.1:8000/analyze
□ K8s has failures? → kubectl get pods (check status)
□ Browser console errors? → F12 Developer Tools
□ API URL correct? → Check api.js baseURL
```

### Issue: Logs not appearing

```bash
# 1. Pod has logs?
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous  # if crashed

# 2. Pod readable by service account?
kubectl auth can-i get pods --as=system:serviceaccount:default:default

# 3. Try with direct K8s call
python3 << 'EOF'
from kubernetes import client, config
config.load_kube_config()
v1 = client.CoreV1Api()
logs = v1.read_namespaced_pod_log(name='crash-app', namespace='default')
print(logs[:500])  # Print first 500 chars
EOF
```

### Issue: AI Analysis not appearing

```bash
# 1. Ollama running?
curl http://127.0.0.1:11434/api/tags
# Should return list of models

# 2. Model available?
ollama pull llama3  # or your model

# 3. Backend logs show AI error?
docker logs <backend> | grep -i "ai\|ollama\|error"

# 4. Try direct AI call
python3 << 'EOF'
from app.services.openai_service import analyze_logs_with_ai
result = analyze_logs_with_ai("Error logs here")
print(result)
EOF
```

---

## 📊 Data Flow

### Request Path
```
Frontend (Dashboard.jsx)
  ↓ (fetch)
API GET /analyze
  ↓ (Python)
analyze_cluster_issues()
  ↓ (checks)
LEVEL 1: Pod Phase? → LEVEL 2: Pod Conditions? → LEVEL 3: Container Status?
  ↓ (if issue found)
get_pod_logs()
  ↓ (AI, optional)
analyze_logs_with_ai()
  ↓ (returns)
List[IncidentIssue] (JSON)
  ↓ (renders)
Frontend: IncidentCard components
```

---

## 🔧 How to Fix Common Issues

### Fix 1: Pod not detected
**Problem:** Pod in Error state but not in API response

**Solution:**
1. Add debug logging to `analyze_cluster_issues()`
2. Print pod phase, conditions, container status
3. Check if your error reason is in `FAILURE_REASONS` set
4. Add missing reason if needed:
   ```python
   FAILURE_REASONS.add("YourCustomReason")
   ```

### Fix 2: API timeout
**Problem:** API request times out

**Solution:**
```python
# In kubernetes_service.py, reduce tail_lines
logs = get_pod_logs(pod_namespace, pod_name, tail_lines=10)  # reduce from 100

# Or skip logs for large clusters
if pod_count > 100:
    logs = "[Logs skipped for large cluster]"
```

### Fix 3: Frontend not updating
**Problem:** Frontend keeps showing 0 failed pods

**Solution:**
```javascript
// In Dashboard.jsx, force refresh
const [refresh, setRefresh] = useState(0);

// Add button to refresh
<button onClick={() => setRefresh(refresh + 1)}>
  Manual Refresh
</button>

// Check console for errors
console.error(error);  // Should show if API fails
```

---

## 📝 Response Format

### Successful Response
```json
[
  {
    "pod": "crash-app-abc123",
    "namespace": "default",
    "status": "Failed",
    "phase": "Failed",
    "possible_reason": "CrashLoopBackOff: Application exiting with code 1",
    "suggestion": "Pod 'crash-app-abc123' is crashing repeatedly. Check container logs for errors, verify environment variables, and ensure dependencies are available.",
    "logs": "2026-05-25 10:30:45 Error: Connection refused...",
    "container": "crash-app",
    "timestamp": "2026-05-25T10:30:00+00:00",
    "ai_analysis": "The application is unable to connect to a required service."
  }
]
```

### Empty Response (No Issues)
```json
[]
```

### Error Response
```json
{
  "detail": "Cluster analysis failed: Connection refused to Kubernetes API"
}
```

---

## 🧪 Test Commands

### Test with intentional crash pod
```bash
# Create a pod that crashes immediately
kubectl run test-crash --image=busybox --restart=OnFailure -- sh -c 'exit 1'

# Wait 5 seconds
sleep 5

# Check it's in Error/Failed state
kubectl get pods

# Check API
curl http://127.0.0.1:8000/analyze

# Should now show in response
```

### Test with image pull error
```bash
kubectl run test-image-error --image=nonexistent-image:latest

# Wait for ImagePullBackOff
sleep 10

# Check API
curl http://127.0.0.1:8000/analyze
```

### Clean up test pods
```bash
kubectl delete pod test-crash
kubectl delete pod test-image-error
kubectl delete pod test-oom  # if created
```

---

## ⚡ Performance Tips

### For Large Clusters (100+ pods)

**Limit analysis to specific namespace:**
```python
issues = analyze_cluster_issues(namespace="production")
```

**Cache results (don't call every second):**
```python
last_issues = None
last_check_time = 0

def get_issues():
    global last_issues, last_check_time
    if time.time() - last_check_time < 10:  # Cache 10 seconds
        return last_issues
    last_issues = analyze_cluster_issues()
    last_check_time = time.time()
    return last_issues
```

**Run analysis in background job:**
```python
# Use RQ job queue to run async
job = queue.enqueue(analyze_cluster_issues)
result = job.result  # Poll later
```

---

## ✅ Success Checklist

After applying fix:

- [ ] Backend starts without errors
- [ ] `curl http://127.0.0.1:8000/health` returns 200
- [ ] `kubectl get pods` shows pod in Error/Failed state
- [ ] `curl http://127.0.0.1:8000/analyze` returns non-empty JSON
- [ ] Frontend dashboard shows `Failed Pods > 0`
- [ ] Incident card appears with pod details
- [ ] Incident card shows "possible_reason"
- [ ] Incident card shows "suggestion"
- [ ] Incident card shows logs
- [ ] AI analysis appears (if Ollama enabled)
- [ ] Pod restart button works
- [ ] Pod delete button works
- [ ] Manual refresh works
- [ ] Auto-refresh (10s) works

---

## 📞 Getting Help

1. **Read the file:** [KUBERNETES_DETECTION_GUIDE.md](KUBERNETES_DETECTION_GUIDE.md)
2. **Check logs:** Backend terminal or Docker logs
3. **Test directly:**
   ```bash
   curl http://127.0.0.1:8000/analyze | python -m json.tool
   kubectl get pods -A
   kubectl describe pod <name> -n <ns>
   ```
4. **Common issues:** See section above "🐛 Debugging Checklist"

---

## 🎓 Key Concepts

**Pod Phase** - Overall state of pod (Pending, Running, Succeeded, Failed, Unknown)

**Container State** - State of individual container (Waiting, Running, Terminated)

**Waiting Reason** - Why container is waiting (CrashLoopBackOff, ImagePullBackOff, etc.)

**Exit Code** - Return code of container (0=success, >0=failure)

**Pod Condition** - Additional conditions like Ready, Initialized, Scheduled

---

**Version:** 1.0
**Last Updated:** 2026-05-25
**Status:** Production Ready ✅
