# Deployment Guide - Agent Workflow

Complete guide for deploying your Next.js Agent Workflow application to the cloud.

## Quick Start

Choose your cloud provider:
- **[AWS Deployment](./aws-deployment.md)** - Amazon Web Services
- **[GCP Deployment](./gcp-deployment.md)** - Google Cloud Platform  
- **[Azure Deployment](./azure-deployment.md)** - Microsoft Azure

---

## Which Cloud Provider Should I Choose?

### AWS (Amazon Web Services)
**Best for:**
- Most mature ecosystem
- Widest range of services
- Enterprise adoption
- Best documentation

**Easiest option:** AWS Amplify
**Most scalable:** ECS Fargate

---

### GCP (Google Cloud Platform)
**Best for:**
- Modern containerized apps
- Cost-effective serverless
- AI/ML integration
- Simpler pricing

**Easiest option:** Cloud Run (highly recommended!)
**Most scalable:** Cloud Run or GKE

---

### Azure
**Best for:**
- Microsoft ecosystem integration
- Enterprise Windows environments
- Hybrid cloud scenarios
- .NET applications

**Easiest option:** Azure App Service
**Most scalable:** AKS

---

## Deployment Comparison Matrix

| Feature | AWS Amplify | GCP Cloud Run | Azure App Service |
|---------|------------|---------------|-------------------|
| **Setup Time** | 5 min | 5 min | 10 min |
| **Cost (monthly)** | $10-30 | $5-20 | $13-55 |
| **Auto-scaling** | ✅ | ✅ | ✅ |
| **Custom Domain** | ✅ | ✅ | ✅ |
| **Free SSL** | ✅ | ✅ | ✅ |
| **CI/CD Built-in** | ✅ | ⚠️ Need setup | ⚠️ Need setup |
| **Difficulty** | Easy | Easy | Medium |
| **Best For** | Beginners | Cost-conscious | Microsoft shops |

---

## My Recommendation by Use Case

### 🎯 For Learning/Testing
**Use:** GCP Cloud Run
- Generous free tier
- Simplest deployment
- Pay only when running
- Great documentation

```bash
gcloud run deploy --source .
```

### 💼 For Production (Small Business)
**Use:** AWS Amplify or GCP Cloud Run
- Reliable auto-scaling
- Managed infrastructure
- Affordable
- Good support

### 🏢 For Enterprise
**Use:** AWS ECS/EKS or GCP GKE or Azure AKS
- Full Kubernetes capabilities
- Advanced networking
- Compliance features
- High availability

### 💰 For Cost Optimization
**Use:** GCP Cloud Run or AWS Lambda
- Pay per request
- Automatic scale to zero
- No idle costs

---

## Pre-Deployment Checklist

### 1. Environment Variables
Create `.env.production`:
```bash
NODE_ENV=production
OPENAI_API_KEY=sk-your-actual-key
FIRECRAWL_API_KEY=fc-your-actual-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Build Test
```bash
npm run build
npm start
```

### 3. Docker Test (if using containers)
```bash
docker build -t agent-workflow .
docker run -p 3000:3000 agent-workflow
```

### 4. Security
- ✅ Use secrets manager (not hardcoded keys)
- ✅ Enable HTTPS/SSL
- ✅ Set up CORS if needed
- ✅ Configure rate limiting

### 5. Performance
- ✅ Enable caching
- ✅ Optimize images
- ✅ Use CDN for static assets
- ✅ Monitor resource usage

---

## Cost Estimates (Monthly)

### Low Traffic (< 10k requests/month)
- **GCP Cloud Run:** ~$5
- **AWS Lambda:** ~$5
- **Azure Container Instances:** ~$15

### Medium Traffic (< 100k requests/month)
- **AWS Amplify:** ~$20
- **GCP Cloud Run:** ~$15
- **Azure App Service:** ~$30

### High Traffic (> 1M requests/month)
- **AWS ECS Fargate:** ~$50-100
- **GCP Cloud Run:** ~$40-80
- **Azure AKS:** ~$100-200

---

## Step-by-Step: Recommended Path

### For First-Time Deployers

**Step 1:** Choose GCP Cloud Run (easiest)

**Step 2:** Install Google Cloud SDK
```bash
# Download from: https://cloud.google.com/sdk/docs/install
gcloud init
```

**Step 3:** Deploy
```bash
gcloud run deploy agent-workflow \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

