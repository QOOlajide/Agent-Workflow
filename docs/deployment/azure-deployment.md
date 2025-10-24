# Microsoft Azure Deployment Guide

This guide covers deploying your Next.js Agent Workflow application on Azure.

## Option 1: Azure App Service (Easiest)

**Best for:** Quick deployment, automatic scaling, managed environment

### Steps:

1. **Install Azure CLI**
   ```bash
   # Download from: https://aka.ms/installazurecliwindows
   
   # Login
   az login
   
   # Set subscription
   az account set --subscription YOUR_SUBSCRIPTION_ID
   ```

2. **Create Resource Group**
   ```bash
   az group create \
     --name agent-workflow-rg \
     --location eastus
   ```

3. **Create App Service Plan**
   ```bash
   az appservice plan create \
     --name agent-workflow-plan \
     --resource-group agent-workflow-rg \
     --sku B1 \
     --is-linux
   ```

4. **Create Web App**
   ```bash
   az webapp create \
     --name agent-workflow \
     --resource-group agent-workflow-rg \
     --plan agent-workflow-plan \
     --runtime "NODE:18-lts"
   ```

5. **Configure Environment Variables**
   ```bash
   az webapp config appsettings set \
     --name agent-workflow \
     --resource-group agent-workflow-rg \
     --settings \
       NODE_ENV=production \
       OPENAI_API_KEY=sk-your-key \
       FIRECRAWL_API_KEY=fc-your-key \
       NEXT_PUBLIC_APP_URL=https://agent-workflow.azurewebsites.net
   ```

6. **Deploy via Git**
   ```bash
   # Get deployment credentials
   az webapp deployment user set \
     --user-name YOUR_USERNAME \
     --password YOUR_PASSWORD
   
   # Get Git URL
   az webapp deployment source config-local-git \
     --name agent-workflow \
     --resource-group agent-workflow-rg
   
   # Deploy
   git remote add azure https://YOUR_USERNAME@agent-workflow.scm.azurewebsites.net/agent-workflow.git
   git push azure main
   ```

7. **Alternative: Deploy via ZIP**
   ```bash
   # Build locally
   npm run build
   
   # Create deployment package
   zip -r deploy.zip .next node_modules package.json package-lock.json public
   
   # Deploy
   az webapp deployment source config-zip \
     --name agent-workflow \
     --resource-group agent-workflow-rg \
     --src deploy.zip
   ```

**Cost:** ~$13-55/month (B1 to S1 tier)

---

## Option 2: Azure Container Instances (Serverless Containers)

**Best for:** Simple containerized apps, cost-effective

### Steps:

1. **Create Azure Container Registry**
   ```bash
   az acr create \
     --name agentworkflowacr \
     --resource-group agent-workflow-rg \
     --sku Basic \
     --admin-enabled true
   ```

2. **Build and Push Docker Image**
   ```bash
   # Login to ACR
   az acr login --name agentworkflowacr
   
   # Build image
   docker build -t agent-workflow .
   
   # Tag
   docker tag agent-workflow agentworkflowacr.azurecr.io/agent-workflow:latest
   
   # Push
   docker push agentworkflowacr.azurecr.io/agent-workflow:latest
   ```

3. **Create Container Instance**
   ```bash
   az container create \
     --name agent-workflow-container \
     --resource-group agent-workflow-rg \
     --image agentworkflowacr.azurecr.io/agent-workflow:latest \
     --registry-login-server agentworkflowacr.azurecr.io \
     --registry-username $(az acr credential show --name agentworkflowacr --query username -o tsv) \
     --registry-password $(az acr credential show --name agentworkflowacr --query passwords[0].value -o tsv) \
     --dns-name-label agent-workflow \
     --ports 3000 \
     --environment-variables \
       NODE_ENV=production \
       OPENAI_API_KEY=sk-your-key \
       FIRECRAWL_API_KEY=fc-your-key \
     --cpu 1 \
     --memory 1.5
   ```

4. **Get Public IP**
   ```bash
   az container show \
     --name agent-workflow-container \
     --resource-group agent-workflow-rg \
     --query ipAddress.fqdn \
     --output tsv
   ```

**Cost:** ~$15-30/month (pay for container uptime)

---

## Option 3: Azure Kubernetes Service (AKS)

**Best for:** Production-grade, scalable applications

### Steps:

1. **Create AKS Cluster**
   ```bash
   az aks create \
     --name agent-workflow-aks \
     --resource-group agent-workflow-rg \
     --node-count 2 \
     --node-vm-size Standard_B2s \
     --enable-managed-identity \
     --generate-ssh-keys
   
   # Get credentials
   az aks get-credentials \
     --name agent-workflow-aks \
     --resource-group agent-workflow-rg
   ```

2. **Create Kubernetes Manifests**
   
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
           image: agentworkflowacr.azurecr.io/agent-workflow:latest
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

3. **Create Secrets**
   ```bash
   kubectl create secret generic api-secrets \
     --from-literal=openai-key=sk-your-key \
     --from-literal=firecrawl-key=fc-your-key
   ```

4. **Deploy**
   ```bash
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   
   # Get external IP
   kubectl get service agent-workflow-service
   ```

