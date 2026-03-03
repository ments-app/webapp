# Ments — Vercel to AWS Migration Guide

> Keep this file out of git (it's in .gitignore).
> Region used throughout: **ap-south-1 (Mumbai)** — matches current Vercel `bom1`.

---

## Quick Decision: Which Option?

| Option | Best For | Time | Cost/mo |
|--------|----------|------|---------|
| **A — AWS Amplify** | Fastest swap, 0–10K DAU | 1–2 hrs | ~$15–25 |
| **B — ECS Fargate** | Auto-scale, 10K–100K DAU | 4–8 hrs | ~$105–250 |
| **C — EC2 + PM2** | Cheapest, full control | 2–4 hrs | ~$30–80 |

**Start with Option A** to get off Vercel fast. Migrate to B when you hit scale.

---

## Pre-flight Checklist (all options)

- [ ] AWS account created
- [ ] IAM user with `AdministratorAccess` (or scoped permissions)
- [ ] AWS CLI installed and configured (`aws configure` — region: `ap-south-1`)
- [ ] Confirm Supabase URL is reachable from AWS Mumbai (it is — Supabase is global)
- [ ] Have these env vars ready:
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  GROQ_API_KEY
  ```

---

## Option A: AWS Amplify (Fastest)

### 1. Add amplify.yml to project root

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### 2. Connect repo in Amplify Console

1. Go to **AWS Amplify Console** → New app → Host web app
2. Connect your GitHub repo (`ments-app/webapp`)
3. Branch: `main`
4. App root: leave as `/` (monorepo root)
5. Build settings: will auto-detect `amplify.yml`

### 3. Set environment variables

In Amplify Console → App settings → Environment variables, add all 4 vars above.

### 4. Custom domain

Amplify Console → Domain management → Add domain → follow wizard.
SSL is provisioned automatically via ACM.

### 5. Remove vercel.json

Once confirmed working, delete `vercel.json` from the repo (or leave it — it won't affect Amplify).

**Limits to know:**
- Default function timeout: 30s (configurable up to 15 min via Lambda settings)
- Cold starts still possible (serverless under the hood)
- No persistent background workers

---

## Option B: ECS Fargate (Recommended for Scale)

### Step 1 — Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# ── Stage 1: Install deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars baked in at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

> `output: 'standalone'` is **already set** in `next.config.ts` — nothing to change there.

### Step 2 — Health check endpoint

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### Step 3 — Push image to ECR

```bash
# Create registry
aws ecr create-repository --repository-name ments-web --region ap-south-1

# Login
aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# Build
docker build -t ments-web \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=<your-url> \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key> \
  .

# Tag + push
docker tag ments-web:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ments-web:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ments-web:latest
```

### Step 4 — Store secrets in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name ments/supabase-service-role-key \
  --secret-string "<YOUR_KEY>" \
  --region ap-south-1

aws secretsmanager create-secret \
  --name ments/groq-api-key \
  --secret-string "<YOUR_KEY>" \
  --region ap-south-1
```

### Step 5 — ECS Task Definition

Save as `task-definition.json` (do not commit):

```json
{
  "family": "ments-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "ments-web",
      "image": "<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ments-web:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:<ACCOUNT_ID>:secret:ments/supabase-service-role-key"
        },
        {
          "name": "GROQ_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:<ACCOUNT_ID>:secret:ments/groq-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ments-web",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

```bash
# Register it
aws ecs register-task-definition --cli-input-json file://task-definition.json --region ap-south-1
```

### Step 6 — Create ECS Cluster + ALB + Service (Console)

Do this in the AWS Console (easier than CLI for first time):

1. **ECS** → Create Cluster → name: `ments-production` → Fargate
2. **Task Definitions** → Register → upload task-definition.json
3. **Create Service**:
   - Cluster: `ments-production`
   - Launch type: Fargate
   - Task def: `ments-web`
   - Desired count: 2
   - Load balancer: Create new ALB
     - Name: `ments-alb`
     - Listener: HTTPS 443 (add HTTP→HTTPS redirect)
     - Target group: port 3000, health check `/api/health`
   - Auto-scaling: Min 2 / Max 10 / Target CPU 70%

### Step 7 — CloudFront in front of ALB

1. Create CloudFront distribution
   - Origin: ALB DNS name
   - Cache behaviors:
     - `/_next/static/*` → Cache (1 year, immutable)
     - `/api/*` → No cache (forward all headers)
     - Default `/*` → Cache 60s
2. Add SSL certificate from ACM (free, must be in `us-east-1` for CloudFront)
3. Add custom domain (e.g. `ments.app`)

### Step 8 — Route 53 DNS

```
ments.app  ALIAS → CloudFront distribution
```

### Step 9 — CI/CD (GitHub Actions)

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: ments-web
  ECS_CLUSTER: ments-production
  ECS_SERVICE: ments-web

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        run: |
          IMAGE=${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}
          docker build \
            --build-arg NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }} \
            --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }} \
            -t $IMAGE:${{ github.sha }} \
            -t $IMAGE:latest \
            .
          docker push $IMAGE --all-tags

      - name: Force new ECS deployment
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
```

Add to GitHub repo secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Option C: EC2 + PM2 (Cheapest)

### 1. Launch EC2

- AMI: **Ubuntu 24.04 LTS**
- Instance: `t3.medium` (2 vCPU, 4 GB RAM) — upgrade to `t3.large` at 10K DAU
- Region: `ap-south-1`
- Storage: 30 GB gp3
- Security group: open ports 80, 443 (and 22 for SSH from your IP only)

### 2. Install dependencies

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 + Nginx + Certbot
sudo npm install -g pm2
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### 3. Deploy the app

```bash
git clone https://github.com/ments-app/webapp.git
cd webapp/ments_web_app

# Create env file
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-key
EOF

npm ci
npm run build

pm2 start npm --name "ments-web" -- start
pm2 save
pm2 startup   # auto-restart on reboot
```

### 4. Nginx config

```nginx
# /etc/nginx/sites-available/ments
server {
    listen 80;
    server_name ments.app www.ments.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ments /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Free SSL
sudo certbot --nginx -d ments.app -d www.ments.app
```

### 5. Deploy script (for future updates)

```bash
cat > ~/deploy.sh << 'EOF'
#!/bin/bash
set -e
cd ~/webapp/ments_web_app
git pull origin main
npm ci
npm run build
pm2 restart ments-web
echo "Deployed at $(date)"
EOF
chmod +x ~/deploy.sh
```

Trigger via GitHub Actions SSH action on push to `main`.

---

## ElastiCache Redis (Add-On — Recommended at 10K+ DAU)

Replaces the Supabase `feed_cache` table with sub-millisecond reads.

### Create cluster

```bash
aws elasticache create-replication-group \
  --replication-group-id ments-redis \
  --description "Ments feed cache" \
  --engine redis \
  --cache-node-type cache.t4g.medium \
  --num-cache-clusters 1 \
  --region ap-south-1
```

### Install client

```bash
npm install ioredis
```

### Create `src/lib/redis.ts`

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export default redis;
```

### Update cache-manager to use Redis

Replace Supabase table read/writes with:

```typescript
import redis from '@/lib/redis';

// Read
const cached = await redis.get(`feed:${userId}`);

// Write (2-hour TTL)
await redis.set(`feed:${userId}`, JSON.stringify(data), 'EX', 7200);

// Invalidate
await redis.del(`feed:${userId}`);
```

Add `REDIS_URL` to env vars (ElastiCache endpoint from console).

---

## Monitoring

### CloudWatch Alarms (set these up immediately)

```bash
# 5xx error rate
aws cloudwatch put-metric-alarm \
  --alarm-name ments-5xx \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum --period 300 --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-south-1:<ACCOUNT_ID>:ments-alerts

# High P95 latency
aws cloudwatch put-metric-alarm \
  --alarm-name ments-latency \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --extended-statistic p95 --period 300 --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-south-1:<ACCOUNT_ID>:ments-alerts
```

### Key metrics to watch

- ECS CPU/Memory per task
- ALB: RequestCount, P95 latency, 5xx rate
- Redis: CacheHits, CacheMisses, Evictions
- SQS: ApproximateNumberOfMessagesVisible (queue depth)

---

## Migration Checklist

### Phase 1 — App on AWS (Week 1)
- [ ] Choose option (A / B / C)
- [ ] Set up AWS account + IAM user + CLI
- [ ] Store secrets (Secrets Manager or env vars)
- [ ] Create health check endpoint `src/app/api/health/route.ts`
- [ ] Deploy and verify `/api/health` → 200
- [ ] Set up custom domain + SSL
- [ ] Set up CloudWatch log group
- [ ] Set up GitHub Actions CI/CD
- [ ] Switch DNS from Vercel → AWS
- [ ] Verify Supabase auth callbacks work (update redirect URLs in Supabase dashboard)
- [ ] Turn off Vercel project

### Phase 2 — Redis Cache (Week 2)
- [ ] Create ElastiCache Redis
- [ ] Update feed cache to use Redis
- [ ] Add `REDIS_URL` to env
- [ ] Verify feed source = "pipeline" in response

### Phase 3 — Background Workers (Week 3+)
- [ ] Create SQS queue for feed events
- [ ] Create ECS worker task definition
- [ ] Move heavy computation to worker
- [ ] Add EventBridge cron for profile recomputation

---

## Cost at Scale

| DAU | Option | Est. Cost/mo |
|-----|--------|-------------|
| 0–5K | Amplify | $15–25 |
| 5K–50K | ECS (2 tasks, t-size) + Redis | $105–180 |
| 50K–200K | ECS (4–8 tasks) + Redis + SQS | $300–600 |
| 200K+ | ECS + Aurora + Redis cluster + SQS | $1000+ |

---

## Important: Update Supabase Auth Redirect URLs

After switching domains, go to **Supabase Dashboard → Authentication → URL Configuration**:

- Site URL: `https://ments.app`
- Redirect URLs: add `https://ments.app/auth/callback`

Remove old Vercel URLs to keep it clean.
