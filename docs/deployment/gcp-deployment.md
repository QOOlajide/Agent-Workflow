# Google Cloud Platform (GCP) Deployment Guide

This guide covers deploying your Next.js Agent Workflow application on GCP.

## Option 1: Cloud Run (Easiest - Serverless Containers)

**Best for:** Automatic scaling, pay-per-use, managed infrastructure

### Steps:

1. **Install Google Cloud SDK**
   ```bash
   # Download and install from: https://cloud.google.com/sdk/docs/install
   
   # Initialize
   gcloud init
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Required APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

3. **Create Secrets**
   ```bash
   # Store API keys in Secret Manager
   echo -n "sk-your-key" | gcloud secrets create openai-api-key --data-file=-
   echo -n "fc-your-key" | gcloud secrets create firecrawl-api-key --data-file=-
   ```

4. **Create Dockerfile** (if not exists)
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   FROM node:18-alpine
   WORKDIR /app
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

5. **Deploy to Cloud Run**
   ```bash
   # Build and deploy in one command
   gcloud run deploy agent-workflow \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --set-secrets OPENAI_API_KEY=openai-api-key:latest,FIRECRAWL_API_KEY=firecrawl-api-key:latest \
     --memory 1Gi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 10
   ```

6. **Custom Domain (Optional)**
   ```bash
   # Map custom domain
   gcloud run domain-mappings create \
     --service agent-workflow \
     --domain your-domain.com \
     --region us-central1
   ```

**Cost:** Pay only when running (~$0.00002400 per request + $0.00001200 per GB-second of memory)

---

## Option 2: Google Kubernetes Engine (GKE)

**Best for:** Complex applications, microservices, full Kubernetes features

### Steps:

1. **Create GKE Cluster**
   ```bash
   gcloud container clusters create agent-workflow-cluster \
     --num-nodes 2 \
     --machine-type e2-medium \
     --region us-central1 \
     --enable-autoscaling \
     --min-nodes 1 \
     --max-nodes 5
   
   # Get credentials
   gcloud container clusters get-credentials agent-workflow-cluster --region us-central1
   ```

2. **Build and Push Image to Artifact Registry**
   ```bash
   # Create repository
   gcloud artifacts repositories create agent-workflow \
     --repository-format=docker \
     --location=us-central1
   
   # Configure Docker
   gcloud auth configure-docker us-central1-docker.pkg.dev
   
   # Build and push
   docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/agent-workflow/app:latest .
   docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/agent-workflow/app:latest
   ```

3. **Create Kubernetes Manifests**
   
   **deployment.yaml**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: agent-workflow
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: agent-workflow
     template:
       metadata:
         labels:
           app: agent-workflow
       spec:
         containers:
         - name: app
           image: us-central1-docker.pkg.dev/YOUR_PROJECT_ID/agent-workflow/app:latest
           ports:
           - containerPort: 3000
           env:
           - name: NODE_ENV
             value: "production"
           - name: OPENAI_API_KEY
             valueFrom:
               secretKeyRef:
                 name: api-secrets
                 key: openai-key
           - name: FIRECRAWL_API_KEY
             valueFrom:
               secretKeyRef:
                 name: api-secrets
                 key: firecrawl-key
           resources:
             requests:
               memory: "512Mi"
               cpu: "500m"
             limits:
               memory: "1Gi"
               cpu: "1000m"
   ```
   
   **service.yaml**
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: agent-workflow-service
   spec:
     type: LoadBalancer
     selector:
       app: agent-workflow
     ports:
     - port: 80
       targetPort: 3000
   ```
   
   **secrets.yaml**
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: api-secrets
   type: Opaque
   stringData:
     openai-key: sk-your-key
     firecrawl-key: fc-your-key
   ```

4. **Deploy to GKE**
   ```bash
   kubectl apply -f secrets.yaml
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   
   # Get external IP
   kubectl get service agent-workflow-service
   ```

