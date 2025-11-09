pipeline {
  agent any
  triggers {
    // Automatically build on new changes (poll SCM every 5 minutes)
    pollSCM('H/5 * * * *')
  }
  parameters {
    // --- App runtime env ---
    string(name: 'PORT', defaultValue: '8080', description: 'API port')
    choice(name: 'GIN_MODE', choices: ['release', 'debug'], description: 'Gin mode')
    string(name: 'DB_HOST', defaultValue: 'db', description: 'DB host (compose service name)')
    string(name: 'DB_PORT', defaultValue: '5432', description: 'DB port')
    string(name: 'DB_USER', defaultValue: 'postgres', description: 'DB user')
    password(name: 'DB_PASSWORD', defaultValue: '', description: 'DB password')
    string(name: 'DB_NAME', defaultValue: 'freelance_monitor', description: 'DB name')
    string(name: 'DB_SSLMODE', defaultValue: 'disable', description: 'DB sslmode')
    password(name: 'JWT_SECRET', defaultValue: '', description: 'JWT secret (required)')
    string(name: 'JWT_TTL_SECONDS', defaultValue: '3600', description: 'JWT TTL seconds')
    string(name: 'RESET_LINK_BASE', defaultValue: 'https://your-domain.com/auth/reset?token=', description: 'Reset link base')
    string(name: 'SMTP_HOST', defaultValue: '', description: 'SMTP host (optional)')
    string(name: 'SMTP_PORT', defaultValue: '587', description: 'SMTP port')
    string(name: 'SMTP_USER', defaultValue: '', description: 'SMTP user')
    password(name: 'SMTP_PASSWORD', defaultValue: '', description: 'SMTP password')
    string(name: 'SMTP_FROM', defaultValue: '', description: 'SMTP from email')
    string(name: 'NEXT_PUBLIC_BACKEND_URL', defaultValue: 'https://your-domain.com', description: 'Public backend URL')

    // --- Build & push ---
    string(name: 'IMAGE_REPO', defaultValue: 'youruser/freelance-monitor-api', description: 'Full image repo (e.g., user/repo)')
    booleanParam(name: 'PUSH_IMAGE', defaultValue: false, description: 'Push image to registry')
    booleanParam(name: 'AUTO_PUSH_ON_MAIN', defaultValue: true, description: 'Auto-push when building main branch')
    booleanParam(name: 'PUSH_LATEST', defaultValue: true, description: 'Also push :latest tag')

    // --- Deploy ---
    booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Deploy to server over SSH')
    string(name: 'SERVER_HOST', defaultValue: 'user@server', description: 'SSH target (user@host)')
  }
  environment {
    // Docker registry credentials (username/password credsId)
    REGISTRY = credentials('docker-registry')
    IMAGE_REPO = "${params.IMAGE_REPO}"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    // Golang cache directories to speed up builds
    GOMODCACHE = "${env.WORKSPACE}/backend/.gomodcache"
    GOCACHE = "${env.WORKSPACE}/backend/.gocache"
  }
  options {
    timestamps()
    ansiColor('xterm')
  }
  stages {
    stage('Validate Params') {
      steps {
        script {
          def errors = []
          if (!params.JWT_SECRET?.trim()) { errors << 'JWT_SECRET is required' }
          if (!params.DB_PASSWORD?.trim()) { errors << 'DB_PASSWORD is required' }
          if (!params.NEXT_PUBLIC_BACKEND_URL?.trim()) { errors << 'NEXT_PUBLIC_BACKEND_URL is required' }
          if (!params.RESET_LINK_BASE?.trim()) { errors << 'RESET_LINK_BASE is required' }
          if (errors) {
            error("Parameter validation failed: " + errors.join('; '))
          }
        }
      }
    }
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Go Test') {
      steps {
        dir('backend') {
          sh '''
            set -euxo pipefail
            mkdir -p .gomodcache .gocache
            go mod tidy
            go fmt ./...
            # produce JUnit XML for test reporting
            go install gotest.tools/gotestsum@latest
            GOTESTSUM=$(go env GOPATH)/bin/gotestsum
            $GOTESTSUM --junitfile test-report.xml --format testname -- -coverprofile=coverage.out ./... || true
          '''
        }
      }
    }

    stage('Generate Env (.env.production)') {
      steps {
        script {
          def envContent = """
PORT=${params.PORT}
GIN_MODE=${params.GIN_MODE}

# PostgreSQL
DB_HOST=${params.DB_HOST}
DB_PORT=${params.DB_PORT}
DB_USER=${params.DB_USER}
DB_PASSWORD=${params.DB_PASSWORD}
DB_NAME=${params.DB_NAME}
DB_SSLMODE=${params.DB_SSLMODE}

# Auth
JWT_SECRET=${params.JWT_SECRET}
JWT_TTL_SECONDS=${params.JWT_TTL_SECONDS}
AUTH_COOKIE=false
DEV_EXPOSE_RESET_TOKEN=false
DEV_ALLOW_UNAUTH=false

# Password reset link
RESET_LINK_BASE=${params.RESET_LINK_BASE}

# SMTP (optional)
SMTP_HOST=${params.SMTP_HOST}
SMTP_PORT=${params.SMTP_PORT}
SMTP_USER=${params.SMTP_USER}
SMTP_PASSWORD=${params.SMTP_PASSWORD}
SMTP_FROM=${params.SMTP_FROM}

# Frontend
NEXT_PUBLIC_BACKEND_URL=${params.NEXT_PUBLIC_BACKEND_URL}
NEXT_PUBLIC_DEV_ALLOW_UNAUTH=false
"""
          writeFile file: 'deploy/.env.production', text: envContent
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        dir('backend') {
          script {
            sh 'docker build -f Dockerfile -t ${IMAGE_REPO}:${IMAGE_TAG} --target runtime .'
          }
        }
      }
    }

    stage('Login & Push') {
      when { expression { return (params.PUSH_IMAGE || (params.AUTO_PUSH_ON_MAIN && env.BRANCH_NAME == 'main')) } }
      steps {
        script {
          sh 'echo $REGISTRY_PSW | docker login -u $REGISTRY_USR --password-stdin'
          sh 'docker push ${IMAGE_REPO}:${IMAGE_TAG}'
          script {
            if (params.PUSH_LATEST) {
              sh 'docker tag ${IMAGE_REPO}:${IMAGE_TAG} ${IMAGE_REPO}:latest'
              sh 'docker push ${IMAGE_REPO}:latest'
            }
          }
        }
      }
    }

    stage('Deploy (Local Docker)') {
      when {
        anyOf {
          branch 'main'
          expression { return params.DEPLOY == true }
        }
      }
      steps {
        script {
          echo "🚀 Deploying ${env.IMAGE_REPO}:${env.IMAGE_TAG} on this server..."
          sh '''
            set -euxo pipefail
            docker rm -f freelance-monitor-api || true
            docker run -d \
              -p ${params.PORT}:${params.PORT} \
              --name freelance-monitor-api \
              --restart unless-stopped \
              -v fms_static:/srv/static \
              --env-file deploy/.env.production \
              ${IMAGE_REPO}:${IMAGE_TAG}
          '''
        }
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'deploy/**, backend/Dockerfile, docker-compose.yml, README.md, backend/coverage.out, backend/test-report.xml', fingerprint: true, onlyIfSuccessful: false
      junit testResults: 'backend/test-report.xml', allowEmptyResults: true
    }
  }
}