**Step 4:** Add secrets
```bash
gcloud secrets create openai-key --data-file=- 
# Paste your key, press Ctrl+D

gcloud secrets create firecrawl-key --data-file=-
# Paste your key, press Ctrl+D
```

**Step 5:** Update service with secrets
```bash
gcloud run services update agent-workflow \
  --set-secrets OPENAI_API_KEY=openai-key:latest,FIRECRAWL_API_KEY=firecrawl-key:latest
```

Done! Your app is live at the provided URL.

---

## Troubleshooting

### Build Fails
```bash
# Check Node version
node --version  # Should be 18+

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables Not Working
```bash
# Check if variables are set
echo $OPENAI_API_KEY

# For Cloud Run
gcloud run services describe agent-workflow --format="value(spec.template.spec.containers[0].env)"
```

### Port Issues
Next.js uses port 3000 by default. Some platforms need:
```json
{
  "scripts": {
    "start": "next start -p $PORT"
  }
}
```

### SSL Certificate Issues
Most platforms auto-provision SSL. If not:
- AWS: Use Certificate Manager
- GCP: Automatic with Cloud Run
- Azure: Enable HTTPS in App Service

---

## Domain Configuration

### 1. Buy Domain
- Namecheap, GoDaddy, or use cloud provider

### 2. Configure DNS
Point to your deployment:
- **AWS:** Use Route 53
- **GCP:** Use Cloud DNS
- **Azure:** Use Azure DNS

### 3. Add to Deployment
```bash
# GCP
gcloud run domain-mappings create --service=agent-workflow --domain=your-domain.com

# AWS
# Use Amplify console or Route 53

# Azure
az webapp config hostname add --hostname your-domain.com
```

---

## Monitoring & Logs

### AWS
```bash
# CloudWatch
aws logs tail /aws/lambda/agent-workflow --follow
```

### GCP
```bash
# Cloud Logging
gcloud run services logs read agent-workflow --limit=50 --follow
```

### Azure
```bash
# App Service logs
az webapp log tail --name agent-workflow
```

---

## Scaling Configuration

### Horizontal Scaling (More Instances)
```bash
# GCP Cloud Run
gcloud run services update agent-workflow --max-instances=10

# AWS ECS
aws ecs update-service --desired-count 5

# Azure App Service
az appservice plan update --number-of-workers 3
```

### Vertical Scaling (More Resources)
```bash
# GCP Cloud Run
gcloud run services update agent-workflow --memory=2Gi --cpu=2

# AWS Lambda
aws lambda update-function-configuration --memory-size 2048

# Azure App Service
az appservice plan update --sku S2
```

---

## Backup & Disaster Recovery

### Database Backups
If you add a database later:
- Enable automatic backups
- Test restore procedures
- Use multiple regions

### Application Backups
- Version control (Git)
- Container registry
- Infrastructure as Code

### Secrets Backup
- Export from secrets manager
- Store encrypted offline
- Document access procedures

---

## Next Steps After Deployment

1. **Setup Monitoring**
   - Enable application insights
   - Configure alerts
   - Track error rates

2. **Enable Analytics**
   - Google Analytics
   - PostHog
   - Mixpanel

3. **Performance Optimization**
   - Enable caching
   - Use CDN
   - Optimize images

4. **Security Hardening**
   - Enable WAF
   - Setup DDoS protection
   - Regular security audits

5. **CI/CD Pipeline**
   - Automated testing
   - Staging environment
   - Blue-green deployments

---

## Getting Help

- **AWS:** [AWS Support](https://aws.amazon.com/support/)
- **GCP:** [Google Cloud Support](https://cloud.google.com/support)
- **Azure:** [Azure Support](https://azure.microsoft.com/support/)

Community:
- Stack Overflow
- Reddit r/aws, r/googlecloud, r/AZURE
- Discord servers