5. **Setup Ingress for HTTPS**
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: agent-workflow-ingress
     annotations:
       kubernetes.io/ingress.global-static-ip-name: "agent-workflow-ip"
       networking.gke.io/managed-certificates: "agent-workflow-cert"
   spec:
     rules:
     - host: your-domain.com
       http:
         paths:
         - path: /*
           pathType: ImplementationSpecific
           backend:
             service:
               name: agent-workflow-service
               port:
                 number: 80
   ```

**Cost:** ~$50-150/month (depends on node count and type)

---

## Option 3: App Engine (Platform as a Service)

**Best for:** Simple deployment, automatic scaling, managed environment

### Steps:

1. **Create app.yaml**
   ```yaml
   runtime: nodejs18
   
   env_variables:
     NODE_ENV: "production"
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
     target_cpu_utilization: 0.65
   
   handlers:
   - url: /_next/static
     static_dir: .next/static
     secure: always
   
   - url: /.*
     script: auto
     secure: always
   ```

2. **Update package.json**
   ```json
   {
     "scripts": {
       "start": "next start -p $PORT"
     }
   }
   ```

3. **Deploy**
   ```bash
   gcloud app deploy
   ```

4. **Set Environment Variables**
   ```bash
   gcloud app deploy --set-env-vars OPENAI_API_KEY=sk-your-key,FIRECRAWL_API_KEY=fc-your-key
   ```

**Cost:** ~$50-100/month (depends on instance hours)

---

## Option 4: Compute Engine VM (Traditional Server)

**Best for:** Full control, custom configurations

### Steps:

1. **Create VM Instance**
   ```bash
   gcloud compute instances create agent-workflow-vm \
     --machine-type e2-medium \
     --zone us-central1-a \
     --image-family ubuntu-2204-lts \
     --image-project ubuntu-os-cloud \
     --boot-disk-size 20GB \
     --tags http-server,https-server
   
   # Allow HTTP/HTTPS
   gcloud compute firewall-rules create allow-http \
     --allow tcp:80 \
     --target-tags http-server
   
   gcloud compute firewall-rules create allow-https \
     --allow tcp:443 \
     --target-tags https-server
   ```

2. **SSH into VM**
   ```bash
   gcloud compute ssh agent-workflow-vm --zone us-central1-a
   ```

3. **Install Node.js and Dependencies**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt update
   sudo apt install -y nginx
   ```

4. **Deploy Application**
   ```bash
   # Clone repo
   git clone https://github.com/yourusername/agent-workflow.git
   cd agent-workflow
   
   # Install dependencies
   npm ci
   
   # Build
   npm run build
   
   # Create .env
   nano .env
   # Add your environment variables
   
   # Start with PM2
   pm2 start npm --name "agent-workflow" -- start
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/agent-workflow
   ```
   
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/agent-workflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **SSL Certificate**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

**Cost:** ~$15-40/month (e2-medium instance)

---

## Comparison

| Method | Difficulty | Cost | Scalability | Best For |
|--------|-----------|------|-------------|----------|
| Cloud Run | ⭐ Easy | $ | ⭐⭐⭐⭐⭐ | Modern apps, auto-scale |
| GKE | ⭐⭐⭐⭐ Hard | $$$ | ⭐⭐⭐⭐⭐ | Microservices |
| App Engine | ⭐⭐ Medium | $$ | ⭐⭐⭐⭐ | Simple PaaS |
| Compute Engine | ⭐⭐⭐ Hard | $$ | ⭐⭐ | Full control |

---

## Monitoring & Logging

```bash
# View Cloud Run logs
gcloud run services logs read agent-workflow --region us-central1 --limit 50

# View GKE logs
kubectl logs -f deployment/agent-workflow

# Cloud Logging (all services)
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

---

## CI/CD with Cloud Build

**cloudbuild.yaml**
```yaml
steps:
  # Build
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/agent-workflow', '.']
  
  # Push
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agent-workflow']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'agent-workflow'
      - '--image=gcr.io/$PROJECT_ID/agent-workflow'
      - '--region=us-central1'
      - '--platform=managed'
```

Connect to GitHub:
```bash
gcloud builds triggers create github \
  --repo-name=agent-workflow \
  --repo-owner=yourusername \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