**Cost:** ~$70-150/month (depends on node count)

---

## Option 4: Azure Static Web Apps + API

**Best for:** Static sites with serverless API functions

### Steps:

1. **Create Static Web App**
   ```bash
   az staticwebapp create \
     --name agent-workflow \
     --resource-group agent-workflow-rg \
     --location eastus2
   ```

2. **Configure GitHub Actions**
   Azure automatically creates a GitHub Actions workflow when you link your repo.

3. **Project Structure**
   ```
   /
   ├── src/
   ├── public/
   ├── api/          # Azure Functions (serverless API)
   │   ├── openai/
   │   │   └── index.js
   │   └── firecrawl/
   │       └── index.js
   └── staticwebapp.config.json
   ```

4. **staticwebapp.config.json**
   ```json
   {
     "routes": [
       {
         "route": "/api/*",
         "allowedRoles": ["anonymous"]
       }
     ],
     "navigationFallback": {
       "rewrite": "/index.html"
     }
   }
   ```

5. **Convert API Routes to Azure Functions**
   
   **api/openai/index.js**
   ```javascript
   module.exports = async function (context, req) {
     const { prompt, model, connectedData } = req.body;
     
     // Your OpenAI logic here
     
     context.res = {
       status: 200,
       body: { success: true, data: response }
     };
   };
   ```

**Cost:** Free tier available, then ~$9/month

---

## Option 5: Azure VM (Traditional Server)

**Best for:** Full control, custom configurations

### Steps:

1. **Create Virtual Machine**
   ```bash
   az vm create \
     --name agent-workflow-vm \
     --resource-group agent-workflow-rg \
     --image UbuntuLTS \
     --size Standard_B2s \
     --admin-username azureuser \
     --generate-ssh-keys
   
   # Open ports
   az vm open-port \
     --name agent-workflow-vm \
     --resource-group agent-workflow-rg \
     --port 80
   
   az vm open-port \
     --name agent-workflow-vm \
     --resource-group agent-workflow-rg \
     --port 443
   ```

2. **Get Public IP**
   ```bash
   az vm show \
     --name agent-workflow-vm \
     --resource-group agent-workflow-rg \
     --show-details \
     --query publicIps \
     --output tsv
   ```

3. **SSH and Setup** (Same as AWS EC2 setup)
   ```bash
   ssh azureuser@YOUR_PUBLIC_IP
   
   # Install Node.js, PM2, Nginx
   # Deploy application
   # Configure reverse proxy
   ```

**Cost:** ~$15-50/month (B2s to D2s tier)

---

## Comparison

| Method | Difficulty | Cost | Scalability | Best For |
|--------|-----------|------|-------------|----------|
| App Service | ⭐ Easy | $$ | ⭐⭐⭐⭐ | Quick deployment |
| Container Instances | ⭐⭐ Medium | $ | ⭐⭐⭐ | Simple containers |
| AKS | ⭐⭐⭐⭐ Hard | $$$ | ⭐⭐⭐⭐⭐ | Production apps |
| Static Web Apps | ⭐ Easy | $ | ⭐⭐⭐⭐ | JAMstack apps |
| VM | ⭐⭐⭐ Hard | $$ | ⭐⭐ | Full control |

---

## Azure Key Vault (Secrets Management)

```bash
# Create Key Vault
az keyvault create \
  --name agent-workflow-kv \
  --resource-group agent-workflow-rg \
  --location eastus

# Store secrets
az keyvault secret set \
  --vault-name agent-workflow-kv \
  --name openai-api-key \
  --value sk-your-key

az keyvault secret set \
  --vault-name agent-workflow-kv \
  --name firecrawl-api-key \
  --value fc-your-key

# Reference in App Service
az webapp config appsettings set \
  --name agent-workflow \
  --resource-group agent-workflow-rg \
  --settings \
    OPENAI_API_KEY="@Microsoft.KeyVault(VaultName=agent-workflow-kv;SecretName=openai-api-key)"
```

---

## Custom Domain & SSL

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name agent-workflow \
  --resource-group agent-workflow-rg \
  --hostname your-domain.com

# Enable HTTPS
az webapp update \
  --name agent-workflow \
  --resource-group agent-workflow-rg \
  --https-only true

# SSL certificate (managed)
az webapp config ssl create \
  --name agent-workflow \
  --resource-group agent-workflow-rg \
  --hostname your-domain.com
```

---

## Monitoring

```bash
# Enable Application Insights
az monitor app-insights component create \
  --app agent-workflow-insights \
  --location eastus \
  --resource-group agent-workflow-rg

# View logs
az webapp log tail \
  --name agent-workflow \
  --resource-group agent-workflow-rg
```

---

## CI/CD with Azure DevOps

**azure-pipelines.yml**
```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
  
  - script: |
      npm ci
      npm run build
    displayName: 'Build'
  
  - task: ArchiveFiles@2
    inputs:
      rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
      includeRootFolder: false
      archiveType: 'zip'
      archiveFile: '$(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip'
  
  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'YOUR_SERVICE_CONNECTION'
      appName: 'agent-workflow'
      package: '$(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip'
```

