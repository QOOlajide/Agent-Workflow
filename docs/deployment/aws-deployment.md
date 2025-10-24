# AWS Deployment Guide

This guide covers deploying your Next.js Agent Workflow application on AWS.

## Option 1: AWS Amplify (Easiest)

**Best for:** Quick deployments, automatic CI/CD, managed infrastructure

### Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/agent-workflow.git
   git push -u origin main
   ```

2. **Deploy with Amplify**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your GitHub repository
   - Configure build settings (Amplify auto-detects Next.js)
   - Add environment variables:
     ```
     OPENAI_API_KEY=sk-your-key
     FIRECRAWL_API_KEY=fc-your-key
     NEXT_PUBLIC_APP_URL=https://your-app.amplifyapp.com
     ```
   - Click "Save and deploy"

3. **Automatic Deployments**
   - Every push to `main` branch triggers automatic deployment
   - Preview deployments for pull requests

**Cost:** ~$0.01 per build minute + $0.15 per GB served

---

## Option 2: AWS EC2 with Docker (More Control)

**Best for:** Custom configurations, specific server requirements

### Steps:

1. **Create EC2 Instance**
   ```bash
   # Launch Ubuntu 22.04 LTS instance (t3.medium recommended)
   # Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
   ```

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Docker & Docker Compose**
   ```bash
   # Install Docker
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   ```

4. **Create Dockerfile** (already in project)
   ```dockerfile
   FROM node:18-alpine AS base
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

5. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - OPENAI_API_KEY=${OPENAI_API_KEY}
         - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
         - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
       restart: unless-stopped
   ```

6. **Deploy**
   ```bash
   # Clone your repo
   git clone https://github.com/yourusername/agent-workflow.git
   cd agent-workflow
   
   # Create .env file
   nano .env
   # Add your environment variables
   
   # Build and run
   docker-compose up -d
   ```

7. **Setup Nginx (Optional)**
   ```bash
   sudo apt install nginx
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

8. **SSL Certificate (Let's Encrypt)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

**Cost:** ~$10-30/month (t3.medium instance)

---

## Option 3: AWS ECS with Fargate (Serverless Containers)

**Best for:** Scalable containerized apps without managing servers

### Steps:

1. **Install AWS CLI**
   ```bash
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   aws configure
   ```

2. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name agent-workflow --region us-east-1
   ```

3. **Build and Push Docker Image**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   
   # Build
   docker build -t agent-workflow .
   
   # Tag
   docker tag agent-workflow:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agent-workflow:latest
   
   # Push
   docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agent-workflow:latest
   ```

4. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name agent-workflow-cluster --region us-east-1
   ```

5. **Create Task Definition** (task-definition.json)
   ```json
   {
     "family": "agent-workflow",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [
       {
         "name": "agent-workflow",
         "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agent-workflow:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "OPENAI_API_KEY",
             "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:openai-key"
           },
           {
             "name": "FIRECRAWL_API_KEY",
             "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:firecrawl-key"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/agent-workflow",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

6. **Register Task Definition**
   ```bash
   aws ecs register-task-definition --cli-input-json file://task-definition.json
   ```

7. **Create Service with Load Balancer**
   - Use AWS Console to create Application Load Balancer
   - Create ECS Service pointing to your task definition
   - Configure auto-scaling based on CPU/memory

**Cost:** ~$15-50/month (depends on usage, pay for what you use)

---

## Option 4: AWS Lambda with Serverless Framework (Serverless)

**Best for:** Cost-effective, low-traffic applications

### Steps:

1. **Install Serverless Framework**
   ```bash
   npm install -g serverless
   ```

2. **Install Next.js Serverless Plugin**
   ```bash
   npm install --save-dev serverless-nextjs-plugin
   ```

3. **Create serverless.yml**
   ```yaml
   service: agent-workflow
   
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
     environment:
       NODE_ENV: production
       OPENAI_API_KEY: ${env:OPENAI_API_KEY}
       FIRECRAWL_API_KEY: ${env:FIRECRAWL_API_KEY}
   
   plugins:
     - serverless-nextjs-plugin
   
   custom:
     nextjs:
       buildDir: .next
   ```

4. **Deploy**
   ```bash
   serverless deploy
   ```

**Cost:** Pay per request (~$0.20 per 1M requests + Lambda execution time)

---

## Comparison

| Method | Difficulty | Cost | Scalability | Best For |
|--------|-----------|------|-------------|----------|
| Amplify | ⭐ Easy | $ | ⭐⭐⭐ | Quick deployments |
| EC2 | ⭐⭐⭐ Hard | $$ | ⭐⭐ | Full control |
| ECS Fargate | ⭐⭐ Medium | $$ | ⭐⭐⭐⭐ | Production apps |
| Lambda | ⭐⭐ Medium | $ | ⭐⭐⭐⭐⭐ | Low traffic |

---

## Environment Variables

Store secrets in **AWS Secrets Manager** or **AWS Systems Manager Parameter Store**:

```bash
# Create secrets
aws secretsmanager create-secret \
  --name agent-workflow/openai-key \
  --secret-string "sk-your-key"

aws secretsmanager create-secret \
  --name agent-workflow/firecrawl-key \
  --secret-string "fc-your-key"
```

---

## Custom Domain

Use **AWS Route 53** for DNS:

1. Register domain in Route 53
2. Create hosted zone
3. Point to your deployment (Amplify URL, ALB, CloudFront)
4. Add SSL certificate via AWS Certificate Manager

---

## Monitoring

- **CloudWatch Logs**: View application logs
- **CloudWatch Metrics**: Monitor CPU, memory, requests
- **X-Ray**: Distributed tracing
- **CloudWatch Alarms**: Alert on errors/high usage

```bash
# View logs
aws logs tail /ecs/agent-workflow --follow
```

