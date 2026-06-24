#  AI DevOps Copilot

> AI-Powered Kubernetes Incident Intelligence & Observability Platform

[![React](https://img.shields.io/badge/Frontend-React-blue)]()
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)]()
[![Kubernetes](https://img.shields.io/badge/Kubernetes-EKS-326CE5)]()
[![Ollama](https://img.shields.io/badge/LLM-Llama%203-orange)]()
[![Prometheus](https://img.shields.io/badge/Monitoring-Prometheus-red)]()
[![Grafana](https://img.shields.io/badge/Visualization-Grafana-orange)]()

AI DevOps Copilot is a cloud-native AIOps platform that combines Kubernetes observability, AI-powered incident analysis, real-time monitoring, and intelligent troubleshooting into a unified operational dashboard.

AI DevOps Copilot is a cloud-native AIOps platform that combines Kubernetes observability, AI-powered incident analysis, real-time monitoring, and intelligent troubleshooting into a unified operational dashboard.

🎯 Project Overview

Modern Kubernetes environments generate a continuous stream of:

Cluster Events
Pod Status Changes
Infrastructure Metrics
Application Logs
Resource Utilization Data
Operational Alerts

Analyzing and correlating this information manually is both time-consuming and error-prone.

AI DevOps Copilot addresses this challenge by combining:

Kubernetes Monitoring
AI-Powered Incident Intelligence
Real-Time Event Streaming
Observability Engineering
Cloud-Native Deployment

to create an intelligent operational assistant for DevOps teams.

✨ Key Features
🤖 AI-Powered Incident Intelligence

Powered by:

Ollama
Llama 3

Capabilities:

Root Cause Analysis
Incident Summarization
Intelligent Recommendations
Infrastructure Insights
Context-Aware Troubleshooting
☸ Kubernetes Monitoring

Monitor Kubernetes resources in real time:

Pods
Nodes
Deployments
Services
Namespaces
ReplicaSets
Events

Provides continuous visibility into cluster health and workload status.

📡 Real-Time WebSocket Monitoring

Implemented a WebSocket-based communication layer to provide:

Live Incident Updates
Real-Time Cluster Events
Instant Dashboard Synchronization
Continuous Infrastructure Visibility

This enables engineers to observe operational changes as they happen.

⚡ Asynchronous Incident Processing

Built using:

Redis
RQ (Redis Queue)

Responsibilities:

Background Incident Processing
AI Analysis Requests
Event Queue Management
Scalable Workload Distribution

Benefits:

Improved Performance
Reduced API Latency
Faster Dashboard Response Times
Better Scalability
📊 Observability Platform
Prometheus

Collects:

Cluster Metrics
Node Metrics
Pod Metrics
Resource Utilization Metrics
Application Health Metrics
Grafana

Provides:

Infrastructure Dashboards
Resource Monitoring
Cluster Health Visualization
Incident Analytics
Loki

Provides centralized log aggregation:

Kubernetes Logs
Application Logs
Pod-Level Visibility
Operational Troubleshooting

Together, Prometheus, Grafana, and Loki provide a complete observability stack.

🐳 Containerized Architecture

All platform services are containerized using Docker.

Containers:

Frontend Service
Backend Service
Ollama Service
Redis Service
RQ Worker Services

Benefits:

Portability
Consistency
Scalability
Simplified Deployment

☁️ AWS EKS Deployment

The platform is deployed using Amazon Elastic Kubernetes Service (EKS).

Infrastructure Components:

Amazon EKS
Amazon VPC
Security Groups
IAM Roles
Application Load Balancer
Kubernetes Worker Nodes

This deployment architecture follows cloud-native best practices for scalability and reliability.

.

🏗️ System Architecture

<img width="1485" height="1041" alt="unnamed (3)" src="https://github.com/user-attachments/assets/f0b8cb6f-781b-4888-85bd-aa5b6e1a1d24" />


## 🧠 AI Incident Analysis Workflow

```mermaid
flowchart TD

A[Kubernetes Incident]
--> B[FastAPI Backend]

B --> C[Cluster Context Collection]

C --> D[Redis Queue]

D --> E[RQ Worker]

E --> F[Ollama + Llama 3]

F --> G[AI Analysis]

G --> H[Root Cause Analysis]
G --> I[Incident Summary]
G --> J[Recommendations]
G --> K[Operational Insights]

H --> L[Dashboard]
I --> L
J --> L
K --> L
```
<img width="1009" height="1165" alt="unnamed (1)" src="https://github.com/user-attachments/assets/7b13a3ec-3e06-4679-960f-86efcbc24cc6" />


## 📡 Real-Time Monitoring Workflow

```mermaid
flowchart TD

A[Kubernetes Cluster]
--> B[Monitoring Engine]

B --> C[WebSocket Gateway]

C --> D[React Dashboard]

D --> E[Live Infrastructure Updates]

E --> F[Pod Status Monitoring]
E --> G[Node Health Monitoring]
E --> H[Deployment Monitoring]
E --> I[Incident Notifications]
```
<img width="1009" height="1165" alt="unnamed (1)" src="https://github.com/user-attachments/assets/ce70cdb0-bca4-4808-9b04-6e0bddba8254" />

## 🔍 Observability Workflow

```mermaid
flowchart LR

A[Kubernetes Pods & Nodes]
--> B[Prometheus]

B --> C[Metrics Collection]

C --> D[Grafana Dashboards]

E[Kubernetes Logs]
--> F[Loki]

F --> G[Log Aggregation]

G --> H[Grafana Log Explorer]

D --> I[Unified Observability Layer]
H --> I
```
## 🛠️ Technology Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios)
<img width="2540" height="1309" alt="brave_screenshot_localhost" src="https://github.com/user-attachments/assets/9380316b-e643-4b15-939a-dda72c64f19f" />

<img width="2530" height="1305" alt="brave_screenshot_localhost (1)" src="https://github.com/user-attachments/assets/b442a145-6dc0-44ee-a491-de60f0bebaf0" />

<img width="2539" height="1304" alt="brave_screenshot_localhost (2)" src="https://github.com/user-attachments/assets/a60c64df-d7e2-4e83-bcf5-84f6189d7c6d" />



### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python)
![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI_Server-success?style=for-the-badge)
<img width="2542" height="1300" alt="brave_screenshot" src="https://github.com/user-attachments/assets/e713f67f-c518-4979-855a-3fa309225f06" />

<img width="2551" height="1303" alt="brave_screenshot (1)" src="https://github.com/user-attachments/assets/d53fa95a-82fc-41a4-bcfb-f46cfebab52a" />


### AI & Intelligence
![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge)
![Llama3](https://img.shields.io/badge/Llama_3-Meta_AI-blue?style=for-the-badge)
<img width="2537" height="1307" alt="brave_screenshot_localhost (2)" src="https://github.com/user-attachments/assets/0eeebbca-0837-4bb5-b6b9-efd9a3d2149d" />

<img width="2540" height="1306" alt="brave_screenshot_localhost" src="https://github.com/user-attachments/assets/eb77fe2b-e986-4ff1-b17a-2dd2019694ca" />

### Real-Time Communication
![WebSocket](https://img.shields.io/badge/WebSocket-Real_Time-orange?style=for-the-badge)
<img width="2544" height="1306" alt="brave_screenshot_localhost (3)" src="https://github.com/user-attachments/assets/fca17eec-3610-437e-a0f6-4b46cf2977de" />

<img width="2543" height="1307" alt="brave_screenshot_localhost" src="https://github.com/user-attachments/assets/27caee1c-4772-4b01-b8b4-a9223e4cdfad" />

<img width="2541" height="1305" alt="brave_screenshot_localhost (1)" src="https://github.com/user-attachments/assets/b756162f-7cf8-41eb-989f-81b69ed2a895" />

### Async Processing
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis)
![RQ](https://img.shields.io/badge/RQ_Workers-Background_Jobs-red?style=for-the-badge)

### Monitoring & Observability
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana)
![Loki](https://img.shields.io/badge/Loki-Log_Aggregation-yellow?style=for-the-badge)
<img width="2552" height="1296" alt="brave_screenshot_localhost" src="https://github.com/user-attachments/assets/88aa6467-7b4a-4518-9da1-251d7dce857d" />

<img width="2559" height="1295" alt="brave_screenshot_localhost (1)" src="https://github.com/user-attachments/assets/7789ec52-5a2e-4d55-8517-1ea0512ed603" />

### Containerization
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge)
<img width="2552" height="1309" alt="Screenshot 2026-06-17 171628" src="https://github.com/user-attachments/assets/c7ce4f56-f09f-4ea6-9d5a-946940c79e6a" />


### Cloud & Orchestration
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes)
![Amazon EKS](https://img.shields.io/badge/Amazon_EKS-FF9900?style=for-the-badge&logo=amazon-aws)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws)
![IAM](https://img.shields.io/badge/IAM-Security-orange?style=for-the-badge)
![VPC](https://img.shields.io/badge/VPC-Networking-blue?style=for-the-badge)
![ALB](https://img.shields.io/badge/Application_Load_Balancer-FF9900?style=for-the-badge)
<img width="2548" height="1391" alt="Screenshot 2026-06-17 160102" src="https://github.com/user-attachments/assets/e75da7c4-8679-4ee4-8714-5bbe1868dd7f" />

<img width="2559" height="1345" alt="Screenshot 2026-06-20 213217" src="https://github.com/user-attachments/assets/b32191a7-64f6-43ea-9d3d-e65d3081e421" />


### Version Control
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github)

## 📂 Project Structure

```text
AI-DevOps-Copilot
│
├── backend/
│   ├── app/
│   ├── services/
│   ├── routes/
│   ├── models/
│   ├── worker.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── kubernetes/
│   ├── deployments/
│   │   ├── backend-deployment.yaml
│   │   └── frontend-deployment.yaml
│   │
│   ├── services/
│   │   ├── backend-service.yaml
│   │   └── frontend-service.yaml
│   │
│   ├── monitoring/
│   │   ├── prometheus.yaml
│   │   └── grafana.yaml
│   │
│   └── ingress.yaml
│
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   └── loki/
│
├── terraform/
│
├── docs/
│
├── images/
│   ├── architecture-diagram.png
│   ├── dashboard.png
│   ├── grafana-dashboard.png
│   └── eks-deployment.png
│
├── docker-compose.yml
├── README.md
└── .github/
```└── README.md


## 🚀 Deployment Pipeline

```mermaid
flowchart LR

A[Developer]
--> B[GitHub Repository]

B --> C[Docker Build]

C --> D[Docker Images]

D --> E[Docker Hub]

E --> F[Amazon EKS Cluster]

F --> G[Frontend Deployment]

F --> H[Backend Deployment]

H --> I[Redis]

H --> J[RQ Workers]

H --> K[Ollama + Llama 3]

G --> L[React Dashboard]

L --> M[End Users]
```
# 🏆 Project Development Roadmap

```mermaid
timeline
    title AI DevOps Copilot Development Journey

    Phase 1 : Project Foundation & Architecture
            : Architecture Design
            : Cloud-Native Planning
            : Kubernetes Strategy

    Phase 2 : Backend Development
            : FastAPI APIs
            : Incident Services
            : Backend Architecture

    Phase 3 : Kubernetes Integration
            : Kubernetes Client
            : Cluster Monitoring APIs
            : Resource Discovery

    Phase 4 : Frontend Development
            : React Dashboard
            : Monitoring UI
            : Incident Management

    Phase 5 : Real-Time Monitoring
            : WebSockets
            : Live Event Streaming
            : Dashboard Synchronization

    Phase 6 : AI Integration
            : Ollama Integration
            : Llama 3 Deployment
            : AI Service Layer

    Phase 7 : Incident Intelligence Engine
            : Root Cause Analysis
            : Incident Summarization
            : AI Recommendations

    Phase 8 : Observability Stack
            : Prometheus
            : Grafana
            : Loki

    Phase 9 : Async Processing & Containerization
            : Redis
            : RQ Workers
            : Docker & Docker Compose

    Phase 10 : Cloud Deployment & Production Readiness
             : AWS EKS Deployment
             : Kubernetes Workloads
             : Production Validation
```


# 🎓 Skills Demonstrated

### Cloud & DevOps

- AWS
- Amazon EKS
- Docker
- Kubernetes
- kubectl
- eksctl

### Backend Engineering

- FastAPI
- Python
- REST APIs
- WebSockets

### Frontend Development

- React
- Vite
- Tailwind CSS

### AI & LLM Engineering

- Ollama
- Llama 3
- Prompt Engineering
- AI Incident Analysis

### Monitoring & Observability

- Prometheus
- Grafana
- Loki

### Distributed Systems

- Redis
- RQ Workers
- Asynchronous Processing

### Platform Engineering

- Incident Management
- Infrastructure Monitoring
- Root Cause Analysis
- Observability Engineering
🔮 Future Enhancements
# 🔮 Future Enhancements

- CI/CD using GitHub Actions
- Automated Incident Remediation
- Multi-Cluster Kubernetes Monitoring
- Slack Integration
- Microsoft Teams Integration
- Alertmanager Integration
- Predictive Incident Detection
- AI Agent Workflows
- RBAC & Multi-Tenant Support

# 👩‍💻 Author

**Iram Khan**

B.Tech – Computer Science & Engineering  
Specialization: Cloud Computing & Automation  
VIT Bhopal University

### Connect With Me

- GitHub: https://github.com/iramk596
- LinkedIn: 

---

# ⭐ Support

If you found this project useful:

- ⭐ Star the repository
- 🍴 Fork the project
- 📢 Share it with your network

Your support helps improve and expand the platform.
